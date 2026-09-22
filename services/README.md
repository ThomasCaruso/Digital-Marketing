# FORM — Service Boundaries

No backend implementation lives here yet. This folder defines the intended boundaries before code is introduced.

## catalog

Responsibilities:
- implement `ProductProvider`;
- query external commerce providers;
- normalize products;
- refresh product metadata;
- resolve affiliate/deep links;
- expose candidate search to the orchestration layer.

Must not:
- rank outfits with an LLM;
- generate try-on images.

## orchestrator

Responsibilities:
- parse user intent with GLM 5.3 Flash;
- request candidate products from catalog;
- apply deterministic filters;
- call GLM outfit ranker;
- validate product IDs;
- compute totals;
- persist outfits;
- route try-on requests.

Must not:
- allow LLM-generated URLs/SKUs/prices into production data.

## vton

Responsibilities:
- provide one application-facing try-on interface;
- route jobs to hosted FASHN or self-hosted VTON;
- normalize statuses/errors;
- store outputs;
- cache by input hash;
- capture latency/cost telemetry.

## media

Future responsibility:
- scene changes;
- premium image edits;
- image-to-video.

Higgsfield is a candidate provider. This service is not required for V1.

## preference

Initially this may be a module rather than a standalone service.

Responsibilities:
- consume user events;
- update explicit/inferred preference weights;
- expose a compact user preference vector/profile to the orchestrator.

## Rule

Keep provider-specific code behind an internal contract. The rest of FORM should not know whether a result came from Rakuten, FASHN hosted, self-hosted VTON, Higgsfield, or a future provider.
