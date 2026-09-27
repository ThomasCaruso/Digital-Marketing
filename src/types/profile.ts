/**
 * FORM Phase 1 contracts — profile domain.
 * Mirrors supabase/migrations/0001_core_tables.sql. Keep both in sync until
 * generated database types are introduced (deliberately deferred — Phase 1
 * stays small).
 */

/** image_role values allowed by the user_reference_images CHECK constraint. */
export type ImageRole =
  | "front"
  | "side"
  | "three_quarter"
  | "natural"
  | "face"
  | "other";

/** Stable keys for profiles.shopping_priority ('balanced' = "Best overall look"). */
export type ShoppingPriority = "balanced" | "value" | "premium";

/** style_preferences.source values allowed by the CHECK constraint. */
export type PreferenceSource =
  | "onboarding"
  | "explicit_feedback"
  | "behavioral_inference";

/**
 * One row per user; `id` IS the Supabase auth user id (TD: ownership root).
 * `typical_budget` is INTEGER MINOR UNITS (US cents) — never floats.
 */
export interface Profile {
  id: string;
  display_name: string;
  height: string;
  usual_top_size: string;
  waist: string;
  inseam: string;
  shoe_size: string;
  typical_budget: number;
  shopping_priority: ShoppingPriority;
  created_at: string;
  updated_at: string;
}

/** A persistent weighted preference, e.g. { dimension: "style", value: "minimal" }. */
export interface StylePreference {
  id: string;
  user_id: string;
  dimension: string;
  value: string;
  /** Bounded [-1, 1]; negative weights are dislikes. No recommendation math yet. */
  weight: number;
  source: PreferenceSource;
  created_at: string;
  updated_at: string;
}

/**
 * METADATA ONLY — raw image bytes live in the private `reference-photos`
 * storage bucket at `storage_path`, never in Postgres.
 */
export interface UserReferenceImage {
  id: string;
  user_id: string;
  /** {user_id}/{reference_image_id}/{filename} */
  storage_path: string;
  image_role: ImageRole;
  version: number;
  is_active: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

/** Private bucket name. Shared by migrations, Edge Functions, and clients. */
export const REFERENCE_PHOTOS_BUCKET = "reference-photos" as const;

/**
 * Deterministic storage path for a reference photo. The first path segment
 * being the owner's auth uid is what Storage RLS enforces — always build
 * paths through this helper.
 */
export function referencePhotoPath(
  userId: string,
  referenceImageId: string,
  filename: string,
): string {
  return `${userId}/${referenceImageId}/${filename}`;
}
