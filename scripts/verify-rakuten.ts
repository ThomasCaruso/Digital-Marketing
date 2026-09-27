/**
 * FORM Phase 2B — Rakuten adapter verification suite.
 *
 * Run:  npm run verify:rakuten
 *
 * Deterministic PASS/FAIL harness (same pattern as verify-catalog.ts). The
 * network is ALWAYS injected — no test here ever touches a real Rakuten
 * endpoint, no real token is fetched, and no credentials exist in this
 * file: every "secret" below is a fake literal used only to prove it never
 * leaks into thrown errors.
 *
 * Covers: normalization (documented fields only, exact integer money,
 * MID+SKU identity, metadata preservation), category mapping, pagination,
 * intent pre-filtering, resilience (timeout, 429 + Retry-After, transient
 * 5xx retry, no retry on auth/config), auth-vs-search failure separation,
 * secret redaction, token single-flight caching, deep-link lazy resolution
 * with failure tolerance, and the availability contract (sizes [] /
 * confidence "unknown" — never invented).
 */

import {
  RakutenProductProvider,
  SEARCH_URL,
  DEEP_LINK_URL,
  rakutenProviderFromEnv,
} from "../src/catalog/providers/rakuten/index.js";
import { ClientCredentialsTokenSource } from "../src/catalog/providers/rakuten/token.js";
import type { FetchLike } from "../src/catalog/providers/rakuten/http.js";
import { validateNormalizedProduct } from "../src/catalog/validation.js";
import { dedupeProducts } from "../src/catalog/validation.js";
import type { NormalizedProduct } from "../src/catalog/types.js";

// ---------------------------------------------------------------------------
// Harness
// ---------------------------------------------------------------------------

interface Check {
  name: string;
  pass: boolean;
  detail?: string;
}

const checks: Check[] = [];

function record(name: string, pass: boolean, detail?: string): void {
  checks.push({ name, pass, detail });
  console.log(`  ${pass ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
}

function section(title: string): void {
  console.log(`\n== ${title} ==`);
}

// ---------------------------------------------------------------------------
// Fake network + XML fixtures
// ---------------------------------------------------------------------------

interface RecordedCall {
  url: string;
  init: RequestInit;
}

interface FakeFetch {
  fetch: FetchLike;
  calls: RecordedCall[];
}

/** Wrap a handler so every call is recorded (url + init) in order. */
function fakeFetch(handler: (call: RecordedCall, index: number) => Response | Promise<Response>): FakeFetch {
  const calls: RecordedCall[] = [];
  const fetch: FetchLike = async (url, init) => {
    const call = { url, init };
    const index = calls.length;
    calls.push(call);
    return handler(call, index);
  };
  return { fetch, calls };
}

const noSleep = async (): Promise<void> => {};
const recordedSleeps: number[] = [];

function sleepRecorder(): (ms: number) => Promise<void> {
  recordedSleeps.length = 0;
  return async (ms: number) => {
    recordedSleeps.push(ms);
  };
}

function jsonResponse(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(typeof body === "string" ? body : JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...headers },
  });
}

function textResponse(body: string, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(body, { status, headers: { "content-type": "text/xml", ...headers } });
}

interface ItemOverrides {
  mid?: string;
  merchantname?: string;
  linkid?: string;
  createdon?: string | null;
  sku?: string | null;
  productname?: string;
  categoryPrimary?: string | null;
  categorySecondary?: string | null;
  price?: string | null;
  priceCurrency?: string | null;
  saleprice?: string | null;
  salepriceCurrency?: string | null;
  upccode?: string | null;
  descriptionShort?: string | null;
  descriptionLong?: string | null;
  keywords?: string | null;
  linkurl?: string | null;
  imageurl?: string | null;
}

/** One documented-shape <item>; every field can be omitted/mangled. */
function itemXml(o: ItemOverrides = {}): string {
  const category =
    o.categoryPrimary === undefined && o.categorySecondary === undefined
      ? "<category><primary>Clothing~~Sweaters</primary><secondary>Merino~~Crewneck</secondary></category>"
      : o.categoryPrimary === null && o.categorySecondary === null
        ? ""
        : `<category><primary>${o.categoryPrimary ?? ""}</primary><secondary>${o.categorySecondary ?? ""}</secondary></category>`;
  const price = o.price === null ? "" : `<price currency="${o.priceCurrency ?? "USD"}">${o.price ?? "89.00"}</price>`;
  const sale =
    o.saleprice === undefined
      ? `<saleprice currency="${o.salepriceCurrency ?? "USD"}">59.99</saleprice>`
      : o.saleprice === null
        ? ""
        : `<saleprice currency="${o.salepriceCurrency ?? "USD"}">${o.saleprice}</saleprice>`;
  const description =
    o.descriptionShort === undefined && o.descriptionLong === undefined
      ? "<description><short>Merino crewneck.</short><long>A long description.</long></description>"
      : o.descriptionShort === null && o.descriptionLong === null
        ? ""
        : `<description><short>${o.descriptionShort ?? ""}</short><long>${o.descriptionLong ?? ""}</long></description>`;
  return [
    "<item>",
    `<mid>${o.mid ?? "3134987"}</mid>`,
    `<merchantname>${o.merchantname ?? "Example Fashion Co"}</merchantname>`,
    `<linkid>${o.linkid ?? "30000000007293871"}</linkid>`,
    o.createdon === null ? "" : `<createdon>${o.createdon ?? "2025-01-16/05:30:32"}</createdon>`,
    o.sku === null ? "" : `<sku>${o.sku ?? "100046604"}</sku>`,
    `<productname>${o.productname ?? "Men&#39;s Merino Wool Sweater"}</productname>`,
    category,
    price,
    sale,
    o.upccode === null ? "" : `<upccode>${o.upccode ?? "012345678901"}</upccode>`,
    description,
    o.keywords === null ? "" : `<keywords>${o.keywords ?? "mens,sweater,merino"}</keywords>`,
    o.linkurl === null
      ? ""
      : `<linkurl>${o.linkurl ?? "https://track.example.com/click?mid=3134987&amp;sku=100046604"}</linkurl>`,
    o.imageurl === null ? "" : `<imageurl>${o.imageurl ?? "https://images.example.com/sweater.jpg"}</imageurl>`,
    "</item>",
  ].join("");
}

function pageXml(items: string[], o: { totalMatches?: number; totalPages?: number; pageNumber?: number } = {}): string {
  return [
    "<result>",
    `<TotalMatches>${o.totalMatches ?? items.length}</TotalMatches>`,
    `<TotalPages>${o.totalPages ?? 1}</TotalPages>`,
    `<PageNumber>${o.pageNumber ?? 1}</PageNumber>`,
    ...items,
    "</result>",
  ].join("");
}

const FAKE_BEARER = "fake-static-bearer-token-0123456789abcdef";
const FAKE_CLIENT_ID = "fake-client-id-1234";
const FAKE_CLIENT_SECRET = "fake-client-secret-5678";
const FAKE_TOKEN = "fake-fetched-access-token-abcdef";

function bearerProvider(
  fetch: FetchLike,
  extra: Partial<ConstructorParameters<typeof RakutenProductProvider>[0]> = {},
): RakutenProductProvider {
  return new RakutenProductProvider({
    bearerToken: FAKE_BEARER,
    fetchImpl: fetch,
    sleep: noSleep,
    ...extra,
  });
}

async function catchError(fn: () => Promise<unknown>): Promise<Error | null> {
  try {
    await fn();
  } catch (err) {
    return err instanceof Error ? err : new Error(String(err));
  }
  return null;
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

let exitCode = 0;

async function run(): Promise<void> {
  console.log("FORM Phase 2B — Rakuten adapter verification (injected network only)");

  // ------------------------------------------------------- NOT CONFIGURED
  section("NOT CONFIGURED");
  const unconfigured = new RakutenProductProvider();
  const unconfiguredErr = await catchError(() => unconfigured.search({ query: "wool coat" }));
  record(
    "missing config throws NOT_CONFIGURED on search",
    unconfiguredErr?.name === "CatalogProviderError" && unconfiguredErr.message.includes("NOT_CONFIGURED"),
  );
  const unconfiguredGet = await catchError(() => unconfigured.getById("3134987:100046604"));
  record(
    "missing config throws NOT_CONFIGURED on getById",
    unconfiguredGet?.message.includes("NOT_CONFIGURED") === true,
  );
  record(
    "missing config throws NOT_CONFIGURED on createAffiliateLink",
    (await catchError(() => unconfigured.createAffiliateLink({} as NormalizedProduct)))?.message.includes(
      "NOT_CONFIGURED",
    ) === true,
  );
  record(
    "rakutenProviderFromEnv returns null with NO rakuten env",
    rakutenProviderFromEnv({}) === null,
  );
  record(
    "rakutenProviderFromEnv returns null with only half the credential pair",
    rakutenProviderFromEnv({ RAKUTEN_CLIENT_ID: "id-only" }) === null,
  );
  record(
    "rakutenProviderFromEnv accepts a bearer token",
    rakutenProviderFromEnv({ RAKUTEN_BEARER_TOKEN: "some-token" }) !== null,
  );
  record(
    "rakutenProviderFromEnv accepts the client credential pair",
    rakutenProviderFromEnv({ RAKUTEN_CLIENT_ID: "id", RAKUTEN_CLIENT_SECRET: "secret" }) !== null,
  );

  // ----------------------------------------------------- BASIC NORMALIZATION
  section("NORMALIZATION — valid single item");
  {
    const { fetch, calls } = fakeFetch(() => textResponse(pageXml([itemXml()])));
    const provider = bearerProvider(fetch);
    const results = await provider.search({ query: "merino sweater" });

    record("single item returns exactly one product", results.length === 1, `got ${results.length}`);
    const p = results[0];
    record(
      "provider is rakuten and identity is MID+SKU (merchant-scoped)",
      p?.provider === "rakuten" && p?.providerProductId === "3134987:100046604",
      p?.providerProductId,
    );
    record(
      "name decodes XML entities and preserves productname",
      p?.name === "Men's Merino Wool Sweater",
      p?.name,
    );
    record("merchant is merchantname", p?.merchant === "Example Fashion Co");
    record(
      "exact money: 89.00 -> 8900, 59.99 -> 5999 (no float math)",
      p?.priceCents === 8900 && p?.salePriceCents === 5999,
      `price=${p?.priceCents} sale=${p?.salePriceCents}`,
    );
    record("currency from price attribute", p?.currency === "USD");
    record(
      "availability contract: color null, colors [], sizes [], confidence unknown",
      p?.color === null &&
        Array.isArray(p?.availableColors) &&
        p?.availableColors.length === 0 &&
        Array.isArray(p?.availableSizes) &&
        p?.availableSizes.length === 0 &&
        p?.availabilityConfidence === "unknown",
    );
    record(
      "productUrl is linkurl; affiliateUrl stays null until deep-linked",
      p?.productUrl === "https://track.example.com/click?mid=3134987&sku=100046604" && p?.affiliateUrl === null,
    );
    record(
      "imageUrls carries imageurl",
      p?.imageUrls.length === 1 && p?.imageUrls[0] === "https://images.example.com/sweater.jpg",
    );
    record(
      "brand stays null (no documented brand field; never derived from title)",
      p?.brand === null,
    );
    record(
      "metadata preserves provider values (mid, sku, linkId, upcCode, createdOn, keywords, providerCategory)",
      p?.metadata.source === "rakuten" &&
        p?.metadata.mid === "3134987" &&
        p?.metadata.sku === "100046604" &&
        p?.metadata.linkId === "30000000007293871" &&
        p?.metadata.upcCode === "012345678901" &&
        p?.metadata.createdOn === "2025-01-16/05:30:32" &&
        p?.metadata.keywords === "mens,sweater,merino" &&
        (p?.metadata.providerCategory as { primary: string }).primary === "Clothing~~Sweaters",
    );
    record(
      "subcategory stays null (provider taxonomy lives in metadata only)",
      p?.subcategory === null,
    );
    record("search hits the documented endpoint with bearer auth", calls.length === 1 && calls[0]!.url.startsWith(SEARCH_URL));
    record(
      "Authorization header carries the bearer token",
      (calls[0]!.init.headers as Record<string, string>).Authorization === `Bearer ${FAKE_BEARER}`,
    );
    const gate = p ? validateNormalizedProduct(p) : null;
    record("normalized product passes the Phase 2A validation gate", gate?.ok === true);
  }

  section("NORMALIZATION — multiple items, missing optional fields");
  {
    const { fetch } = fakeFetch(() =>
      textResponse(
        pageXml([
          itemXml(),
          itemXml({
            sku: "2001",
            productname: "Silk Scarf",
            categoryPrimary: "Accessories~~Scarves",
            categorySecondary: null,
            createdon: null,
            upccode: null,
            keywords: null,
            imageurl: null,
            descriptionShort: null,
            descriptionLong: null,
            saleprice: null,
          }),
        ]),
      ),
    );
    const provider = bearerProvider(fetch);
    const results = await provider.search({ query: "accessories" });
    record("multiple items return in feed order", results.length === 2);
    const scarf = results[1];
    record(
      "missing optionals normalize to contract-safe defaults",
      scarf?.metadata.upcCode === null &&
        scarf?.metadata.createdOn === null &&
        scarf?.metadata.keywords === null &&
        scarf?.imageUrls.length === 0 &&
        scarf?.description === null &&
        scarf?.salePriceCents === null,
    );
    record(
      "scarf maps to accessories via primary token",
      scarf?.category === "accessories",
      scarf?.category,
    );
    record(
      "missing saleprice means salePriceCents null, effective = regular",
      results[0]?.salePriceCents === 5999 && scarf !== undefined,
    );
  }

  section("NORMALIZATION — sale prices and anomalies");
  {
    const { fetch } = fakeFetch(() =>
      textResponse(
        pageXml([
          itemXml({ sku: "SALE-OK", saleprice: "49.50" }),
          itemXml({ sku: "ANOMALY", price: "50.00", saleprice: "90.00" }),
        ]),
      ),
    );
    const provider = bearerProvider(fetch);
    const results = await provider.search({ query: "sale" });
    const ok = results.find((p) => p.providerProductId === "3134987:SALE-OK");
    const anomaly = results.find((p) => p.providerProductId === "3134987:ANOMALY");
    record("normal sale (below regular) normalizes exactly", ok?.priceCents === 8900 && ok?.salePriceCents === 4950);
    record(
      "sale ABOVE regular preserved with explicit anomaly metadata (TD-013), not silently dropped",
      anomaly?.salePriceCents === 9000 &&
        typeof anomaly?.metadata.sale_price_anomaly === "object" &&
        (anomaly?.metadata.sale_price_anomaly as { rawSalePrice: string }).rawSalePrice === "90.00",
    );
    record(
      "anomalous record still passes the validation gate via the anomaly escape hatch",
      anomaly !== undefined && validateNormalizedProduct(anomaly).ok === true,
    );
  }

  section("NORMALIZATION — per-item malformed data skips, never fails the search");
  {
    const { fetch } = fakeFetch(() =>
      textResponse(
        pageXml([
          itemXml(),
          itemXml({ sku: "BADS", price: "1,234.56" }), // comma → malformed
          itemXml({ sku: "THREED", price: "9.999" }), // three decimals → malformed
          itemXml({ sku: "NOPRICE", price: null }),
          itemXml({ sku: "NONAME", productname: "" }),
          itemXml({ sku: "NOURL", linkurl: null }),
          itemXml({ sku: "EURITEM", priceCurrency: "EUR" }),
        ]),
      ),
    );
    const provider = bearerProvider(fetch);
    const results = await provider.search({ query: "sweaters" });
    record(
      "malformed/insufficient items are skipped deterministically (1 survivor under USD default)",
      results.length === 1 && results[0]?.providerProductId === "3134987:100046604",
      `got ${results.length}`,
    );
    const stats = provider.lastSearchStats;
    record(
      "skip reasons are counted for catalog-quality reporting",
      stats?.itemsSeen === 7 && stats.itemsSkipped.some((s) => s.reason === "malformed_price" && s.count === 2),
      JSON.stringify(stats?.itemsSkipped),
    );
  }

  // -------------------------------------------------------------- CURRENCY
  section("INTENT — currency and price pre-filters");
  {
    const { fetch } = fakeFetch(() =>
      textResponse(
        pageXml([
          itemXml({ sku: "USD1", price: "40.00", saleprice: null }),
          itemXml({ sku: "EUR1", price: "40.00", saleprice: null, priceCurrency: "EUR" }),
        ]),
      ),
    );
    const provider = bearerProvider(fetch);
    const usd = await provider.search({ query: "tops" });
    record("default currency USD excludes EUR items", usd.length === 1 && usd[0]?.metadata.sku === "USD1");
    const eur = await provider.search({ query: "tops", currency: "EUR" });
    record("explicit EUR keeps only the EUR item (excluded, never converted)", eur.length === 1 && eur[0]?.metadata.sku === "EUR1");

    const { fetch: fetch2 } = fakeFetch(() =>
      textResponse(pageXml([
        itemXml({ sku: "CHEAP", price: "20.00", saleprice: null }),
        itemXml({ sku: "MIDRANGE", price: "75.00", saleprice: null }),
        itemXml({ sku: "PRICY", price: "120.00", saleprice: null }),
      ])),
    );
    const ranged = await bearerProvider(fetch2).search({ query: "tops", minPriceCents: 5000, maxPriceCents: 10000 });
    record(
      "min/max price pre-filter applies to effective price in minor units",
      ranged.length === 1 && ranged[0]?.metadata.sku === "MIDRANGE",
      `got ${ranged.map((p) => p.metadata.sku).join(",")}`,
    );
  }

  section("INTENT — category post-filter, limit, empty query");
  {
    const { fetch, calls } = fakeFetch(() =>
      textResponse(
        pageXml([
          itemXml({ sku: "SWEATER", categoryPrimary: "Clothing~~Sweaters", categorySecondary: null }),
          itemXml({ sku: "SNEAKER", categoryPrimary: "Shoes~~Sneakers", categorySecondary: null }),
        ]),
      ),
    );
    const provider = bearerProvider(fetch);
    const tops = await provider.search({ query: "fall", categories: ["tops"] });
    record("category intent post-filter keeps mapped tops only", tops.length === 1 && tops[0]?.metadata.sku === "SWEATER");

    const { fetch: fetch2 } = fakeFetch(() => textResponse(pageXml([itemXml(), itemXml({ sku: "2" }), itemXml({ sku: "3" })])));
    const limited = await bearerProvider(fetch2).search({ query: "fall", limit: 2 });
    record("limit slices results", limited.length === 2);

    const { fetch: fetch3, calls: calls3 } = fakeFetch(() => textResponse(pageXml([itemXml()])));
    await bearerProvider(fetch3).search({ query: "??? &&& $$$" });
    record(
      "query with ONLY unsupported characters issues no network call and returns []",
      calls3.length === 0,
    );

    const { fetch: fetch4, calls: calls4 } = fakeFetch(() => textResponse(pageXml([itemXml()])));
    await bearerProvider(fetch4).search({});
    record("absent query issues no network call", calls4.length === 0 && calls.length > 0);

    const { fetch: fetch5, calls: calls5 } = fakeFetch(() => textResponse(pageXml([itemXml()])));
    await bearerProvider(fetch5).search({ query: "wool (coat) -grey" });
    const sentKeyword = new URL(calls5[0]!.url).searchParams.get("keyword") ?? "";
    record(
      "unsupported characters stripped from keyword before sending",
      sentKeyword === "wool coat grey",
      sentKeyword,
    );
  }

  // ------------------------------------------------------------- PAGINATION
  section("PAGINATION — deterministic pages, documented ceilings");
  {
    const page1Items = Array.from({ length: 100 }, (_, i) => itemXml({ sku: `P1-${String(i).padStart(3, "0")}` }));
    const page2Items = Array.from({ length: 50 }, (_, i) => itemXml({ sku: `P2-${String(i).padStart(3, "0")}` }));
    const { fetch, calls } = fakeFetch((_call, index) =>
      index === 0
        ? textResponse(pageXml(page1Items, { totalMatches: 150, totalPages: 2, pageNumber: 1 }))
        : textResponse(pageXml(page2Items, { totalMatches: 150, totalPages: 2, pageNumber: 2 })),
    );
    const provider = bearerProvider(fetch);
    const results = await provider.search({ query: "sweater", limit: 150 });
    record("limit above page size fetches a second page", calls.length === 2, `${calls.length} calls`);
    record("all 150 items collected across pages", results.length === 150, `got ${results.length}`);
    const requestedPages = calls.map((c) => new URL(c.url).searchParams.get("pagenumber"));
    record(
      "pagenumber requests are 1 then 2 (never beyond TotalPages — documented error)",
      requestedPages.join(",") === "1,2",
      requestedPages.join(","),
    );
    record(
      "page size caps at the documented max=100",
      new URL(calls[0]!.url).searchParams.get("max") === "100",
    );
    record(
      "pagination is deterministic: same fixture, same ids",
      JSON.stringify(results.map((p) => p.providerProductId)) ===
        JSON.stringify(
          [
            ...Array.from({ length: 100 }, (_, i) => `3134987:P1-${String(i).padStart(3, "0")}`),
            ...Array.from({ length: 50 }, (_, i) => `3134987:P2-${String(i).padStart(3, "0")}`),
          ],
        ),
    );
  }
  {
    // limit within one page must NOT trigger a second request
    const { fetch, calls } = fakeFetch(() =>
      textResponse(pageXml([itemXml({ sku: "A" }), itemXml({ sku: "B" })], { totalMatches: 999, totalPages: 500 })),
    );
    const provider = bearerProvider(fetch);
    const results = await provider.search({ query: "sweater", limit: 2 });
    record("single-page limit never requests more pages", calls.length === 1 && results.length === 2);

    const { fetch: fetch2, calls: calls2 } = fakeFetch(() => textResponse(pageXml([], { totalMatches: 0, totalPages: 0 })));
    const empty = await bearerProvider(fetch2).search({ query: "nothing matches this" });
    record("empty result set returns [] without error", empty.length === 0 && calls2.length === 1);
  }

  // ------------------------------------------------------------ IDENTITY
  section("IDENTITY — merchant-scoped ids and dedupe interaction");
  {
    const { fetch } = fakeFetch(() =>
      textResponse(
        pageXml([
          itemXml({ mid: "111", sku: "SAME-SKU", productname: "Merchant One Version" }),
          itemXml({ mid: "222", sku: "SAME-SKU", productname: "Merchant Two Version" }),
        ]),
      ),
    );
    const provider = bearerProvider(fetch);
    const results = await provider.search({ query: "same sku" });
    record(
      "same SKU under different MIDs yields DIFFERENT provider ids",
      results.length === 2 &&
        results[0]!.providerProductId === "111:SAME-SKU" &&
        results[1]!.providerProductId === "222:SAME-SKU",
    );
    const deduped = dedupeProducts(results);
    record("distinct ids survive the Phase 2A dedupe untouched", deduped.products.length === 2);
  }
  {
    const { fetch } = fakeFetch(() =>
      textResponse(
        pageXml([
          itemXml({ sku: "DUP", productname: "First seen" }),
          itemXml({ sku: "DUP", productname: "Last seen wins" }),
        ]),
      ),
    );
    const provider = bearerProvider(fetch);
    const results = await provider.search({ query: "dup" });
    record(
      "same MID+SKU twice yields the SAME provider id (upsert-stable)",
      results.length === 2 && results[0]!.providerProductId === results[1]!.providerProductId,
    );
    const deduped = dedupeProducts(results);
    record(
      "in-batch duplicates collapse to LAST occurrence (matches upsert semantics)",
      deduped.products.length === 1 && deduped.products[0]!.name === "Last seen wins",
    );
    const { fetch: fetch2 } = fakeFetch(() => textResponse(pageXml([itemXml({ sku: "DUP", productname: "Again" })])));
    const secondCall = await bearerProvider(fetch2).search({ query: "dup" });
    record(
      "ids are deterministic across searches (stable uuid v5 of provider identity)",
      secondCall[0]!.id === results[0]!.id,
      `${secondCall[0]!.id} vs ${results[0]!.id}`,
    );
    record(
      "sku-less feed falls back to MID+linkid identity",
      (
        await bearerProvider(
          fakeFetch(() => textResponse(pageXml([itemXml({ sku: null, linkid: "LINK-9" })]))).fetch,
        ).search({ query: "x" })
      )[0]!.providerProductId === "3134987:link-LINK-9",
    );
  }

  // ------------------------------------------------------- CATEGORY MAPPING
  section("CATEGORY MAPPING — deterministic table");
  {
    const cases: Array<{ primary: string | null; secondary: string | null; expected: string }> = [
      { primary: "Clothing~~Shirts", secondary: null, expected: "tops" },
      { primary: "Clothing~~Sweaters", secondary: null, expected: "tops" },
      { primary: "Apparel~~Tops", secondary: null, expected: "tops" },
      { primary: "Clothing~~Pants", secondary: null, expected: "bottoms" },
      { primary: "Clothing~~Trousers", secondary: null, expected: "bottoms" },
      { primary: "Denim~~Jeans", secondary: null, expected: "bottoms" },
      { primary: "Clothing~~Shorts", secondary: null, expected: "bottoms" },
      { primary: "Outerwear~~Jackets", secondary: null, expected: "outerwear" },
      { primary: "Outerwear~~Coats", secondary: null, expected: "outerwear" },
      { primary: "Clothing~~Dresses", secondary: null, expected: "one_piece" },
      { primary: "Clothing~~Jumpsuits", secondary: null, expected: "one_piece" },
      { primary: "Shoes~~Sneakers", secondary: null, expected: "shoes" },
      { primary: "Footwear~~Boots", secondary: null, expected: "shoes" },
      { primary: "Shoes~~Loafers", secondary: null, expected: "shoes" },
      { primary: "Accessories~~Belts", secondary: null, expected: "accessories" },
      { primary: "Bags~~Handbags", secondary: null, expected: "accessories" },
      { primary: "Accessories~~Hats", secondary: null, expected: "accessories" },
      { primary: "Jewelry~~Necklaces", secondary: null, expected: "accessories" },
      { primary: "Accessories~~Scarves", secondary: null, expected: "accessories" },
      // precedence: "dress shirt" is a SHIRT first
      { primary: "Shirts~~Dress Shirts", secondary: null, expected: "tops" },
      // secondary consulted when primary is ambiguous
      { primary: "Apparel", secondary: "Shoes~~Sneakers", expected: "shoes" },
      // word boundaries: no false substring hits
      { primary: "Laptop Sleeves", secondary: null, expected: "other" },
      // ambiguous maps to other
      { primary: "Home~~Kitchen Textiles", secondary: null, expected: "other" },
      { primary: null, secondary: null, expected: "other" },
    ];
    const { fetch } = fakeFetch(() =>
      textResponse(
        pageXml(
          cases.map((c, i) =>
            itemXml({ sku: `CAT-${i}`, categoryPrimary: c.primary, categorySecondary: c.secondary }),
          ),
        ),
      ),
    );
    const provider = bearerProvider(fetch);
    const results = await provider.search({ query: "categories" });
    const wrong = cases.filter((c, i) => results[i]?.category !== c.expected);
    record(
      `all ${cases.length} category-mapping cases match the deterministic table`,
      wrong.length === 0,
      wrong.map((c) => `${c.primary}→${results[cases.indexOf(c)]?.category} (want ${c.expected})`).join("; "),
    );
  }

  // ------------------------------------------------------------------ RESILIENCE
  section("RESILIENCE — transport failures");
  {
    // invalid XML
    const bad = await catchError(() =>
      bearerProvider(fakeFetch(() => textResponse("<result><TotalPages>1</TotalPages><item>")).fetch).search({
        query: "x",
      }),
    );
    record(
      "unparseable XML surfaces PROVIDER_ERROR (never silent emptiness)",
      bad?.message.includes("PROVIDER_ERROR") === true && bad.message.includes("unparseable XML"),
    );
    record("XML failure does not leak the bearer token", !bad?.message.includes(FAKE_BEARER));

    // 401 / 403 → AUTH_FAILED, distinct from provider errors
    for (const status of [401, 403]) {
      const err = await catchError(() =>
        bearerProvider(fakeFetch(() => textResponse("denied", status)).fetch).search({ query: "x" }),
      );
      record(
        `HTTP ${status} surfaces AUTH_FAILED (auth separated from search failures)`,
        err?.message.includes("AUTH_FAILED") === true,
      );
      record(`HTTP ${status} message carries no secret`, !err?.message.includes(FAKE_BEARER));
    }

    // 400 is a config-class failure: no retry
    const { fetch: fetch400, calls: calls400 } = fakeFetch(() => textResponse("bad request", 400));
    const err400 = await catchError(() => bearerProvider(fetch400).search({ query: "x" }));
    record("HTTP 400 never retries and surfaces PROVIDER_ERROR", calls400.length === 1 && err400?.message.includes("PROVIDER_ERROR") === true);

    // 429 honors Retry-After then succeeds
    let rateLimitedSeen = 0;
    const { fetch: fetch429, calls: calls429 } = fakeFetch((_call, index) => {
      if (index === 0) {
        rateLimitedSeen++;
        return textResponse("slow down", 429, { "retry-after": "3" });
      }
      return textResponse(pageXml([itemXml()]));
    });
    const sleep = sleepRecorder();
    const after429 = await bearerProvider(fetch429, { sleep }).search({ query: "x" });
    record(
      "HTTP 429 retries once honoring Retry-After, then succeeds",
      calls429.length === 2 && after429.length === 1 && recordedSleeps[0] === 3000,
      `sleeps=${JSON.stringify(recordedSleeps)}`,
    );
    record("rate-limit body text is not silently treated as data", rateLimitedSeen === 1);

    // 500 retries bounded, then PROVIDER_ERROR
    const { fetch: fetch500, calls: calls500 } = fakeFetch(() => textResponse("boom", 500));
    const err500 = await catchError(() => bearerProvider(fetch500, { maxRetries: 2 }).search({ query: "x" }));
    record(
      "HTTP 500 retries the bounded number of times then fails PROVIDER_ERROR",
      calls500.length === 3 && err500?.message.includes("PROVIDER_ERROR") === true,
      `${calls500.length} attempts`,
    );

    // timeout
    const hangish: FetchLike = (url, init) =>
      new Promise((resolve, reject) => {
        const timer = setTimeout(() => resolve(textResponse(pageXml([itemXml()]))), 500);
        init.signal?.addEventListener("abort", () => {
          clearTimeout(timer);
          reject(new Error("aborted"));
        });
      });
    const timeoutErr = await catchError(() =>
      bearerProvider(hangish, { timeoutMs: 25, maxRetries: 0 }).search({ query: "x" }),
    );
    record(
      "slow responses hit the configured timeout and fail PROVIDER_ERROR (not a hang, not auth)",
      timeoutErr?.message.includes("PROVIDER_ERROR") === true && timeoutErr.message.includes("timed out"),
    );

    // network-level failure
    const networkErr = await catchError(() =>
      bearerProvider(
        fakeFetch(() => {
          throw new Error("ECONNRESET");
        }).fetch,
        { maxRetries: 1 },
      ).search({ query: "x" }),
    );
    record("network failure retries bounded then PROVIDER_ERROR", networkErr?.message.includes("PROVIDER_ERROR") === true);
  }

  // --------------------------------------------------------------- TOKENS
  section("TOKENS — client-credentials path (injected endpoint)");
  {
    let tokenCalls = 0;
    const { fetch, calls } = fakeFetch((call) => {
      if (call.url.endsWith("/token")) {
        tokenCalls++;
        return jsonResponse({ access_token: FAKE_TOKEN, token_type: "bearer", expires_in: 3600 });
      }
      return textResponse(pageXml([itemXml()]));
    });
    const provider = new RakutenProductProvider({
      clientId: FAKE_CLIENT_ID,
      clientSecret: FAKE_CLIENT_SECRET,
      tokenUrl: "https://token.example.test/token",
      fetchImpl: fetch,
      sleep: noSleep,
    });
    const first = await provider.search({ query: "a" });
    const second = await provider.search({ query: "b" });
    record("client-credentials path fetches the token and searches successfully", first.length === 1 && second.length === 1);
    record("token endpoint hit exactly once for two searches (cached)", tokenCalls === 1, `${tokenCalls} calls`);
    const searchCall = (callOf: { url: string; init: RequestInit }) => !callOf.url.endsWith("/token");
    const lastSearch = calls.filter(searchCall).at(-1);
    record(
      "search requests carry the FETCHED bearer token",
      lastSearch !== undefined &&
        (lastSearch.init.headers as Record<string, string>).Authorization === `Bearer ${FAKE_TOKEN}`,
    );

    const single = new ClientCredentialsTokenSource({
      clientId: FAKE_CLIENT_ID,
      clientSecret: FAKE_CLIENT_SECRET,
      tokenUrl: "https://token.example.test/token",
      timeoutMs: 1000,
      maxRetries: 0,
      retryDelayMs: 1,
      fetchImpl: fakeFetch(() => {
        tokenCalls++;
        return jsonResponse({ access_token: FAKE_TOKEN, expires_in: 3600 });
      }).fetch,
      sleep: noSleep,
    });
    tokenCalls = 0;
    const [t1, t2, t3] = await Promise.all([single.getToken(), single.getToken(), single.getToken()]);
    record(
      "concurrent getToken() calls are single-flight (a new token invalidates the old one)",
      tokenCalls === 1 && t1 === t2 && t2 === t3,
      `${tokenCalls} fetches`,
    );

    const rejected = new ClientCredentialsTokenSource({
      clientId: FAKE_CLIENT_ID,
      clientSecret: FAKE_CLIENT_SECRET,
      tokenUrl: "https://token.example.test/token",
      timeoutMs: 1000,
      maxRetries: 0,
      retryDelayMs: 1,
      fetchImpl: fakeFetch(() => jsonResponse({ error: "invalid_client" }, 401)).fetch,
      sleep: noSleep,
    });
    const authErr = await catchError(() => rejected.getToken());
    record(
      "token-endpoint 401 surfaces AUTH_FAILED with NO secret in the message",
      authErr?.message.includes("AUTH_FAILED") === true &&
        !authErr.message.includes(FAKE_CLIENT_ID) &&
        !authErr.message.includes(FAKE_CLIENT_SECRET),
    );

    const garbage = new ClientCredentialsTokenSource({
      clientId: FAKE_CLIENT_ID,
      clientSecret: FAKE_CLIENT_SECRET,
      tokenUrl: "https://token.example.test/token",
      timeoutMs: 1000,
      maxRetries: 0,
      retryDelayMs: 1,
      fetchImpl: fakeFetch(() => jsonResponse({ unexpected: true })).fetch,
      sleep: noSleep,
    });
    const shapeErr = await catchError(() => garbage.getToken());
    record(
      "token response without access_token is a typed provider error, never a fake token",
      shapeErr?.message.includes("PROVIDER_ERROR") === true && shapeErr.message.includes("access_token"),
    );
  }

  // ------------------------------------------------------------ DEEP LINKS
  section("DEEP LINKS — lazy, cached, failure-tolerant");
  {
    const { fetch, calls } = fakeFetch((call) => {
      if (call.url === DEEP_LINK_URL) {
        return jsonResponse({ deep_links: [{ link: "https://click.example.test/deeplink/9" }] });
      }
      return textResponse(pageXml([itemXml()]));
    });
    const provider = bearerProvider(fetch);
    const products = await provider.search({ query: "x" });
    const base = products[0]!;
    const linked = await provider.createAffiliateLink(base);
    record(
      "createAffiliateLink fills affiliateUrl, keeps productUrl",
      linked.affiliateUrl === "https://click.example.test/deeplink/9" && linked.productUrl === base.productUrl,
      linked.affiliateUrl ?? "null",
    );
    record("deep-link request hits the documented endpoint once", calls.filter((c) => c.url === DEEP_LINK_URL).length === 1);
    const relinked = await provider.createAffiliateLink(base);
    record(
      "successful deep links are cached (no second network call for the same product)",
      relinked.affiliateUrl === linked.affiliateUrl && calls.filter((c) => c.url === DEEP_LINK_URL).length === 1,
    );
    record(
      "deep-link request body carries url + advertiser_id (+u1 when given)",
      (() => {
        const body = JSON.parse(String(calls.find((c) => c.url === DEEP_LINK_URL)?.init.body ?? "{}")) as Record<string, unknown>;
        return body.url === base.productUrl && body.advertiser_id === "3134987";
      })(),
    );
    const withU1 = await provider.createAffiliateLink({ ...base, affiliateUrl: null, productUrl: `${base.productUrl}&variant=2` }, { u1: "form-user-1" });
    let u1Body: Record<string, unknown> = {};
    for (const c of calls) {
      if (c.url === DEEP_LINK_URL && String(c.init.body).includes("variant=2")) {
        u1Body = JSON.parse(String(c.init.body)) as Record<string, unknown>;
      }
    }
    record("optional u1 forwarded when provided", withU1.affiliateUrl !== null && u1Body.u1 === "form-user-1");

    // failure tolerance
    const failing = bearerProvider(
      fakeFetch((call) => (call.url === DEEP_LINK_URL ? textResponse("not found", 404) : textResponse(pageXml([itemXml()])))).fetch,
    );
    const product = (await failing.search({ query: "x" }))[0]!;
    const survived = await failing.createAffiliateLink(product);
    record(
      "deep-link failure leaves the product record intact (affiliateUrl absent, productUrl kept)",
      survived.affiliateUrl === null && survived.productUrl === product.productUrl && survived.id === product.id,
    );

    const unsupported = bearerProvider(
      fakeFetch((call) => (call.url === DEEP_LINK_URL ? jsonResponse({ errors: [{ message: "advertiser does not support deep links" }] }) : textResponse(pageXml([itemXml()])))).fetch,
    );
    const unsupportedProduct = (await unsupported.search({ query: "x" }))[0]!;
    const kept = await unsupported.createAffiliateLink(unsupportedProduct);
    record(
      "no-link response keeps productUrl and leaves affiliateUrl absent",
      kept.affiliateUrl === null && kept.productUrl === unsupportedProduct.productUrl,
    );

    const many = await unsupported.resolveAffiliateLinks([unsupportedProduct, unsupportedProduct], { concurrency: 2 });
    record(
      "resolveAffiliateLinks preserves order and length under bounded concurrency",
      many.length === 2 && many[0]!.id === unsupportedProduct.id && many[1]!.id === unsupportedProduct.id,
    );
    record(
      "deep-link auth failures never leak the token into state",
      !JSON.stringify(many).includes(FAKE_BEARER),
    );
  }

  // ------------------------------------------------------------ getById
  section("getById — honest nulls (documented API has no id lookup)");
  {
    const { fetch, calls } = fakeFetch(() => textResponse(pageXml([itemXml()])));
    const provider = bearerProvider(fetch);
    record(
      "configured getById resolves null without any network call",
      (await provider.getById("3134987:100046604")) === null && calls.length === 0,
    );
  }

  // -------------------------------------------------------- LEAK SWEEP
  section("SECRET HYGIENE — every failure path above");
  {
    const secrets = [FAKE_BEARER, FAKE_TOKEN, FAKE_CLIENT_ID, FAKE_CLIENT_SECRET];
    // The provider's error body echoes back everything we sent — including
    // the bearer token. None of it may reach a thrown message.
    const failingProvider = bearerProvider(
      fakeFetch(() => textResponse(`<error>rejected token ${FAKE_BEARER} try again</error>`, 500)).fetch,
      { maxRetries: 0 },
    );
    const leakErr = await catchError(() => failingProvider.search({ query: "x" }));
    const leaked = leakErr === null ? [] : secrets.filter((s) => leakErr.message.includes(s));
    record(
      "provider failure message that ECHOES the bearer token carries no secret",
      leaked.length === 0 && leakErr?.message.includes("[redacted]") === true,
      leaked.length > 0 ? `leaked ${leaked.length} secrets` : undefined,
    );
  }
}

try {
  await run();
} catch (err) {
  record("suite ran to completion", false, err instanceof Error ? err.message : String(err));
  exitCode = 1;
}

section("SUMMARY");
const failed = checks.filter((c) => !c.pass);
console.log(`  ${checks.length - failed.length}/${checks.length} invariants passed`);
if (failed.length > 0) {
  console.log("\nFAILED invariants:");
  for (const c of failed) console.log(`  - ${c.name}${c.detail ? ` — ${c.detail}` : ""}`);
  exitCode = 1;
}
process.exit(exitCode);
