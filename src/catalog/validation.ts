/**
 * FORM Phase 2A — validation gate between adapters and the application.
 *
 * Every NormalizedProduct an adapter produces must pass
 * `validateNormalizedProduct` before ingestion or filtering. Validation is
 * PURE: it never mutates, never invents, never "fixes" data — optional
 * fields that are missing stay missing, and provider metadata survives
 * untouched. Malformed records are rejected with precise issues so the
 * ingestion layer can skip and report them deterministically.
 */

import {
  AVAILABILITY_CONFIDENCES,
  PRODUCT_CATEGORIES,
  SALE_PRICE_ANOMALY,
  type NormalizedProduct,
} from "./types.js";

export type ProductValidationCode =
  | "invalid_id"
  | "invalid_provider"
  | "invalid_provider_product_id"
  | "invalid_merchant"
  | "invalid_name"
  | "invalid_category"
  | "invalid_price"
  | "invalid_sale_price"
  | "sale_price_exceeds_regular"
  | "invalid_currency"
  | "invalid_product_url"
  | "invalid_affiliate_url"
  | "invalid_image_urls"
  | "invalid_color"
  | "invalid_available_colors"
  | "invalid_available_sizes"
  | "invalid_availability_confidence"
  | "invalid_metadata"
  | "invalid_last_synced_at";

export interface ProductValidationIssue {
  field: string;
  code: ProductValidationCode;
  message: string;
}

export type ProductValidationResult =
  | { ok: true; product: NormalizedProduct }
  | { ok: false; issues: ProductValidationIssue[] };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CURRENCY_RE = /^[A-Z]{3}$/;
const NON_EMPTY_RE = /^\S+$/;

function issue(field: string, code: ProductValidationCode, message: string): ProductValidationIssue {
  return { field, code, message };
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === "string");
}

/**
 * Validate one normalized product. Returns the SAME record (same reference)
 * on success — normalization upstream owns shaping; this only gates it.
 */
export function validateNormalizedProduct(product: NormalizedProduct): ProductValidationResult {
  const issues: ProductValidationIssue[] = [];

  if (typeof product.id !== "string" || !UUID_RE.test(product.id)) {
    issues.push(issue("id", "invalid_id", "must be a UUID string"));
  }
  if (typeof product.provider !== "string" || !NON_EMPTY_RE.test(product.provider)) {
    issues.push(issue("provider", "invalid_provider", "must be a non-empty identifier"));
  }
  if (
    typeof product.providerProductId !== "string" ||
    !NON_EMPTY_RE.test(product.providerProductId)
  ) {
    issues.push(
      issue("providerProductId", "invalid_provider_product_id", "must be a non-empty stable id"),
    );
  }
  if (typeof product.merchant !== "string" || product.merchant.trim() === "") {
    issues.push(issue("merchant", "invalid_merchant", "must be a non-empty name"));
  }
  if (typeof product.name !== "string" || product.name.trim() === "") {
    issues.push(issue("name", "invalid_name", "must be a non-empty name"));
  }
  if (!(PRODUCT_CATEGORIES as readonly string[]).includes(product.category)) {
    issues.push(
      issue("category", "invalid_category", `must be one of ${PRODUCT_CATEGORIES.join(", ")}`),
    );
  }

  if (!Number.isSafeInteger(product.priceCents) || product.priceCents < 0) {
    issues.push(
      issue("priceCents", "invalid_price", "must be a non-negative integer of minor units"),
    );
  }
  if (product.salePriceCents !== null) {
    if (!Number.isSafeInteger(product.salePriceCents) || product.salePriceCents < 0) {
      issues.push(
        issue("salePriceCents", "invalid_sale_price", "must be null or a non-negative integer"),
      );
    } else if (product.salePriceCents > product.priceCents) {
      // Deterministic policy (TD-013): a sale price above the regular price is
      // contradictory source data. It is rejected UNLESS the adapter
      // explicitly preserved the anomaly under metadata[SALE_PRICE_ANOMALY],
      // keeping the typed price fields free of contradictions.
      const anomaly = product.metadata?.[SALE_PRICE_ANOMALY];
      if (!anomaly || typeof anomaly !== "object") {
        issues.push(
          issue(
            "salePriceCents",
            "sale_price_exceeds_regular",
            "sale price must not exceed regular price; preserve the raw source data under " +
              `metadata.${SALE_PRICE_ANOMALY} to keep the record explicitly anomalous`,
          ),
        );
      }
    }
  }

  if (typeof product.currency !== "string" || !CURRENCY_RE.test(product.currency)) {
    issues.push(issue("currency", "invalid_currency", "must be an uppercase ISO 4217 code"));
  }

  if (!isHttpUrl(product.productUrl)) {
    issues.push(issue("productUrl", "invalid_product_url", "must be a valid http(s) URL"));
  }
  if (product.affiliateUrl !== null && !isHttpUrl(product.affiliateUrl)) {
    issues.push(issue("affiliateUrl", "invalid_affiliate_url", "must be null or a valid http(s) URL"));
  }
  if (!isStringArray(product.imageUrls) || product.imageUrls.some((url) => !isHttpUrl(url))) {
    issues.push(
      issue("imageUrls", "invalid_image_urls", "must be an array of valid http(s) URLs"),
    );
  }

  if (product.color !== null && (typeof product.color !== "string" || product.color.trim() === "")) {
    issues.push(issue("color", "invalid_color", "must be null or a non-empty colorway"));
  }
  if (!isStringArray(product.availableColors) || product.availableColors.some((c) => c.trim() === "")) {
    issues.push(
      issue("availableColors", "invalid_available_colors", "must be an array of non-empty strings"),
    );
  }
  // An empty array is VALID and means "sizes unknown" — it must never be read
  // as "no sizes available" (see filter.ts).
  if (!isStringArray(product.availableSizes) || product.availableSizes.some((s) => s.trim() === "")) {
    issues.push(
      issue("availableSizes", "invalid_available_sizes", "must be an array of non-empty strings"),
    );
  }

  if (!(AVAILABILITY_CONFIDENCES as readonly string[]).includes(product.availabilityConfidence)) {
    issues.push(
      issue(
        "availabilityConfidence",
        "invalid_availability_confidence",
        `must be one of ${AVAILABILITY_CONFIDENCES.join(", ")}`,
      ),
    );
  }
  if (
    typeof product.metadata !== "object" ||
    product.metadata === null ||
    Array.isArray(product.metadata)
  ) {
    issues.push(issue("metadata", "invalid_metadata", "must be a plain object"));
  }
  if (typeof product.lastSyncedAt !== "string" || Number.isNaN(Date.parse(product.lastSyncedAt))) {
    issues.push(issue("lastSyncedAt", "invalid_last_synced_at", "must be a parseable ISO instant"));
  }

  if (issues.length > 0) return { ok: false, issues };
  return { ok: true, product };
}

export interface DedupeResult {
  /** Deduplicated records, in feed order, LAST occurrence per id. */
  products: NormalizedProduct[];
  /** Number of superseded duplicates. */
  duplicatesDropped: number;
}

/**
 * Deterministic duplicate handling: when a provider returns the same
 * (provider, providerProductId) twice in one batch, the LAST occurrence
 * wins (a later record in feed order supersedes an earlier one — the same
 * rule the upsert applies across syncs). Same input always yields the same
 * output.
 */
export function dedupeProducts(products: NormalizedProduct[]): DedupeResult {
  const lastIndex = new Map<string, number>();
  for (let i = 0; i < products.length; i++) {
    const product = products[i];
    if (!product) continue;
    lastIndex.set(`${product.provider}:${product.providerProductId}`, i);
  }
  const kept: NormalizedProduct[] = [];
  for (let i = 0; i < products.length; i++) {
    const product = products[i];
    if (!product) continue;
    if (lastIndex.get(`${product.provider}:${product.providerProductId}`) === i) {
      kept.push(product);
    }
  }
  return { products: kept, duplicatesDropped: products.length - kept.length };
}
