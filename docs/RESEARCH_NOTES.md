# FORM — Technical Research Notes

Last organized: September 2026.

These notes support architecture decisions. Provider features, pricing, licensing, and API behavior can change; verify them again before production commitments.

## Higgsfield

### Current conclusion

Higgsfield is relevant as an orchestration/media provider, but its core proprietary models were not made open source.

Useful directions for FORM:
- general image generation/editing;
- environment changes;
- premium editorial renders;
- image-to-video;
- persistent identity tooling such as Soul ID.

Do not use a general image model as the source of truth for exact garment appearance without validating SKU fidelity.

References:
- https://higgsfield.ai/creator-hub/help-center/getting-started/official-higgsfield-platforms
- https://higgsfield.ai/blog/higgsfield-api
- https://open.higgsfield.ai/
- https://higgsfield.ai/creator-hub/help-center/ai-models/how-do-i-create-and-use-a-soul-id-character

## FASHN hosted API

### Current conclusion

Hosted FASHN is the fastest route to a real VTON integration and should be treated as:
- initial benchmark;
- fallback provider;
- possible long-term premium route if quality materially exceeds self-hosting.

References:
- https://docs.fashn.ai/
- https://docs.fashn.ai/api-reference/tryon-v1-6
- https://docs.fashn.ai/api-reference/tryon-max
- https://docs.fashn.ai/api-overview/data-retention-privacy
- https://help.fashn.ai/plans-and-pricing/api-pricing

## FASHN VTON v1.5

### Current conclusion

FASHN released VTON v1.5 model weights and inference code under Apache 2.0. This is the primary self-hosting candidate for FORM's core try-on.

Research claims to verify during implementation:
- roughly 972M parameters;
- approximately 2 GB model weights;
- designed for maskless virtual try-on;
- intended to preserve garment visual details;
- can be deployed on modern consumer/datacenter GPUs.

Reference:
- https://github.com/fashn-AI/fashn-vton-1.5
- https://fashn.ai/research/vton-1-5

### Licensing note

Do not assume every transitive component has the same license as the main VTON repository.

The FASHN human-parser repository has separate licensing/dependency considerations that should be reviewed before a paid commercial release.

Reference:
- https://github.com/fashn-AI/fashn-human-parser

Action:
- complete a dependency/license review before shipping self-hosted VTON commercially;
- replace any problematic component with a permissively licensed alternative if necessary.

## Product/affiliate data

### Rakuten

Phase 2B (2026-09-27) captured the live official documentation and implemented
the adapter against it. The developer portal is a JS-rendered SPA — plain
fetchers return navigation shells; the guide bodies below were captured with a
rendering reader. Re-verify before production commitments.

**Verified from current official docs (developers.rakutenadvertising.com):**

- Product Search: `GET https://api.linksynergy.com/productsearch/1.0`,
  `Authorization: Bearer {token}`, XML-ONLY response, rate limit 100
  calls/min, max 5,000 results total, page size (`max`) up to 100 (default
  20), `pagenumber` — requesting a page beyond TotalPages is an ERROR.
- Query params: `keyword` (all terms), `exact`, `one`, `none`, `cat`,
  `language` (default en_US), `max`, `pagenumber`, `mid` (advertiser filter),
  `sort` (retailprice|productname|categoryname|mid), `sorttype` (asc|dsc).
- Unsupported characters in search terms: `& = ? { } \ ( ) [ ] - ; ~ | $ ! >
  < * %` — FORM strips them before sending.
- Response item fields: `mid`, `merchantname`, `linkid`, `createdon`
  (format like `2020-07-16/05:30:32`), `sku`, `productname`,
  `category>primary`, `category>secondary` (e.g. `Dresses~~Dress`),
  `<price currency="USD">`, `<saleprice currency="USD">`, `upccode`,
  `description>short`, `description>long`, `keywords`, `linkurl`, `imageurl`.
  There is NO brand, color, size, or stock field — FORM keeps `brand` null,
  `availableSizes`/`availableColors` empty (unknown), and availability
  confidence `unknown`.
- Deep Links: `POST https://api.linksynergy.com/v1/links/deep_links`, Bearer
  auth, input URL + advertiser_id + optional u1, ONE link per request,
  requires an approved partnership AND an advertiser that supports deep
  linking.
- Bearer tokens come from the developer portal "Applications" page or the
  Token API; issuing a NEW token immediately expires the previous one —
  which makes server-side token caching + single-flight refresh a
  correctness requirement, not an optimization.

**NOT verifiable from portal text (actionable gaps):**

- The Access Tokens guide is screenshot-only, so the exact Token API wire
  format (endpoint path, request/response fields, `expires_in` semantics)
  could not be re-verified. The adapter's
  `ClientCredentialsTokenSource` implements the OAuth 2.0 client-credentials
  flow corroborated by the prior official portal guide and ecosystem
  integrations (Basic auth + `grant_type=client_credentials`, ~1h tokens);
  the endpoint defaults to `https://api.linksynergy.com/token` and is
  overridable (`RAKUTEN_TOKEN_URL` / config). This is the ONE unverified
  surface — isolate any live-validated correction to `token.ts`.
- The Deep Links response example could not be captured textually; link
  extraction is defensive (first http(s) URL string in the JSON body, in
  deterministic field order). Confirm the exact shape during live
  validation; the extractor is one function in `deeplink.ts`.

Architecture implication:
- Rakuten is the first live `ProductProvider` (`src/catalog/providers/rakuten/`);
- size/stock fields remain "unknown" — the adapter never invents them;
- `productUrl` is the provider's `linkurl` (an affiliate-tracked link) and
  stays semantically separate from `affiliateUrl`, which only ever comes
  from the Deep Links API;
- env taxonomy (audit result): the documented mechanism is an application
  bearer token (Applications page) plus an optional client-credential pair
  for the Token API — `RAKUTEN_BEARER_TOKEN` (new) and
  `RAKUTEN_CLIENT_ID`/`RAKUTEN_CLIENT_SECRET` (names kept; they match the
  Applications-page credential pair), server-side only.

References:
- https://developers.rakutenadvertising.com/guides/product_search
- https://developers.rakutenadvertising.com/guides/product_search/reference
- https://developers.rakutenadvertising.com/guides/deep_link
- https://developers.rakutenadvertising.com/guides/access_tokens

### CJ

Candidate second provider for broader product feeds.

Reference:
- https://docs.cj.com/docs/finding-your-path

## Private image storage

Supabase supports storage access controls and signed URL patterns suitable for private source imagery.

Reference:
- https://supabase.com/docs/guides/storage/security/access-control

Architecture implication:
- source user photos are private;
- signed URLs are short-lived;
- model-provider keys remain server-side.

## Local segmentation/editing

A clothing-specific SegFormer model can provide garment/body-part masks for zero-cost local edits such as recoloring.

Candidate:
- https://huggingface.co/wfghg/segformer_b2_clothes

SAM 2 is a future option for difficult general segmentation cases:
- https://github.com/facebookresearch/sam2

Before production:
- verify model licenses;
- benchmark in-browser/ONNX performance;
- validate masks on VTON outputs.

## Fit and body measurement

Virtual try-on and physical sizing are separate problems.

Specialized vendors demonstrate that serious fit estimation often uses:
- guided photo capture;
- body measurement inference;
- garment specifications;
- purchase/return data.

References:
- https://3dlook.ai/mobile-tailor/
- https://boldmetrics.com/solutions/virtual-sizer
- https://help.truefit.com/app-data-requirements

Product implication:
- V1 may provide "recommended size";
- V1 must not promise guaranteed physical fit.

## Research priorities still open

1. Hosted vs self-hosted VTON quality.
2. Sequential multi-item try-on drift.
3. Reliable per-size inventory data.
4. Affiliate provider coverage by target retailer/brand.
5. Exact cost/latency of self-hosted VTON on selected GPUs.
6. Whether user onboarding needs 2–4 references or more for acceptable identity consistency.
7. Best segmentation model for local garment recoloring.
