/**
 * FORM Phase 2A contracts — the ProductProvider boundary (TD-002, TD-013).
 *
 * A provider adapter turns provider-native responses into NormalizedProduct
 * records. FORM application logic never sees provider field names; provider
 * data that has no canonical column belongs in `metadata`.
 */

import type { NormalizedProduct, ProductSearchIntent, ProviderId } from "./types.js";

export interface ProductProvider {
  /** Identifier recorded on every product and sync run. */
  readonly id: ProviderId;
  /** Search the provider and return normalized records. Implementations
   *  should apply the intent as a best-effort pre-filter; the authoritative
   *  deterministic filtering happens in filter.ts, downstream. */
  search(intent: ProductSearchIntent): Promise<NormalizedProduct[]>;
  /** Fetch one product by its provider-native id, or null when absent. */
  getById(providerProductId: string): Promise<NormalizedProduct | null>;
}

/** Machine-readable failure codes for provider operations. */
export type CatalogProviderErrorCode =
  /** Credentials for the provider are absent/incomplete. */
  | "NOT_CONFIGURED"
  /** The adapter boundary exists but the integration is not implemented. */
  | "NOT_IMPLEMENTED"
  /** The provider was reachable but answered with an error. */
  | "PROVIDER_ERROR";

export class CatalogProviderError extends Error {
  readonly code: CatalogProviderErrorCode;
  readonly provider: ProviderId;

  constructor(code: CatalogProviderErrorCode, provider: ProviderId, message: string) {
    super(`[${code}] ${provider}: ${message}`);
    this.name = "CatalogProviderError";
    this.code = code;
    this.provider = provider;
  }
}
