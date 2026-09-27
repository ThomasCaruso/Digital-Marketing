/**
 * FORM Phase 2B — Rakuten Deep Links client (lazy affiliate URL resolution).
 *
 * Documented (developers.rakutenadvertising.com/guides/deep_link, retrieved
 * 2026-09-27): POST https://api.linksynergy.com/v1/links/deep_links with
 * `Authorization: Bearer {token}`; input is the URL to deep-link, the
 * advertiser id, and an optional u1 tracking value; ONE link per request;
 * requires an approved partner-advertiser relationship AND an advertiser
 * that supports deep linking.
 *
 * FORM treats deep linking as strictly optional ENRICHMENT:
 *
 *   - generation is lazy — search results never wait on it;
 *   - successes are cached per product URL (bounded cache);
 *   - ANY failure (unsupported advertiser, no partnership, HTTP error,
 *     timeout, unexpected body) returns null — the product keeps its
 *     `productUrl` (the provider's linkurl) and `affiliateUrl` simply stays
 *     absent. A deep-link failure can never damage a product record.
 *
 * The documented response example could not be captured textually from the
 * portal (JS-rendered page); link extraction is therefore defensive: the
 * first http(s) URL string found in the JSON body, in deterministic field
 * order — no undocumented field name is assumed. Confirm the exact shape
 * during live validation (docs/RESEARCH_NOTES.md).
 */

import { requestJson, type FetchLike } from "./http.js";
import type { RakutenTokenSource } from "./token.js";

export interface DeepLinkClientOptions {
  tokenSource: RakutenTokenSource;
  endpoint: string;
  timeoutMs: number;
  maxRetries: number;
  retryDelayMs: number;
  fetchImpl: FetchLike;
  sleep: (ms: number) => Promise<void>;
  maxCacheEntries?: number;
}

/** Depth-first scan for the first http(s) URL string in a decoded body. */
function firstHttpUrl(value: unknown): string | null {
  if (typeof value === "string") {
    return /^https?:\/\//i.test(value) ? value : null;
  }
  if (Array.isArray(value)) {
    for (const entry of value) {
      const found = firstHttpUrl(entry);
      if (found !== null) return found;
    }
    return null;
  }
  if (value !== null && typeof value === "object") {
    for (const entry of Object.values(value)) {
      const found = firstHttpUrl(entry);
      if (found !== null) return found;
    }
  }
  return null;
}

export class RakutenDeepLinkClient {
  private readonly cache = new Map<string, string>();
  private readonly maxCacheEntries: number;

  constructor(private readonly options: DeepLinkClientOptions) {
    this.maxCacheEntries = options.maxCacheEntries ?? 1000;
  }

  /** Resolve the deep link for one product URL, or null on any failure. */
  async createAffiliateUrl(productUrl: string, advertiserId: string, u1?: string): Promise<string | null> {
    const cached = this.cache.get(productUrl);
    if (cached !== undefined) return cached;
    if (advertiserId.trim() === "") return null;

    try {
      const token = await this.options.tokenSource.getToken();
      const body: Record<string, string> = {
        url: productUrl,
        advertiser_id: advertiserId,
      };
      if (u1 !== undefined && u1 !== "") body.u1 = u1;

      const parsed = await requestJson({
        method: "POST",
        url: this.options.endpoint,
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
        // The bearer token must never leak into a thrown message.
        secrets: [token],
        timeoutMs: this.options.timeoutMs,
        maxRetries: this.options.maxRetries,
        retryDelayMs: this.options.retryDelayMs,
        fetchImpl: this.options.fetchImpl,
        sleep: this.options.sleep,
      });

      const link = firstHttpUrl(parsed);
      if (link === null) return null;
      if (this.cache.size >= this.maxCacheEntries) {
        const oldest = this.cache.keys().next();
        if (!oldest.done) this.cache.delete(oldest.value);
      }
      this.cache.set(productUrl, link);
      return link;
    } catch {
      // Enrichment only: swallow and let the product keep productUrl.
      return null;
    }
  }
}
