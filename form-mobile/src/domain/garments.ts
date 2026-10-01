import type { GarmentSlot, Look, Product, UserGarment } from './types';

/**
 * User-upload garment helpers. Uploads keep their own identity end to end:
 * a UserGarment is never re-catalogued — boards receive a lightweight Product
 * view that still carries source: 'user_upload' and the local photo URI, so
 * mixed boards (catalog jacket, uploaded trousers, catalog shoes) render the
 * real photographs without ever redrawing an upload as an illustration.
 */

const SLOT_LABELS: Record<GarmentSlot, string> = {
  top: 'Top', pants: 'Bottom', outerwear: 'Outerwear', shoes: 'Shoes', accessory: 'Accessory',
};

/** Intake ordering matches the add-a-piece screen: Top, Bottom, Outerwear, Shoes. */
export const INTAKE_SLOTS: readonly GarmentSlot[] = ['top', 'pants', 'outerwear', 'shoes'];

export function slotLabel(slot: GarmentSlot): string {
  return SLOT_LABELS[slot];
}

export function newGarmentId(): string {
  return 'up-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
}

/** A board/product-list view of an upload. Not a catalog product — no price, no brand. */
export function userGarmentToProduct(garment: UserGarment): Product {
  return {
    id: garment.id,
    slot: garment.slot,
    source: 'user_upload',
    brand: 'Your upload',
    name: garment.name ?? slotLabel(garment.slot),
    priceCents: 0,
    localUri: garment.localUri,
    aspect: garment.aspect,
    color: garment.color ?? '',
    hex: 'transparent',
    size: '—',
    details: 'Your uploaded photo, kept on this device.',
    palette: [],
    alternatives: [],
  };
}

export function isUserUpload(product: Product): boolean {
  return product.source === 'user_upload' && !!product.localUri;
}

/**
 * Place an uploaded piece onto a look's board. Returns a new look object —
 * fixture data and saved snapshots are never mutated; callers persist the
 * result through the store's replaceLook, which keeps adjusted looks in a
 * working session.
 */
export function addGarmentToLook(look: Look, garment: UserGarment): Look {
  if (look.products.some(p => p.id === garment.id)) return look;
  return { ...look, products: [...look.products, userGarmentToProduct(garment)] };
}

export function removePieceFromLook(look: Look, productId: string): Look {
  return { ...look, products: look.products.filter(p => p.id !== productId) };
}

/**
 * One entry in the temporary try-on selection. Catalog pieces carry their
 * resolved product; uploads reference the persisted garment by id so a
 * rename or re-save stays live. Not persisted — a selection is a session
 * gesture, never a stored try-on.
 */
export type TryOnSelectionItem = { source: 'catalog'; product: Product } | { source: 'user_upload'; id: string };

export function selectionKey(item: TryOnSelectionItem): string {
  return item.source + ':' + (item.source === 'catalog' ? item.product.id : item.id);
}

export function selectionFromProduct(product: Product): TryOnSelectionItem {
  return isUserUpload(product) ? { source: 'user_upload', id: product.id } : { source: 'catalog', product };
}
