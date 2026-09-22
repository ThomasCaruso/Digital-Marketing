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
