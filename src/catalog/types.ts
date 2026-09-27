/**
 * FORM Phase 2A contracts — the provider-independent catalog domain.
 *
 * This is the canonical shape every commerce provider must be normalized
 * into before FORM application logic sees it (TD-002, TD-013):
 *
 *   provider response -> provider adapter -> NormalizedProduct
 *     -> validation -> deterministic filtering -> application
 *
 * Rakuten-specific field names never leave the adapter. Provider-specific
 * data belongs in `metadata`.
 *
 * Money is INTEGER MINOR UNITS (US cents) everywhere — never floats.
 * This is the single FORM money convention (docs/DATA_MODEL.md, Phase 1
 * implementation notes item 3); `priceCents`/`salePriceCents` continue it.
 *
 * Unknown values remain unknown: optional fields are `null`/absent, and an
 * empty `availableSizes` array means "sizes unknown", never "no sizes".
 */

/** Canonical product categories. Deliberately small (six + other); finer
 *  taxonomy can arrive later without breaking the contract. Provider-native
 *  category strings live in `metadata.providerCategory`, never here. */
export const PRODUCT_CATEGORIES = [
  "tops",
  "bottoms",
  "outerwear",
  "one_piece",
  "shoes",
  "accessories",
  "other",
] as const;

export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number];

/** How sure the provider is that the product can actually be bought.
 *  Never inferred: if a provider does not say, this stays `unknown`. */
export const AVAILABILITY_CONFIDENCES = ["confirmed", "partial", "unknown"] as const;

export type AvailabilityConfidence = (typeof AVAILABILITY_CONFIDENCES)[number];

/** Commerce providers FORM knows about. Application logic must not branch on
 *  the concrete value — it is an identifier, not a feature flag. */
export const PROVIDER_IDS = ["fixture", "rakuten"] as const;

export type ProviderId = (typeof PROVIDER_IDS)[number];

/**
 * The catalog record every provider adapter must produce. Mirrors
 * `public.products` in supabase/migrations/0004_catalog.sql (snake_case
 * there, camelCase here) — keep both in sync.
 *
 * `id` is the FORM catalog id (UUID; the Postgres primary key). Adapters that
 * can mint stable ids should; once a row exists, upserts preserve the
 * original DB id and match on `(provider, providerProductId)` instead.
 */
export interface NormalizedProduct {
  id: string;
  provider: ProviderId;
  /** Stable within the provider — the adapter's contract to uphold. */
  providerProductId: string;
  merchant: string;
  /** Unknown when the provider does not name a brand. */
  brand: string | null;
  name: string;
  description: string | null;
  category: ProductCategory;
  subcategory: string | null;
  /** Regular price, integer minor units, >= 0. */
  priceCents: number;
  /** Sale price, integer minor units. Must not exceed `priceCents` unless the
   *  source contradiction is explicitly preserved via
   *  metadata[SALE_PRICE_ANOMALY] (see validation.ts). */
  salePriceCents: number | null;
  /** ISO 4217 alphabetic code, uppercase ("USD"). */
  currency: string;
  /** Every entry must be a valid http(s) URL. */
  imageUrls: string[];
  productUrl: string;
  affiliateUrl: string | null;
  /** Primary colorway, when the provider states one. */
  color: string | null;
  /** Colorways the provider lists. Empty = unknown, not "none". */
  availableColors: string[];
  /** Sizes the provider explicitly lists. Empty = UNKNOWN, never "none". */
  availableSizes: string[];
  availabilityConfidence: AvailabilityConfidence;
  /** Provider-specific and sync-related data. Not interpreted by FORM logic. */
  metadata: Record<string, unknown>;
  /** When the adapter last saw this record from the provider (ISO instant). */
  lastSyncedAt: string;
}

/**
 * What a catalog search is looking for. Deliberately NOT tied to GLM output
 * (Phase 3 will map parsed intent onto this); it is a plain catalog query.
 * Prices are integer minor units.
 */
export interface ProductSearchIntent {
  query?: string;
  categories?: ProductCategory[];
  minPriceCents?: number;
  maxPriceCents?: number;
  brands?: string[];
  excludedBrands?: string[];
  colors?: string[];
  sizes?: string[];
  currency?: string;
  /** Max records the caller wants back. */
  limit?: number;
}

/**
 * Deterministic filter criteria applied AFTER retrieval, independent of any
 * provider and of GLM. Superset of ProductSearchIntent's facets plus
 * merchant scoping and the size-confirmation switch.
 */
export interface ProductFilterCriteria {
  categories?: ProductCategory[];
  /** Inclusive bounds on the effective price (sale price when present). */
  minPriceCents?: number;
  maxPriceCents?: number;
  /** Keep only these brands (case-insensitive). A product with unknown brand
   *  cannot be confirmed and is dropped. */
  brands?: string[];
  /** Drop these brands (case-insensitive). Unknown brand is NOT excluded. */
  excludedBrands?: string[];
  /** Same semantics as brands, for merchants. */
  merchants?: string[];
  excludedMerchants?: string[];
  /** Match `color` OR any entry of `availableColors` (case-insensitive). */
  colors?: string[];
  /** Any-of match against `availableSizes` (case-insensitive). See
   *  classifySizeMatch for the confirmed/no-match/unknown distinction. */
  sizes?: string[];
  /** false (default): unknown-size products survive a size filter.
   *  true: only products whose sizes are known AND include a requested size
   *  survive — for callers that must guarantee availability. */
  requireConfirmedSizeAvailability?: boolean;
}

/** Metadata key under which an adapter preserves a source-data contradiction
 *  (sale price above regular price). Its presence is what makes such a
 *  record valid instead of rejected; the value should carry the raw evidence. */
export const SALE_PRICE_ANOMALY = "sale_price_anomaly" as const;
