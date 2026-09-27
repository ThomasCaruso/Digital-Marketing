/**
 * FORM Phase 2A catalog smoke test — hosted-Supabase verification of the
 * commerce spine's security and constraint posture.
 *
 * Run:  npm run smoke:catalog   (hosted credentials in .env.local)
 *
 * Proves, against the LIVE project after `supabase db push`:
 *
 *   SERVICE ROLE  trusted server-side writes work end to end: insert,
 *                 UNIQUE(provider, provider_product_id) rejection, upsert
 *                 (id stays sticky, price refreshes), sale-price anomaly
 *                 CHECK (rejected without metadata, accepted with it),
 *                 provider_sync_runs lifecycle.
 *
 *   AUTHENTICATED a real signed-in user can READ the catalog, cannot write
 *                 products, and sees ZERO provider_sync_runs.
 *
 *   ANON          unauthenticated client: zero catalog rows, zero sync-run
 *                 rows, every write rejected.
 *
 *   CLEANUP       every row this smoke creates is removed; the test user is
 *                 deleted. Phase 1 tables are left untouched.
 *
 * Environment: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
 * (auto-loaded from .env.local / .env — same as smoke-profile.ts).
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// ---------------------------------------------------------------------------
// Environment (identical loading to scripts/smoke-profile.ts)
// ---------------------------------------------------------------------------

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

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error(
    "Missing SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY.\n" +
      "Provide hosted-project credentials via .env.local (never commit real keys).",
  );
  process.exit(2);
}

const URL_BASE: string = SUPABASE_URL;
const ANON_KEY: string = SUPABASE_ANON_KEY;
const SERVICE_KEY: string = SUPABASE_SERVICE_ROLE_KEY;

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

function clientWith(key: string): SupabaseClient {
  return createClient(URL_BASE, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

const admin = clientWith(SERVICE_KEY); // fixture setup/cleanup + trusted server writes
const anon = clientWith(ANON_KEY); // RLS negative tests

const EMAIL = "catalog-smoke@form.local";
const PASSWORD = "form-smoke-1!";
const PROVIDER = "smoke-catalog"; // every row this smoke writes carries this marker

const RUN_ID = "00000000-0000-4000-8000-00000000c001";
const PRODUCT_ID = "00000000-0000-4000-8000-00000000d001";

function smokeProduct(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: PRODUCT_ID,
    provider: PROVIDER,
    provider_product_id: "SMOKE-1",
    merchant: "Smoke Fixture Merchant",
    brand: null,
    name: "Catalog Smoke Fixture",
    description: null,
    category: "accessories",
    subcategory: null,
    price_cents: 4200,
    sale_price_cents: null,
    currency: "USD",
    image_urls: ["https://img.example/smoke-1.jpg"],
    product_url: "https://shops.example/smoke-catalog/smoke-1",
    affiliate_url: null,
    color: "navy",
    available_colors: ["navy"],
    available_sizes: [],
    availability_confidence: "unknown",
    metadata: { source: "smoke", note: "Phase 2A smoke fixture — deleted at end of run" },
    ...overrides,
  };
}

async function removeSmokeUser(): Promise<void> {
  const { data: list } = await admin.auth.admin.listUsers();
  const existing = list.users.find((u) => u.email === EMAIL);
  if (existing) await admin.auth.admin.deleteUser(existing.id);
}

async function cleanupSmokeRows(): Promise<void> {
  await admin.from("products").delete().eq("provider", PROVIDER);
  await admin.from("provider_sync_runs").delete().eq("provider", PROVIDER);
}

async function signIn(email: string): Promise<{ client: SupabaseClient; userId: string }> {
  const client = clientWith(ANON_KEY);
  const { data, error } = await client.auth.signInWithPassword({ email, password: PASSWORD });
  if (error || !data.session) throw new Error(`sign-in failed for ${email}: ${error?.message}`);
  return { client, userId: data.user.id };
}

// ---------------------------------------------------------------------------
// Smoke run
// ---------------------------------------------------------------------------

let exitCode = 0;

try {
  console.log(`FORM Phase 2A catalog smoke — ${URL_BASE}`);

  section("FIXTURE SETUP (service role)");
  await cleanupSmokeRows();
  await removeSmokeUser();
  const { data: userData, error: userError } = await admin.auth.admin.createUser({
    email: EMAIL,
    password: PASSWORD,
    email_confirm: true,
  });
  record("smoke user created (fixture only)", !userError && Boolean(userData.user));

  // ------------------------------------------------------------ SERVICE ROLE
  section("SERVICE ROLE — trusted server-side catalog writes");
  const ins = await admin.from("products").insert(smokeProduct()).select("id").single();
  record("insert minimal valid product", ins.error === null && ins.data?.id === PRODUCT_ID, ins.error?.message);

  const dup = await admin.from("products").insert(smokeProduct({ id: undefined }));
  record(
    "UNIQUE(provider, provider_product_id) enforced on hosted (409)",
    dup.error !== null && dup.error.code === "23505",
    dup.error?.message,
  );

  const upsert = await admin
    .from("products")
    .upsert(smokeProduct({ price_cents: 5100, id: undefined }), { onConflict: "provider,provider_product_id" })
    .select("id, price_cents")
    .single();
  record(
    "upsert refreshes price and keeps the original FORM id sticky",
    upsert.error === null && upsert.data?.id === PRODUCT_ID && upsert.data?.price_cents === 5100,
    upsert.error?.message,
  );

  const badSale = await admin
    .from("products")
    .insert(smokeProduct({ provider_product_id: "SMOKE-BAD-SALE", price_cents: 5000, sale_price_cents: 9000 }));
  record(
    "sale_price > price REJECTED without anomaly metadata (CHECK)",
    badSale.error !== null && badSale.error.code === "23514",
    badSale.error?.message,
  );

  const markedSale = await admin
    .from("products")
    .insert(
      smokeProduct({
        id: undefined, // DB default; PRODUCT_ID already belongs to SMOKE-1
        provider_product_id: "SMOKE-ANOMALY",
        price_cents: 5000,
        sale_price_cents: 9000,
        metadata: { source: "smoke", sale_price_anomaly: { source: "feed", rawPrice: 5000, rawSalePrice: 9000 } },
      }),
    )
    .select("id")
    .single();
  record(
    "sale_price > price accepted WITH explicit anomaly metadata",
    markedSale.error === null,
    markedSale.error?.message,
  );

  const runIns = await admin
    .from("provider_sync_runs")
    .insert({ id: RUN_ID, provider: PROVIDER, status: "running" })
    .select("id, status")
    .single();
  record("sync run opens in 'running' state", runIns.error === null && runIns.data?.status === "running", runIns.error?.message);

  // Both timestamps are set from the SAME (client) clock: mixing a client
  // completed_at with the DB-defaulted started_at would make the CHECK
  // constraint dependent on local-vs-hosted clock skew.
  const runUpd = await admin
    .from("provider_sync_runs")
    .update({
      status: "succeeded",
      started_at: new Date(Date.now() - 1000).toISOString(),
      completed_at: new Date().toISOString(),
      records_received: 2,
      records_inserted: 1,
      records_updated: 1,
    })
    .eq("id", RUN_ID)
    .select("status, records_received, records_inserted, records_updated, completed_at")
    .single();
  record(
    "sync run completes with counts and completed_at",
    runUpd.error === null &&
      runUpd.data?.status === "succeeded" &&
      runUpd.data?.records_received === 2 &&
      runUpd.data?.completed_at !== null,
    runUpd.error?.message,
  );

  // ----------------------------------------------------------- AUTHENTICATED
  section("AUTHENTICATED — read the catalog, never write it");
  const { client: userClient } = await signIn(EMAIL);

  const userRead = await userClient.from("products").select("provider_product_id").eq("provider", PROVIDER);
  record(
    "authenticated user CAN read catalog rows (SELECT policy)",
    userRead.error === null && (userRead.data?.length ?? 0) === 2,
    userRead.error?.message ?? `${userRead.data?.length} rows`,
  );

  const userInsert = await userClient.from("products").insert(smokeProduct({ provider_product_id: "SMOKE-HACK" }));
  record("authenticated user CANNOT insert products", userInsert.error !== null, userInsert.error?.message);

  const userUpdate = await userClient
    .from("products")
    .update({ price_cents: 1 }, { count: "exact" })
    .eq("provider", PROVIDER);
  record("authenticated UPDATE affects 0 rows (hidden by RLS)", userUpdate.error === null && userUpdate.count === 0);

  const userDelete = await userClient
    .from("products")
    .delete({ count: "exact" })
    .eq("provider", PROVIDER);
  record("authenticated DELETE affects 0 rows (hidden by RLS)", userDelete.error === null && userDelete.count === 0);

  const userSync = await userClient.from("provider_sync_runs").select("*");
  record("authenticated user sees ZERO provider_sync_runs", userSync.error === null && userSync.data?.length === 0);

  const userProfiles = await userClient.from("profiles").select("id");
  record("Phase 1 profile read still works for the smoke user (coexistence)", userProfiles.error === null);

  // -------------------------------------------------------------------- ANON
  section("ANON — catalog is invisible and unwritable");

  const anonRead = await anon.from("products").select("*");
  record("anon sees 0 product rows", anonRead.error === null && anonRead.data?.length === 0);

  const anonInsert = await anon.from("products").insert(smokeProduct({ provider_product_id: "SMOKE-ANON" }));
  record("anon CANNOT insert products", anonInsert.error !== null, anonInsert.error?.message);

  const anonSync = await anon.from("provider_sync_runs").select("*");
  record("anon sees 0 provider_sync_runs", anonSync.error === null && anonSync.data?.length === 0);

  const anonRunInsert = await anon.from("provider_sync_runs").insert({ provider: PROVIDER, status: "running" });
  record("anon CANNOT insert provider_sync_runs", anonRunInsert.error !== null, anonRunInsert.error?.message);

  // ----------------------------------------------------------------- CLEANUP
  section("CLEANUP (service role)");
  await cleanupSmokeRows();
  const leftoverProducts = await admin.from("products").select("id", { count: "exact" }).eq("provider", PROVIDER);
  const leftoverRuns = await admin.from("provider_sync_runs").select("id", { count: "exact" }).eq("provider", PROVIDER);
  record(
    "all smoke rows removed",
    leftoverProducts.count === 0 && leftoverRuns.count === 0,
    `${leftoverProducts.count} products, ${leftoverRuns.count} runs`,
  );
  await removeSmokeUser();
  record("smoke user removed", true);
} catch (err) {
  record("smoke ran to completion", false, err instanceof Error ? err.message : String(err));
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
