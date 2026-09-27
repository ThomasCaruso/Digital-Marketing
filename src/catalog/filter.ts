/**
 * FORM Phase 2A — deterministic product filtering.
 *
 * Pure, GLM-independent, provider-independent. Given the same products and
 * criteria it always returns the same result, in the same order, without
 * mutating its inputs. This is the authoritative post-retrieval gate; a
 * provider adapter may pre-filter, but nothing the adapter does can relax
 * these rules.
 *
 * Size semantics (the part that must never be conflated):
 *
 *   availableSizes non-empty  + requested size present -> confirmed-match
 *   availableSizes non-empty  + requested size absent  -> confirmed-no-match
 *   availableSizes empty (unknown)                     -> unknown
 *
 * By default an unknown-size product SURVIVES a size filter (it is unknown,
 * not unavailable). Only `requireConfirmedSizeAvailability: true` drops it —
 * that switch is for callers which must guarantee the size exists.
 */

import type { NormalizedProduct, ProductFilterCriteria } from "./types.js";
import { effectivePriceCents } from "./money.js";

/**
 * How a product's size availability relates to the requested sizes.
 * `unknown` is a first-class outcome: most providers do not expose reliable
 * per-size inventory, and pretending otherwise would fabricate data.
 */
export type SizeMatchStatus = "confirmed-match" | "confirmed-no-match" | "unknown";

/** Any-of match against `availableSizes`, case-insensitive. */
export function classifySizeMatch(
  product: Pick<NormalizedProduct, "availableSizes">,
  requestedSizes: string[],
): SizeMatchStatus {
  // Empty availableSizes means sizes are UNKNOWN — never "no sizes".
  if (product.availableSizes.length === 0) return "unknown";
  const lowerRequested = requestedSizes.map((size) => size.toLowerCase());
  const lowerAvailable = product.availableSizes.map((size) => size.toLowerCase());
  return lowerAvailable.some((size) => lowerRequested.includes(size))
    ? "confirmed-match"
    : "confirmed-no-match";
}

function normalizeList(values: string[] | undefined): string[] {
  return (values ?? []).map((value) => value.toLowerCase());
}

function containsFold(haystack: string[], needle: string): boolean {
  return haystack.includes(needle.toLowerCase());
}

/**
 * Apply criteria to products. Unknown/absent criteria are ignored; empty
 * criteria returns every product unchanged (same order, same references).
 */
export function filterProducts(
  products: NormalizedProduct[],
  criteria: ProductFilterCriteria,
): NormalizedProduct[] {
  const categories = criteria.categories ? new Set(criteria.categories) : undefined;
  const brands = normalizeList(criteria.brands);
  const excludedBrands = normalizeList(criteria.excludedBrands);
  const merchants = normalizeList(criteria.merchants);
  const excludedMerchants = normalizeList(criteria.excludedMerchants);
  const colors = normalizeList(criteria.colors);
  const sizes = criteria.sizes ?? [];

  return products.filter((product) => {
    if (categories && !categories.has(product.category)) return false;

    const price = effectivePriceCents(product);
    if (criteria.minPriceCents !== undefined && price < criteria.minPriceCents) return false;
    if (criteria.maxPriceCents !== undefined && price > criteria.maxPriceCents) return false;

    // Allow-lists require confirmation: an unknown brand/merchant cannot be
    // confirmed to be one of the requested ones. Exclude-lists are the
    // opposite: only a CONFIRMED match excludes (unknown != excluded).
    if (brands.length > 0) {
      if (product.brand === null || !containsFold(brands, product.brand)) return false;
    }
    if (excludedBrands.length > 0 && product.brand !== null && containsFold(excludedBrands, product.brand)) {
      return false;
    }
    if (merchants.length > 0 && !containsFold(merchants, product.merchant)) return false;
    if (excludedMerchants.length > 0 && containsFold(excludedMerchants, product.merchant)) return false;

    if (colors.length > 0) {
      const colorHit =
        (product.color !== null && containsFold(colors, product.color)) ||
        product.availableColors.some((color) => containsFold(colors, color));
      if (!colorHit) return false;
    }

    if (sizes.length > 0) {
      const status = classifySizeMatch(product, sizes);
      if (status === "confirmed-no-match") return false;
      if (status === "unknown" && criteria.requireConfirmedSizeAvailability === true) return false;
    }

    return true;
  });
}
