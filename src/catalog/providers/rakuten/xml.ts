/**
 * FORM Phase 2B — Rakuten Product Search XML parsing.
 *
 * Response shape comes ONLY from the live official documentation
 * (developers.rakutenadvertising.com/guides/product_search +
 * /guides/product_search/reference, retrieved 2026-09-27):
 *
 *   GET https://api.linksynergy.com/productsearch/1.0 answers with XML:
 *
 *   <result>
 *     <TotalMatches>...</TotalMatches><TotalPages>...</TotalPages>
 *     <PageNumber>...</PageNumber>
 *     <item>
 *       <mid/><merchantname/><linkid/><createdon/><sku/><productname/>
 *       <category><primary/><secondary/></category>
 *       <price currency="USD">445.00</price>
 *       <saleprice currency="USD">445.00</saleprice>
 *       <upccode/>
 *       <description><short/><long/></description>
 *       <keywords/><linkurl/><imageurl/>
 *     </item>
 *   </result>
 *
 * No field outside this table is read. Parsing uses fast-xml-parser (a small,
 * maintained, zero-dependency parser) plus its built-in well-formedness
 * validator — never regex. Numbers are kept as raw strings so the
 * decimal→integer-cents conversion happens exactly, without float math.
 */

import { XMLParser, XMLValidator } from "fast-xml-parser";
import { CatalogProviderError } from "../../provider.js";

export interface RakutenMoneyField {
  /** Raw decimal string exactly as the provider sent it. */
  amount: string;
  currency: string | null;
}

export interface RakutenRawItem {
  mid: string | null;
  merchantName: string | null;
  linkId: string | null;
  createdOn: string | null;
  sku: string | null;
  productName: string | null;
  categoryPrimary: string | null;
  categorySecondary: string | null;
  price: RakutenMoneyField | null;
  salePrice: RakutenMoneyField | null;
  upcCode: string | null;
  descriptionShort: string | null;
  descriptionLong: string | null;
  keywords: string | null;
  linkUrl: string | null;
  imageUrl: string | null;
}

export interface RakutenSearchPage {
  totalMatches: number | null;
  totalPages: number | null;
  pageNumber: number | null;
  items: RakutenRawItem[];
}

// fast-xml-parser is PINNED to v4: v5 stopped decoding numeric character
// references (a product name "Men&#39;s ..." must not be stored literally),
// while v4 decodes named and numeric entities and stays actively patched.
const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  trimValues: true,
  // Keep "445.00" as a string: money conversion must be exact, not float.
  numberParseOptions: { hex: false, leadingZeros: false, skipLike: /./ },
});

/** Element text: plain string, or {#text, @attr…} when it carries attributes. */
function elementText(value: unknown): string | null {
  if (typeof value === "string") return value === "" ? null : value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (value !== null && typeof value === "object" && "#text" in value) {
    const inner = (value as { "#text"?: unknown })["#text"];
    if (typeof inner === "string") return inner === "" ? null : inner;
  }
  return null;
}

function attribute(value: unknown, name: string): string | null {
  if (value !== null && typeof value === "object" && name in value) {
    const attr = (value as Record<string, unknown>)[name];
    if (typeof attr === "string" && attr !== "") return attr;
  }
  return null;
}

function moneyField(value: unknown): RakutenMoneyField | null {
  const amount = elementText(value);
  if (amount === null) return null;
  return { amount, currency: attribute(value, "@_currency") };
}

function asArray<T>(value: unknown): T[] {
  if (value === undefined || value === null) return [];
  return (Array.isArray(value) ? value : [value]) as T[];
}

function optionalNumber(value: unknown): number | null {
  const text = elementText(value);
  if (text === null) return null;
  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : null;
}

function toRawItem(raw: unknown): RakutenRawItem {
  const item = (raw ?? {}) as Record<string, unknown>;
  const category = (item.category ?? {}) as Record<string, unknown>;
  const description = (item.description ?? {}) as Record<string, unknown>;
  return {
    mid: elementText(item.mid),
    merchantName: elementText(item.merchantname),
    linkId: elementText(item.linkid),
    createdOn: elementText(item.createdon),
    sku: elementText(item.sku),
    productName: elementText(item.productname),
    categoryPrimary: elementText(category.primary),
    categorySecondary: elementText(category.secondary),
    price: moneyField(item.price),
    salePrice: moneyField(item.saleprice),
    upcCode: elementText(item.upccode),
    descriptionShort: elementText(description.short),
    descriptionLong: elementText(description.long),
    keywords: elementText(item.keywords),
    linkUrl: elementText(item.linkurl),
    imageUrl: elementText(item.imageurl),
  };
}

/**
 * Parse one documented search-response XML document. Structural failures are
 * PROVIDER_ERROR — malformed transport data is the provider's failure, never
 * silently-empty data.
 */
export function parseSearchXml(xml: string): RakutenSearchPage {
  const validated = XMLValidator.validate(xml);
  if (validated !== true) {
    const err = validated.err;
    throw new CatalogProviderError(
      "PROVIDER_ERROR",
      "rakuten",
      `unparseable XML response: ${err?.msg ?? "unknown well-formedness error"}`,
    );
  }

  let document: unknown;
  try {
    document = parser.parse(xml);
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    throw new CatalogProviderError("PROVIDER_ERROR", "rakuten", `XML parsing failed: ${detail}`);
  }

  if (document === null || typeof document !== "object" || !("result" in document)) {
    throw new CatalogProviderError(
      "PROVIDER_ERROR",
      "rakuten",
      "XML response has no <result> envelope",
    );
  }

  const result = (document as { result?: unknown }).result;
  if (result === null || typeof result !== "object") {
    throw new CatalogProviderError(
      "PROVIDER_ERROR",
      "rakuten",
      "XML <result> envelope is not an element",
    );
  }

  const envelope = result as Record<string, unknown>;
  return {
    totalMatches: optionalNumber(envelope.TotalMatches),
    totalPages: optionalNumber(envelope.TotalPages),
    pageNumber: optionalNumber(envelope.PageNumber),
    items: asArray<unknown>(envelope.item).map(toRawItem),
  };
}
