/**
 * FORM Phase 2A — FixtureProductProvider.
 *
 * EVERY RECORD IN THIS FILE IS A TEST FIXTURE. These are not real products,
 * not real merchants, and not live commerce. They exist to:
 *
 *   - validate the NormalizedProduct contract deterministically;
 *   - exercise filtering and ingestion before live credentials exist;
 *   - serve as the development provider until a real adapter lands.
 *
 * Rules upheld here (and asserted in scripts/verify-catalog.ts):
 *   - all URLs use RFC 2606 RESERVED domains (`shops.example`, `img.example`)
 *     so fixture data can never resolve to, or be mistaken for, real commerce;
 *   - merchant names are fictional ("Example Outfitters", "Demo Apparel Co.", ...);
 *   - metadata carries `source: "fixture"` so downstream code can always tell;
 *   - records are deterministic: fixed ids, fixed timestamps, no randomness —
 *     two searches with the same intent return byte-identical results.
 *
 * A future live provider adapter (e.g. providers/rakuten.ts) must produce the
 * same NormalizedProduct shape from real provider responses.
 */

import type { ProductProvider } from "../provider.js";
import {
  type NormalizedProduct,
  type ProductCategory,
  type ProductSearchIntent,
} from "../types.js";

/** Deterministic UUIDv4-shaped id: 00000000-0000-4000-8000-<n padded to 12>. */
function fixtureId(n: number): string {
  return `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
}

const FIXTURE_SYNCED_AT = "2026-09-20T12:00:00.000Z";
const FIXTURE_METADATA = {
  source: "fixture",
  note: "TEST FIXTURE — synthetic record, not a real product or merchant",
} as const;

interface FixtureInput {
  n: number;
  providerProductId: string;
  merchant: string;
  brand: string | null;
  name: string;
  description: string | null;
  category: ProductCategory;
  subcategory: string | null;
  priceCents: number;
  salePriceCents: number | null;
  color: string | null;
  availableColors: string[];
  availableSizes: string[];
  availabilityConfidence: NormalizedProduct["availabilityConfidence"];
  affiliateUrl: string | null;
  providerCategory: string;
}

function toProduct(input: FixtureInput): NormalizedProduct {
  const slug = input.providerProductId.toLowerCase();
  return {
    id: fixtureId(input.n),
    provider: "fixture",
    providerProductId: input.providerProductId,
    merchant: input.merchant,
    brand: input.brand,
    name: input.name,
    description: input.description,
    category: input.category,
    subcategory: input.subcategory,
    priceCents: input.priceCents,
    salePriceCents: input.salePriceCents,
    currency: "USD",
    imageUrls: [`https://img.example/fixture/${slug}-1.jpg`, `https://img.example/fixture/${slug}-2.jpg`],
    productUrl: `https://shops.example/${input.merchant.toLowerCase().replace(/[^a-z0-9]+/g, "-")}/${slug}`,
    affiliateUrl: input.affiliateUrl,
    color: input.color,
    availableColors: input.availableColors,
    availableSizes: input.availableSizes,
    availabilityConfidence: input.availabilityConfidence,
    metadata: { ...FIXTURE_METADATA, providerCategory: input.providerCategory },
    lastSyncedAt: FIXTURE_SYNCED_AT,
  };
}

const FIXTURE_INPUTS: FixtureInput[] = [
  // ------------------------------------------------------------------- tops
  {
    n: 1, providerProductId: "FIX-TOP-001", merchant: "Example Outfitters", brand: "Northloom",
    name: "Merino Crew Sweater",
    description: "Mid-gauge merino crewneck with set-in sleeves and ribbed trims.",
    category: "tops", subcategory: "sweaters", priceCents: 12800, salePriceCents: null,
    color: "navy", availableColors: ["navy", "charcoal", "oat"], availableSizes: ["S", "M", "L", "XL"],
    availabilityConfidence: "confirmed", affiliateUrl: null, providerCategory: "knitwear",
  },
  {
    n: 2, providerProductId: "FIX-TOP-002", merchant: "Demo Apparel Co.", brand: "Cinder & Co",
    name: "Washed Oxford Shirt",
    description: "Soft-washed cotton oxford with a button-down collar.",
    category: "tops", subcategory: "shirts", priceCents: 8900, salePriceCents: 5900,
    color: "white", availableColors: ["white", "blue"], availableSizes: ["S", "M", "L", "XL", "XXL"],
    availabilityConfidence: "confirmed", affiliateUrl: "https://shops.example/aff/fix-top-002",
    providerCategory: "shirts-casual",
  },
  {
    n: 3, providerProductId: "FIX-TOP-003", merchant: "Example Outfitters", brand: "Kestrel",
    name: "Heavyweight Pocket Tee",
    description: "240gsm combed-cotton tee with a single chest pocket.",
    category: "tops", subcategory: "tees", priceCents: 3200, salePriceCents: null,
    // Sizes not exposed by the fixture feed: they stay UNKNOWN (empty array),
    // never invented. Same for the primary colorway.
    color: null, availableColors: ["black", "white", "olive"], availableSizes: [],
    availabilityConfidence: "unknown", affiliateUrl: null, providerCategory: "tees",
  },
  {
    n: 4, providerProductId: "FIX-TOP-004", merchant: "Fixture Clothiers", brand: "Atlas Standard",
    name: "Poplin Spread-Collar Shirt", description: null,
    category: "tops", subcategory: "shirts", priceCents: 7500, salePriceCents: null,
    color: "cream", availableColors: ["cream", "sky"], availableSizes: ["S", "M", "L", "XL"],
    availabilityConfidence: "partial", affiliateUrl: null, providerCategory: "shirts-dress",
  },
  {
    n: 5, providerProductId: "FIX-TOP-005", merchant: "Demo Apparel Co.", brand: "Marlowe",
    name: "Silk Charmeuse Blouse",
    description: "Fluid silk blouse with a covered placket and blouson sleeve.",
    category: "tops", subcategory: "blouses", priceCents: 16800, salePriceCents: 14200,
    color: "ivory", availableColors: ["ivory", "black"], availableSizes: ["XS", "S", "M", "L"],
    availabilityConfidence: "confirmed", affiliateUrl: null, providerCategory: "blouses",
  },
  {
    n: 6, providerProductId: "FIX-TOP-006", merchant: "Example Outfitters", brand: "Field Theory",
    name: "Utility Overshirt",
    description: "Cotton twill overshirt with double chest pockets.",
    category: "tops", subcategory: "shirts", priceCents: 9800, salePriceCents: null,
    color: "olive", availableColors: ["olive", "charcoal"], availableSizes: ["M", "L", "XL", "XXL"],
    availabilityConfidence: "confirmed", affiliateUrl: null, providerCategory: "shirts-casual",
  },

  // ---------------------------------------------------------------- bottoms
  {
    n: 7, providerProductId: "FIX-BOT-001", merchant: "Fixture Clothiers", brand: "Atlas Standard",
    name: "Slim Selvedge Jean",
    description: "13.5oz Japanese selvedge denim, slim straight leg.",
    category: "bottoms", subcategory: "jeans", priceCents: 14800, salePriceCents: null,
    color: "indigo", availableColors: ["indigo"], availableSizes: ["28", "30", "32", "34", "36"],
    availabilityConfidence: "confirmed", affiliateUrl: null, providerCategory: "denim",
  },
  {
    n: 8, providerProductId: "FIX-BOT-002", merchant: "Example Outfitters", brand: "Driftline",
    name: "Relaxed Chino",
    description: "Garment-dyed cotton chino with a relaxed straight leg.",
    category: "bottoms", subcategory: "chinos", priceCents: 8400, salePriceCents: 6200,
    color: "tan", availableColors: ["tan", "olive", "navy"], availableSizes: ["30", "32", "34", "36", "38"],
    availabilityConfidence: "confirmed", affiliateUrl: "https://shops.example/aff/fix-bot-002",
    providerCategory: "chinos",
  },
  {
    n: 9, providerProductId: "FIX-BOT-003", merchant: "Demo Apparel Co.", brand: "Halstead",
    name: "Pleated Wool Trouser", description: null,
    category: "bottoms", subcategory: "trousers", priceCents: 11500, salePriceCents: null,
    color: "charcoal", availableColors: ["charcoal", "grey"], availableSizes: [],
    availabilityConfidence: "unknown", affiliateUrl: null, providerCategory: "trousers",
  },
  {
    n: 10, providerProductId: "FIX-BOT-004", merchant: "Demo Apparel Co.", brand: "Cinder & Co",
    name: "Ponte Knit Legging",
    description: "Structured ponte legging with a hidden elastic waist.",
    category: "bottoms", subcategory: "leggings", priceCents: 5800, salePriceCents: null,
    color: "black", availableColors: ["black"], availableSizes: ["XS", "S", "M", "L", "XL"],
    availabilityConfidence: "partial", affiliateUrl: null, providerCategory: "leggings",
  },
  {
    n: 11, providerProductId: "FIX-BOT-005", merchant: "Example Outfitters", brand: "Kestrel",
    name: "Canvas Five-Pocket Pant",
    description: "Rugged cotton canvas five-pocket pant.",
    category: "bottoms", subcategory: "pants", priceCents: 9200, salePriceCents: null,
    color: "olive", availableColors: ["olive", "sand"], availableSizes: ["29", "30", "32", "34", "36"],
    availabilityConfidence: "confirmed", affiliateUrl: null, providerCategory: "pants-casual",
  },

  // -------------------------------------------------------------- outerwear
  {
    n: 12, providerProductId: "FIX-OUT-001", merchant: "Example Outfitters", brand: "Northloom",
    name: "Wool-Cashmere Topcoat",
    description: "Double-faced wool-cashmere topcoat with a notch lapel.",
    category: "outerwear", subcategory: "coats", priceCents: 42800, salePriceCents: null,
    color: "charcoal", availableColors: ["charcoal", "camel"], availableSizes: ["36", "38", "40", "42", "44"],
    availabilityConfidence: "confirmed", affiliateUrl: "https://shops.example/aff/fix-out-001",
    providerCategory: "coats",
  },
  {
    n: 13, providerProductId: "FIX-OUT-002", merchant: "Fixture Clothiers", brand: "Field Theory",
    name: "Quilted Liner Jacket",
    description: "Lightweight diamond-quilted liner with ripstop shell.",
    category: "outerwear", subcategory: "jackets", priceCents: 16800, salePriceCents: 11900,
    color: "black", availableColors: ["black", "olive"], availableSizes: ["S", "M", "L", "XL", "XXL"],
    availabilityConfidence: "confirmed", affiliateUrl: null, providerCategory: "jackets",
  },
  {
    n: 14, providerProductId: "FIX-OUT-003", merchant: "Example Outfitters", brand: "Driftline",
    name: "Sealed-Seam Rain Shell", description: null,
    category: "outerwear", subcategory: "jackets", priceCents: 13500, salePriceCents: null,
    color: "navy", availableColors: ["navy", "black"], availableSizes: [],
    availabilityConfidence: "partial", affiliateUrl: null, providerCategory: "outerwear-technical",
  },
  {
    n: 15, providerProductId: "FIX-OUT-004", merchant: "Demo Apparel Co.", brand: null,
    name: "Goatsuede Bomber Jacket",
    description: "Unlined goatsuede bomber with ribbed cuffs and hem.",
    category: "outerwear", subcategory: "jackets", priceCents: 36800, salePriceCents: null,
    color: "brown", availableColors: ["brown"], availableSizes: ["M", "L", "XL", "XXL"],
    availabilityConfidence: "confirmed", affiliateUrl: null, providerCategory: "jackets",
  },

  // ------------------------------------------------------------------ shoes
  {
    n: 16, providerProductId: "FIX-SHO-001", merchant: "Fixture Clothiers", brand: "Bruno Aldo",
    name: "Leather Derby Shoe",
    description: "Burnished calf leather derby with a leather sole.",
    category: "shoes", subcategory: "dress_shoes", priceCents: 22500, salePriceCents: null,
    color: "dark brown", availableColors: ["dark brown", "black"], availableSizes: ["8", "9", "10", "11", "12", "13"],
    availabilityConfidence: "confirmed", affiliateUrl: "https://shops.example/aff/fix-sho-001",
    providerCategory: "dress-shoes",
  },
  {
    n: 17, providerProductId: "FIX-SHO-002", merchant: "Example Outfitters", brand: "Kestrel",
    name: "Court Leather Sneaker",
    description: "Low-profile leather court sneaker with a gum sole.",
    category: "shoes", subcategory: "sneakers", priceCents: 9800, salePriceCents: 7400,
    color: "white", availableColors: ["white", "grey"], availableSizes: ["7", "8", "9", "10", "11", "12", "13"],
    availabilityConfidence: "confirmed", affiliateUrl: null, providerCategory: "sneakers",
  },
  {
    n: 18, providerProductId: "FIX-SHO-003", merchant: "Demo Apparel Co.", brand: "Ottavia",
    name: "Slingback Flat",
    description: "Nappa leather slingback with an elasticized heel strap.",
    category: "shoes", subcategory: "flats", priceCents: 14200, salePriceCents: null,
    color: "black", availableColors: ["black", "cream"], availableSizes: ["5", "6", "7", "8", "9", "10", "11"],
    availabilityConfidence: "partial", affiliateUrl: null, providerCategory: "flats",
  },
  {
    n: 19, providerProductId: "FIX-SHO-004", merchant: "Example Outfitters", brand: "Driftline",
    name: "Trail Runner", description: null,
    category: "shoes", subcategory: "sneakers", priceCents: 11800, salePriceCents: null,
    color: "grey", availableColors: ["grey", "indigo"], availableSizes: [],
    availabilityConfidence: "unknown", affiliateUrl: null, providerCategory: "sneakers",
  },
  {
    n: 20, providerProductId: "FIX-SHO-005", merchant: "Fixture Clothiers", brand: "Halstead",
    name: "Chelsea Boot",
    description: "Polished leather Chelsea boot with elastic gores.",
    category: "shoes", subcategory: "boots", priceCents: 19500, salePriceCents: null,
    color: "brown", availableColors: ["brown", "black"], availableSizes: ["8", "9", "10", "11", "12"],
    availabilityConfidence: "confirmed", affiliateUrl: null, providerCategory: "boots",
  },

  // ------------------------------------------------------------ accessories
  {
    n: 21, providerProductId: "FIX-ACC-001", merchant: "Example Outfitters", brand: "Northloom",
    name: "Lambswool Scarf",
    description: "Brushed lambswool scarf with fringed ends.",
    category: "accessories", subcategory: "scarves", priceCents: 4800, salePriceCents: null,
    color: "oat", availableColors: ["oat", "charcoal"], availableSizes: ["One Size"],
    availabilityConfidence: "confirmed", affiliateUrl: null, providerCategory: "scarves",
  },
  {
    n: 22, providerProductId: "FIX-ACC-002", merchant: "Demo Apparel Co.", brand: "Marlowe",
    name: "Bridle Leather Belt",
    description: "English bridle leather belt with a solid brass buckle.",
    category: "accessories", subcategory: "belts", priceCents: 6800, salePriceCents: null,
    color: "tan", availableColors: ["tan", "black"], availableSizes: ["30", "32", "34", "36", "38"],
    availabilityConfidence: "confirmed", affiliateUrl: "https://shops.example/aff/fix-acc-002",
    providerCategory: "belts",
  },
  {
    n: 23, providerProductId: "FIX-ACC-003", merchant: "Fixture Clothiers", brand: "Field Theory",
    name: "Merino Ribbed Beanie", description: null,
    category: "accessories", subcategory: "hats", priceCents: 3200, salePriceCents: null,
    color: null, availableColors: ["navy", "black", "oat"], availableSizes: [],
    availabilityConfidence: "unknown", affiliateUrl: null, providerCategory: "hats",
  },
  {
    n: 24, providerProductId: "FIX-ACC-004", merchant: "Demo Apparel Co.", brand: "Ottavia",
    name: "Silk Pocket Square",
    description: "Hand-rolled silk pocket square.",
    category: "accessories", subcategory: "pocket_squares", priceCents: 4500, salePriceCents: 2900,
    color: "burgundy", availableColors: ["burgundy", "navy"], availableSizes: ["One Size"],
    availabilityConfidence: "confirmed", affiliateUrl: null, providerCategory: "pocket-squares",
  },
];

/** In-feed order; stable across processes. Exported for contract tests. */
export const FIXTURE_PRODUCTS: NormalizedProduct[] = FIXTURE_INPUTS.map(toProduct);

function matchesIntent(product: NormalizedProduct, intent: ProductSearchIntent): boolean {
  if (intent.query !== undefined) {
    const q = intent.query.toLowerCase();
    const haystack = [product.name, product.description, product.brand ?? ""].join(" ").toLowerCase();
    if (!haystack.includes(q)) return false;
  }
  if (intent.categories && !intent.categories.includes(product.category)) return false;
  if (intent.minPriceCents !== undefined && product.priceCents < intent.minPriceCents) return false;
  if (intent.maxPriceCents !== undefined && product.priceCents > intent.maxPriceCents) return false;
  if (intent.brands && (product.brand === null || !intent.brands.some((b) => b.toLowerCase() === product.brand?.toLowerCase()))) return false;
  if (intent.excludedBrands && product.brand !== null && intent.excludedBrands.some((b) => b.toLowerCase() === product.brand?.toLowerCase())) return false;
  if (intent.colors) {
    const colors = intent.colors.map((c) => c.toLowerCase());
    const colorHit =
      (product.color !== null && colors.includes(product.color.toLowerCase())) ||
      product.availableColors.some((c) => colors.includes(c.toLowerCase()));
    if (!colorHit) return false;
  }
  if (intent.currency !== undefined && product.currency !== intent.currency) return false;
  return true;
}

/**
 * Deterministic in-memory provider. The pre-filter here is a convenience;
 * the authoritative filtering is filter.ts, applied downstream.
 */
export class FixtureProductProvider implements ProductProvider {
  readonly id = "fixture" as const;

  async search(intent: ProductSearchIntent = {}): Promise<NormalizedProduct[]> {
    const found = FIXTURE_PRODUCTS.filter((product) => matchesIntent(product, intent));
    return intent.limit !== undefined ? found.slice(0, intent.limit) : found;
  }

  async getById(providerProductId: string): Promise<NormalizedProduct | null> {
    return FIXTURE_PRODUCTS.find((product) => product.providerProductId === providerProductId) ?? null;
  }
}
