/**
 * FORM Phase 2A — integer money helpers.
 *
 * All FORM money is integer minor units (US cents). These helpers exist so
 * derived values (effective price, outfit totals) are computed exactly, and
 * so a non-integer can never sneak into a calculation.
 */

/**
 * The price a shopper pays: the sale price when present, otherwise the
 * regular price. Returns an integer.
 */
export function effectivePriceCents(product: { priceCents: number; salePriceCents: number | null }): number {
  return product.salePriceCents ?? product.priceCents;
}

/** Sum integer minor-unit prices exactly. */
export function sumPriceCents(pricesCents: number[]): number {
  let total = 0;
  for (const cents of pricesCents) {
    total += assertIntegerCents(cents);
  }
  return total;
}

/** Effective prices for a set of products, summed exactly. */
export function sumEffectivePricesCents(
  products: { priceCents: number; salePriceCents: number | null }[],
): number {
  return sumPriceCents(products.map(effectivePriceCents));
}

/** Reject anything that is not a non-negative safe integer (minor units). */
export function assertIntegerCents(cents: number): number {
  if (!Number.isSafeInteger(cents) || cents < 0) {
    throw new Error(`money must be a non-negative integer of minor units, got ${cents}`);
  }
  return cents;
}
