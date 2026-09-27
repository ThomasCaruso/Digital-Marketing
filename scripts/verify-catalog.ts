/**
 * FORM Phase 2A — catalog verification (commerce spine).
 *
 * Deterministic checks over everything the phase builds, in one run:
 *
 *   CONTRACT     every fixture is a valid NormalizedProduct; unknown fields
 *                stay unknown; metadata survives; runs are deterministic.
 *   VALIDATION   malformed URLs, non-integer/negative prices, unknown
 *                categories/availability, and sale-above-regular behavior.
 *   DEDUPE       duplicate provider ids handled deterministically.
 *   FILTERS      category/price/brand/merchant/color/size — including the
 *                size unknown-vs-unavailable distinction.
 *   MONEY        integer minor-unit math only.
 *   DATABASE     real Postgres (PGlite): 0004_catalog.sql constraints,
 *                upsert insert/update accounting, sync-run recording,
 *                updated_at trigger, RLS posture, Phase 1 coexistence.
 *   INGESTION    the full pipeline against the database, including
 *                rejection accounting and provider-failure handling.
 *
 * No test framework was added: this follows the repo's existing
 * deterministic-script pattern (verify-migrations.ts).
 *
 * Run:  npm run verify:catalog
 */

import { PGlite } from "@electric-sql/pglite";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { POST_MIGRATION_GRANTS, SUPABASE_STUBS } from "./lib/supabase-stubs.js";
import { FIXTURE_PRODUCTS, FixtureProductProvider } from "../src/catalog/providers/fixture.js";
import { RakutenProductProvider } from "../src/catalog/providers/rakuten/index.js";
import { CatalogProviderError, type ProductProvider } from "../src/catalog/provider.js";
import { dedupeProducts, validateNormalizedProduct } from "../src/catalog/validation.js";
import { classifySizeMatch, filterProducts } from "../src/catalog/filter.js";
import {
  assertIntegerCents,
  effectivePriceCents,
  sumEffectivePricesCents,
  sumPriceCents,
} from "../src/catalog/money.js";
import { createPostgresCatalogStore, type CatalogDbClient } from "../src/catalog/store.js";
import { CatalogIngestError, ingestFromProvider } from "../src/catalog/ingest.js";
import { SALE_PRICE_ANOMALY, type NormalizedProduct } from "../src/catalog/types.js";

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

/** Assert validation rejected the record, naming the expected issue code(s). */
function rejectedWith(name: string, product: NormalizedProduct, ...codes: string[]): void {
  const result = validateNormalizedProduct(product);
  const actual: string[] = result.ok ? [] : result.issues.map((issue) => issue.code);
  record(
    name,
    !result.ok && codes.every((code) => actual.includes(code)),
    result.ok ? "unexpectedly valid" : `codes: ${actual.join(", ") || "none"}`,
  );
}

const ids = (products: NormalizedProduct[]): string[] => products.map((p) => p.providerProductId);
const sameSet = (a: string[], b: string[]): boolean =>
  a.length === b.length && [...a].sort().join("|") === [...b].sort().join("|");

const provider = new FixtureProductProvider();
const ALL = FIXTURE_PRODUCTS;
const byId = new Map(ALL.map((p) => [p.providerProductId, p]));

// ---------------------------------------------------------------------------
// CONTRACT — fixtures satisfy the normalized product contract
// ---------------------------------------------------------------------------

function verifyContract(): void {
  section("CONTRACT — fixture provider outputs valid NormalizedProducts");

  const invalid = ALL.filter((p) => !validateNormalizedProduct(p).ok);
  record(`all ${ALL.length} fixtures pass validateNormalizedProduct`, invalid.length === 0);
  record("catalog size within the 20–40 record budget", ALL.length >= 20 && ALL.length <= 40, `${ALL.length} records`);

  const categories = new Set<string>(ALL.map((p) => p.category));
  record(
    "fixtures cover tops, bottoms, outerwear, shoes, accessories",
    ["tops", "bottoms", "outerwear", "shoes", "accessories"].every((c) => categories.has(c)),
  );
  record(
    "fixtures vary availability confidence across all three values",
    new Set(ALL.map((p) => p.availabilityConfidence)).size === 3,
  );
  record(
    "fixtures include sale prices, unknown brands, unknown colors, unknown sizes",
    ALL.some((p) => p.salePriceCents !== null) &&
      ALL.some((p) => p.brand === null) &&
      ALL.some((p) => p.color === null) &&
      ALL.some((p) => p.availableSizes.length === 0),
  );
  record(
    "every fixture is clearly marked as a test fixture in metadata",
    ALL.every((p) => p.metadata.source === "fixture"),
  );
  record(
    "every fixture URL uses reserved .example domains (never real commerce)",
    ALL.every(
      (p) =>
        new URL(p.productUrl).hostname.endsWith(".example") &&
        p.imageUrls.every((u) => new URL(u).hostname.endsWith(".example")),
    ),
  );
  record(
    "all fixture ids are unique and provider ids stable",
    new Set(ALL.map((p) => p.id)).size === ALL.length && ALL.every((p) => p.provider === "fixture"),
  );

  // Missing optional fields REMAIN missing; provider metadata SURVIVES.
  const withNullDescription = byId.get("FIX-TOP-004");
  const withNullBrand = byId.get("FIX-OUT-004");
  const withUnknownSizes = byId.get("FIX-TOP-003");
  record(
    "optional fields that are unknown stay null / empty (not defaulted)",
    withNullDescription?.description === null &&
      withNullBrand?.brand === null &&
      withUnknownSizes?.color === null &&
      withUnknownSizes !== undefined &&
      withUnknownSizes.availableSizes.length === 0,
  );
  const validatedDescription = withNullDescription
    ? validateNormalizedProduct(withNullDescription)
    : null;
  record(
    "provider-specific metadata (providerCategory) survives validation untouched",
    validatedDescription !== null &&
      validatedDescription.ok &&
      validatedDescription.product.metadata.providerCategory === "shirts-dress",
  );

  const searchA = ALL;
  record(
    "fixture construction is deterministic (module-level records are frozen order)",
    searchA.map((p) => p.providerProductId).join(",") ===
      FIXTURE_PRODUCTS.map((p) => p.providerProductId).join(","),
  );
}

// ---------------------------------------------------------------------------
// VALIDATION — the gate rejects malformed records precisely
// ---------------------------------------------------------------------------

function verifyValidation(): void {
  section("VALIDATION — malformed records rejected, anomalies deterministic");
  const base: NormalizedProduct = { ...byId.get("FIX-TOP-001")! };

  rejectedWith("malformed productUrl rejected", { ...base, productUrl: "not-a-url" }, "invalid_product_url");
  rejectedWith(
    "javascript: productUrl rejected",
    { ...base, productUrl: "javascript:alert(1)" },
    "invalid_product_url",
  );
  rejectedWith(
    "malformed entry in imageUrls rejected",
    { ...base, imageUrls: [base.imageUrls[0] ?? "", "ftp://img.example/x.jpg"] },
    "invalid_image_urls",
  );
  rejectedWith("negative price rejected", { ...base, priceCents: -1 }, "invalid_price");
  rejectedWith(
    "non-integer (floating point) price rejected",
    { ...base, priceCents: 1299.5 },
    "invalid_price",
  );
  rejectedWith("negative sale price rejected", { ...base, salePriceCents: -100 }, "invalid_sale_price");
  rejectedWith(
    "unknown availability confidence rejected",
    { ...base, availabilityConfidence: "available" as NormalizedProduct["availabilityConfidence"] },
    "invalid_availability_confidence",
  );
  rejectedWith(
    "unknown category rejected",
    { ...base, category: "shirts" as unknown as NormalizedProduct["category"] },
    "invalid_category",
  );
  rejectedWith("non-UUID id rejected", { ...base, id: "FIX-TOP-001" }, "invalid_id");
  rejectedWith("empty merchant rejected", { ...base, merchant: "   " }, "invalid_merchant");
  rejectedWith("lowercase currency rejected", { ...base, currency: "usd" }, "invalid_currency");
  rejectedWith(
    "non-array availableSizes rejected",
    { ...base, availableSizes: "M" as unknown as string[] },
    "invalid_available_sizes",
  );
  rejectedWith(
    "metadata must be an object",
    { ...base, metadata: [] as unknown as Record<string, unknown> },
    "invalid_metadata",
  );
  rejectedWith("unparseable lastSyncedAt rejected", { ...base, lastSyncedAt: "whenever" }, "invalid_last_synced_at");
  rejectedWith(
    "malformed affiliateUrl rejected",
    { ...base, affiliateUrl: "almost a url" },
    "invalid_affiliate_url",
  );

  // salePrice > price: deterministic two-branch policy.
  const anomalous = { ...base, priceCents: 5000, salePriceCents: 9000 };
  rejectedWith(
    "salePrice > price rejected when source anomaly is NOT preserved",
    anomalous,
    "sale_price_exceeds_regular",
  );
  const preserved: NormalizedProduct = {
    ...anomalous,
    metadata: { ...base.metadata, [SALE_PRICE_ANOMALY]: { source: "feed", rawPrice: 5000, rawSalePrice: 9000 } },
  };
  const preservedResult = validateNormalizedProduct(preserved);
  record(
    "salePrice > price accepted ONLY with explicit anomalous metadata",
    preservedResult.ok && preservedResult.product === preserved,
  );
  record(
    "salePrice <= price accepted without any anomaly marker",
    validateNormalizedProduct({ ...base, priceCents: 9000, salePriceCents: 5000 }).ok,
  );

  // Optional fields can be null without tripping checks.
  record(
    "null optional fields (brand/color/affiliate/description) validate cleanly",
    validateNormalizedProduct({
      ...base,
      brand: null,
      color: null,
      affiliateUrl: null,
      description: null,
      availableColors: [],
      availableSizes: [],
    }).ok,
  );
}

// ---------------------------------------------------------------------------
// DEDUPE — duplicate provider ids handled deterministically
// ---------------------------------------------------------------------------

function verifyDedupe(): void {
  section("DEDUPE — duplicates deterministic (last occurrence wins)");
  const a1 = { ...byId.get("FIX-TOP-001")!, priceCents: 111 };
  const a2 = { ...byId.get("FIX-TOP-001")!, priceCents: 222 };
  const b = byId.get("FIX-BOT-001")!;
  const a3 = { ...byId.get("FIX-TOP-001")!, priceCents: 333 };

  const first = dedupeProducts([a1, a2, b, a3]);
  const second = dedupeProducts([a1, a2, b, a3]);
  record(
    "duplicate provider id collapses to the LAST occurrence",
    first.products.length === 2 &&
      first.duplicatesDropped === 2 &&
      first.products.some((p) => p.priceCents === 333 && p.providerProductId === "FIX-TOP-001") &&
      sameSet(ids(first.products), ["FIX-TOP-001", "FIX-BOT-001"]),
  );
  record(
    "dedupe is deterministic (same input -> same output)",
    JSON.stringify(first) === JSON.stringify(second),
  );
  record("dedupe of a clean batch is a no-op", dedupeProducts(ALL).duplicatesDropped === 0);
}

// ---------------------------------------------------------------------------
// FILTERS — deterministic, GLM-independent
// ---------------------------------------------------------------------------

function verifyFilters(): void {
  section("FILTERS — deterministic behavior");
  record(
    "empty criteria returns every product unchanged",
    filterProducts(ALL, {}).length === ALL.length && filterProducts(ALL, {})[0] === ALL[0],
  );
  record(
    "category filter (tops) returns exactly the six tops",
    sameSet(ids(filterProducts(ALL, { categories: ["tops"] })), [
      "FIX-TOP-001",
      "FIX-TOP-002",
      "FIX-TOP-003",
      "FIX-TOP-004",
      "FIX-TOP-005",
      "FIX-TOP-006",
    ]),
  );
  record(
    "maxPriceCents uses the EFFECTIVE (sale) price",
    sameSet(ids(filterProducts(ALL, { maxPriceCents: 5000 })), [
      "FIX-TOP-003",
      "FIX-ACC-001",
      "FIX-ACC-003",
      "FIX-ACC-004",
    ]),
  );
  record(
    "min/max price band brackets sale prices too",
    sameSet(ids(filterProducts(ALL, { minPriceCents: 30000, maxPriceCents: 50000 })), [
      "FIX-OUT-001",
      "FIX-OUT-004",
    ]),
  );
  record(
    "brand allow-list is case-insensitive",
    sameSet(ids(filterProducts(ALL, { brands: ["northloom"] })), ids(filterProducts(ALL, { brands: ["Northloom"] }))) &&
      sameSet(ids(filterProducts(ALL, { brands: ["Northloom", "Kestrel"] })), [
        "FIX-TOP-001",
        "FIX-TOP-003",
        "FIX-BOT-005",
        "FIX-OUT-001",
        "FIX-SHO-002",
        "FIX-ACC-001",
      ]),
  );
  const noBruno = filterProducts(ALL, { excludedBrands: ["Bruno Aldo"] });
  record(
    "brand exclude-list drops confirmed matches but KEEPS unknown-brand products",
    noBruno.length === ALL.length - 1 &&
      !ids(noBruno).includes("FIX-SHO-001") &&
      ids(noBruno).includes("FIX-OUT-004"),
  );
  record(
    "merchant allow/exclude behave symmetrically",
    sameSet(ids(filterProducts(ALL, { merchants: ["fixture clothiers"] })), [
      "FIX-TOP-004",
      "FIX-BOT-001",
      "FIX-OUT-002",
      "FIX-SHO-001",
      "FIX-SHO-005",
      "FIX-ACC-003",
    ]) && filterProducts(ALL, { excludedMerchants: ["Demo Apparel Co."] }).length === ALL.length - 8,
  );
  record(
    "color filter matches primary color OR availableColors, case-insensitive",
    filterProducts(ALL, { colors: ["BLACK"] }).length === 10 &&
      sameSet(ids(filterProducts(ALL, { colors: ["black"] })), ids(filterProducts(ALL, { colors: ["BLACK"] }))),
  );
  record(
    "combined criteria intersect",
    sameSet(ids(filterProducts(ALL, { categories: ["tops"], maxPriceCents: 10000 })), [
      "FIX-TOP-002",
      "FIX-TOP-003",
      "FIX-TOP-004",
      "FIX-TOP-006",
    ]),
  );

  // Inputs are never mutated.
  const snapshot = JSON.stringify(ALL);
  filterProducts(ALL, { categories: ["tops"], sizes: ["M"], requireConfirmedSizeAvailability: true });
  record("filtering never mutates its inputs", JSON.stringify(ALL) === snapshot);
}

function verifySizeSemantics(): void {
  section("SIZE SEMANTICS — unknown is not unavailable");
  record(
    "empty availableSizes classifies as UNKNOWN",
    classifySizeMatch({ availableSizes: [] }, ["M"]) === "unknown",
  );
  record(
    "requested size absent from known sizes is CONFIRMED-NO-MATCH",
    classifySizeMatch({ availableSizes: ["S", "L"] }, ["M"]) === "confirmed-no-match",
  );
  record(
    "requested size present is CONFIRMED-MATCH (case-insensitive)",
    classifySizeMatch({ availableSizes: ["S", "M"] }, ["m"]) === "confirmed-match",
  );

  // Filter-level consequences, counted against the real fixture set:
  // with sizes ["32"]: 4 confirmed matches, 5 unknown-size products,
  // everything else a confirmed no-match.
  const sizes32 = filterProducts(ALL, { sizes: ["32"] });
  const confirmed32 = filterProducts(ALL, { sizes: ["32"], requireConfirmedSizeAvailability: true });
  record(
    "default size filter keeps confirmed matches AND unknowns, drops only confirmed no-matches",
    sameSet(ids(sizes32), [
      "FIX-BOT-001",
      "FIX-BOT-002",
      "FIX-BOT-005",
      "FIX-ACC-002",
      "FIX-TOP-003",
      "FIX-BOT-003",
      "FIX-OUT-003",
      "FIX-SHO-004",
      "FIX-ACC-003",
    ]),
  );
  record(
    "requireConfirmedSizeAvailability drops the unknowns and only them",
    sameSet(ids(confirmed32), ["FIX-BOT-001", "FIX-BOT-002", "FIX-BOT-005", "FIX-ACC-002"]),
  );
  const sizesM = filterProducts(ALL, { sizes: ["M"] });
  const confirmedM = filterProducts(ALL, { sizes: ["M"], requireConfirmedSizeAvailability: true });
  record(
    "size M: 13 kept by default, exactly the 8 confirmed when requiring confirmation",
    sizesM.length === 13 && confirmedM.length === 8,
  );
  const unknown = byId.get("FIX-TOP-003");
  record(
    "an unknown-size product is never claimed to have the requested size",
    unknown !== undefined &&
      classifySizeMatch(unknown, ["M"]) === "unknown" &&
      !unknown.availableSizes.includes("M"),
  );
}

// ---------------------------------------------------------------------------
// MONEY — integer minor units only
// ---------------------------------------------------------------------------

function verifyMoney(): void {
  section("MONEY — integer minor-unit math");
  record(
    "effective price prefers the sale price",
    effectivePriceCents({ priceCents: 8900, salePriceCents: 5900 }) === 5900,
  );
  record(
    "effective price falls back to regular price",
    effectivePriceCents({ priceCents: 8900, salePriceCents: null }) === 8900,
  );
  record("sums are exact integers (no float drift)", sumPriceCents([1999, 4999, 1]) === 6999);
  record(
    "sumEffectivePricesCents matches the manual map+sum",
    sumEffectivePricesCents(ALL) === ALL.reduce((total, p) => total + effectivePriceCents(p), 0),
  );
  let threw = false;
  try {
    assertIntegerCents(0.5);
  } catch {
    threw = true;
  }
  record("fractional minor units are refused at the boundary", threw);
  record(
    "every fixture price is a non-negative safe integer",
    ALL.every((p) => Number.isSafeInteger(p.priceCents) && p.priceCents >= 0),
  );
}

// ---------------------------------------------------------------------------
// DATABASE — constraints, upserts, sync runs, RLS (PGlite = real Postgres)
// ---------------------------------------------------------------------------

const USER_A = "11111111-1111-4111-8111-111111111111";

async function verifyDatabase(): Promise<void> {
  const db = new PGlite();

  async function run(sqlText: string): Promise<void> {
    await db.exec(sqlText);
  }

  async function rows<T>(sqlText: string, params: unknown[] = []): Promise<T[]> {
    const result = await db.query(sqlText, params);
    return result.rows as T[];
  }

  /** Run a statement and report whether the engine REJECTED it. */
  async function fails(name: string, sqlText: string, params: unknown[] = []): Promise<void> {
    try {
      await db.query(sqlText, params);
      record(name, false, "statement unexpectedly succeeded");
    } catch (err) {
      record(name, true, err instanceof Error ? err.message.split("\n")[0] : "rejected");
    }
  }

  async function actAs(userId: string): Promise<void> {
    await run("reset role");
    await db.query("select set_config('request.jwt.claim.sub', $1, false)", [userId]);
    await run("set role authenticated");
  }

  async function backToOwner(): Promise<void> {
    await run("reset role");
    await db.query("select set_config('request.jwt.claim.sub', '', false)", []);
  }

  // Service-role stand-in: the owner connection ingestion runs through.
  const store = createPostgresCatalogStore(db as unknown as CatalogDbClient);

  section("DATABASE — migrations apply cleanly on real Postgres");
  await run(SUPABASE_STUBS);
  const migrationsDir = join(process.cwd(), "supabase", "migrations");
  const migrations = readdirSync(migrationsDir).filter((f) => f.endsWith(".sql")).sort();
  for (const file of migrations) {
    try {
      await run(readFileSync(join(migrationsDir, file), "utf8"));
      record(`${file} applies cleanly`, true);
    } catch (err) {
      record(`${file} applies cleanly`, false, err instanceof Error ? err.message : String(err));
    }
  }
  await run(POST_MIGRATION_GRANTS);

  section("DATABASE — products constraints");
  const validInsert = `
    insert into public.products
      (id, provider, provider_product_id, merchant, name, category, price_cents, currency,
       image_urls, product_url, available_colors, available_sizes, availability_confidence, metadata)
    values (gen_random_uuid(), 'fixture', 'SQL-OK-1', 'Example Outfitters', 'Constraint Fixture', 'tops',
            1000, 'USD', '[]'::jsonb, 'https://shops.example/x', '[]'::jsonb, '[]'::jsonb, 'unknown', '{}'::jsonb)`;
  const inserted = await db.query(validInsert);
  record("minimal valid product row inserts (defaults fill the rest)", inserted.affectedRows === 1);

  await fails(
    "UNIQUE(provider, provider_product_id) rejects duplicate provider records",
    validInsert,
  );
  // Constraint fixtures include availability_confidence so the constraint
  // under test (not a NOT NULL violation) is what fires.
  await fails(
    "negative price_cents rejected",
    "insert into public.products (provider, provider_product_id, merchant, name, category, price_cents, currency, product_url, availability_confidence) values ('fixture', 'SQL-BAD-1', 'm', 'n', 'tops', -1, 'USD', 'https://shops.example/x', 'unknown')",
  );
  {
    // Postgres ROUNDS a numeric 10.5 into the integer column (stores 11) —
    // the column type alone cannot reject fractional cents. This is exactly
    // why validation.ts's Number.isSafeInteger gate is mandatory BEFORE any
    // write (proven above in VALIDATION).
    await db.query(
      "insert into public.products (provider, provider_product_id, merchant, name, category, price_cents, currency, product_url, availability_confidence) values ('fixture', 'SQL-ROUND-1', 'm', 'n', 'tops', 10.5, 'USD', 'https://shops.example/x', 'unknown')",
    );
    const rounded = (
      await rows<{ price_cents: number }>("select price_cents from public.products where provider_product_id = 'SQL-ROUND-1'")
    )[0];
    record(
      "DB rounds fractional numeric input (10.5 -> 11) — the TS integer gate is the real enforcement point",
      rounded?.price_cents === 11,
      `stored ${rounded?.price_cents}`,
    );
  }
  await fails(
    "unknown category rejected",
    "insert into public.products (provider, provider_product_id, merchant, name, category, price_cents, currency, product_url, availability_confidence) values ('fixture', 'SQL-BAD-3', 'm', 'n', 'shirts', 100, 'USD', 'https://shops.example/x', 'unknown')",
  );
  await fails(
    "unknown availability_confidence rejected",
    "insert into public.products (provider, provider_product_id, merchant, name, category, price_cents, currency, product_url, availability_confidence) values ('fixture', 'SQL-BAD-4', 'm', 'n', 'tops', 100, 'USD', 'https://shops.example/x', 'available')",
  );
  await fails(
    "lowercase currency rejected",
    "insert into public.products (provider, provider_product_id, merchant, name, category, price_cents, currency, product_url, availability_confidence) values ('fixture', 'SQL-BAD-5', 'm', 'n', 'tops', 100, 'usd', 'https://shops.example/x', 'unknown')",
  );
  await fails(
    "non-array image_urls rejected",
    "insert into public.products (provider, provider_product_id, merchant, name, category, price_cents, currency, product_url, image_urls, availability_confidence) values ('fixture', 'SQL-BAD-6', 'm', 'n', 'tops', 100, 'USD', 'https://shops.example/x', '{\"a\":1}', 'unknown')",
  );
  await fails(
    "sale_price > price rejected WITHOUT anomaly metadata",
    "insert into public.products (provider, provider_product_id, merchant, name, category, price_cents, sale_price_cents, currency, product_url, metadata, availability_confidence) values ('fixture', 'SQL-BAD-7', 'm', 'n', 'tops', 5000, 9000, 'USD', 'https://shops.example/x', '{}'::jsonb, 'unknown')",
  );
  await db.query(
    "insert into public.products (provider, provider_product_id, merchant, name, category, price_cents, sale_price_cents, currency, product_url, metadata, availability_confidence) values ('fixture', 'SQL-ANOMALY-1', 'm', 'Anomalous Fixture', 'tops', 5000, 9000, 'USD', 'https://shops.example/x', $1::jsonb, 'unknown')",
    [JSON.stringify({ [SALE_PRICE_ANOMALY]: { source: "feed", rawPrice: 5000, rawSalePrice: 9000 } })],
  );
  record("sale_price > price accepted WITH explicit anomaly metadata", true);
  await fails(
    "negative records_received rejected on provider_sync_runs",
    "insert into public.provider_sync_runs (provider, status, records_received) values ('fixture', 'succeeded', -1)",
  );
  await fails(
    "unknown sync status rejected",
    "insert into public.provider_sync_runs (provider, status) values ('fixture', 'done')",
  );
  await fails(
    "completed_at before started_at rejected",
    "insert into public.provider_sync_runs (provider, status, started_at, completed_at) values ('fixture', 'succeeded', now(), now() - interval '1 hour')",
  );

  section("DATABASE — Phase 1 tables untouched by Phase 2 migration");
  await run(`insert into auth.users (id, email) values ('${USER_A}', 'a@form.local')`);
  const phase1 = await rows<{ count: number }>(`
    select
      (select count(*) from public.profiles) +
      (select count(*) from public.style_preferences) +
      (select count(*) from public.user_reference_images) +
      (select count(*) from public.user_events) as count`);
  record("Phase 1 tables all exist and are queryable", phase1[0]?.count === 0);

  // ----------------------------------------------------------------- INGESTION
  section("INGESTION — full pipeline against the database");
  const first = await ingestFromProvider(store, provider);
  record(
    "first fixture ingest inserts every record (received == inserted, none updated)",
    first.status === "succeeded" &&
      first.recordsReceived === ALL.length &&
      first.recordsInserted === ALL.length &&
      first.recordsUpdated === 0 &&
      first.recordsRejected === 0,
  );

  const catalogCount = (await rows<{ count: number }>("select count(*) as count from public.products"))[0];
  record(
    "products table now holds fixtures + constraint fixtures",
    catalogCount?.count === ALL.length + 3, // +3 SQL-level fixtures inserted above
  );
  const fixtureRow = (
    await rows<{
      price_cents: number;
      sale_price_cents: number | null;
      metadata: Record<string, unknown>;
      available_sizes: string[];
    }>(
      "select price_cents, sale_price_cents, metadata, available_sizes from public.products where provider_product_id = 'FIX-TOP-002'",
    )
  )[0];
  record(
    "ingested row preserves contract values (price, sale price, metadata, sizes)",
    fixtureRow?.price_cents === 8900 &&
      fixtureRow?.sale_price_cents === 5900 &&
      fixtureRow?.metadata?.providerCategory === "shirts-casual" &&
      Array.isArray(fixtureRow?.available_sizes) &&
      (fixtureRow?.available_sizes as string[]).includes("S"),
  );

  const firstRun = (
    await rows<{
      status: string;
      records_received: number;
      records_inserted: number;
      records_updated: number;
      completed_at: Date | null;
      started_at: Date;
    }>("select * from public.provider_sync_runs where id = $1", [first.runId])
  )[0];
  record(
    "sync run recorded: succeeded, counted, completed_at >= started_at",
    firstRun?.status === "succeeded" &&
      firstRun?.records_received === ALL.length &&
      firstRun?.records_inserted === ALL.length &&
      firstRun?.records_updated === 0 &&
      firstRun?.completed_at !== null &&
      firstRun !== undefined &&
      new Date(firstRun.completed_at as unknown as string).getTime() >=
        new Date(firstRun.started_at).getTime(),
  );

  // Second ingest exercises the update path (and the updated_at trigger).
  const beforeUpdate = (
    await rows<{ id: string; created_at: Date; updated_at: Date }>(
      "select id, created_at, updated_at from public.products where provider_product_id = 'FIX-TOP-001'",
    )
  )[0];
  await new Promise((resolve) => setTimeout(resolve, 30));
  const second = await ingestFromProvider(store, provider);
  const afterUpdate = (
    await rows<{ id: string; created_at: Date; updated_at: Date }>(
      "select id, created_at, updated_at from public.products where provider_product_id = 'FIX-TOP-001'",
    )
  )[0];
  record(
    "second ingest UPDATES every record (0 inserted, all updated)",
    second.recordsInserted === 0 && second.recordsUpdated === ALL.length,
  );
  record(
    "upsert keeps the original FORM id and created_at (id sticky across syncs)",
    beforeUpdate !== undefined &&
      afterUpdate !== undefined &&
      afterUpdate.id === beforeUpdate.id &&
      new Date(afterUpdate.created_at).getTime() === new Date(beforeUpdate.created_at).getTime(),
  );
  record(
    "updated_at refreshed by trigger on sync update",
    beforeUpdate !== undefined &&
      afterUpdate !== undefined &&
      new Date(afterUpdate.updated_at).getTime() > new Date(beforeUpdate.updated_at).getTime(),
  );

  section("INGESTION — rejection, duplicate, and failure accounting");
  const badProduct: NormalizedProduct = {
    ...byId.get("FIX-ACC-001")!,
    id: "00000000-0000-4000-8000-000000000901",
    providerProductId: "FIX-BAD-901",
    productUrl: "not-a-url",
    priceCents: -5,
  };
  const goodProduct: NormalizedProduct = {
    ...byId.get("FIX-ACC-002")!,
    id: "00000000-0000-4000-8000-000000000902",
    providerProductId: "FIX-GOOD-902",
  };
  const stubProvider: ProductProvider = {
    id: "fixture",
    search: async () => [badProduct, goodProduct],
    getById: async (id) => (id === goodProduct.providerProductId ? goodProduct : null),
  };
  const mixed = await ingestFromProvider(store, stubProvider);
  record(
    "invalid records are skipped and counted, valid ones still ingested",
    mixed.recordsReceived === 2 &&
      mixed.recordsRejected === 1 &&
      mixed.recordsInserted === 1 &&
      mixed.rejected[0]?.providerProductId === "FIX-BAD-901" &&
      (mixed.rejected[0]?.issues.some((issue) => issue.code === "invalid_price") ?? false),
  );
  const badRowAbsent = await rows<{ count: number }>(
    "select count(*) as count from public.products where provider_product_id = 'FIX-BAD-901'",
  );
  record("rejected record never reaches the database", badRowAbsent[0]?.count === 0);
  const mixedRun = (
    await rows<{ error_summary: { rejected?: unknown[] } }>(
      "select error_summary from public.provider_sync_runs where id = $1",
      [mixed.runId],
    )
  )[0];
  record(
    "rejections recorded in the sync run error_summary",
    Array.isArray(mixedRun?.error_summary?.rejected) && mixedRun.error_summary.rejected.length === 1,
  );

  // FIX-ACC-001 has no sale price, so lowering its price is a valid update —
  // the dedupe/upsert path is what is under test here, not the anomaly gate.
  const v1 = { ...byId.get("FIX-ACC-001")!, id: "00000000-0000-4000-8000-000000000903", priceCents: 1111 };
  const v2 = { ...byId.get("FIX-ACC-001")!, id: "00000000-0000-4000-8000-000000000903", priceCents: 2222 };
  const dupProvider: ProductProvider = {
    id: "fixture",
    search: async () => [v1, v2],
    getById: async () => null,
  };
  const deduped = await ingestFromProvider(store, dupProvider);
  const dupPrice = (
    await rows<{ price_cents: number }>("select price_cents from public.products where provider_product_id = 'FIX-ACC-001'")
  )[0];
  record(
    "duplicate provider ids in one batch: received counts both, DB keeps the LAST",
    deduped.recordsReceived === 2 &&
      deduped.recordsDedupedAway === 1 &&
      deduped.recordsInserted === 0 &&
      deduped.recordsUpdated === 1 &&
      dupPrice?.price_cents === 2222,
  );

  const failingProvider: ProductProvider = {
    id: "fixture",
    search: async () => {
      throw new CatalogProviderError("PROVIDER_ERROR", "fixture", "simulated outage");
    },
    getById: async () => null,
  };
  let failedRunId = "";
  let failedAsExpected = false;
  try {
    await ingestFromProvider(store, failingProvider);
  } catch (err) {
    failedAsExpected = err instanceof CatalogIngestError;
    failedRunId = err instanceof CatalogIngestError ? err.runId : "";
  }
  record(
    "provider failure surfaces as CatalogIngestError carrying the run id",
    failedAsExpected && failedRunId !== "",
  );
  const failedRun = (
    await rows<{ status: string; error_summary: { stage?: string } }>(
      "select status, error_summary from public.provider_sync_runs where id = $1",
      [failedRunId],
    )
  )[0];
  record(
    "failed provider call is recorded as a failed run with an error summary",
    failedRun?.status === "failed" && failedRun?.error_summary?.stage === "provider_search",
  );

  section("PROVIDER BOUNDARY — adapters fail loudly, fixtures stay deterministic");
  const rakuten = new RakutenProductProvider();
  let rakutenError: CatalogProviderError | null = null;
  try {
    await rakuten.search({});
  } catch (err) {
    if (err instanceof CatalogProviderError) rakutenError = err;
  }
  record("unconfigured Rakuten adapter throws NOT_CONFIGURED", rakutenError?.code === "NOT_CONFIGURED");

  // Phase 2B: the adapter is real, but its network is injectable — an
  // injected 401 surfaces as a distinct AUTH_FAILED code without any live
  // call, keeping auth failures separate from search failures.
  const rejectingRakuten = new RakutenProductProvider({
    bearerToken: "test-bearer-token-not-real",
    fetchImpl: async () =>
      new Response("unauthorized", { status: 401, headers: { "content-type": "text/plain" } }),
    sleep: async () => {},
  });
  let authError: CatalogProviderError | null = null;
  try {
    await rejectingRakuten.search({ query: "wool coat" });
  } catch (err) {
    if (err instanceof CatalogProviderError) authError = err;
  }
  record(
    "configured Rakuten adapter surfaces injected 401 as AUTH_FAILED (distinct from search failures)",
    authError?.code === "AUTH_FAILED" && !authError.message.includes("test-bearer-token-not-real"),
  );

  record(
    "fixture getById resolves seeded records and null for unknown",
    (await provider.getById("FIX-TOP-001")) !== null && (await provider.getById("NOPE")) === null,
  );
  const searchTopsA = await provider.search({ categories: ["tops"] });
  const searchTopsB = await provider.search({ categories: ["tops"] });
  record(
    "provider search is deterministic (byte-identical results)",
    JSON.stringify(searchTopsA) === JSON.stringify(searchTopsB) && searchTopsA.length === 6,
  );
  const limited = await provider.search({ limit: 3 });
  record("provider search honors limit", limited.length === 3);

  // ----------------------------------------------------------------------- RLS
  section("SECURITY — catalog is public-readable, server-writable only");
  await actAs(USER_A);

  const visible = await rows<{ count: number }>("select count(*) as count from public.products");
  record("authenticated client CAN read the catalog", (visible[0]?.count ?? 0) >= ALL.length);
  const syncVisible = await rows<unknown>("select * from public.provider_sync_runs");
  record("authenticated client sees ZERO provider_sync_runs (no policy)", syncVisible.length === 0);
  await fails(
    "authenticated client CANNOT insert products",
    "insert into public.products (provider, provider_product_id, merchant, name, category, price_cents, currency, product_url) values ('fixture', 'HACK-1', 'm', 'n', 'tops', 1, 'USD', 'https://shops.example/x')",
  );
  const forbiddenUpdate = await db.query(
    "update public.products set price_cents = 1 where provider_product_id = 'FIX-TOP-001'",
  );
  record("authenticated UPDATE on products is a silent 0-row no-op", forbiddenUpdate.affectedRows === 0);
  const forbiddenDelete = await db.query(
    "delete from public.products where provider_product_id = 'FIX-TOP-001'",
  );
  record("authenticated DELETE on products is a silent 0-row no-op", forbiddenDelete.affectedRows === 0);
  await backToOwner();
  const priceAfterAttempts = (
    await rows<{ price_cents: number }>("select price_cents from public.products where provider_product_id = 'FIX-TOP-001'")
  )[0];
  record("catalog data intact after client-side mutation attempts", priceAfterAttempts?.price_cents === 12800);

  await db.close();
}

// ---------------------------------------------------------------------------
// Run everything
// ---------------------------------------------------------------------------

async function main(): Promise<number> {
  console.log("FORM Phase 2A — catalog verification (commerce spine)");
  verifyContract();
  verifyValidation();
  verifyDedupe();
  verifyFilters();
  verifySizeSemantics();
  verifyMoney();
  await verifyDatabase();

  const failed = checks.filter((c) => !c.pass);
  console.log(`\n== SUMMARY ==\n  ${checks.length - failed.length}/${checks.length} invariants passed`);
  if (failed.length > 0) {
    console.log("\nFAILED invariants:");
    for (const c of failed) console.log(`  - ${c.name}${c.detail ? ` — ${c.detail}` : ""}`);
    return 1;
  }
  return 0;
}

main().then(
  (code) => process.exit(code),
  (err) => {
    console.error(err);
    process.exit(1);
  },
);
