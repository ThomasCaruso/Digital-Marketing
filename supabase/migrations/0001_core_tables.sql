-- FORM Phase 1 — core user-owned tables.
-- Source specification: docs/DATA_MODEL.md.
-- Documented production corrections (also listed in docs/DATA_MODEL.md,
-- "Phase 1 implementation notes"):
--   * profiles.id IS auth.users.id (no redundant id + user_id pair).
--   * profile columns renamed: height_text -> height, top_size -> usual_top_size,
--     waist_size -> waist, inseam_size -> inseam, default_budget -> typical_budget.
--   * All money is stored as INTEGER MINOR UNITS (US cents) — never floats.
--   * style_preferences.tag split into dimension + value.
--   * user_events.product_id / outfit_id / generation_id are plain nullable UUIDs
--     with NO foreign keys yet — those tables do not exist until Phase 2+.
--     FKs are added by later migrations via ALTER TABLE ... ADD CONSTRAINT.

-- gen_random_uuid() is built in since PostgreSQL 13; no extension required.

-- ---------------------------------------------------------------------------
-- profiles — one row per user; the primary key IS the Supabase auth user id.
-- ---------------------------------------------------------------------------
create table public.profiles (
  id                uuid primary key references auth.users (id) on delete cascade,
  display_name      text not null default '',
  height            text not null default '',
  usual_top_size    text not null default '',
  waist             text not null default '',
  inseam            text not null default '',
  shoe_size         text not null default '',
  -- Minor units (US cents). The demo budget slider is $100-$1000 in $50 steps
  -- ($300 default => 30000). Exact, float-free, and the single money convention
  -- for FORM Postgres data going forward.
  typical_budget    integer not null default 30000 check (typical_budget >= 0),
  -- Stable keys; UI labels map 1:1 ('balanced' = "Best overall look").
  shopping_priority text not null default 'balanced'
                    check (shopping_priority in ('balanced', 'value', 'premium')),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

comment on table public.profiles is
  'One row per user. id = auth.users.id (ownership root for Phase 1 RLS).';

-- ---------------------------------------------------------------------------
-- style_preferences — persistent weighted preferences.
-- dimension + value replace the conceptual single "tag" column so onboarding
-- (style/minimal), explicit feedback (color/black) and later inference
-- (fit/relaxed-outerwear) share one bounded-weight row shape.
-- No recommendation math lives here yet (ROADMAP Phase 6).
-- ---------------------------------------------------------------------------
create table public.style_preferences (
  id         uuid primary key default gen_random_uuid (),
  user_id    uuid not null references auth.users (id) on delete cascade,
  -- Free-form dimension: Phase 6 adds brand/price/category affinities, so the
  -- set is deliberately NOT enumerated; only non-emptiness is enforced.
  dimension  text not null check (char_length (btrim (dimension)) between 1 and 40),
  value      text not null check (char_length (btrim (value)) between 1 and 80),
  -- Bounded [-1, 1]: positive affinity .. negative affinity (dislikes).
  weight     numeric not null default 0.5 check (weight >= -1 and weight <= 1),
  source     text not null check (source in ('onboarding', 'explicit_feedback', 'behavioral_inference')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, dimension, value)
);

-- ---------------------------------------------------------------------------
-- user_reference_images — METADATA ONLY; raw image bytes live in the private
-- `reference-photos` storage bucket, never in Postgres.
-- The client generates the id so storage_path can embed it:
--   {user_id}/{reference_image_id}/{filename}
-- ---------------------------------------------------------------------------
create table public.user_reference_images (
  id           uuid primary key default gen_random_uuid (),
  user_id      uuid not null references auth.users (id) on delete cascade,
  storage_path text not null check (position ('/' in storage_path) > 0),
  image_role   text not null check (image_role in ('front', 'side', 'three_quarter', 'natural', 'face', 'other')),
  version      integer not null default 1 check (version >= 1),
  is_active    boolean not null default true,
  metadata     jsonb not null default '{}'::jsonb,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (user_id, storage_path)
);

-- ---------------------------------------------------------------------------
-- user_events — first-class from the first backend release (TD-010).
-- product_id / outfit_id / generation_id are FK-less UUIDs for now (see header
-- note); metadata carries context that does not yet warrant a column.
-- Append-only: no updated_at.
-- ---------------------------------------------------------------------------
create table public.user_events (
  id            uuid primary key default gen_random_uuid (),
  user_id       uuid not null references auth.users (id) on delete cascade,
  event_type    text not null check (event_type in ('view', 'like', 'dislike', 'save', 'unsave', 'try_on', 'click_out', 'purchase', 'return')),
  product_id    uuid,
  outfit_id     uuid,
  generation_id uuid,
  metadata      jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Indexes for the access shapes the product loop actually uses.
-- ---------------------------------------------------------------------------
create index style_preferences_user_id_idx on public.style_preferences (user_id);
create index user_reference_images_user_id_idx on public.user_reference_images (user_id);
create index user_events_user_created_idx on public.user_events (user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- updated_at maintenance. user_events is append-only and gets no trigger.
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at ()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now ();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at ();

create trigger style_preferences_set_updated_at
  before update on public.style_preferences
  for each row execute function public.set_updated_at ();

create trigger user_reference_images_set_updated_at
  before update on public.user_reference_images
  for each row execute function public.set_updated_at ();
