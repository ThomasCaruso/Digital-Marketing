// FORM Phase 1 — signed-url Edge Function (TD-012: Supabase Edge Functions
// are the server runtime).
//
// Issues short-lived signed URLs for the caller's OWN reference photos.
//
// Security model (defense in depth — every layer must independently hold):
//   1. The caller's JWT is validated server-side via auth.getUser(); the user
//      id is never taken from the request body.
//   2. Row lookup on user_reference_images is filtered by user_id AND is
//      additionally scoped by RLS (migrations/0002).
//   3. The storage path's first segment must equal the caller's uid.
//   4. Storage RLS (migrations/0003) independently restricts signing to the
//      caller's own prefix, so even a bug in (2)/(3) cannot cross users.
//   5. No service role is used anywhere in this function.

import { createClient, type SupabaseClient } from "jsr:@supabase/supabase-js@2";

const REFERENCE_PHOTOS_BUCKET = "reference-photos";

/** Signed URL lifetime — short by design (DATA_MODEL.md: "short-lived"). */
const SIGNED_URL_TTL_SECONDS = 300; // 5 minutes

// TODO(TD-012): tighten to the production client origin once it exists.
const CORS_ALLOW_ORIGIN = "*";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": CORS_ALLOW_ORIGIN,
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface SignedUrlRequest {
  /** Preferred: id of a user_reference_images row owned by the caller. */
  referenceImageId?: string;
  /** Alternative: an owned storage path ({uid}/{imageId}/{filename}). */
  storagePath?: string;
}

interface ReferenceImageRow {
  id: string;
  storage_path: string;
}

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function errorBody(code: string, message: string): unknown {
  return { error: { code, message } };
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function createCallerClient(req: Request): SupabaseClient {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing SUPABASE_URL / SUPABASE_ANON_KEY environment");
  }
  const authorization = req.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer ")) {
    throw new Error("missing_bearer_token");
  }
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json(405, errorBody("method_not_allowed", "Use POST"));
  }

  let client: SupabaseClient;
  try {
    client = createCallerClient(req);
  } catch (err) {
    const message = err instanceof Error ? err.message : "unauthorized";
    if (message === "missing_bearer_token") {
      return json(401, errorBody("unauthorized", "Authorization bearer token required"));
    }
    return json(500, errorBody("server_config", "Server misconfiguration"));
  }

  // (1) Validate the JWT server-side; derive the uid here, never from the body.
  const { data: userData, error: userError } = await client.auth.getUser();
  if (userError || !userData.user) {
    return json(401, errorBody("unauthorized", "Invalid or expired session"));
  }
  const userId = userData.user.id;

  let body: SignedUrlRequest;
  try {
    body = (await req.json()) as SignedUrlRequest;
  } catch {
    return json(400, errorBody("invalid_json", "Body must be JSON"));
  }

  // (2) Resolve to an owned storage path.
  let storagePath: string;
  if (body.referenceImageId !== undefined) {
    if (!UUID_RE.test(body.referenceImageId)) {
      return json(400, errorBody("invalid_reference_image_id", "referenceImageId must be a UUID"));
    }
    // Explicit user_id filter (RLS re-checks the same predicate underneath).
    const { data: rows, error: lookupError } = await client
      .from("user_reference_images")
      .select("id, storage_path")
      .eq("id", body.referenceImageId)
      .eq("user_id", userId)
      .limit(1)
      .returns<ReferenceImageRow[]>();
    if (lookupError) {
      return json(500, errorBody("lookup_failed", "Could not verify reference image"));
    }
    // 404 (not 403) for other users' rows: never confirm existence.
    const row = rows?.[0];
    if (!row) {
      return json(404, errorBody("not_found", "Reference image not found"));
    }
    storagePath = row.storage_path;
  } else if (body.storagePath !== undefined) {
    storagePath = body.storagePath;
  } else {
    return json(400, errorBody("missing_input", "Provide referenceImageId or storagePath"));
  }

  // (3) Deterministic ownership: first path segment must be the caller.
  if (storagePath.split("/")[0] !== userId) {
    return json(403, errorBody("forbidden", "Path does not belong to the caller"));
  }

  // (4) Storage RLS independently restricts signing to the caller's prefix.
  const { data: signed, error: signError } = await client.storage
    .from(REFERENCE_PHOTOS_BUCKET)
    .createSignedUrl(storagePath, SIGNED_URL_TTL_SECONDS);
  if (signError || !signed) {
    return json(404, errorBody("not_found", "Object not found in reference-photos"));
  }

  return json(200, {
    signedUrl: signed.signedUrl,
    path: storagePath,
    expiresInSeconds: SIGNED_URL_TTL_SECONDS,
  });
});
