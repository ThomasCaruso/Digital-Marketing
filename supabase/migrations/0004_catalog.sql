-- FORM Phase 2A — catalog persistence (commerce spine).
-- Source specification: docs/DATA_MODEL.md "Phase 2 implementation notes".
-- Provider-independent canonical catalog (TD-002 / TD-013): rows are written
-- only by trusted server-side processes from normalized provider batches.

-- Money stays INTEGER MINOR UNITS (US cents) — the single FORM convention.
-- An empty available_sizes / available_colors array means UNKNOWN, never
-- "confirmed none" — application code (src/catalog/filter.ts) owns that
-- distinction and must not lose it in the database representation.

-- ---------------------------------------------------------------------------
-- products — canonical normalized catalog. One row per provider record.
-- ---------------------------------------------------------------------------
create table public.products (
  id                      uuid primary key default gen_random_uuid (),
  provider                text not null,
  -- Stable within the provider; the pair is the upsert identity.
  provider_product_id     text not null,
  merchant                text not null check (char_length (btrim (merchant)) between 1 and 200),
  brand                   text,
  name                    text not null check (char_length (btrim (name)) between 1 and 500),
  description             text,
  category                text not null check (category in ('tops', 'bottoms', 'outerwear', 'one_piece', 'shoes', 'accessories', 'other')),
  subcategory             text,
  price_cents             integer not null check (price_cents >= 0),
  sale_price_cents        integer check (sale_price_cents >= 0),
  -- A sale price above the regular price is contradictory source data; it is
  -- only accepted when the adapter explicitly preserved the anomaly in
  -- metadata (mirrors src/catalog/validation.ts).
  check (
    sale_price_cents is null
    or sale_price_cents <= price_cents
    or (metadata ->> 'sale_price_anomaly') is not null
  ),
  currency                text not null check (currency ~ '^[A-Z]{3}$'),
  -- jsonb arrays of URL strings; URL WELL-FORMEDNESS is enforced in
  -- src/catalog/validation.ts BEFORE any row reaches the database
  -- (CHECK constraints cannot contain subqueries).
  image_urls              jsonb not null default '[]'::jsonb check (jsonb_typeof (image_urls) = 'array'),
  product_url             text not null check (char_length (product_url) between 1 and 2000),
  affiliate_url           text,
  color                   text,
  available_colors        jsonb not null default '[]'::jsonb check (jsonb_typeof (available_colors) = 'array'),
  available_sizes         jsonb not null default '[]'::jsonb check (jsonb_typeof (available_sizes) = 'array'),
  availability_confidence text not null check (availability_confidence in ('confirmed', 'partial', 'unknown')),
  metadata                jsonb not null default '{}'::jsonb,
  last_synced_at          timestamptz not null default now(),
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  unique (provider, provider_product_id)
);

comment on table public.products is
  'Canonical provider-independent catalog (TD-013). Written only by server-side ingestion; clients are read-only.';

create index products_category_idx on public.products (category);
create index products_provider_idx on public.products (provider);
-- Effective price = sale price when present, else regular price: the value
-- deterministic filters and budget math operate on.
create index products_effective_price_idx on public.products (
  coalesce (sale_price_cents, price_cents)
);

-- ---------------------------------------------------------------------------
-- provider_sync_runs — one row per ingestion attempt; the freshness audit
-- trail behind last_synced_at. Counts are pre-dedupe "received" plus the
-- outcomes; rejected-record details live in error_summary.
-- ---------------------------------------------------------------------------
create table public.provider_sync_runs (
  id                uuid primary key default gen_random_uuid (),
  provider          text not null,
  started_at        timestamptz not null default now(),
  completed_at      timestamptz,
  status            text not null check (status in ('running', 'succeeded', 'failed')),
  records_received  integer not null default 0 check (records_received >= 0),
  records_inserted  integer not null default 0 check (records_inserted >= 0),
  records_updated   integer not null default 0 check (records_updated >= 0),
  error_summary     jsonb not null default '{}'::jsonb,
  metadata          jsonb not null default '{}'::jsonb,
  check (completed_at is null or completed_at >= started_at)
);

comment on table public.provider_sync_runs is
  'One row per catalog ingestion attempt (Phase 2A). Server-side only: no RLS policies for anon/authenticated.';

-- ---------------------------------------------------------------------------
-- Access model (deliberate — see docs/DATA_MODEL.md Phase 2 notes):
--   * products: PUBLIC CATALOG application data, not user-owned rows, so
--     there is intentionally NO ownership/RLS-by-user machinery here.
--     RLS is still ENABLED (defense in depth) with a single read-only
--     policy for authenticated clients. Anonymous sees zero rows — same
--     lockdown posture as Phase 1. NO insert/update/delete policy exists
--     for any client role: catalog mutation is a service-role-only
--     (server-side) operation, which also keeps provider plumbing out of
--     public reach.
--   * provider_sync_runs: RLS enabled, no client policies at all —
--     operational data visible only to the service role.
-- ---------------------------------------------------------------------------
alter table public.products          enable row level security;
alter table public.provider_sync_runs enable row level security;

create policy "products_select_authenticated"
  on public.products
  for select to authenticated
  using (true);

-- ---------------------------------------------------------------------------
-- updated_at maintenance (same shape as Phase 1).
-- ---------------------------------------------------------------------------
create trigger products_set_updated_at
  before update on public.products
  for each row execute function public.set_updated_at ();
