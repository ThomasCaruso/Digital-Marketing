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

Useful capabilities researched:
- product search;
- merchant/product records;
- SKU/product identifiers;
- price/sale price;
- product image;
- buy URL;
- deep-link generation.

Architecture implication:
- Rakuten can be the first `ProductProvider`;
- size/stock fields must remain "unknown" when the provider does not supply normalized inventory data.

References:
- https://developers.rakutenadvertising.com/guides/product_search/reference
- https://developers.rakutenadvertising.com/guides/deep_link

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
