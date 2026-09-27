/**
 * FORM Phase 2A — Rakuten provider BOUNDARY STUB.
 *
 * This file exists so the provider boundary is real (implements
 * ProductProvider) and so Phase 3+ code can be written against it. It is
 * INTENTIONALLY NOT AN INTEGRATION:
 *
 *   - no Rakuten endpoint is called;
 *   - no response shape is assumed or modeled — inventing endpoint shapes
 *     from memory is forbidden (docs/RESEARCH_NOTES.md lists the docs to
 *     consult: developers.rakutenadvertising.com product search + deep link);
 *   - every call throws a clear CatalogProviderError, NOT_CONFIGURED when
 *     credentials are missing and NOT_IMPLEMENTED otherwise.
 *
 * Live integration requirements (future phase, not this one):
 *   1. RAKUTEN_CLIENT_ID / RAKUTEN_CLIENT_SECRET, server-side only.
 *   2. Real Product Search + deep-link API reference documentation.
 *   3. An adapter that maps Rakuten responses -> NormalizedProduct, with
 *      Rakuten-native fields preserved under `metadata`, availability left
 *      `unknown` wherever the feed does not state it, and deep links
 *      resolved into `affiliateUrl`.
 */

import { CatalogProviderError, type ProductProvider } from "../provider.js";
import type { NormalizedProduct, ProductSearchIntent } from "../types.js";

export interface RakutenProviderConfig {
  clientId: string;
  clientSecret: string;
}

export class RakutenProductProvider implements ProductProvider {
  readonly id = "rakuten" as const;

  constructor(private readonly config: RakutenProviderConfig | null = null) {}

  async search(_intent: ProductSearchIntent): Promise<NormalizedProduct[]> {
    throw this.notReady();
  }

  async getById(_providerProductId: string): Promise<NormalizedProduct | null> {
    throw this.notReady();
  }

  private notReady(): CatalogProviderError {
    if (this.config === null) {
      return new CatalogProviderError(
        "NOT_CONFIGURED",
        this.id,
        "RAKUTEN_CLIENT_ID / RAKUTEN_CLIENT_SECRET are not set (server-side only)",
      );
    }
    return new CatalogProviderError(
      "NOT_IMPLEMENTED",
      this.id,
      "Rakuten adapter is a Phase 2A boundary stub — no endpoint has been implemented; " +
        "response shapes must come from the live API documentation, not from memory",
    );
  }
}
