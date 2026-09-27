/**
 * FORM Phase 2B — Rakuten raw item → NormalizedProduct.
 *
 * Normalization rules (Phase 2B spec):
 *
 *   - Documented response fields ONLY. No color, size, brand, or stock data
 *     exists in the documented Product Search response, so `color` stays
 *     null, `availableColors`/`availableSizes` stay [], availability stays
 *     "unknown", and `brand` stays null — never derived from titles or
 *     descriptions.
 *   - Product identity is merchant-scoped: MID + SKU when the feed supplies
 *     a SKU, falling back to MID + linkid when it does not (both documented,
 *     stable-per-merchant fields). SKUs are NOT globally unique across
 *     merchants.
 *   - Money: decimal string → integer minor units by string arithmetic —
 *     never `parseFloat`. More than two minor digits, separators, or
 *     negatives are malformed → the item is skipped upstream, not guessed.
 *   - productUrl is the documented `linkurl` (an affiliate-tracked link the
 *     provider already returns). It is kept semantically separate from
 *     `affiliateUrl`, which only ever comes from the Deep Links API.
 *   - Provider values survive in `metadata`; the canonical fields carry only
 *     contract data.
 */

import { createHash } from "node:crypto";
import { SALE_PRICE_ANOMALY, type NormalizedProduct } from "../../types.js";
import { mapRakutenCategory } from "./categories.js";
import type { RakutenRawItem } from "./xml.js";

/**
 * Namespace for deterministic FORM ids minted from provider identity
 * (RFC 4122 v5). A fixed literal so the same provider item always maps to
 * the same UUID.
 */
const FORM_PROVIDER_ID_NAMESPACE = "6ba7b810-9dad-11d1-80b4-00c04fd430c8"; // URL namespace (RFC 4122 §C)

function uuidV5(name: string, namespace: string): string {
  const nsBytes = namespace.replace(/-/g, "").match(/../g)?.map((byte) => parseInt(byte, 16)) ?? [];
  if (nsBytes.length !== 16) throw new Error("invalid uuid namespace");
  const hash = createHash("sha1")
    .update(Uint8Array.from(nsBytes))
    .update(name, "utf8")
    .digest();
  const bytes = Uint8Array.from(hash.subarray(0, 16));
  bytes[6] = (bytes[6]! & 0x0f) | 0x50; // version 5
  bytes[8] = (bytes[8]! & 0x3f) | 0x80; // RFC 4122 variant
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/**
 * Exact decimal string → integer minor units. Accepts only `d+(.d{1,2})?`;
 * anything else (commas, three decimals, negatives, empty) is malformed and
 * returns null. No float parsing anywhere.
 */
export function decimalStringToMinorUnits(amount: string): number | null {
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(amount);
  if (match === null) return null;
  const whole = Number(match[1]);
  const fraction = match[2] === undefined ? "0" : match[2].padEnd(2, "0");
  const cents = whole * 100 + Number(fraction);
  return Number.isSafeInteger(cents) ? cents : null;
}

export interface RakutenSkip {
  reason: string;
  detail: string;
}

/**
 * Normalize one raw item. Returns the product, or a deterministic skip
 * reason when the item lacks data the contract requires (name, merchant,
 * identity, valid price/link). Skips are per-item data problems; they are
 * counted by the caller and never become provider errors.
 */
export function normalizeRakutenItem(
  item: RakutenRawItem,
  lastSyncedAt: string,
): { ok: true; product: NormalizedProduct } | { ok: false; skip: RakutenSkip } {
  if (item.mid === null) return { ok: false, skip: { reason: "missing_mid", detail: "no <mid> in item" } };
  if (item.productName === null) {
    return { ok: false, skip: { reason: "missing_productname", detail: "no <productname> in item" } };
  }
  if (item.merchantName === null) {
    return { ok: false, skip: { reason: "missing_merchantname", detail: "no <merchantname> in item" } };
  }
  if (item.linkUrl === null) {
    return { ok: false, skip: { reason: "missing_linkurl", detail: "no <linkurl> in item" } };
  }
  if (item.price === null) {
    return { ok: false, skip: { reason: "missing_price", detail: "no <price> in item" } };
  }

  const priceCents = decimalStringToMinorUnits(item.price.amount);
  if (priceCents === null) {
    return {
      ok: false,
      skip: { reason: "malformed_price", detail: `unparseable price "${item.price.amount}"` },
    };
  }

  // The product currency comes from the regular price. A sale price in a
  // DIFFERENT currency is contradictory feed data — skip, don't guess.
  let salePriceCents: number | null = null;
  if (item.salePrice !== null) {
    if (item.salePrice.currency !== null && item.salePrice.currency !== item.price.currency) {
      return {
        ok: false,
        skip: {
          reason: "mixed_currency",
          detail: `price ${item.price.currency ?? "?"} vs saleprice ${item.salePrice.currency}`,
        },
      };
    }
    const parsed = decimalStringToMinorUnits(item.salePrice.amount);
    if (parsed === null) {
      return {
        ok: false,
        skip: { reason: "malformed_sale_price", detail: `unparseable saleprice "${item.salePrice.amount}"` },
      };
    }
    salePriceCents = parsed;
  }

  // Merchant-scoped identity: SKUs repeat ACROSS merchants, so MID+SKU is
  // the identity; MID+linkid covers SKU-less feeds.
  const identity =
    item.sku !== null
      ? `${item.mid}:${item.sku}`
      : item.linkId !== null
        ? `${item.mid}:link-${item.linkId}`
        : null;
  if (identity === null) {
    return { ok: false, skip: { reason: "no_identity", detail: "item has neither <sku> nor <linkid>" } };
  }

  const currency = item.price.currency;
  if (currency === null || !/^[A-Z]{3}$/.test(currency)) {
    return {
      ok: false,
      skip: { reason: "invalid_currency", detail: `price currency "${currency ?? ""}" is not an ISO 4217 code` },
    };
  }

  // A sale price ABOVE the regular price is preserved as an explicit anomaly
  // (TD-013 policy) instead of being silently normalized or dropped.
  const sale = item.salePrice;
  const saleAnomaly =
    sale !== null && salePriceCents !== null && salePriceCents > priceCents
      ? {
          rawPrice: item.price.amount,
          rawSalePrice: sale.amount,
          currency,
        }
      : undefined;

  const metadata: Record<string, unknown> = {
    source: "rakuten",
    mid: item.mid,
    linkId: item.linkId,
    sku: item.sku,
    upcCode: item.upcCode,
    createdOn: item.createdOn,
    keywords: item.keywords,
    providerCategory: { primary: item.categoryPrimary, secondary: item.categorySecondary },
  };
  if (saleAnomaly !== undefined) metadata[SALE_PRICE_ANOMALY] = saleAnomaly;

  const product: NormalizedProduct = {
    id: uuidV5(`rakuten:${identity}`, FORM_PROVIDER_ID_NAMESPACE),
    provider: "rakuten",
    providerProductId: identity,
    merchant: item.merchantName,
    brand: null,
    name: item.productName,
    description: item.descriptionLong ?? item.descriptionShort ?? null,
    category: mapRakutenCategory(item.categoryPrimary, item.categorySecondary),
    subcategory: null,
    priceCents,
    salePriceCents,
    currency,
    imageUrls: item.imageUrl === null ? [] : [item.imageUrl],
    productUrl: item.linkUrl,
    affiliateUrl: null,
    color: null,
    availableColors: [],
    availableSizes: [],
    availabilityConfidence: "unknown",
    metadata,
    lastSyncedAt,
  };
  return { ok: true, product };
}
