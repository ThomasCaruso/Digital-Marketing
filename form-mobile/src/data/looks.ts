/**
 * Demo catalog — typed port of ai-stylist-mvp/app.js mock data.
 * All prices are integer cents. Nothing here is fetched; the MockLooksProvider
 * is the only module screens may receive this data through.
 */
import type { ColorOption, Look, StyleOption } from '../domain/types';

export const SLOT_PALETTES: Record<Look['products'][number]['slot'], readonly ColorOption[]> = {
  top: [
    { name: 'Charcoal', hex: '#24262b' },
    { name: 'Stone', hex: '#d6cfc2' },
    { name: 'Forest', hex: '#2c3a31' },
    { name: 'Burgundy', hex: '#4b2430' },
    { name: 'Navy', hex: '#2f3d55' },
  ],
  pants: [
    { name: 'Charcoal', hex: '#2e2f31' },
    { name: 'Stone', hex: '#cfc8ba' },
    { name: 'Dark Taupe', hex: '#4c4a44' },
    { name: 'Navy', hex: '#2c3547' },
    { name: 'Black', hex: '#1c1c1e' },
  ],
  shoes: [
    { name: 'White / Gum', hex: '#d9d2c6' },
    { name: 'Black', hex: '#1e1e20' },
    { name: 'Sand', hex: '#c9b58e' },
    { name: 'Chestnut', hex: '#5d4531' },
    { name: 'Grey', hex: '#8f8d88' },
  ],
};

/**
 * Base looks. `id` here is the seed id — freshLooks() suffixes a per-session
 * seed so every generated look has a globally unique id (the web demo reused
 * `look-01` across sessions, which is exactly the identity bug we do not port).
 */
const LOOK_SEEDS: Look[] = [
  {
    id: 'look-01',
    number: '01',
    title: 'Quiet confidence',
    vibe: 'Strong fit for your style',
    description:
      'Clean proportions, neutral layers, and enough structure to look deliberate without feeling overdressed.',
    why:
      'You lean minimal with elevated-casual edges, so this stays tonal: a fine merino layer, a straight trouser with real drape, and one classic sneaker. The silhouette is straight through the leg, which suits your 6’0" / M frame.',
    scene: { a: '#b8b1a5', b: '#e9e4da' },
    products: [
      {
        id: 'l1-top', slot: 'top',
        brand: 'COS', name: 'Merino Zip Polo', priceCents: 9900,
        color: 'Charcoal', hex: '#24262b', size: 'M',
        details: 'Fine-gauge extra-fine merino, knit in a clean polo silhouette. True to size; hem sits at the hip.',
        palette: SLOT_PALETTES.top,
        alternatives: [
          { brand: 'Uniqlo', name: 'Fine Gauge Crew', priceCents: 3900, color: 'Stone', hex: '#d6cfc2', reason: 'Lower price' },
          { brand: 'Todd Snyder', name: 'Merino Polo', priceCents: 12800, color: 'Forest', hex: '#2c3a31', reason: 'More texture' },
          { brand: 'COS', name: 'Knit Overshirt', priceCents: 13500, color: 'Stone', hex: '#d6cfc2', reason: 'More relaxed' },
          { brand: 'Club Monaco', name: 'Half-Zip Knit', priceCents: 11900, color: 'Navy', hex: '#2f3d55', reason: 'Warmer for the evening' },
        ],
      },
      {
        id: 'l1-pants', slot: 'pants',
        brand: 'Abercrombie', name: 'Tailored Straight Trouser', priceCents: 9000,
        color: 'Dark Taupe', hex: '#4c4a44', size: '31×32',
        details: 'Four-way stretch with a tailored straight leg. Runs true; 32" inseam clears a low sneaker.',
        palette: SLOT_PALETTES.pants,
        alternatives: [
          { brand: 'Uniqlo', name: 'Pleated Wide Trouser', priceCents: 5900, color: 'Charcoal', hex: '#2e2f31', reason: 'Lower price' },
          { brand: 'COS', name: 'Pleated Wool Trouser', priceCents: 15900, color: 'Charcoal', hex: '#2e2f31', reason: 'More formal' },
          { brand: 'J.Crew', name: 'Weekday Chino', priceCents: 8000, color: 'Stone', hex: '#cfc8ba', reason: 'More casual' },
          { brand: 'Aritzia Men', name: 'Effortless Pant', priceCents: 9800, color: 'Black', hex: '#1c1c1e', reason: 'Dressier drape' },
        ],
      },
      {
        id: 'l1-shoes', slot: 'shoes',
        brand: 'Adidas', name: 'Samba OG', priceCents: 9700,
        color: 'White / Gum', hex: '#d9d2c6', size: '10',
        details: 'Low-profile leather terrace sneaker. Fits true to size; works with a straight or wide leg opening.',
        palette: SLOT_PALETTES.shoes,
        alternatives: [
          { brand: 'Veja', name: 'Campo Sneaker', priceCents: 11000, color: 'White / Gum', hex: '#d9d2c6', reason: 'Cleaner lines' },
          { brand: 'New Balance', name: '1906', priceCents: 11500, color: 'Grey', hex: '#8f8d88', reason: 'More cushion' },
          { brand: 'Morjas', name: 'Penny Loafer', priceCents: 14900, color: 'Chestnut', hex: '#5d4531', reason: 'More formal' },
          { brand: 'Vans', name: 'Authentic', priceCents: 6000, color: 'Black', hex: '#1e1e20', reason: 'Lower price' },
        ],
      },
    ],
  },
  {
    id: 'look-02',
    number: '02',
    title: 'Soft structure',
    vibe: 'Leans into your neutrals',
    description:
      'A lighter palette with sharper trousers — polished enough for the evening, relaxed enough to enjoy it.',
    why:
      'This one plays to your budget priority: the knit is the value piece, and the spend moves to the trouser, where a wool blend reads noticeably better at night. The stone-on-black pairing flatters your neutral palette.',
    scene: { a: '#ccc3b7', b: '#f1ede6' },
    products: [
      {
        id: 'l2-top', slot: 'top',
        brand: 'Uniqlo U', name: 'Fine Gauge Knit', priceCents: 5900,
        color: 'Stone', hex: '#d6cfc2', size: 'M',
        details: 'Lightweight crew with a slightly boxy body. Size down for a closer fit through the chest.',
        palette: SLOT_PALETTES.top,
        alternatives: [
          { brand: 'Muji', name: 'Cashmere Blend Crew', priceCents: 7900, color: 'Stone', hex: '#d6cfc2', reason: 'Softer hand' },
          { brand: 'COS', name: 'Merino Zip Polo', priceCents: 9900, color: 'Charcoal', hex: '#24262b', reason: 'More structure' },
          { brand: 'Uniqlo', name: 'Lambswool V-Neck', priceCents: 4900, color: 'Charcoal', hex: '#24262b', reason: 'Lower price' },
          { brand: 'Everlane', name: 'ReCashmere Crew', priceCents: 9800, color: 'Sand', hex: '#c9b58e', reason: 'Warmer' },
        ],
      },
      {
        id: 'l2-pants', slot: 'pants',
        brand: 'COS', name: 'Pleated Wool Trouser', priceCents: 15900,
        color: 'Black', hex: '#1c1c1e', size: '31',
        details: 'Single-pleat wool blend with a pressed crease and tapered leg. High rise; pair with a tucked or short hem.',
        palette: SLOT_PALETTES.pants,
        alternatives: [
          { brand: 'Aritzia Men', name: 'Relaxed Crease Pant', priceCents: 14500, color: 'Black', hex: '#1c1c1e', reason: 'More relaxed' },
          { brand: 'Abercrombie', name: 'Tailored Straight Trouser', priceCents: 9000, color: 'Dark Taupe', hex: '#4c4a44', reason: 'Lower price' },
          { brand: 'Suitsupply', name: 'Brescia Trouser', priceCents: 19900, color: 'Charcoal', hex: '#2e2f31', reason: 'More formal' },
          { brand: 'Uniqlo', name: 'Easy Pants', priceCents: 4900, color: 'Navy', hex: '#2c3547', reason: 'Most relaxed' },
        ],
      },
      {
        id: 'l2-shoes', slot: 'shoes',
        brand: 'New Balance', name: 'RC42', priceCents: 10000,
        color: 'Grey', hex: '#8f8d88', size: '10',
        details: 'Slim retro runner on a low wedge. True to size; the grey tone keeps the look quiet.',
        palette: SLOT_PALETTES.shoes,
        alternatives: [
          { brand: 'Adidas', name: 'Samba OG', priceCents: 9700, color: 'White / Gum', hex: '#d9d2c6', reason: 'Sharper profile' },
          { brand: 'Veja', name: 'Campo Sneaker', priceCents: 11000, color: 'Black', hex: '#1e1e20', reason: 'Leather upgrade' },
          { brand: 'Converse', name: 'Chuck 70', priceCents: 8500, color: 'Black', hex: '#1e1e20', reason: 'Lower price' },
          { brand: 'Salomon', name: 'XT-6', priceCents: 16000, color: 'Grey', hex: '#8f8d88', reason: 'More technical' },
        ],
      },
    ],
  },
  {
    id: 'look-03',
    number: '03',
    title: 'Night shift',
    vibe: 'A bolder read for the night',
    description:
      'Darker and slightly more directional — built for dinner that turns into a longer night out.',
    why:
      'FORM went one step outside your usual palette here: head-to-toe black with a textured layer on top. The overshirt keeps it from reading as a suit, and the white sneaker gives the eye somewhere to land.',
    scene: { a: '#8d8982', b: '#d6d2ca' },
    products: [
      {
        id: 'l3-top', slot: 'top',
        brand: 'Zara', name: 'Textured Overshirt', priceCents: 8900,
        color: 'Black', hex: '#24262b', size: 'M',
        details: 'Boxy overshirt with a seersucker-style texture. Roomy through the chest; wears open or buttoned.',
        palette: SLOT_PALETTES.top,
        alternatives: [
          { brand: 'COS', name: 'Knit Overshirt', priceCents: 13500, color: 'Charcoal', hex: '#24262b', reason: 'More texture' },
          { brand: 'AllSaints', name: 'Patch Shirt', priceCents: 12900, color: 'Black', hex: '#1c1c1e', reason: 'More edge' },
          { brand: 'Uniqlo', name: 'Flannel Overshirt', priceCents: 5900, color: 'Charcoal', hex: '#2e2f31', reason: 'Lower price' },
          { brand: 'Theory', name: 'Irving Shirt', priceCents: 18500, color: 'Black', hex: '#1c1c1e', reason: 'More refined' },
        ],
      },
      {
        id: 'l3-pants', slot: 'pants',
        brand: 'Aritzia Men', name: 'Relaxed Crease Pant', priceCents: 14500,
        color: 'Black', hex: '#1c1c1e', size: '31',
        details: 'Fluid crease-front pant with a relaxed leg. Sits at the natural waist; drapes over sneakers cleanly.',
        palette: SLOT_PALETTES.pants,
        alternatives: [
          { brand: 'COS', name: 'Pleated Wool Trouser', priceCents: 15900, color: 'Black', hex: '#1c1c1e', reason: 'More formal' },
          { brand: 'Levi’s', name: '511 Slim', priceCents: 6900, color: 'Black', hex: '#1c1c1e', reason: 'Lower price' },
          { brand: 'Lululemon', name: 'ABC Pant', priceCents: 12800, color: 'Black', hex: '#1c1c1e', reason: 'More comfort' },
          { brand: 'Suitsupply', name: 'Winter Trouser', priceCents: 19900, color: 'Charcoal', hex: '#2e2f31', reason: 'Dressier' },
        ],
      },
      {
        id: 'l3-shoes', slot: 'shoes',
        brand: 'Veja', name: 'Campo Sneaker', priceCents: 11000,
        color: 'White / Gum', hex: '#d9d2c6', size: '10',
        details: 'Chrome-free leather low-top with a rubber sole. Runs slightly large; half size down if between.',
        palette: SLOT_PALETTES.shoes,
        alternatives: [
          { brand: 'Adidas', name: 'Samba OG', priceCents: 9700, color: 'White / Gum', hex: '#d9d2c6', reason: 'Lower price' },
          { brand: 'Common Projects', name: 'Achilles', priceCents: 21000, color: 'White', hex: '#e4ded2', reason: 'Minimal icon' },
          { brand: 'Morjas', name: 'Penny Loafer', priceCents: 14900, color: 'Chestnut', hex: '#5d4531', reason: 'More formal' },
          { brand: 'New Balance', name: '1906', priceCents: 11500, color: 'Grey', hex: '#8f8d88', reason: 'Sportier' },
        ],
      },
    ],
  },
];

export const LOADING_MESSAGES: readonly string[] = [
  'Considering your style',
  'Balancing the budget',
  'Matching silhouettes',
  'Finding the right shoes',
];

/** The four starting points, hand-picked — inspiration, not filters. */
export const STARTING_POINTS: readonly { label: string; prompt: string }[] = [
  { label: 'Dinner', prompt: 'Dinner in SoHo Saturday. 55°F. I want to look expensive but not overdressed. Under $350.' },
  { label: 'Going out', prompt: 'Going out with friends. Darker palette, easy shoes, has to stay sharp late.' },
  { label: 'Work', prompt: 'A normal workday. Smart, quiet, comfortable. Nothing flashy.' },
  { label: 'Weekend', prompt: 'A slow weekend. Coffee, errands, maybe an early dinner — relaxed but still put together.' },
];

export const STYLE_OPTIONS: readonly StyleOption[] = [
  { name: 'Minimal', description: 'Clean lines, quiet color' },
  { name: 'Elevated casual', description: 'Polished, never stiff' },
  { name: 'Classic', description: 'Timeless over trendy' },
  { name: 'Streetwear', description: 'Relaxed, current' },
  { name: 'Formal', description: 'Sharp tailoring' },
  { name: 'Rugged', description: 'Workwear bones' },
  { name: 'Playful', description: 'Color, pattern, fun' },
  { name: 'Bold', description: 'Makes an entrance' },
];

export const PRIORITY_OPTIONS: readonly string[] = ['Value first', 'Balanced', 'Best overall look'];

/** Generate this session's looks with globally unique ids. */
export function freshLooks(sessionSeed: string): Look[] {
  return LOOK_SEEDS.map(seed => ({
    ...seed,
    id: `${seed.id}_${sessionSeed}`,
    scene: { ...seed.scene },
    products: seed.products.map(p => ({ ...p })),
  }));
}
