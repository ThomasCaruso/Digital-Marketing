/**
 * FORM Phase 2A — catalog persistence (products + provider_sync_runs).
 *
 * A thin, dependency-free store over any SQL client that matches PGlite /
 * node-postgres semantics (`query` -> `{ rows, rowCount }`). Phase 2A uses it
 * with PGlite in verification; Edge Functions can later inject a Postgres
 * client with the service role — catalog writes are SERVER-SIDE ONLY
 * (RLS on public.products allows no client mutations; see 0004_catalog.sql).
 *
 * Upsert semantics: match on UNIQUE (provider, provider_product_id); on
 * conflict every provider-owned column is refreshed while the FORM `id`,
 * created_at stay sticky. `xmax = 0` distinguishes inserted from updated
 * rows (xmax is only stamped on rows touched by a conflicting update).
 */

import type { NormalizedProduct, ProviderId } from "./types.js";

/** Minimal SQL surface both PGlite and future server clients satisfy. */
export interface CatalogDbClient {
  query(text: string, params?: unknown[]): Promise<{
    rows: Record<string, unknown>[];
    rowCount: number;
  }>;
}

export interface CatalogUpsertResult {
  inserted: number;
  updated: number;
}

export interface SyncRunStart {
  runId: string;
  startedAt: string;
}

export interface SyncRunCompletion {
  status: "succeeded" | "failed";
  recordsReceived: number;
  recordsInserted: number;
  recordsUpdated: number;
  errorSummary: Record<string, unknown>;
  metadata: Record<string, unknown>;
}

export interface CatalogStore {
  upsertProducts(products: NormalizedProduct[]): Promise<CatalogUpsertResult>;
  startSyncRun(provider: ProviderId): Promise<SyncRunStart>;
  completeSyncRun(runId: string, completion: SyncRunCompletion): Promise<void>;
}

const UPSERT_CHUNK = 50;

function json(value: unknown): string {
  return JSON.stringify(value);
}

export function createPostgresCatalogStore(client: CatalogDbClient): CatalogStore {
  return {
    async upsertProducts(products: NormalizedProduct[]): Promise<CatalogUpsertResult> {
      let inserted = 0;
      let updated = 0;
      for (let offset = 0; offset < products.length; offset += UPSERT_CHUNK) {
        const chunk = products.slice(offset, offset + UPSERT_CHUNK);
        if (chunk.length === 0) continue;
        const params: unknown[] = [];
        const tuples = chunk.map((product) => {
          const base = params.length + 1; // Postgres placeholders are 1-based
          params.push(
            product.id,
            product.provider,
            product.providerProductId,
            product.merchant,
            product.brand,
            product.name,
            product.description,
            product.category,
            product.subcategory,
            product.priceCents,
            product.salePriceCents,
            product.currency,
            json(product.imageUrls),
            product.productUrl,
            product.affiliateUrl,
            product.color,
            json(product.availableColors),
            json(product.availableSizes),
            product.availabilityConfidence,
            json(product.metadata),
            product.lastSyncedAt,
          );
          return `(${Array.from({ length: 21 }, (_, i) => `$${base + i}`).join(", ")})`;
        });
        const result = await client.query(
          `
          insert into public.products (
            id, provider, provider_product_id, merchant, brand, name, description,
            category, subcategory, price_cents, sale_price_cents, currency,
            image_urls, product_url, affiliate_url, color, available_colors,
            available_sizes, availability_confidence, metadata, last_synced_at
          )
          values ${tuples.join(", ")}
          on conflict (provider, provider_product_id) do update set
            merchant = excluded.merchant,
            brand = excluded.brand,
            name = excluded.name,
            description = excluded.description,
            category = excluded.category,
            subcategory = excluded.subcategory,
            price_cents = excluded.price_cents,
            sale_price_cents = excluded.sale_price_cents,
            currency = excluded.currency,
            image_urls = excluded.image_urls,
            product_url = excluded.product_url,
            affiliate_url = excluded.affiliate_url,
            color = excluded.color,
            available_colors = excluded.available_colors,
            available_sizes = excluded.available_sizes,
            availability_confidence = excluded.availability_confidence,
            metadata = excluded.metadata,
            last_synced_at = excluded.last_synced_at,
            updated_at = now()
          returning (xmax = 0) as inserted
          `,
          params,
        );
        for (const row of result.rows) {
          if (row.inserted === true) inserted += 1;
          else updated += 1;
        }
      }
      return { inserted, updated };
    },

    async startSyncRun(provider: ProviderId): Promise<SyncRunStart> {
      const result = await client.query(
        `
        insert into public.provider_sync_runs (provider, status)
        values ($1, 'running')
        returning id, started_at
        `,
        [provider],
      );
      const row = result.rows[0];
      if (!row) throw new Error("provider_sync_runs insert returned no row");
      return {
        runId: String(row.id),
        startedAt: row.started_at instanceof Date ? row.started_at.toISOString() : String(row.started_at),
      };
    },

    async completeSyncRun(runId: string, completion: SyncRunCompletion): Promise<void> {
      await client.query(
        `
        update public.provider_sync_runs set
          completed_at = now(),
          status = $2,
          records_received = $3,
          records_inserted = $4,
          records_updated = $5,
          error_summary = $6::jsonb,
          metadata = $7::jsonb
        where id = $1
        `,
        [
          runId,
          completion.status,
          completion.recordsReceived,
          completion.recordsInserted,
          completion.recordsUpdated,
          json(completion.errorSummary),
          json(completion.metadata),
        ],
      );
    },
  };
}
