/**
 * FORM Phase 2B — Rakuten bearer-token retrieval and caching.
 *
 * Officially documented (developers.rakutenadvertising.com, Product Search +
 * Deep Links guides, retrieved 2026-09-27):
 *
 *   - API calls authenticate with `Authorization: Bearer {token}`;
 *   - the token comes from the developer portal "Applications" page or from
 *     the Token API;
 *   - issuing a NEW token immediately expires the previous one.
 *
 * That last fact makes token CACHING a correctness requirement, not an
 * optimization: two concurrent refreshes would invalidate each other.
 * Retrieval is therefore single-flight, and the cached token is reused until
 * shortly before its expiry (refresh buffer).
 *
 * Two documented retrieval paths, both injectable for tests:
 *
 *   - `StaticBearerToken`: an operator-generated token from the Applications
 *     page (fully documented UI flow). Nothing is ever hardcoded; the token
 *     arrives via server-side env only.
 *   - `ClientCredentialsTokenSource`: the programmatic Token API. The CURRENT
 *     portal documents this path but its guide is screenshot-only, so the
 *     exact wire format could not be re-verified from portal text — it
 *     follows the OAuth 2.0 client-credentials flow corroborated by the
 *     prior official portal guide and ecosystem integrations, with
 *     `expires_in` defaulting to one hour when omitted. This is the one
 *     unverified surface in the adapter; it is isolated here and overridable
 *     via `tokenUrl`. See docs/RESEARCH_NOTES.md before enabling live.
 */

import { CatalogProviderError } from "../../provider.js";
import { requestJson, redactSecrets, type FetchLike, type RakutenHttpError } from "./http.js";

export interface RakutenTokenSource {
  getToken(): Promise<string>;
}

/** A pre-generated bearer token from the developer portal Applications page. */
export class StaticBearerToken implements RakutenTokenSource {
  constructor(private readonly token: string) {
    if (token.trim() === "") {
      throw new Error("static bearer token must be a non-empty string");
    }
  }

  async getToken(): Promise<string> {
    return this.token;
  }
}

/**
 * The one token endpoint value we could not re-verify from current portal
 * text. Corroborated default, config-overridable, and exercised only when
 * client credentials are used without a static token.
 */
export const DEFAULT_TOKEN_URL = "https://api.linksynergy.com/token";
/** Corroborated default; the real value should come from `expires_in`. */
const DEFAULT_TOKEN_TTL_SECONDS = 3600;

export interface ClientCredentialsOptions {
  clientId: string;
  clientSecret: string;
  tokenUrl?: string;
  timeoutMs: number;
  maxRetries: number;
  retryDelayMs: number;
  /** Refresh this long before expiry (default 120s). */
  refreshBufferMs?: number;
  fetchImpl: FetchLike;
  sleep: (ms: number) => Promise<void>;
}

function basicAuth(clientId: string, clientSecret: string): string {
  // btoa throws on non-Latin1; credential pairs are ASCII portal secrets.
  return btoa(`${clientId}:${clientSecret}`);
}

export class ClientCredentialsTokenSource implements RakutenTokenSource {
  private cache: { token: string; expiresAtMs: number } | null = null;
  private inflight: Promise<string> | null = null;
  private readonly refreshBufferMs: number;

  constructor(private readonly options: ClientCredentialsOptions) {
    this.refreshBufferMs = options.refreshBufferMs ?? 120_000;
  }

  async getToken(): Promise<string> {
    if (this.cache !== null && Date.now() < this.cache.expiresAtMs - this.refreshBufferMs) {
      return this.cache.token;
    }
    // Single-flight: a new token invalidates the previous one, so concurrent
    // retrievals MUST collapse into one request.
    if (this.inflight === null) {
      this.inflight = this.retrieve().finally(() => {
        this.inflight = null;
      });
    }
    return this.inflight;
  }

  private async retrieve(): Promise<string> {
    const o = this.options;
    const basic = basicAuth(o.clientId, o.clientSecret);
    const secrets: readonly string[] = [o.clientId, o.clientSecret, basic];
    try {
      const body = await requestJson({
        method: "POST",
        url: o.tokenUrl ?? DEFAULT_TOKEN_URL,
        headers: {
          Authorization: `Basic ${basic}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: "grant_type=client_credentials",
        secrets,
        timeoutMs: o.timeoutMs,
        maxRetries: o.maxRetries,
        retryDelayMs: o.retryDelayMs,
        fetchImpl: o.fetchImpl,
        sleep: o.sleep,
      });
      const token = typeof body.access_token === "string" ? body.access_token : null;
      if (token === null || token === "") {
        throw new CatalogProviderError(
          "PROVIDER_ERROR",
          "rakuten",
          "token endpoint returned no access_token (response shape needs live verification)",
        );
      }
      const ttlSeconds =
        typeof body.expires_in === "number" && Number.isFinite(body.expires_in) && body.expires_in > 0
          ? body.expires_in
          : DEFAULT_TOKEN_TTL_SECONDS;
      this.cache = { token, expiresAtMs: Date.now() + ttlSeconds * 1000 };
      return token;
    } catch (err) {
      throw this.toAuthAwareError(err, secrets);
    }
  }

  /** Re-map transport failures: 401/403 are AUTH (credentials rejected);
   *  everything else is a provider error. Messages never carry secrets. */
  private toAuthAwareError(err: unknown, secrets: readonly string[]): Error {
    if (err instanceof CatalogProviderError) return err;
    const httpErr = err as Partial<RakutenHttpError>;
    if (httpErr?.kind === "status" && (httpErr.status === 401 || httpErr.status === 403)) {
      return new CatalogProviderError(
        "AUTH_FAILED",
        "rakuten",
        `token endpoint rejected the credentials (HTTP ${httpErr.status})`,
      );
    }
    const detail = err instanceof Error ? err.message : String(err);
    return new CatalogProviderError(
      "PROVIDER_ERROR",
      "rakuten",
      `token retrieval failed: ${redactSecrets(detail, secrets)}`,
    );
  }
}
