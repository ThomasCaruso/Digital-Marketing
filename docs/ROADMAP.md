# FORM — Implementation Roadmap

## Phase 0 — Product scaffold

Status: complete (2026-09-27)

Deliverables:
- product scope;
- architecture;
- data contracts;
- technical decision log;
- experiment plan;
- repository structure.

No website changes in this phase.

## Phase 1 — Persistent user profile

Status: COMPLETE (2026-09-27). Delivered: Supabase project scaffold (`supabase/`), migrations for profiles / style_preferences / user_reference_images / user_events (`supabase/migrations/`), RLS policies, private `reference-photos` bucket + Storage RLS, `signed-url` Edge Function, TypeScript contracts (`src/types/`), SQL verification suite (`scripts/verify-migrations.ts`, 31/31 passing on PGlite), smoke suite (`scripts/smoke-profile.ts`, 37/37 passing against the hosted project). Hosted validation (2026-09-27): all three migrations applied to the hosted Supabase project, RLS confirmed enabled on all four tables, bucket confirmed private (`public=false`), storage policies confirmed scoped to `auth.uid()`, Edge Function deployed, and the full smoke suite green on hosted — user A happy path, user B cross-user denial (reads, inserts, update, delete, storage, signing), anonymous lockdown.

Goal: replace browser-only demo state with real user data.

Deliverables:
- Supabase project;
- authentication;
- profiles table;
- style preferences;
- sizing fields;
- private reference-photo storage;
- RLS policies;
- signed image access;
- basic feedback-event table.

Exit criteria:
- a user can leave and return without losing onboarding data.

## Phase 2 — Real commerce catalog

Status: IN PROGRESS — Phase 2A "commerce spine" COMPLETE (2026-09-27). The
provider-independent catalog layer is built, persisted, and verified WITHOUT
live provider credentials. Landed: `NormalizedProduct` / `ProductProvider` /
`ProductSearchIntent` / filter-criteria contracts (`src/catalog/`), a pure
validation gate (`validation.ts`), deterministic filters with the
unknown ≠ unavailable size distinction (`filter.ts`), integer money helpers
(`money.ts`), a deterministic fixture provider (24 records, reserved
`.example` domains only, `metadata.source = "fixture"`), a Rakuten boundary
stub that throws `NOT_CONFIGURED` / `NOT_IMPLEMENTED`
(`providers/rakuten.ts`), Postgres persistence
(`supabase/migrations/0004_catalog.sql`: `products` + `provider_sync_runs`,
RLS read-only for clients, service-role-only writes), and the ingestion
pipeline with per-run audit rows (`ingest.ts` / `store.ts`). Verification:
`npm run verify:catalog` 98/98 on PGlite; migration 0004 applied to the
hosted project and `npm run smoke:catalog` 20/20 on hosted; Phase 1 suites
remain green (`npm run verify:sql` 32/32, `npm run smoke` 37/37).
NOT landed yet: a live provider implementation (Rakuten search + deep
links), affiliate URL resolution, semantic search, and any app-facing query
API.

Goal: remove mock product records.

Deliverables:
- `ProductProvider` interface;
- first commerce provider implementation;
- normalized product schema;
- catalog ingestion/query path;
- affiliate/deep-link support;
- deterministic filters;
- catalog freshness metadata.

Exit criteria:
- every product rendered in the app has a real source record and merchant URL.

## Phase 3 — GLM stylist

Goal: convert user intent + product candidates into valid outfits.

Deliverables:
- strict intent-parser schema;
- strict outfit-ranking schema;
- product-ID validation;
- budget validation;
- category coverage rules;
- retry/fallback behavior;
- prompt fixtures and test cases.

Exit criteria:
- GLM cannot introduce a product that was not provided to it.
- total outfit pricing is derived by software, not invented by the model.

## Phase 4 — Hosted virtual try-on

Goal: complete the first real end-to-end loop.

Deliverables:
- FASHN hosted integration;
- secure source-image handoff;
- async job handling;
- generation status UI;
- cached result storage;
- failure/retry states.

Exit criteria:
- real user + real product -> real generated try-on.

## Phase 5 — Self-hosted VTON benchmark

Goal: determine whether open-source VTON should become default.

Deliverables:
- reproducible benchmark set;
- RunPod/serverless deployment;
- hosted-vs-self-hosted comparison;
- per-generation cost model;
- latency distributions;
- failure taxonomy;
- quality review rubric.

Decision:
- keep hosted;
- self-host;
- or use hybrid routing.

## Phase 6 — Preference learning

Goal: make FORM materially better with use.

Initial implementation:
- event-weighted heuristics;
- user tag weights;
- color/style/category affinities;
- brand and price affinities;
- negative preference tracking.

Do not introduce complex recommender infrastructure until enough real interaction data exists.

## Phase 7 — Cheap image editing

Deliverables:
- garment segmentation;
- masks persisted with generated asset;
- local recoloring;
- background/lighting adjustments where deterministic;
- variant cache.

Goal:
- reduce generative calls for changes that do not contain meaningful new visual information.

## Phase 8 — Complete-look rendering

Research:
- sequential top/bottom layering;
- garment preservation across passes;
- shoes/accessories;
- full-body reference conditioning.

Exit criteria:
- quality is stable enough to describe a render as a complete look rather than separate garment previews.

## Phase 9 — Premium media

Optional after retention signals are positive:
- environment generation;
- editorial images;
- 5–10 second motion previews;
- persistent high-fidelity identity model.

Potential provider:
- Higgsfield API.

## Phase 10 — Sizing intelligence

Do not claim guaranteed fit before this phase.

Possible directions:
- richer merchant garment measurements;
- return/purchase history;
- body-measurement provider integration;
- 3DLOOK/Bold Metrics-like specialized tooling;
- brand-specific fit profiles.

## Immediate next three engineering tasks

1. Implement the first live provider behind `ProductProvider` (Rakuten
   product search + deep links) against its real API documentation.
2. Build the strict GLM intent/ranking schemas on top of the catalog's
   `ProductSearchIntent` and deterministic filters.
3. Build the VTON benchmark harness before committing to a long-term image
   provider.
