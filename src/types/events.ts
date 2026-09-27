/**
 * FORM Phase 1 contracts — user events (TD-010: first-class from day one).
 * Mirrors supabase/migrations/0001_core_tables.sql.
 */

/** event_type values allowed by the user_events CHECK constraint. */
export type EventType =
  | "view"
  | "like"
  | "dislike"
  | "save"
  | "unsave"
  | "try_on"
  | "click_out"
  | "purchase"
  | "return";

/**
 * Append-only interaction event.
 *
 * `product_id` / `outfit_id` / `generation_id` are PLAIN NULLABLE UUIDs with
 * no foreign keys: those tables do not exist until Phase 2+. Keeping the
 * column types UUID (rather than text or stuffing values into metadata) means
 * the later migrations are a clean `ALTER TABLE ... ADD CONSTRAINT ... FOREIGN KEY`.
 */
export interface UserEvent {
  id: string;
  user_id: string;
  event_type: EventType;
  product_id: string | null;
  outfit_id: string | null;
  generation_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}
