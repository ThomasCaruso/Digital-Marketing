# FORM

FORM is an AI personal stylist and shopping intelligence product.

The goal is simple: a user builds a persistent profile once, tells FORM what they are dressing for, and receives complete looks made from real purchasable products—with exact links and realistic virtual try-on.

## Current status

The repository currently contains:

- **Deployed concept website:** `ai-stylist-mvp/`
- **Project architecture and product scope:** `docs/`
- **Backend/service boundaries:** `services/`
- **Provider-independent application contracts:** `contracts/`
- **VTON benchmark plan:** `experiments/vton-benchmark/`
- **Safe environment-variable scaffold:** `.env.example`
- **Phase 1 profile spine (complete, validated on hosted Supabase):** `supabase/` (migrations, RLS, private storage, `signed-url` Edge Function), `src/types/` (Phase 1 contracts), `scripts/` (SQL verification + end-to-end smoke suite)
- **Phase 2A commerce spine (complete, validated on hosted Supabase):** `src/catalog/` (provider-independent catalog: `NormalizedProduct` contract, validation gate, deterministic filters, integer money, fixture provider, ingestion), `supabase/migrations/0004_catalog.sql` (`products` + `provider_sync_runs`, RLS read-only for clients), `scripts/verify-catalog.ts` + `scripts/smoke-catalog.ts`
- **Phase 2B Rakuten adapter (implemented, live validation pending):** `src/catalog/providers/rakuten/` — real Product Search integration built from the official Rakuten Advertising docs (bearer auth, XML parsing, exact integer money, merchant-scoped MID+SKU identity, deterministic category mapping, lazy deep links, single-flight token caching, bounded transient retry, `AUTH_FAILED` vs `PROVIDER_ERROR` separation), `scripts/verify-rakuten.ts` (fully offline, injected network) + gated live smoke `scripts/smoke-rakuten.ts`

The current website is intentionally isolated. Project scaffolding does not modify it.

SQL structure and RLS are verified locally on every run (`npm run verify:sql`, real Postgres via PGlite — no Docker needed), the catalog layer has its own deterministic suite (`npm run verify:catalog`, 98 invariants), and the Rakuten adapter has a fully offline suite (`npm run verify:rakuten`, 82 invariants — injected network, no real endpoints). Hosted validation (2026-09-27): all four migrations applied to the hosted Supabase project; `npm run smoke` (Phase 1, 37/37) and `npm run smoke:catalog` (Phase 2A, 20/20) both pass end to end. **The Rakuten adapter is implemented but has NOT yet made a real API call — no credentials exist in the local environment.** Set `RAKUTEN_BEARER_TOKEN` (or `RAKUTEN_CLIENT_ID` + `RAKUTEN_CLIENT_SECRET`) server-side, then run `npm run smoke:rakuten` to execute the live validation protocol; until then Phase 2's live-provider work is IMPLEMENTED BUT LIVE VALIDATION PENDING.

Live concept:
https://thomascaruso.github.io/Digital-Marketing/

## Product loop

```text
user profile
    +
occasion / budget / intent
    |
    v
GLM 5.3 Flash intent parsing
    |
    v
real product retrieval
    |
    v
deterministic filtering
    |
    v
GLM outfit ranking
    |
    v
real outfit + merchant links
    |
    v
fashion-specific virtual try-on
    |
    v
save / like / dislike / click
    |
    v
persistent preference model
```

## Planned stack

| Layer | Current direction |
|---|---|
| Intelligence | GLM 5.3 Flash |
| Auth / database / private storage | Supabase |
| Commerce | ProductProvider abstraction; Rakuten first candidate |
| Hosted VTON benchmark/fallback | FASHN API |
| Self-hosted VTON candidate | FASHN VTON v1.5 |
| Cheap edits | local segmentation + browser/image processing |
| Premium imagery/video | Higgsfield later |
| Deployment | web-first while backend loop is validated |

## Non-negotiable architecture rules

1. **The LLM does not invent products.** It may only rank/select product IDs supplied by the catalog layer.
2. **Prices and URLs come from commerce records**, not model prose.
3. **User source photos remain private.**
4. **Provider secrets remain server-side.**
5. **Simple color changes and repeat views should not trigger generation.**
6. **Fashion-specific VTON handles garment fidelity.**
7. **Do not claim guaranteed fit in V1.**
8. **Do not modify `ai-stylist-mvp/` unless the task explicitly includes website changes.**

## Documentation

Start here:

- [Project scope](docs/PROJECT_SCOPE.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Implementation roadmap](docs/ROADMAP.md)
- [Technical decisions](docs/TECHNICAL_DECISIONS.md)
- [Initial data model](docs/DATA_MODEL.md)
- [Technical research notes](docs/RESEARCH_NOTES.md)
- [Application contracts](contracts/README.md)
- [Service boundaries](services/README.md)
- [VTON benchmark](experiments/vton-benchmark/README.md)

## Immediate next work

The next engineering sequence is:

1. First real `ProductProvider` implementation (Rakuten) behind the existing catalog boundary.
2. Strict GLM intent/ranking schemas on top of `ProductSearchIntent` + deterministic filters.
3. Hosted FASHN integration for the first real try-on.
4. Self-hosted VTON benchmark.
5. Preference-learning loop.
6. Local color/edit pipeline.

See [ROADMAP.md](docs/ROADMAP.md) for the full sequence.
