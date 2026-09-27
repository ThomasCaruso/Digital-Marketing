/**
 * FORM Phase 2B — live Rakuten ProductProvider (replaces the Phase 2A stub).
 *
 * Everything here is built ONLY from the current official documentation
 * (developers.rakutenadvertising.com, retrieved 2026-09-27; see
 * docs/RESEARCH_NOTES.md for the full capture):
 *
 *   Product Search
 *     GET https://api.linksynergy.com/productsearch/1.0
 *     `Authorization: Bearer {token}`; XML response; ≤100 calls/min;
 *     ≤5,000 total results; page size (`max`) ≤100; requesting a page
 *     beyond TotalPages is an error.
 *     Query params used: keyword (all terms), max, pagenumber. Terms must
 *     not contain & = ? { } \ ( ) [ ] - ; ~ | $ ! > < * % — FORM strips
 *     them before sending. mid/sort/exact/one/none/cat exist but FORM does
 *     not need them for V1 retrieval.
 *
 *   Deep Links
 *     POST https://api.linksynergy.com/v1/links/deep_links (lazy, optional,
 *     failure-tolerant — see deeplink.ts).
 *
 * Intent mapping is a documented BEST-EFFORT pre-filter (see
 * ProductProvider.search): query→keyword, currency/category/price post-
 * filters, limit via pagination. Brand/color/size facets are not expressible
 * (the provider supplies none of that data); the authoritative deterministic
 * filtering stays in filter.ts downstream.
 *
 * getById always resolves null: the documented API has no id lookup, and
 * keyword-searching a MID:SKU composite could silently return the WRONG
 * product — an honest null beats a plausible guess.
 *
 * Secrets (bearer token, client id/secret) live only inside the token
 * source and request headers, are never logged, never thrown, and never
 * hardcoded. Auth failures surface as CatalogProviderError AUTH_FAILED,
 * separate from search failures (PROVIDER_ERROR).
 */

import { CatalogProviderError, type ProductProvider } from "../../provider.js";
import { effectivePriceCents } from "../../money.js";
import type { NormalizedProduct, ProductSearchIntent } from "../../types.js";
import { mapWithConcurrency, requestWithResilience, type FetchLike, type RakutenHttpError } from "./http.js";
import { defaultSleep } from "./http.js";
import { ClientCredentialsTokenSource, StaticBearerToken, type RakutenTokenSource } from "./token.js";
import { parseSearchXml, type RakutenSearchPage } from "./xml.js";
import { normalizeRakutenItem } from "./normalize.js";
import { RakutenDeepLinkClient } from "./deeplink.js";

export const SEARCH_URL = "https://api.linksynergy.com/productsearch/1.0";
export const DEEP_LINK_URL = "https://api.linksynergy.com/v1/links/deep_links";

/** Documented API ceilings. */
const MAX_PAGE_SIZE = 100;
const MAX_TOTAL_RESULTS = 5000;

/** Characters the docs declare unsupported in search terms. */
const UNSUPPORTED_SEARCH_CHARS = /[&=?{}\\()[\];~|$!><*%-]/g;

export interface RakutenProviderConfig {
  /** Pre-generated bearer token from the developer portal Applications page
   *  (the documented static retrieval path). */
  bearerToken?: string;
  /** Token API credential pair (the documented programmatic path). */
  clientId?: string;
  clientSecret?: string;
  /** Token endpoint override — see token.ts for the verification status. */
  tokenUrl?: string;
  searchUrl?: string;
  deepLinkUrl?: string;
  timeoutMs?: number;
  /** Transient-only retries on top of the first attempt. */
  maxRetries?: number;
  retryDelayMs?: number;
  tokenRefreshBufferMs?: number;
  /** Network injection point — tests NEVER hit the real endpoints. */
  fetchImpl?: FetchLike;
  /** Retry-sleep injection point so tests stay instant. */
  sleep?: (ms: number) => Promise<void>;
}

export function rakutenProviderFromEnv(
  env: Partial<Pick<NodeJS.ProcessEnv, "RAKUTEN_BEARER_TOKEN" | "RAKUTEN_CLIENT_ID" | "RAKUTEN_CLIENT_SECRET" | "RAKUTEN_TOKEN_URL">>,
): RakutenProductProvider | null {
  const bearerToken = env.RAKUTEN_BEARER_TOKEN?.trim();
  const clientId = env.RAKUTEN_CLIENT_ID?.trim();
  const clientSecret = env.RAKUTEN_CLIENT_SECRET?.trim();
  if ((bearerToken ?? "") === "" && ((clientId ?? "") === "" || (clientSecret ?? "") === "")) {
    return null;
  }
  return new RakutenProductProvider({
    bearerToken: bearerToken === "" ? undefined : bearerToken,
    clientId: clientId === "" ? undefined : clientId,
    clientSecret: clientSecret === "" ? undefined : clientSecret,
    tokenUrl: env.RAKUTEN_TOKEN_URL?.trim() || undefined,
  });
}

export interface RakutenSearchStats {
  keyword: string;
  pagesFetched: number;
  itemsSeen: number;
  itemsSkipped: RakutenSkipSummary[];
}

export interface RakutenSkipSummary {
  reason: string;
  count: number;
}

export class RakutenProductProvider implements ProductProvider {
  readonly id = "rakuten" as const;

  private readonly config: RakutenProviderConfig | null;
  private readonly tokenSource: RakutenTokenSource | null;
  private readonly deepLinkClient: RakutenDeepLinkClient | null;

  /** Observability for the last search(): page/item counts and per-reason
   *  skip tallies. Not part of the ProductProvider contract. */
  lastSearchStats: RakutenSearchStats | null = null;

  constructor(config: RakutenProviderConfig | null = null) {
    this.config = config;
    if (config === null) {
      this.tokenSource = null;
      this.deepLinkClient = null;
      return;
    }
    const fetchImpl: FetchLike = config.fetchImpl ?? ((url, init) => fetch(url, init));
    const sleep = config.sleep ?? defaultSleep;
    const timeoutMs = config.timeoutMs ?? 10_000;
    const maxRetries = config.maxRetries ?? 2;
    const retryDelayMs = config.retryDelayMs ?? 500;

    this.tokenSource =
      config.bearerToken !== undefined
        ? new StaticBearerToken(config.bearerToken)
        : config.clientId !== undefined && config.clientSecret !== undefined
          ? new ClientCredentialsTokenSource({
              clientId: config.clientId,
              clientSecret: config.clientSecret,
              tokenUrl: config.tokenUrl,
              timeoutMs,
              maxRetries,
              retryDelayMs,
              refreshBufferMs: config.tokenRefreshBufferMs,
              fetchImpl,
              sleep,
            })
          : null;

    this.deepLinkClient =
      this.tokenSource !== null
        ? new RakutenDeepLinkClient({
            tokenSource: this.tokenSource,
            endpoint: config.deepLinkUrl ?? DEEP_LINK_URL,
            timeoutMs,
            maxRetries,
            retryDelayMs,
            fetchImpl,
            sleep,
          })
        : null;
  }

  /** One shared request profile for search-page fetches. */
  private fetchDefaults(): {
    fetchImpl: FetchLike;
    sleep: (ms: number) => Promise<void>;
    timeoutMs: number;
    maxRetries: number;
    retryDelayMs: number;
  } {
    const config = this.config!;
    return {
      fetchImpl: config.fetchImpl ?? ((url, init) => fetch(url, init)),
      sleep: config.sleep ?? defaultSleep,
      timeoutMs: config.timeoutMs ?? 10_000,
      maxRetries: config.maxRetries ?? 2,
      retryDelayMs: config.retryDelayMs ?? 500,
    };
  }

  private notConfigured(): CatalogProviderError {
    return new CatalogProviderError(
      "NOT_CONFIGURED",
      this.id,
      "Rakuten provider needs RAKUTEN_BEARER_TOKEN or RAKUTEN_CLIENT_ID + RAKUTEN_CLIENT_SECRET (server-side only)",
    );
  }

  private requireTokenSource(): RakutenTokenSource {
    if (this.config === null || this.tokenSource === null) throw this.notConfigured();
    return this.tokenSource;
  }

  /**
   * Search the live Rakuten catalog. Sequential page fetches (the API has a
   * 100 calls/min budget and page N+1's necessity depends on page N's
   * TotalPages) — deterministic order, no parallel bursts.
   */
  async search(intent: ProductSearchIntent): Promise<NormalizedProduct[]> {
    const tokenSource = this.requireTokenSource();
    const defaults = this.fetchDefaults();

    // The docs list these characters as unsupported in search terms; strip
    // them (word-separating) instead of failing retrieval on prose.
    const keyword = (intent.query ?? "").replace(UNSUPPORTED_SEARCH_CHARS, " ").replace(/\s+/g, " ").trim();
    if (keyword === "") return [];

    const currency = (intent.currency ?? "USD").toUpperCase();
    const limit =
      intent.limit !== undefined && intent.limit > 0 ? Math.min(intent.limit, MAX_TOTAL_RESULTS) : null;
    const pageSize = Math.min(MAX_PAGE_SIZE, limit ?? MAX_PAGE_SIZE);

    const categories = intent.categories !== undefined && intent.categories.length > 0
      ? new Set<string>(intent.categories)
      : null;

    const collected: NormalizedProduct[] = [];
    const skips = new Map<string, number>();
    // One timestamp for the whole call: results stay deterministic within a
    // single search invocation.
    const syncedAt = new Date().toISOString();
    const stats: RakutenSearchStats = { keyword, pagesFetched: 0, itemsSeen: 0, itemsSkipped: [] };

    const token = await tokenSource.getToken();

    for (let pageNumber = 1; pageNumber <= MAX_TOTAL_RESULTS / MAX_PAGE_SIZE; pageNumber++) {
      const params = new URLSearchParams({
        keyword,
        max: String(pageSize),
        pagenumber: String(pageNumber),
      });
      let page: RakutenSearchPage;
      try {
        const response = await requestWithResilience({
          url: `${this.config!.searchUrl ?? SEARCH_URL}?${params.toString()}`,
          headers: { Authorization: `Bearer ${token}` },
          secrets: [token],
          ...defaults,
        });
        page = parseSearchXml(await response.text());
      } catch (err) {
        throw this.toCatalogError(err);
      }
      stats.pagesFetched++;

      for (const rawItem of page.items) {
        stats.itemsSeen++;
        const normalized = normalizeRakutenItem(rawItem, syncedAt);
        if (!normalized.ok) {
          skips.set(normalized.skip.reason, (skips.get(normalized.skip.reason) ?? 0) + 1);
          continue;
        }
        collected.push(normalized.product);
      }

      const totalPages = page.totalPages;
      const enoughRaw = limit !== null && collected.length >= limit;
      if (enoughRaw || totalPages === null || pageNumber >= totalPages || page.items.length === 0) break;
    }

    stats.itemsSkipped = [...skips.entries()].map(([reason, count]) => ({ reason, count }));
    this.lastSearchStats = stats;

    // Best-effort intent pre-filter (documented expressible facets only).
    let results = collected.filter((product) => {
      if (product.currency !== currency) return false;
      if (categories !== null && !categories.has(product.category)) return false;
      const effective = effectivePriceCents(product);
      if (intent.minPriceCents !== undefined && effective < intent.minPriceCents) return false;
      if (intent.maxPriceCents !== undefined && effective > intent.maxPriceCents) return false;
      return true;
    });

    if (limit !== null) results = results.slice(0, limit);
    return results;
  }

  /**
   * The documented Product Search API has no id lookup. A keyword search for
   * a MID:SKU composite could silently return a DIFFERENT product, so this
   * resolves null instead of guessing.
   */
  async getById(_providerProductId: string): Promise<NormalizedProduct | null> {
    if (this.config === null || this.tokenSource === null) throw this.notConfigured();
    return null;
  }

  /**
   * Lazily resolve one product's affiliate deep link. Returns the SAME
   * product with `affiliateUrl` filled, or unchanged (affiliateUrl absent)
   * when the advertiser does not support deep linking or the call fails —
   * retrieval outcomes are never destroyed by link enrichment.
   */
  async createAffiliateLink(
    product: NormalizedProduct,
    options: { u1?: string } = {},
  ): Promise<NormalizedProduct> {
    const client = this.deepLinkClient;
    if (this.config === null || client === null) throw this.notConfigured();
    if (product.affiliateUrl !== null) return product;
    const advertiserId = typeof product.metadata.mid === "string" ? product.metadata.mid : "";
    const link = await client.createAffiliateUrl(product.productUrl, advertiserId, options.u1);
    return link === null ? product : { ...product, affiliateUrl: link };
  }

  /**
   * Deep-link many products with bounded concurrency (default 4). Order
   * matches input order; failures keep the product unchanged.
   */
  async resolveAffiliateLinks(
    products: readonly NormalizedProduct[],
    options: { concurrency?: number; u1?: string } = {},
  ): Promise<NormalizedProduct[]> {
    const concurrency = Math.max(1, Math.min(options.concurrency ?? 4, 16));
    return mapWithConcurrency(products, concurrency, (product) =>
      this.createAffiliateLink(product, { u1: options.u1 }),
    );
  }

  /** Map transport/parse failures onto the catalog error taxonomy. Auth is
   *  distinct so callers can alert differently (bad credentials vs outage). */
  private toCatalogError(err: unknown): CatalogProviderError {
    if (err instanceof CatalogProviderError) return err;
    const httpErr = err as Partial<RakutenHttpError>;
    if (httpErr?.kind === "status" && (httpErr.status === 401 || httpErr.status === 403)) {
      return new CatalogProviderError(
        "AUTH_FAILED",
        this.id,
        `Rakuten rejected the bearer token (HTTP ${httpErr.status})`,
      );
    }
    const detail = err instanceof Error ? err.message : String(err);
    return new CatalogProviderError("PROVIDER_ERROR", this.id, `Rakuten search failed: ${detail}`);
  }
}
