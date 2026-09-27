# FORM — Initial Data Model

This is the conceptual schema for the first production backend. Exact migrations should be created only when the Supabase implementation begins.

## Phase 1 implementation notes (2026-09-27)

Phase 1 is implemented in `supabase/migrations/`. The conceptual schema below
remains the source spec; the migration layer made these production-required
corrections, all deliberate:

1. **`profiles.id = auth.users.id`.** The separate `user_id` column is dropped —
   the primary key IS the ownership root (RLS predicate: `id = auth.uid()`).
   All dependent tables reference `auth.users(id) ON DELETE CASCADE`.
2. **Profile column renames:** `height_text`→`height`, `top_size`→`usual_top_size`,
   `waist_size`→`waist`, `inseam_size`→`inseam`, `default_budget`→`typical_budget`.
   `shopping_priority` is retained, constrained to stable keys
   (`balanced | value | premium`; `balanced` maps to the demo's "Best overall look").
3. **Money is INTEGER MINOR UNITS (US cents)** — never floats. The single money
   convention for all FORM Postgres data going forward.
4. **`style_preferences.tag` split into `dimension` + `value`** (e.g.
   `style/minimal`, `color/black`, `fit/relaxed-outerwear`); `weight` bounded
   `[-1, 1]` (negative = dislike); `source` constrained to
   `onboarding | explicit_feedback | behavioral_inference`;
   `UNIQUE (user_id, dimension, value)`.
5. **`user_reference_images`** gained `updated_at` and
   `UNIQUE (user_id, storage_path)`; `image_role` constrained to
   `front | side | three_quarter | natural | face | other`. Metadata only —
   bytes live in the private `reference-photos` bucket at
   `{user_id}/{reference_image_id}/{filename}` (50 MiB, JPEG/PNG/WebP only).
6. **`user_events.product_id / outfit_id / generation_id` are plain nullable
   UUIDs with NO foreign keys** — those tables do not exist until Phase 2+.
   Future migrations add the FKs with `ALTER TABLE ... ADD CONSTRAINT`.
   `event_type` is constrained to the TD-010 event set.
7. **RLS shape:** every Phase 1 table has one `FOR ALL ... to authenticated`
   policy (`USING` + `WITH CHECK` on the owner predicate). Cross-user
   UPDATE/DELETE is a silent 0-row no-op by design; clients must treat
   "0 rows affected" as not-found. Anonymous principals have no policies and
   see zero rows.

## Phase 2 implementation notes (2026-09-27)

Phase 2A implements the catalog spine in `supabase/migrations/0004_catalog.sql`
with the TypeScript contract in `src/catalog/`. The conceptual schema below
remains the source spec; the migration layer made these production decisions,
all deliberate:

1. **Money columns, not numerics:** `price` / `sale_price` become
   `price_cents` / `sale_price_cents` — INTEGER MINOR UNITS (US cents),
   continuing the Phase 1 convention. Postgres silently ROUNDS a fractional
   numeric into an `integer` column, so the real enforcement point for
   "integer money" is the TypeScript validation gate
   (`src/catalog/validation.ts`, `Number.isSafeInteger`) which runs BEFORE
   any write; the DB adds `>= 0` CHECKs.
2. **Upsert identity:** `UNIQUE (provider, provider_product_id)`. Ingestion
   upserts on this pair — provider-owned columns refresh, while the FORM
   `id`, `created_at` stay sticky across syncs and `updated_at` is refreshed
   by trigger. Duplicate ids WITHIN one provider batch are collapsed to the
   LAST occurrence before the write (`src/catalog/validation.ts`
   `dedupeProducts`).
3. **Categories are a closed set:** `category` is constrained to
   `tops | bottoms | outerwear | one_piece | shoes | accessories | other`.
   Provider-native category strings are preserved in `metadata`
   (e.g. `metadata.providerCategory`), not in `category`.
4. **No `product_images` table in Phase 2A.** The conceptual table is
   replaced by a `image_urls jsonb` array — nothing in the current loop needs
   per-image rows, and the array round-trips 1:1 with the TypeScript
   `imageUrls` contract. Revisit only if per-image metadata (position,
   image_type) becomes real. Likewise no `product_variants` table: no live
   provider evidence yet requires per-variant rows.
5. **Empty array means UNKNOWN.** `available_sizes` / `available_colors` are
   jsonb arrays where `[]` means "provider did not say", never "confirmed
   none". `availability_confidence` is constrained to
   `confirmed | partial | unknown` and is never inferred. Filtering code
   (`src/catalog/filter.ts`) keeps the three size outcomes distinct:
   confirmed-match / confirmed-no-match / unknown.
6. **Contradictory sale prices are gated, not silently normalized.**
   `CHECK (sale_price_cents IS NULL OR sale_price_cents <= price_cents OR
   metadata ->> 'sale_price_anomaly' IS NOT NULL)` mirrors the TypeScript
   rule: a sale price above the regular price is rejected unless the adapter
   explicitly preserved the source contradiction under
   `metadata.sale_price_anomaly`.
7. **URL validity lives above the database.** CHECK constraints cannot
   contain subqueries, so well-formedness of `product_url` / `affiliate_url`
   / every `image_urls` entry is enforced by `validateNormalizedProduct`
   (http/https only) BEFORE persistence; the DB enforces non-emptiness and
   jsonb array typing only.
8. **`provider_sync_runs` counters renamed against the conceptual block:**
   `records_seen` / `records_written` become `records_received` (pre-dedupe,
   pre-validation), `records_inserted`, and `records_updated`.
   `status` is constrained to `running | succeeded | failed`, counts are
   `>= 0`, and `completed_at >= started_at` is enforced. Validation
   rejections and provider failures are recorded per-run in `error_summary`.
9. **Catalog security posture:** catalog rows are APPLICATION data, not
   user-owned data, so there is deliberately no ownership/RLS-by-user
   machinery. RLS is still ENABLED on both tables (defense in depth):
   `products` has a single read-only `SELECT ... to authenticated` policy;
   `provider_sync_runs` has NO client policies (service role only). No
   INSERT/UPDATE/DELETE policy exists for anon or authenticated on either
   table — catalog mutation is a trusted server-side (service-role)
   operation. Anonymous principals see zero rows, consistent with Phase 1.


## profiles

```text
id uuid primary key
user_id uuid unique
display_name text
height_text text
top_size text
waist_size text
inseam_size text
shoe_size text
default_budget integer
shopping_priority text
created_at timestamptz
updated_at timestamptz
```

## style_preferences

```text
id uuid primary key
user_id uuid
tag text
weight numeric
source text
created_at timestamptz
updated_at timestamptz
```

Sources may include:
- onboarding;
- explicit feedback;
- behavioral inference.

## user_reference_images

```text
id uuid primary key
user_id uuid
storage_path text
reference_type text
version integer
is_active boolean
created_at timestamptz
```

Reference types:
- front;
- side;
- three_quarter;
- face;
- natural.

Never store public source-photo URLs as the canonical reference.

## products

```text
id uuid primary key
provider text
provider_product_id text
merchant text
brand text
name text
description text
category text
subcategory text
price numeric
sale_price numeric nullable
currency text
product_url text
affiliate_url text nullable
color text nullable
available_colors jsonb
available_sizes jsonb
availability_confidence text
metadata jsonb
last_synced_at timestamptz
```

Constraint:
- `provider + provider_product_id` should be unique.

## product_images

```text
id uuid primary key
product_id uuid
url text
position integer
image_type text
metadata jsonb
```

## outfits

```text
id uuid primary key
user_id uuid
title text
description text
occasion text
intent jsonb
match_score numeric nullable
total_price numeric
currency text
created_at timestamptz
```

Important:
- total price is calculated from product rows, not generated by the LLM.

## outfit_products

```text
outfit_id uuid
product_id uuid
role text
position integer
recommended_size text nullable
reason text nullable
```

Example roles:
- top;
- layer;
- bottom;
- shoe;
- accessory.

## generations

```text
id uuid primary key
user_id uuid
outfit_id uuid nullable
product_id uuid nullable
provider text
model_name text
model_version text
generation_type text
input_hash text
status text
source_reference_version integer
output_storage_path text nullable
provider_job_id text nullable
cost_estimate numeric nullable
latency_ms integer nullable
error_code text nullable
created_at timestamptz
completed_at timestamptz nullable
```

Generation types:
- try_on;
- edit;
- scene;
- video.

The `input_hash` enables deduplication/caching.

## generation_masks

```text
id uuid primary key
generation_id uuid
mask_type text
storage_path text
created_at timestamptz
```

Mask types may include:
- top;
- bottom;
- shoes;
- skin;
- hair;
- background.

## user_events

```text
id uuid primary key
user_id uuid
event_type text
product_id uuid nullable
outfit_id uuid nullable
generation_id uuid nullable
properties jsonb
created_at timestamptz
```

Event types:
- view;
- like;
- dislike;
- save;
- unsave;
- try_on;
- click_out;
- purchase;
- return.

## provider_sync_runs

```text
id uuid primary key
provider text
started_at timestamptz
completed_at timestamptz nullable
status text
records_seen integer
records_written integer
error_summary jsonb
```

## Security baseline

Every user-owned table should be protected with RLS.

Users may read/write only their own:
- profile;
- preferences;
- reference-image metadata;
- outfits;
- generations;
- events.

Product/catalog tables may be readable more broadly but should be written only by trusted server-side processes.
