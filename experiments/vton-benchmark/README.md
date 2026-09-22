# VTON Benchmark — Hosted vs Self-Hosted

## Question

Can self-hosted FASHN VTON v1.5 replace the hosted FASHN API for the default FORM try-on path without unacceptable degradation in garment fidelity, identity preservation, latency, or reliability?

## Candidates

### A — Hosted baseline
FASHN hosted virtual try-on API.

Purpose:
- fastest integration;
- quality reference;
- fallback path.

### B — Self-hosted candidate
FASHN VTON v1.5.

Target deployment:
- GPU serverless provider such as RunPod.

## Benchmark set

Start with at least:
- 5 user/reference subjects;
- 10 garments;
- multiple garment categories;
- difficult materials/patterns;
- visible logos/graphics;
- dark/light color combinations.

Aim for 50+ matched comparisons.

Each exact person/garment pair must be run through both candidates.

## Capture per run

```text
subject_id
garment_id
provider
model_version
input_hash
seed/settings when available
latency_ms
estimated_gpu_or_api_cost
status
failure_type
output_path
```

## Human review rubric

Score 1–5:

### Identity preservation
- face;
- hair;
- skin tone;
- perceived body build.

### Garment fidelity
- color;
- silhouette;
- pattern;
- logo/text;
- material cues;
- neckline/collar;
- sleeves/hem.

### Anatomical quality
- hands/arms;
- torso geometry;
- garment-body interaction.

### Commercial trust
Question:
> Would showing this image make the shopper more accurately understand the real product, or could it misrepresent the item?

## Operational metrics

Measure:
- p50 latency;
- p95 latency;
- cold-start latency;
- failure rate;
- retry rate;
- cost per successful output;
- memory requirements;
- model-load time.

## Decision thresholds

Self-hosted does not win merely because it is cheaper.

Adopt self-hosted default only if:
- garment fidelity is close enough to hosted baseline;
- identity preservation is acceptable;
- failure rate is operationally manageable;
- p95 latency fits the product;
- effective cost after cold starts/retries is materially lower.

Otherwise:
- keep hosted default;
- use self-hosting for specific workloads;
- or use hybrid routing.

## Multi-item extension

After single-garment benchmarking, test sequential application:

```text
person
 -> top
 -> bottom
 -> optional third item
```

Track whether each pass alters:
- face;
- body;
- previously applied garment.

Do not ship "complete look try-on" claims until this test passes a separate quality threshold.
