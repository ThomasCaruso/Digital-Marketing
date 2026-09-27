# FORM — Technical Decision Log

This file records current decisions so future coding agents do not silently re-architect the project.

## TD-001 — GLM is an orchestrator, not a product database

**Decision:** GLM 5.3 Flash may interpret intent and rank real candidates. It may not invent product details.

**Reason:** SKU, price, stock, merchant URL, size, and product imagery are commerce facts.

**Guardrail:** every recommended product ID must exist in the candidate set supplied to the model.

## TD-002 — Product data is provider-agnostic

**Decision:** all commerce integrations sit behind a normalized `ProductProvider` contract.

**Reason:** no single affiliate/catalog network should become the application architecture.

## TD-003 — VTON is specialized

**Decision:** use a fashion-specific virtual try-on model for garment rendering.

**Reason:** general image models can produce visually persuasive but commercially inaccurate garments.

## TD-004 — Benchmark hosted vs self-hosted FASHN

**Decision:** FASHN hosted API is the first production benchmark/fallback. Open-source FASHN VTON v1.5 is the primary self-host candidate.

**Reason:** hosted API reduces initial integration risk; self-hosting may materially reduce unit cost and increase control.

**Open question:** whether quality and operational burden justify self-hosting.

## TD-005 — Higgsfield is a premium media layer, not core VTON

**Decision:** do not make Higgsfield the source of truth for exact garment appearance in V1.

Potential use later:
- environments;
- editorial polish;
- image-to-video;
- persistent digital identity.

## TD-006 — Local edits before regeneration

**Decision:** simple recolors and repeated views should not consume generation calls.

**Reason:** they introduce little or no new visual information.

## TD-007 — Web-first backend validation

**Decision:** validate the backend/product loop before investing heavily in native-app architecture.

**Reason:** the current risk is recommendation and visualization quality, not native UI capability.

## TD-008 — Supabase for first production backend

**Decision:** Supabase is the initial auth/database/storage platform.

**Requirements:**
- RLS;
- private image buckets;
- signed URLs;
- server-side provider keys.

## TD-009 — Do not promise guaranteed fit in V1

**Decision:** language may say "recommended size" or "visual approximation." It may not claim physical fit certainty.

**Reason:** true fit prediction requires richer body and garment data.

## TD-010 — Feedback events are first-class product data

**Decision:** save interaction events from the first backend-connected release.

Events should include:
- view;
- like;
- dislike;
- save;
- try_on;
- click_out;
- purchase when known;
- return when known.

## TD-011 — Existing website is isolated

**Decision:** `ai-stylist-mvp/` remains the current deployed concept. Architecture/scaffold work must not modify it unless a task explicitly says to update the website.

## TD-012 — Supabase Edge Functions are the server runtime

**Decision:** server-side logic (the `catalog`, `orchestrator`, and `vton` boundaries from `services/README.md`) runs as Supabase Edge Functions (Deno/TypeScript) until a workload justifies extraction into a dedicated service.

**Reason:**
- minimal new infrastructure — the runtime ships with the Supabase project;
- TypeScript end to end, matching the contracts' shapes;
- provider secrets stay server-side by construction;
- native integration with Supabase Auth, Postgres, and Storage;
- service boundaries can start as internal modules and be extracted later without client-facing contract changes.

**Consequences:**
- no separate Express/Fastify/Next.js server is introduced;
- code under `supabase/functions/` uses Deno-style imports (`jsr:` / `npm:`) and is type-checked by Deno, not the repo's Node `tsc` config;
- business logic is kept in small modules so later extraction remains cheap.

## TD-013 — Canonical normalized catalog, provider adapters, Postgres persistence

**Decision (Phase 2A, 2026-09-27):**

1. **One canonical product shape.** All commerce data passes through the
   `NormalizedProduct` contract (`src/catalog/types.ts`). Providers are
   integrated as adapters implementing `ProductProvider`
   (`src/catalog/provider.ts`) that translate provider-native responses into
   that shape before FORM logic sees them; provider-specific values live in
   `metadata` (e.g. `metadata.providerCategory`), never in shared fields.
2. **PostgreSQL persistence as application data.** The catalog lives in
   `public.products` and `public.provider_sync_runs`
   (`supabase/migrations/0004_catalog.sql`). These are NOT user-owned rows:
   RLS is enabled with a single read-only `SELECT` policy for authenticated
   clients, and there are no client mutation policies at all — writes happen
   only through trusted server-side processes (service role). Anonymous
   principals see zero rows, matching the Phase 1 lockdown posture.
   No user-ownership machinery is imposed on catalog rows.
3. **Deterministic ingestion.** `src/catalog/ingest.ts` runs one pipeline:
   search → dedupe (LAST occurrence per `(provider, provider_product_id)`
   wins, matching upsert semantics) → validate → upsert (match on
   `(provider, provider_product_id)`; the FORM `id` and `created_at` stay
   sticky across syncs) → one `provider_sync_runs` audit row per attempt,
   including failures. No cron, queues, Redis, or a search engine — Postgres
   is enough at this scale.
4. **Unknown availability remains unknown.** `availability_confidence` is one
   of `confirmed | partial | unknown` and is never inferred. An empty
   `available_sizes` / `available_colors` array means UNKNOWN, never
   "confirmed none". Size filtering therefore has three outcomes
   (`src/catalog/filter.ts`): confirmed-match, confirmed-no-match, unknown —
   and unknown-size products survive a size filter unless the caller
   explicitly passes `requireConfirmedSizeAvailability`.
5. **Money stays integer minor units** (Phase 1 convention, continued):
   `price_cents` / `sale_price_cents` / `minPriceCents` / `maxPriceCents`.
   No floating point anywhere in catalog money.
6. **Contradictory prices are not silently normalized.** A sale price above
   the regular price is rejected by the validation gate unless the adapter
   explicitly preserved the source contradiction under
   `metadata.sale_price_anomaly`; the typed price fields never encode it.

**Reason:** TD-002 (provider independence) needs a concrete, tested boundary
before the first live provider; deterministic filtering is also what will
keep the GLM ranker honest in Phase 3 (TD-001).

**Guardrails:**
- FORM application logic never references provider field names;
- every record passes `validateNormalizedProduct` before persistence —
  validation rejects, it never repairs or guesses;
- the Rakuten adapter is a stub that throws `NOT_CONFIGURED` /
  `NOT_IMPLEMENTED` (`src/catalog/providers/rakuten.ts`) — endpoint response
  shapes must come from live API documentation, never from memory;
- fixture data (the `fixture` provider) uses RFC 2606 reserved `.example`
  domains and is marked `metadata.source = "fixture"` so it can never be
  mistaken for live commerce.
