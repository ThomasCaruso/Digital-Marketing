/**
 * FORM Phase 2B — deterministic Rakuten → FORM category mapping.
 *
 * The mapping table is fixed by the Phase 2B spec; anything ambiguous maps
 * to `other`. Provider-native strings are preserved verbatim in
 * `metadata.providerCategory` by normalize.ts — this mapper only assigns the
 * canonical FORM category, and it is a pure function: same input, same
 * output, always.
 *
 * Matching is word-boundary based (so "laptop" never matches "top") over the
 * category tokens after splitting on the separators merchants use (`~~`, the
 * documented form, plus `>>`, `>`, `|`). Rules run in PRECEDENCE order and
 * the first hit wins, which resolves overlaps deterministically — e.g.
 * "dress shirt" is a shirt (tops), not a dress (one_piece). Known accepted
 * limitation: a compound like "top handle bag" precedence-maps to tops;
 * the source strings stay in metadata either way.
 */

import type { ProductCategory } from "../../types.js";

interface CategoryRule {
  pattern: RegExp;
  category: ProductCategory;
}

/** In precedence order: tops first (the spec lists them first), so garment
 *  words that include a dress/other token still classify as tops. */
const RULES: readonly CategoryRule[] = [
  {
    // shirts / sweaters / tops (+ standard top synonyms)
    pattern: /\b(shirts?|sweaters?|tops?|blouses?|tees?|t-?shirts?|tank tops?|pullovers?|cardigans?|hoodies?)\b/,
    category: "tops",
  },
  {
    // pants / trousers / jeans / shorts
    pattern: /\b(pants?|trousers?|jeans|shorts?|chinos?)\b/,
    category: "bottoms",
  },
  {
    // jackets / coats (+ blazer, parka)
    pattern: /\b(jackets?|coats?|blazers?|parkas?|overcoats?|trench coats?)\b/,
    category: "outerwear",
  },
  {
    // dress / jumpsuit
    pattern: /\b(dresses?|jumpsuits?|rompers?)\b/,
    category: "one_piece",
  },
  {
    // shoe / sneaker / boot / loafer (+ standard footwear)
    pattern: /\b(shoes?|sneakers?|boots?|loafers?|heels?|sandals?|oxfords?|flats|slip-?ons?)\b/,
    category: "shoes",
  },
  {
    // belt / bag / hat / jewelry / scarf (+ common accessories)
    pattern: /\b(belts?|bags?|handbags?|purses?|backpacks?|wallets?|hats?|caps?|beanies?|jewelry|jewellery|necklaces?|bracelets?|earrings?|rings?|watches|scarves|scarfs?|sunglasses?|gloves?|ties?)\b/,
    category: "accessories",
  },
];

/** Split a provider category string into lowercase tokens ("Dresses~~Dress"
 *  → ["dresses", "dress"]). */
function tokenize(raw: string): string[] {
  return raw
    .split(/~~|>>|>|\|/)
    .map((token) => token.trim().toLowerCase())
    .filter((token) => token !== "");
}

/**
 * Map one item's provider category strings to the canonical FORM category.
 * Checks the primary string, then the secondary; within a string, rules run
 * in precedence order. Ambiguous input maps to `other`.
 */
export function mapRakutenCategory(primary: string | null, secondary: string | null): ProductCategory {
  const primaryTokens = primary === null ? [] : tokenize(primary);
  const secondaryTokens = secondary === null ? [] : tokenize(secondary);

  for (const rule of RULES) {
    if (primaryTokens.some((token) => rule.pattern.test(token))) return rule.category;
    if (secondaryTokens.some((token) => rule.pattern.test(token))) return rule.category;
  }
  // Fall back to scanning the raw strings (merchants occasionally put the
  // product type in a free-form spot the separators do not split).
  for (const rule of RULES) {
    if (primary !== null && rule.pattern.test(primary.toLowerCase())) return rule.category;
    if (secondary !== null && rule.pattern.test(secondary.toLowerCase())) return rule.category;
  }
  return "other";
}
