# FORM — System Architecture

## High-level architecture

```text
                         FORM CLIENT
                             |
             +---------------+---------------+
             |                               |
         USER PROFILE                     USER INTENT
             |                               |
             v                               v
        Supabase Auth                  GLM 5.3 Flash
        Postgres / Storage             intent parsing
             |                               |
             +---------------+---------------+
                             |
                             v
                      PRODUCT ENGINE
                             |
                    ProductProvider API
                             |
               +-------------+-------------+
               |                           |
            Rakuten                  future providers
                                      CJ / retailers
               |                           |
               +-------------+-------------+
                             |
                      normalized catalog
                             |
                deterministic filtering
                             |
                             v
                      GLM OUTFIT RANKER
                             |
                  strict product-ID JSON
                             |
                 +-----------+-----------+
                 |                       |
              PRODUCT UI              TRY-ON
                                         |
                             +-----------+-----------+
                             |                       |
                       hosted FASHN            self-hosted
                         fallback               VTON v1.5
                             |                       |
                             +-----------+-----------+
                                         |
                                  generated image
                                         |
                          +--------------+--------------+
                          |                             |
                    local image edits            premium media
                   masks / recoloring            Higgsfield later
                          |                             |
                          +--------------+--------------+
                                         |
                           save / like / click / skip
                                         |
                                         v
                                  preference model
```

## Frontend

Current demo:
- static HTML/CSS/JS under `ai-stylist-mvp/`.

Future production client can remain web-first while the core backend contracts stabilize. Native/mobile work should not precede a validated backend loop.

Responsibilities:
- onboarding;
- photo collection;
- style and fit inputs;
- occasion composer;
- outfit display;
- try-on state;
- saved looks;
- feedback events;
- zero-cost local edits where possible.

## Backend

Recommended:
- Supabase Auth;
- Postgres;
- Supabase Storage;
- Row Level Security;
- short-lived signed URLs for private image access;
- server-side functions/API routes for model and commerce calls.

Never expose provider secrets in the client.

## Intelligence layer — GLM 5.3 Flash

GLM has two distinct jobs.

### Intent parser

Input:
- user request;
- saved profile;
- budget;
- optional contextual data.

Output schema concept:

```json
{
  "occasion": "dinner/nightlife",
  "budget_total": 350,
  "formality": 6,
  "palette": ["neutral"],
  "style_tags": ["elevated-casual", "minimal"],
  "constraints": []
}
```

### Outfit ranker

Input:
- normalized user profile;
- retrieved candidate product records;
- intent object.

Output:
- product IDs only;
- outfit reasoning;
- match metadata.

The ranker must never output an unknown product ID.

## Commerce layer

Define a provider-independent `ProductProvider` interface.

A normalized product should support at minimum:

```text
id
provider
provider_product_id
merchant
brand
name
description
category
subcategory
price
sale_price
currency
image_urls[]
product_url
affiliate_url
color
available_colors[]
available_sizes[]
availability_confidence
metadata
last_synced_at
```

Fields may be unknown. Unknown availability must remain unknown rather than inferred.

Initial provider target:
- Rakuten Product Search + deep-link APIs.

Future:
- CJ;
- direct retailer feeds/APIs;
- other affiliate/product data providers.

## Virtual try-on

Two-track strategy:

### Hosted benchmark/fallback
FASHN hosted API provides a fast integration path and a quality baseline.

### Self-hosted default candidate
FASHN VTON v1.5 is open source under Apache 2.0 and should be benchmarked for:
- face preservation;
- body preservation;
- garment fidelity;
- logo/pattern fidelity;
- latency;
- GPU cost;
- failure rate.

Do not switch from hosted to self-hosted based solely on theoretical GPU cost.

## Multi-item look rendering

This is an explicit research item.

Potential path:

```text
person
 -> apply top
 -> apply bottom
 -> apply shoes/accessories where supported
 -> final look
```

Risk:
- identity drift;
- body drift;
- earlier garments being altered by later passes.

This must be benchmarked before promising complete-look fidelity.

## Local editing

After a generation, segment useful regions and reuse the image.

Targets:
- top;
- pants;
- shoes;
- skin;
- hair;
- background.

For simple colorway changes:
- preserve luminance;
- alter chroma/hue inside garment mask;
- blend edges;
- avoid a new generative call.

Candidate segmentation:
- clothing-specific SegFormer/ONNX model;
- SAM-family model later for difficult cases.

## Premium media

Higgsfield is best treated as a premium scene/video layer, not the source of truth for garment fidelity.

Possible future use:
- environment changes;
- editorial final imagery;
- motion/video previews;
- optional persistent identity tooling.

## Privacy

Production requirements:
- user photos private by default;
- RLS on all user-owned rows/objects;
- short-lived signed URLs;
- server-side API keys;
- explicit retention/deletion behavior;
- no public buckets for source photos;
- provider calls documented in privacy policy.

## Caching

Cache by stable generation input hash:

```text
user_reference_version
+ product_id(s)
+ pose/reference
+ model_version
+ render_settings
```

Repeated views should never regenerate identical assets.
