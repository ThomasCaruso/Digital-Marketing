/**
 * FORM Phase 2A — catalog ingestion.
 *
 * The Phase 2 pipeline in one deterministic function:
 *
 *   provider.search(intent)
 *     -> dedupe (last occurrence per provider id wins)
 *     -> validateNormalizedProduct (invalid records are skipped + reported,
 *        never repaired or guessed)
 *     -> upsert into public.products
 *     -> record the whole run in public.provider_sync_runs
 *
 * No cron, no queues, no Redis, no search engine — Postgres is enough at
 * this scale. Runs are always recorded, including failures: the sync-run row
 * is the audit trail for later freshness decisions (last_synced_at).
 */

import type { ProductProvider } from "./provider.js";
import type { CatalogStore } from "./store.js";
import type { ProductValidationIssue } from "./validation.js";
import { dedupeProducts, validateNormalizedProduct } from "./validation.js";
import type { NormalizedProduct, ProductSearchIntent } from "./types.js";

export interface RejectedRecord {
  providerProductId: string | null;
  issues: ProductValidationIssue[];
}

export interface IngestResult {
  runId: string;
  provider: ProductProvider["id"];
  status: "succeeded";
  recordsReceived: number;
  recordsDedupedAway: number;
  recordsRejected: number;
  recordsInserted: number;
  recordsUpdated: number;
  rejected: RejectedRecord[];
}

export class CatalogIngestError extends Error {
  constructor(
    message: string,
    readonly runId: string,
    override readonly cause: unknown,
  ) {
    super(message);
    this.name = "CatalogIngestError";
  }
}

/**
 * Ingest one provider batch. On provider failure the sync run is marked
 * 'failed' with the error summary, and CatalogIngestError is thrown so the
 * caller cannot mistake a dead sync for an empty catalog.
 */
export async function ingestFromProvider(
  store: CatalogStore,
  provider: ProductProvider,
  intent: ProductSearchIntent = {},
): Promise<IngestResult> {
  const run = await store.startSyncRun(provider.id);

  let received: NormalizedProduct[];
  try {
    received = await provider.search(intent);
  } catch (err) {
    await store.completeSyncRun(run.runId, {
      status: "failed",
      recordsReceived: 0,
      recordsInserted: 0,
      recordsUpdated: 0,
      errorSummary: {
        stage: "provider_search",
        message: err instanceof Error ? err.message : String(err),
      },
      metadata: { intent },
    });
    throw new CatalogIngestError(`provider ${provider.id} search failed`, run.runId, err);
  }

  const { products, duplicatesDropped } = dedupeProducts(received);

  const valid: NormalizedProduct[] = [];
  const rejected: RejectedRecord[] = [];
  for (const product of products) {
    const result = validateNormalizedProduct(product);
    if (result.ok) {
      valid.push(result.product);
    } else {
      rejected.push({ providerProductId: product.providerProductId ?? null, issues: result.issues });
    }
  }

  const { inserted, updated } = await store.upsertProducts(valid);

  await store.completeSyncRun(run.runId, {
    status: "succeeded",
    recordsReceived: received.length,
    recordsInserted: inserted,
    recordsUpdated: updated,
    errorSummary: rejected.length > 0
      ? {
          stage: "validation",
          rejectedCount: rejected.length,
          rejected: rejected.map((r) => ({
            providerProductId: r.providerProductId,
            codes: r.issues.map((issue) => issue.code),
          })),
        }
      : {},
    metadata: { intent, duplicatesDropped },
  });

  return {
    runId: run.runId,
    provider: provider.id,
    status: "succeeded",
    recordsReceived: received.length,
    recordsDedupedAway: duplicatesDropped,
    recordsRejected: rejected.length,
    recordsInserted: inserted,
    recordsUpdated: updated,
    rejected,
  };
}
