# FORM — Implementation Roadmap

## Phase 0 — Product scaffold

Status: in progress

Deliverables:
- product scope;
- architecture;
- data contracts;
- technical decision log;
- experiment plan;
- repository structure.

No website changes in this phase.

## Phase 1 — Persistent user profile

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

1. Create Supabase schema and RLS design.
2. Implement a real `ProductProvider` interface with one provider.
3. Build the VTON benchmark harness before committing to a long-term image provider.
