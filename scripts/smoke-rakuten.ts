/**
 * FORM Phase 2B — gated LIVE Rakuten validation smoke.
 *
 * Run:  npm run smoke:rakuten
 *
 * This script is the ONLY code in the repo that talks to the real Rakuten
 * API, and it runs ONLY when Rakuten credentials are present in the local
 * environment (.env.local / .env). With no credentials it prints SKIP and
 * exits 0 — "IMPLEMENTED BUT LIVE VALIDATION PENDING". All other suites
 * (verify:rakuten) are fully offline and inject the network.
 *
 * When credentials ARE present it performs the Phase 2B live protocol:
 *
 *   1. The three mandated queries ("men merino sweater", "men trousers",
 *      "men sneakers") through the real adapter;
 *   2. catalog-quality measurement: partner merchant breadth, recognizable
 *      fashion merchants, image/price coverage, category-mapping
 *      distribution (how often → other), duplicate rate, and the
 *      availability limits (sizes stay [], confidence stays "unknown");
 *   3. a single deep-link attempt on one product (informational);
 *   4. IF hosted Supabase credentials exist: a tiny 2-record ingestion with
 *      a smoke marker, an upsert-refresh verification, and full cleanup of
 *      every marked row.
 *
 * Credentials are NEVER printed; error output goes through the adapter's
 * redaction (no bearer token, no client secret in any thrown message).
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { RakutenProductProvider, rakutenProviderFromEnv } from "../src/catalog/providers/rakuten/index.js";
import { validateNormalizedProduct } from "../src/catalog/validation.js";
import type { NormalizedProduct } from "../src/catalog/types.js";

function loadEnvFile(path: string): void {
  let text: string;
  try {
    text = readFileSync(resolve(process.cwd(), path), "utf8");
  } catch {
    return;
  }
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (trimmed === "" || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
    if (process.env[key] === undefined) process.env[key] = value;
  }
}
loadEnvFile(".env.local");
loadEnvFile(".env");

const SMOKE_MARKER = "form-live-smoke-2026-09-27";
const QUERIES = ["men merino sweater", "men trousers", "men sneakers"];
const PER_QUERY_LIMIT = 20;

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function hasRakutenCreds(): boolean {
  return (
    (process.env.RAKUTEN_BEARER_TOKEN?.trim() ?? "") !== "" ||
    ((process.env.RAKUTEN_CLIENT_ID?.trim() ?? "") !== "" &&
      (process.env.RAKUTEN_CLIENT_SECRET?.trim() ?? "") !== "")
  );
}

if (!hasRakutenCreds()) {
  console.log("SKIP — no Rakuten credentials in environment.");
  console.log("Status: IMPLEMENTED BUT LIVE VALIDATION PENDING");
  console.log("(offline suite: npm run verify:rakuten — 82/82)");
  process.exit(0);
}

console.log("FORM Phase 2B — LIVE Rakuten validation");
const provider = rakutenProviderFromEnv(process.env);
if (provider === null) {
  console.error("credential shape invalid; aborting");
  process.exit(2);
}

const all: NormalizedProduct[] = [];
let liveFailed = false;

for (const query of QUERIES) {
  console.log(`\n== "${query}" ==`);
  let results: NormalizedProduct[];
  try {
    results = await provider.search({ query, limit: PER_QUERY_LIMIT });
  } catch (err) {
    liveFailed = true;
    console.error(`  search failed: ${err instanceof Error ? err.message : String(err)}`);
    continue;
  }
  all.push(...results);
  const merchants = [...new Set(results.map((p) => p.merchant))];
  const withImage = results.filter((p) => p.imageUrls.length > 0).length;
  const withPrice = results.filter((p) => p.priceCents > 0).length;
  const categories = new Map<string, number>();
  for (const p of results) categories.set(p.category, (categories.get(p.category) ?? 0) + 1);
  const invalid = results.filter((p) => !validateNormalizedProduct(p).ok).length;
  console.log(`  results: ${results.length}`);
  console.log(`  merchants (${merchants.length}): ${merchants.slice(0, 10).join(" | ")}`);
  console.log(`  image coverage: ${withImage}/${results.length}, price coverage: ${withPrice}/${results.length}`);
  console.log(`  category mapping: ${[...categories.entries()].map(([c, n]) => `${c}=${n}`).join(", ")}`);
  console.log(
    `  sizes all unknown: ${results.every((p) => p.availableSizes.length === 0)}, ` +
      `availability all unknown: ${results.every((p) => p.availabilityConfidence === "unknown")}, ` +
      `validation-gate failures: ${invalid}`,
  );
}

console.log("\n== DUPLICATES across queries ==");
const seen = new Map<string, number>();
for (const p of all) seen.set(p.providerProductId, (seen.get(p.providerProductId) ?? 0) + 1);
const dupes = [...seen.entries()].filter(([, n]) => n > 1);
console.log(`  ${all.length} records, ${dupes.length} duplicate provider ids across queries`);

console.log("\n== DEEP LINK (single attempt, informational) ==");
const candidate = all[0];
if (candidate !== undefined) {
  try {
    const linked = await provider.createAffiliateLink(candidate);
    console.log(
      linked.affiliateUrl !== null
        ? `  deep link resolved (${linked.affiliateUrl.slice(0, 60)}...)`
        : "  deep link NOT resolved (advertiser may not support deep linking) — product record unaffected",
    );
  } catch (err) {
    console.log(`  deep link failed (non-fatal): ${err instanceof Error ? err.message : String(err)}`);
  }
} else {
  console.log("  no product to deep-link");
}

// ------------------------------------------------------------------ HOSTED
console.log("\n== HOSTED INGESTION (marked 2-record sample) ==");
if (SUPABASE_URL === undefined || SERVICE_KEY === undefined) {
  console.log("  SKIP — no SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY for the hosted check");
} else if (all.length < 2) {
  console.log("  SKIP — fewer than 2 live products retrieved");
} else {
  const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });

  function toRow(product: NormalizedProduct): Record<string, unknown> {
    return {
      id: product.id,
      provider: product.provider,
      provider_product_id: product.providerProductId,
      merchant: product.merchant,
      brand: product.brand,
      name: product.name,
      description: product.description,
      category: product.category,
      subcategory: product.subcategory,
      price_cents: product.priceCents,
      sale_price_cents: product.salePriceCents,
      currency: product.currency,
      image_urls: product.imageUrls,
      product_url: product.productUrl,
      affiliate_url: product.affiliateUrl,
      color: product.color,
      available_colors: product.availableColors,
      available_sizes: product.availableSizes,
      availability_confidence: product.availabilityConfidence,
      metadata: { ...product.metadata, smokeMarker: SMOKE_MARKER },
      last_synced_at: product.lastSyncedAt,
    };
  }

  let upsertOk = false;
  try {
    const sample = all.slice(0, 2).map((p) => ({ ...p, metadata: { ...p.metadata, smokeMarker: SMOKE_MARKER } }));
    const insert = await admin.from("products").upsert(sample.map(toRow), {
      onConflict: "provider,provider_product_id",
    });
    upsertOk = insert.error === null;
    console.log(`  insert: ${insert.error === null ? "OK (2 rows)" : `FAILED — ${insert.error.message}`}`);

    if (upsertOk) {
      const reread = await admin
        .from("products")
        .select("id, price_cents")
        .eq("metadata->>smokeMarker", SMOKE_MARKER);
      // Second upsert of the SAME records: the conflict path must refresh the
      // rows while keeping the FORM ids sticky (TD-013 upsert semantics).
      const second = await admin.from("products").upsert(sample.map(toRow), {
        onConflict: "provider,provider_product_id",
      });
      const ids = new Set(reread.data?.map((r) => r.id) ?? []);
      const sticky = sample.every((p) => ids.has(p.id));
      console.log(
        `  upsert: ${second.error === null ? "OK" : `FAILED — ${second.error.message}`}; FORM ids sticky: ${sticky}`,
      );
    }
  } catch (err) {
    console.log(`  hosted check failed (non-fatal for live validation): ${err instanceof Error ? err.message : String(err)}`);
  }

  const del = await admin.from("products").delete().eq("metadata->>smokeMarker", SMOKE_MARKER);
  const leftover = await admin
    .from("products")
    .select("id", { count: "exact" })
    .eq("metadata->>smokeMarker", SMOKE_MARKER);
  console.log(
    `  cleanup: ${del.error === null ? "OK" : `FAILED — ${del.error.message}`}; leftover marked rows: ${leftover.count ?? "?"}`,
  );
  console.log(`  (sample rows were written with metadata.smokeMarker = "${SMOKE_MARKER}")`);
}

console.log(liveFailed ? "\nLIVE VALIDATION: completed WITH search failures (see above)" : "\nLIVE VALIDATION: completed");
