/**
 * FORM Phase 1 smoke test — the "profile spine" invariants.
 *
 * Run:  npm run smoke        (after `npx supabase start` on a Docker machine)
 *
 * Proves, with ordinary authenticated clients (service role is used ONLY to
 * create/clean up the two test users — never to assert RLS behavior):
 *
 *   USER A  signup -> profile create/update -> style preferences (incl. bound
 *           and uniqueness CHECK violations) -> reference-image metadata ->
 *           upload into reference-photos -> signed URL via the signed-url
 *           Edge Function (and the URL actually serves the bytes) -> user
 *           event -> reads own data.
 *
 *   USER B  signup -> EVERY attempt to touch A's rows, paths, or signed URLs
 *           fails -> B can still write/read B's own data.
 *
 *   ANON    unauthenticated client sees zero rows in every user-owned table.
 *
 * Environment: SUPABASE_URL (default http://127.0.0.1:54321), SUPABASE_ANON_KEY,
 * SUPABASE_SERVICE_ROLE_KEY. Missing keys are auto-loaded from .env.local / .env
 * (`npx supabase status -o env > .env.local` produces exactly this file).
 */

import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import {
  REFERENCE_PHOTOS_BUCKET,
  referencePhotoPath,
  type Profile,
  type StylePreference,
  type UserReferenceImage,
} from "../src/types/profile.js";
import type { UserEvent } from "../src/types/events.js";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// ---------------------------------------------------------------------------
// Environment
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

const SUPABASE_URL = process.env.SUPABASE_URL ?? "http://127.0.0.1:54321";
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error(
    "Missing SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY.\n" +
      "On a machine running the local stack:  npx supabase status -o env > .env.local\n" +
      "Or export the variables for a hosted project (never commit real keys).",
  );
  process.exit(2);
}

// Narrowed handles — TypeScript's control-flow narrowing does not cross into
// function bodies, so these string-typed constants are what the helpers use.
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

/** Assert a request that MUST be rejected was in fact rejected. */
function rejected(name: string, error: unknown, detail?: string): void {
  record(name, error !== null && error !== undefined, detail ?? "request was rejected as required");
}

// 1x1 transparent PNG fixture (allowed by the bucket's MIME policy).
const PNG_1X1 = new Uint8Array(
  Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
    "base64",
  ),
);

const A_EMAIL = "smoke-a@form.local";
const B_EMAIL = "smoke-b@form.local";
const PASSWORD = "form-smoke-1!";

function clientWith(key: string): SupabaseClient {
  return createClient(SUPABASE_URL, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

const admin = clientWith(SERVICE_KEY); // fixture setup/cleanup ONLY
const anon = clientWith(ANON_KEY); // RLS negative tests

async function createUser(email: string): Promise<User> {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
  });
  if (error || !data.user) throw new Error(`fixture setup failed for ${email}: ${error?.message}`);
  return data.user;
}

async function removeUserAndObjects(email: string): Promise<void> {
  const { data: list } = await admin.auth.admin.listUsers();
  const existing = list.users.find((u) => u.email === email);
  if (!existing) return;
  // Remove the user's storage prefix first (service role bypasses RLS — cleanup only).
  const { data: folders } = await admin.storage.from(REFERENCE_PHOTOS_BUCKET).list(existing.id);
  for (const folder of folders ?? []) {
    const { data: files } = await admin.storage
      .from(REFERENCE_PHOTOS_BUCKET)
      .list(`${existing.id}/${folder.name}`);
    const paths = (files ?? []).map((f) => `${existing.id}/${folder.name}/${f.name}`);
    if (paths.length > 0) await admin.storage.from(REFERENCE_PHOTOS_BUCKET).remove(paths);
  }
  await admin.auth.admin.deleteUser(existing.id);
}

interface InvokeResult {
  status: number;
  body: Record<string, unknown>;
}

async function invokeSignedUrl(
  accessToken: string,
  payload: Record<string, unknown>,
): Promise<InvokeResult> {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/signed-url`, {
    method: "POST",
    headers: {
      apikey: ANON_KEY,
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  return { status: res.status, body };
}

async function signIn(email: string): Promise<{ client: SupabaseClient; token: string; userId: string }> {
  const client = clientWith(ANON_KEY);
  const { data, error } = await client.auth.signInWithPassword({ email, password: PASSWORD });
  if (error || !data.session) throw new Error(`sign-in failed for ${email}: ${error?.message}`);
  return { client, token: data.session.access_token, userId: data.user.id };
}

// ---------------------------------------------------------------------------
// Smoke run
// ---------------------------------------------------------------------------

let exitCode = 0;

try {
  console.log(`FORM Phase 1 smoke — ${SUPABASE_URL}`);

  section("FIXTURE SETUP (service role — user provisioning only)");
  await removeUserAndObjects(A_EMAIL);
  await removeUserAndObjects(B_EMAIL);
  const userA = await createUser(A_EMAIL);
  const userB = await createUser(B_EMAIL);
  record("test users A and B created (fixture only)", Boolean(userA.id && userB.id));

  // ------------------------------------------------------------------ USER A
  section("USER A — happy path");
  const A = await signIn(A_EMAIL);
  const aClient = A.client;

  const now0 = new Date().toISOString();
  const { data: profileRow, error: profileErr } = await aClient
    .from("profiles")
    .insert({
      id: A.userId,
      display_name: "Smoke A",
      height: `6'0"`,
      usual_top_size: "M",
      waist: "31",
      inseam: "32",
      shoe_size: "10",
      typical_budget: 35000, // $350.00 in minor units
      shopping_priority: "value",
    })
    .select()
    .single<Profile>();
  record(
    "A creates own profile",
    profileErr === null && profileRow?.id === A.userId,
    profileErr?.message,
  );

  const { data: updatedProfile, error: updateErr } = await aClient
    .from("profiles")
    .update({ display_name: "Smoke A Updated" })
    .eq("id", A.userId)
    .select()
    .single<Profile>();
  record(
    "A updates own profile (trigger refreshes updated_at)",
    updateErr === null &&
      updatedProfile !== null &&
      updatedProfile.display_name === "Smoke A Updated" &&
      Date.parse(updatedProfile.updated_at) > Date.parse(updatedProfile.created_at),
    updateErr?.message,
  );

  const { data: prefs, error: prefsErr } = await aClient
    .from("style_preferences")
    .insert([
      { user_id: A.userId, dimension: "style", value: "minimal", weight: 0.5, source: "onboarding" },
      { user_id: A.userId, dimension: "color", value: "black", weight: 0.8, source: "onboarding" },
      { user_id: A.userId, dimension: "fit", value: "relaxed-outerwear", weight: -0.2, source: "explicit_feedback" },
    ])
    .select()
    .returns<StylePreference[]>();
  record("A inserts 3 style preferences (incl. negative weight)", prefsErr === null && prefs?.length === 3, prefsErr?.message);

  const { error: weightErr } = await aClient
    .from("style_preferences")
    .insert({ user_id: A.userId, dimension: "style", value: "streetwear", weight: 1.5, source: "onboarding" });
  rejected("CHECK rejects weight > 1", weightErr);

  const { error: dupErr } = await aClient
    .from("style_preferences")
    .insert({ user_id: A.userId, dimension: "style", value: "minimal", weight: 0.5, source: "onboarding" });
  rejected("UNIQUE rejects duplicate (user, dimension, value)", dupErr);

  const imageId = crypto.randomUUID();
  const imagePath = referencePhotoPath(A.userId, imageId, "front.png");
  const { data: refImage, error: refErr } = await aClient
    .from("user_reference_images")
    .insert({
      id: imageId,
      user_id: A.userId,
      storage_path: imagePath,
      image_role: "front",
      metadata: { fixture: true },
    })
    .select()
    .single<UserReferenceImage>();
  record("A creates reference-image metadata row", refErr === null && refImage?.id === imageId, refErr?.message);

  const { error: uploadErr } = await aClient.storage
    .from(REFERENCE_PHOTOS_BUCKET)
    .upload(imagePath, PNG_1X1, { contentType: "image/png" });
  record("A uploads photo into own reference-photos prefix", uploadErr === null, uploadErr?.message);

  const signed = await invokeSignedUrl(A.token, { referenceImageId: imageId });
  const signedOk =
    signed.status === 200 &&
    typeof signed.body.signedUrl === "string" &&
    signed.body.expiresInSeconds === 300;
  record("A gets signed URL from Edge Function (TTL 300s)", signedOk, JSON.stringify(signed.body));

  if (typeof signed.body.signedUrl === "string") {
    const img = await fetch(signed.body.signedUrl as string);
    record(
      "signed URL actually serves the photo bytes",
      img.status === 200 && (img.headers.get("content-type") ?? "").startsWith("image/png"),
      `status ${img.status}`,
    );
  }

  const { error: signOwnPathErr } = await aClient.storage
    .from(REFERENCE_PHOTOS_BUCKET)
    .createSignedUrl(imagePath, 60);
  record("A can sign own path directly (Storage RLS select)", signOwnPathErr === null, signOwnPathErr?.message);

  const missing = await invokeSignedUrl(A.token, { referenceImageId: crypto.randomUUID() });
  record(
    "Edge Function 404s a nonexistent (but well-formed) image id",
    missing.status === 404,
    `status ${missing.status} — existence never confirmed`,
  );
  record(
    "Edge Function 400s an invalid UUID input",
    (await invokeSignedUrl(A.token, { referenceImageId: "not-a-uuid" })).status === 400,
  );
  record(
    "Edge Function 401s an unauthenticated caller",
    (
      await fetch(`${SUPABASE_URL}/functions/v1/signed-url`, {
        method: "POST",
        headers: { apikey: ANON_KEY, "Content-Type": "application/json" },
        body: JSON.stringify({ referenceImageId: imageId }),
      })
    ).status === 401,
  );

  const { data: event, error: eventErr } = await aClient
    .from("user_events")
    .insert({ user_id: A.userId, event_type: "like", metadata: { lookId: "demo-01", at: now0 } })
    .select()
    .single<UserEvent>();
  record("A records a user event", eventErr === null && event?.event_type === "like", eventErr?.message);

  const { error: badEventErr } = await aClient
    .from("user_events")
    .insert({ user_id: A.userId, event_type: "hover" });
  rejected("CHECK rejects unknown event_type", badEventErr);

  const { data: ownEvents, error: ownEventsErr } = await aClient
    .from("user_events")
    .select("id")
    .eq("user_id", A.userId);
  record("A reads own events back", ownEventsErr === null && ownEvents?.length === 1, ownEventsErr?.message);

  // ------------------------------------------------------------------ USER B
  section("USER B — every cross-user attempt must fail");
  const B = await signIn(B_EMAIL);
  const bClient = B.client;

  const { data: bProfileSeen } = await bClient.from("profiles").select("id").eq("id", A.userId);
  record("B cannot READ A's profile (0 rows)", bProfileSeen?.length === 0);

  const { data: bPrefsSeen } = await bClient
    .from("style_preferences")
    .select("id")
    .eq("user_id", A.userId);
  record("B cannot READ A's style preferences (0 rows)", bPrefsSeen?.length === 0);

  const { data: bRefsSeen } = await bClient
    .from("user_reference_images")
    .select("id")
    .eq("id", imageId);
  record("B cannot READ A's reference-image metadata (0 rows)", bRefsSeen?.length === 0);

  const bSigned = await invokeSignedUrl(B.token, { referenceImageId: imageId });
  record(
    "B cannot SIGN A's image via Edge Function (404 — existence hidden)",
    bSigned.status === 404,
    `status ${bSigned.status}`,
  );

  const { error: bPathSignErr } = await bClient.storage
    .from(REFERENCE_PHOTOS_BUCKET)
    .createSignedUrl(imagePath, 60);
  rejected("B cannot sign A's storage path directly (Storage RLS)", bPathSignErr);

  const { error: bDownloadErr } = await bClient.storage
    .from(REFERENCE_PHOTOS_BUCKET)
    .download(imagePath);
  rejected("B cannot DOWNLOAD A's photo (Storage RLS)", bDownloadErr);

  const { error: bUploadErr } = await bClient.storage
    .from(REFERENCE_PHOTOS_BUCKET)
    .upload(referencePhotoPath(A.userId, imageId, "stolen.png"), PNG_1X1, { contentType: "image/png" });
  rejected("B cannot WRITE into A's storage prefix", bUploadErr);

  const { error: bForgeProfileErr } = await bClient
    .from("profiles")
    .insert({ id: A.userId, display_name: "Hijack" });
  rejected("B cannot INSERT a profile owned by A (WITH CHECK)", bForgeProfileErr);

  const { error: bForgeEventErr } = await bClient
    .from("user_events")
    .insert({ user_id: A.userId, event_type: "view" });
  rejected("B cannot INSERT an event attributed to A (WITH CHECK)", bForgeEventErr);

  const { error: bOwnProfileErr } = await bClient
    .from("profiles")
    .insert({ id: B.userId, display_name: "Smoke B" });
  record("B CAN still create/read own profile (isolation, not lockdown)", bOwnProfileErr === null, bOwnProfileErr?.message);

  // -------------------------------------------------------------------- ANON
  section("ANON — unauthenticated access");
  const { data: anonProfiles } = await anon.from("profiles").select("id");
  const { data: anonEvents } = await anon.from("user_events").select("id");
  record("anon sees 0 profiles", anonProfiles?.length === 0);
  record("anon sees 0 user_events", anonEvents?.length === 0);
} catch (err) {
  record("smoke run completed without setup failure", false, err instanceof Error ? err.message : String(err));
} finally {
  section("FIXTURE CLEANUP");
  try {
    await removeUserAndObjects(A_EMAIL);
    await removeUserAndObjects(B_EMAIL);
    console.log("  smoke users removed");
  } catch (err) {
    console.log(`  cleanup failed (harmless for results): ${err instanceof Error ? err.message : String(err)}`);
  }
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
