# FORM — Application Contracts

These contracts are intentionally provider-independent.

## ProductProvider

Conceptual TypeScript interface:

```ts
interface ProductSearchIntent {
  query?: string;
  categories?: string[];
  brands?: string[];
  colors?: string[];
  minPrice?: number;
  maxPrice?: number;
  currency?: string;
  sizes?: string[];
  limit?: number;
}

interface Product {
  id: string;
  provider: string;
  providerProductId: string;
  merchant: string;
  brand: string;
  name: string;
  description?: string;
  category: string;
  subcategory?: string;
  price: number;
  salePrice?: number;
  currency: string;
  imageUrls: string[];
  productUrl: string;
  affiliateUrl?: string;
  color?: string;
  availableColors?: string[];
  availableSizes?: string[];
  availabilityConfidence: "confirmed" | "partial" | "unknown";
  metadata?: Record<string, unknown>;
}

interface ProductProvider {
  search(intent: ProductSearchIntent): Promise<Product[]>;
  getById(providerProductId: string): Promise<Product | null>;
}
```

## IntentParser

Input:
- raw user request;
- compact profile summary;
- default budget.

Output must be JSON matching a validated schema.

Example:

```json
{
  "occasion": "date-night",
  "budget_total": 300,
  "categories": ["top", "bottom", "shoe"],
  "style_tags": ["minimal", "elevated-casual"],
  "preferred_colors": ["black", "cream", "charcoal"],
  "excluded_colors": [],
  "formality": 6,
  "notes": "understated"
}
```

## OutfitRanker

Input:
- parsed intent;
- compact user preferences;
- candidate products.

Output:

```json
{
  "looks": [
    {
      "title": "Quiet confidence",
      "product_ids": ["p_123", "p_456", "p_789"],
      "reason": "Neutral proportions and clean layers match saved preferences.",
      "match_score": 0.94
    }
  ]
}
```

Validation rules:
- every `product_id` must exist in candidate set;
- no duplicate category unless explicitly allowed;
- total price is computed after model output;
- budget violations are rejected or repaired deterministically.

## VTONProvider

```ts
interface TryOnRequest {
  userId: string;
  referenceImageUrl: string;
  garmentImageUrl: string;
  category?: "top" | "bottom" | "one-piece";
  cacheKey: string;
}

interface TryOnResult {
  jobId: string;
  status: "queued" | "running" | "succeeded" | "failed";
  outputUrl?: string;
  provider: string;
  model: string;
  latencyMs?: number;
  estimatedCost?: number;
  errorCode?: string;
}

interface VTONProvider {
  submit(request: TryOnRequest): Promise<TryOnResult>;
  status(jobId: string): Promise<TryOnResult>;
}
```

## Important invariants

1. URLs/prices come from commerce records, never LLM text.
2. User source photos remain private.
3. Provider API secrets remain server-side.
4. Identical generation input hashes should reuse an existing successful result.
5. Provider-specific fields go into `metadata`, not into shared product logic.
