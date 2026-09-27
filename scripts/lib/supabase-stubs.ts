/**
 * Supabase-interface stubs for in-process PGlite verification.
 *
 * Installs the pieces of the Supabase platform the migrations touch, before
 * any migration runs — faithful to how Supabase defines them:
 *
 *   - `authenticated` / `anon` roles (RLS targets)
 *   - auth.users + auth.uid() (reads request.jwt.claim.sub)
 *   - storage.buckets / storage.objects / storage.foldername (RLS-enabled)
 *
 * Superset of the copy embedded in verify-migrations.ts (adds the `anon`
 * role + a storage schema grant for it). Phase 1's script is deliberately
 * left untouched; if the platform interfaces ever change, update both.
 */

export const SUPABASE_STUBS = `
create role authenticated nologin noinherit;
create role anon nologin noinherit;
grant usage on schema public to authenticated, anon;

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
grant usage on schema storage to authenticated, anon;
grant all on all tables in schema storage to authenticated;
`;

/** Applied AFTER migrations (tables must exist before they can be granted). */
export const POST_MIGRATION_GRANTS = `
grant all on all tables in schema public to authenticated;
grant all on all sequences in schema public to authenticated;
grant select on all tables in schema public to anon;
`;
