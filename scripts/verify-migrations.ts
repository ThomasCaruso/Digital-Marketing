/**
 * FORM Phase 1 — SQL verification WITHOUT Docker.
 *
 * Runs every file in supabase/migrations against PGlite (a real PostgreSQL
 * engine compiled to WASM, in-process) after installing faithful stubs of the
 * Supabase interfaces this phase's SQL touches:
 *
 *   - the `authenticated` role (Supabase grants + RLS target)
 *   - auth.users table and auth.uid() (reads request.jwt.claim.sub, exactly
 *     as the Supabase auth schema defines it)
 *   - storage.buckets / storage.objects / storage.foldername, with RLS enabled
 *
 * What this PROVES: the migrations execute cleanly in order, constraints and
 * triggers fire, and the RLS policies enforce ownership (including across
 * users and for claim-less callers).
 *
 * What this does NOT prove: the hosted Supabase surfaces around them — the
 * storage HTTP API, Auth server, and Edge Functions runtime. Those are covered
 * by `npm run smoke` on a Docker machine (supabase start + functions serve).
 *
 * Run:  npm run verify:sql
 */

import { PGlite } from "@electric-sql/pglite";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const MIGRATIONS_DIR = join(process.cwd(), "supabase", "migrations");

// ---------------------------------------------------------------------------
// Supabase-interface stubs (installed before migrations).
// ---------------------------------------------------------------------------
const STUBS = `
create role authenticated nologin noinherit;
grant usage on schema public to authenticated;

create schema auth;
create table auth.users (id uuid primary key, email text);

create function auth.uid() returns uuid
language sql stable
as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;

create schema storage;
create table storage.buckets (
  id text primary key,
  name text not null,
  public boolean not null default false,
  file_size_limit bigint,
  allowed_mime_types text[]
);
create table storage.objects (
  id uuid primary key default gen_random_uuid(),
  bucket_id text not null,
  name text not null
);
create function storage.foldername(name text) returns text[]
language sql immutable
as $$ select string_to_array(name, '/') $$;

alter table storage.objects enable row level security;
grant usage on schema storage to authenticated;
grant all on all tables in schema storage to authenticated;
`;

// Applied AFTER the migrations (tables must exist before they can be granted).
const GRANTS = `
grant all on all tables in schema public to authenticated;
grant all on all sequences in schema public to authenticated;
`;

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

const db = new PGlite();

async function run(sqlText: string): Promise<void> {
  await db.exec(sqlText);
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

async function rows<T>(sqlText: string, params: unknown[] = []): Promise<T[]> {
  const result = await db.query(sqlText, params);
  return result.rows as T[];
}

/** Become `authenticated` with a given JWT subject ("" = no claim). */
async function actAs(userId: string): Promise<void> {
  await run("reset role");
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [userId]);
  await run("set role authenticated");
}

async function backToOwner(): Promise<void> {
  await run("reset role");
  await db.query("select set_config('request.jwt.claim.sub', '', false)", []);
}

/** PGlite parses timestamptz into JS Date objects; normalize to epoch millis. */
function epoch(value: unknown): number {
  return value instanceof Date ? value.getTime() : Date.parse(String(value));
}

const USER_A = "11111111-1111-4111-8111-111111111111";
const USER_B = "22222222-2222-4222-8222-222222222222";
const IMAGE_A = "33333333-3333-4333-8333-333333333333";
const PATH_A = `${USER_A}/${IMAGE_A}/front.png`;

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------

let exitCode = 0;

try {
  console.log("FORM Phase 1 — SQL verification on PGlite (Postgres WASM)");

  section("STUBS + MIGRATIONS");
  await run(STUBS);
  const files = readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith(".sql")).sort();
  for (const file of files) {
    try {
      await run(readFileSync(join(MIGRATIONS_DIR, file), "utf8"));
      record(`${file} applies cleanly`, true);
    } catch (err) {
      record(`${file} applies cleanly`, false, err instanceof Error ? err.message : String(err));
    }
  }
  await run(GRANTS);

  const buckets = await rows<{ id: string; public: boolean }>("select id, public from storage.buckets");
  record(
    "reference-photos bucket exists and is PRIVATE",
    buckets.length === 1 && buckets[0]?.id === "reference-photos" && buckets[0]?.public === false,
  );

  // Seed auth users (the FK target for every user-owned table).
  await run(`insert into auth.users (id, email) values ('${USER_A}', 'a@form.local'), ('${USER_B}', 'b@form.local')`);

  // ------------------------------------------------------------------- USER A
  section("USER A — constraints, triggers, happy path");
  await actAs(USER_A);

  await db.query(
    `insert into public.profiles (id, display_name, height, usual_top_size, waist, inseam, shoe_size, typical_budget, shopping_priority)
     values ($1, 'Smoke A', $2, 'M', '31', '32', '10', 35000, 'value')`,
    [USER_A, `6'0"`],
  );
  const profBefore = (await rows<{ created_at: unknown; updated_at: unknown }>("select created_at, updated_at from public.profiles where id = $1", [USER_A]))[0];
  // In-process execution can land both statements inside one host clock tick,
  // which would make now() identical; pause so the trigger's fresh now() is
  // strictly distinguishable.
  await new Promise((resolve) => setTimeout(resolve, 30));
  await db.query("update public.profiles set display_name = 'Smoke A Updated' where id = $1", [USER_A]);
  const profAfter = (await rows<{ display_name: string; created_at: unknown; updated_at: unknown }>("select display_name, created_at, updated_at from public.profiles where id = $1", [USER_A]))[0];
  record(
    "profiles UPDATE trigger refreshes updated_at",
    profBefore !== undefined &&
      profAfter !== undefined &&
      profAfter.display_name === "Smoke A Updated" &&
      epoch(profAfter.updated_at) > epoch(profAfter.created_at) &&
      epoch(profAfter.created_at) === epoch(profBefore.created_at),
  );

  await fails("profiles CHECK rejects negative budget", "update public.profiles set typical_budget = -1 where id = $1", [USER_A]);
  await fails("profiles CHECK rejects unknown shopping_priority", "update public.profiles set shopping_priority = 'whatever' where id = $1", [USER_A]);

  const prefCount = (
    await db.query(
      `insert into public.style_preferences (user_id, dimension, value, weight, source)
       values ($1, 'style', 'minimal', 0.5, 'onboarding'),
              ($1, 'color', 'black', 0.8, 'onboarding'),
              ($1, 'fit', 'relaxed-outerwear', -0.2, 'explicit_feedback')`,
      [USER_A],
    )
  ).affectedRows;
  record("style_preferences inserts 3 rows (incl. negative weight)", prefCount === 3);

  await fails("style_preferences CHECK rejects weight > 1",
    "insert into public.style_preferences (user_id, dimension, value, weight, source) values ($1, 'style', 'streetwear', 1.5, 'onboarding')", [USER_A]);
  await fails("style_preferences UNIQUE rejects duplicate (user, dimension, value)",
    "insert into public.style_preferences (user_id, dimension, value, weight, source) values ($1, 'style', 'minimal', 0.9, 'onboarding')", [USER_A]);

  await db.query(
    `insert into public.user_reference_images (id, user_id, storage_path, image_role, metadata)
     values ($1, $2, $3, 'front', '{"fixture":true}')`,
    [IMAGE_A, USER_A, PATH_A],
  );
  await fails("user_reference_images CHECK rejects unknown image_role",
    "insert into public.user_reference_images (user_id, storage_path, image_role) values ($1, $2, 'profile')", [USER_A, `${USER_A}/x/y.png`]);
  await fails("user_reference_images UNIQUE rejects duplicate storage_path",
    "insert into public.user_reference_images (id, user_id, storage_path, image_role) values (gen_random_uuid(), $1, $2, 'front')", [USER_A, PATH_A]);

  await db.query("insert into public.user_events (user_id, event_type, metadata) values ($1, 'like', '{\"lookId\":\"demo-01\"}')", [USER_A]);
  await fails("user_events CHECK rejects unknown event_type", "insert into public.user_events (user_id, event_type) values ($1, 'hover')", [USER_A]);

  // ------------------------------------------------------------------- USER B
  section("USER B — cross-user access must fail");
  await actAs(USER_B);

  for (const [table, column] of [
    ["profiles", "id"],
    ["style_preferences", "user_id"],
    ["user_reference_images", "user_id"],
    ["user_events", "user_id"],
  ] as const) {
    const seen = await rows<unknown>(`select * from public.${table} where ${column} = $1`, [USER_A]);
    record(`B sees 0 rows in ${table} owned by A (RLS filter)`, seen.length === 0);
  }

  await fails("B cannot INSERT a profile owned by A (WITH CHECK)", "insert into public.profiles (id, display_name) values ($1, 'Hijack')", [USER_A]);
  await fails("B cannot INSERT a style_preference attributed to A", "insert into public.style_preferences (user_id, dimension, value, weight, source) values ($1, 'style', 'x', 0.5, 'onboarding')", [USER_A]);
  await fails("B cannot INSERT an event attributed to A", "insert into public.user_events (user_id, event_type) values ($1, 'view')", [USER_A]);
  // Cross-user UPDATE/DELETE under RLS is a SILENT no-op (the USING clause
  // hides the row: 0 rows affected, no error) — only INSERT/UPDATE WITH CHECK
  // violations throw. The security invariant is "nothing changed".
  const bUpdate = await db.query("update public.profiles set display_name = 'Hijack' where id = $1", [USER_A]);
  record("B cannot UPDATE A's profile (0 rows affected — row hidden by RLS)", bUpdate.affectedRows === 0);
  const bDelete = await db.query("delete from public.profiles where id = $1", [USER_A]);
  record("B cannot DELETE A's profile (0 rows affected — row hidden by RLS)", bDelete.affectedRows === 0);

  await backToOwner();
  const aIntact = (await rows<{ display_name: string }>("select display_name from public.profiles where id = $1", [USER_A]))[0];
  record("A's profile is intact after B's write attempts", aIntact?.display_name === "Smoke A Updated");

  record("B CAN insert and read own profile (isolation, not lockdown)",
    (await db.query("insert into public.profiles (id, display_name) values ($1, 'Smoke B')", [USER_B])).affectedRows === 1);

  // ----------------------------------------------------------------- STORAGE
  section("STORAGE RLS — prefix ownership on storage.objects");
  await actAs(USER_B);

  await db.query("insert into storage.objects (bucket_id, name) values ('reference-photos', $1)", [`${USER_B}/${IMAGE_A}/b-front.png`]);
  const bVisible = await rows<unknown>("select name from storage.objects where bucket_id = 'reference-photos'");
  record("B sees only own storage object (1 row, not A's)", bVisible.length === 1);

  await fails("B cannot WRITE into A's storage prefix",
    "insert into storage.objects (bucket_id, name) values ('reference-photos', $1)", [`${USER_A}/${IMAGE_A}/stolen.png`]);
  await fails("B cannot sign/see paths outside the reference-photos bucket",
    "insert into storage.objects (bucket_id, name) values ('some-other-bucket', $1)", [`${USER_B}/x/y.png`]);

  // -------------------------------------------------------------------- ANON
  section("ANON / claim-less caller");
  await actAs("");
  const anonProfiles = await rows<unknown>("select * from public.profiles");
  const anonEvents = await rows<unknown>("select * from public.user_events");
  record("claim-less caller sees 0 profiles", anonProfiles.length === 0);
  record("claim-less caller sees 0 user_events", anonEvents.length === 0);
  await fails("claim-less caller cannot INSERT a profile", "insert into public.profiles (id, display_name) values ($1, 'Anon')", [USER_A]);

  // ------------------------------------------------------------------ CASCADE
  section("ACCOUNT DELETION — ON DELETE CASCADE");
  await backToOwner();
  await run("delete from auth.users where id = $1".replace("$1", `'${USER_A}'`));
  const orphans = await rows<{ profiles: number; prefs: number; refs: number; events: number }>(`
    select
      (select count(*) from public.profiles where id = '${USER_A}') as profiles,
      (select count(*) from public.style_preferences where user_id = '${USER_A}') as prefs,
      (select count(*) from public.user_reference_images where user_id = '${USER_A}') as refs,
      (select count(*) from public.user_events where user_id = '${USER_A}') as events`);
  const orphanRow = orphans[0];
  record(
    "deleting auth user A removes every dependent FORM row",
    orphanRow !== undefined &&
      orphanRow.profiles === 0 &&
      orphanRow.prefs === 0 &&
      orphanRow.refs === 0 &&
      orphanRow.events === 0,
  );
} catch (err) {
  record("verification ran to completion", false, err instanceof Error ? err.message : String(err));
} finally {
  await db.close();
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
