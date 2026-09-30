/**
 * FORM domain types — typed ports of the demo data shapes.
 * Money is ALWAYS integer cents internally; format only at the UI edge.
 */

export type GarmentSlot = 'top' | 'pants' | 'shoes';

export interface ColorOption {
  name: string;
  hex: string;
}

export interface ProductAlternative {
  brand: string;
  name: string;
  priceCents: number;
  color: string;
  hex: string;
  /** Why FORM suggests this alternative, e.g. "Lower price" or "More relaxed". */
  reason: string;
}

export interface Product {
  id: string;
  slot: GarmentSlot;
  brand: string;
  name: string;
  priceCents: number;
  /** Product image or transparent cutout, rendered without storefront framing. */
  imageUri?: string;
  assetKey?: string;
  material?: string;
  availableSizes?: string[];
  styleTags?: string[];
  formality?: number;
  /** Currently selected color name. */
  color: string;
  /** Currently selected color hex — drives the figure recolor. */
  hex: string;
  /** Recommended size for this user's profile. */
  size: string;
  details: string;
  /** Selectable palette for this garment's slot. */
  palette: readonly ColorOption[];
  alternatives: readonly ProductAlternative[];
}

export interface LookScene {
  a: string;
  b: string;
}

export interface Look {
  id: string;
  /** Display ordinal, e.g. "01". */
  number: string;
  title: string;
  vibe: string;
  description: string;
  /** Stylist rationale — "Why FORM chose this". */
  why: string;
  scene: LookScene;
  products: Product[];
  previewKey?: 'quiet' | 'night' | 'weekend';
  refinements?: Refinement[];
}

export type Refinement = 'Less formal' | 'More formal' | 'Lower price' | 'Different shoes' | 'Warmer' | 'More relaxed';
export type ReviewStatus = 'saved' | 'passed';
export interface EditRequest { occasion: string; dressCode: string; budgetCents: number; location?: string; notes?: string; }
export interface SavedPiece { id: string; product: Product; savedAt: number; }

export interface Session {
  id: string;
  occasion: string;
  looks: Look[];
  createdAt: number;
  request?: EditRequest;
}

/**
 * Immutable snapshot of a look at save time. Saved looks must NEVER resolve
 * through a session by id — later swaps or session trimming must not be able
 * to change what the user sees on their board.
 */
export interface SavedLook {
  id: string;
  occasion: string;
  savedAt: number;
  request?: EditRequest;
  look: Look;
}

export interface PassedLook {
  lookId: string;
  title: string;
  occasion: string;
  passedAt: number;
}

export interface Profile {
  name: string;
  height: string;
  topSize: string;
  waist: string;
  inseam: string;
  shoe: string;
  budgetCents: number;
  styles: string[];
  priority: string;
  brands: string[];
  favoriteColors?: string[];
  avoidedColors?: string[];
  avoidedBrands?: string[];
}

export interface StyleOption {
  name: string;
  description: string;
}


