import type { ColorOption, Look, Product, ProductAlternative, SavedLook } from './types';

/**
 * Pure look transforms. Every function returns a NEW look — nothing in this
 * module mutates state. The UI (look detail, swap sheet) will call these from
 * the store; the store replaces the session's look with the result.
 */

export function cloneLook(look: Look): Look {
  return {
    ...look,
    scene: { ...look.scene },
    products: look.products.map(p => ({ ...p })),
  };
}

/**
 * Snapshot builder for saving. This is the fix for the web demo's identity bug:
 * the board stores WHAT THE USER SAW, not a reference to be re-resolved later.
 */
export function createSavedSnapshot(look: Look, occasion: string): SavedLook {
  return {
    id: look.id,
    occasion,
    savedAt: Date.now(),
    look: cloneLook(look),
  };
}

function swapProduct(product: Product, alt: ProductAlternative): Product {
  return {
    ...product,
    brand: alt.brand,
    name: alt.name,
    priceCents: alt.priceCents,
    color: alt.color,
    hex: alt.hex,
    details: `${alt.brand} ${alt.name} — swapped into this look in the demo.`,
  };
}

/** Swap one product for one of its alternatives; keeps the slot palette. */
export function applyAlternative(look: Look, productId: string, altIndex: number): Look {
  return {
    ...look,
    products: look.products.map(p => {
      if (p.id !== productId) return p;
      const alt = p.alternatives[altIndex];
      return alt ? swapProduct(p, alt) : p;
    }),
  };
}

/** Recolor one garment; instant, local, no network. */
export function applyColor(look: Look, productId: string, option: ColorOption): Look {
  return {
    ...look,
    products: look.products.map(p =>
      p.id === productId ? { ...p, hex: option.hex, color: option.name } : p
    ),
  };
}
