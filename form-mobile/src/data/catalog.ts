import type { Look, Product } from '../domain/types';
type Spec = [string, Product['slot'], string, string, number, string, string, string, string[], number, string?];
const specs: Spec[] = [
  ['jacket', 'top', 'OUR LEGACY', 'Mini Jacket', 42000, 'Dark Brown', '#493529', 'Suede leather; cotton lining', ['Classic', 'Elevated casual'], 2, 'jacket'],
  ['crew', 'top', 'COS', 'Cotton Crewneck', 8900, 'Ivory', '#e4dace', '100% cotton', ['Minimal', 'Elevated casual'], 1, 'knit'],
  ['pleat', 'pants', 'THEORY', 'Pleated Trouser', 19500, 'Charcoal', '#44423f', 'Wool blend', ['Classic', 'Formal'], 3, 'trousers'],
  ['sneaker', 'shoes', 'Veja', 'Leather Sneakers', 11000, 'White', '#e4ded2', 'Leather upper; rubber sole', ['Minimal'], 0],
  ['overshirt', 'top', 'COS', 'Wool Overshirt', 13500, 'Soft black', '#29231d', 'Wool blend', ['Minimal', 'Elevated casual'], 2],
  ['shirt', 'top', 'Uniqlo', 'Oxford Shirt', 6500, 'Bone', '#e4dace', '100% cotton', ['Classic', 'Formal'], 3],
  ['straight', 'pants', 'Abercrombie', 'Straight Trouser', 9000, 'Grey', '#91918e', 'Cotton blend', ['Classic', 'Minimal'], 2],
  ['loafer', 'shoes', 'G.H. Bass', 'Penny Loafers', 9500, 'Soft black', '#29231d', 'Leather upper and lining', ['Classic', 'Formal'], 3],
  ['fine-knit', 'top', 'Uniqlo', 'Fine-knit Crewneck', 5900, 'Taupe', '#9a8a79', '100% cotton', ['Elevated casual', 'Minimal'], 0, 'knit'],
  ['linen', 'pants', 'Uniqlo', 'Linen Trouser', 4900, 'Bone', '#e4dace', 'Linen and cotton blend', ['Elevated casual'], 0, 'trousers'],
  ['canvas', 'shoes', 'Vans', 'Canvas Sneakers', 5500, 'Soft black', '#29231d', 'Cotton canvas; rubber sole', ['Streetwear', 'Minimal'], 0],
  ['warm-knit', 'top', 'Muji', 'Lambswool Crewneck', 7900, 'Navy', '#29313f', '100% lambswool', ['Minimal', 'Elevated casual'], 1],
  ['relaxed', 'pants', 'Muji', 'Relaxed Cotton Pants', 5900, 'Taupe', '#9a8a79', '100% cotton', ['Elevated casual', 'Streetwear'], 0],
  ['runner', 'shoes', 'New Balance', 'Retro Runners', 7500, 'Grey', '#91918e', 'Mesh and suede upper', ['Streetwear', 'Elevated casual'], 0],
];
export const catalogProducts: Product[] = specs.map(([id, slot, brand, name, priceCents, color, hex, material, styleTags, formality, assetKey]) => ({
  id, slot, brand, name, priceCents, color, hex, material, styleTags, formality, assetKey,
  size: slot === 'top' ? 'M' : slot === 'pants' ? '30 × 32' : '10',
  availableSizes: slot === 'top' ? ['XS', 'S', 'M', 'L', 'XL'] : slot === 'pants' ? ['28', '30', '32', '34', '36'] : ['8', '9', '10', '11', '12'],
  details: 'Demo catalog piece. Images, material, sizes and pricing are fixture information.',
  palette: [], alternatives: [],
}));
const piece = (id: string) => catalogProducts.find(p => p.id === id)!;
export const fixtureLooks: Look[] = [
  { id: 'quiet', number: '01', title: 'Quiet confidence', vibe: 'Elevated casual', description: 'Clean lines, rich texture, and an easy balance of relaxed and refined.', why: 'Demo styling: tonal layers with a straighter trouser.', scene: { a: '#b8b1a5', b: '#e9e4da' }, products: [piece('jacket'), piece('pleat'), piece('sneaker')], previewKey: 'quiet' },
  { id: 'night', number: '02', title: 'Night out', vibe: 'Smart casual', description: 'Deep tones, a sharp silhouette, and just enough ease for the evening.', why: 'Demo styling: a wool layer and a quiet leather shoe.', scene: { a: '#8d8982', b: '#d6d2ca' }, products: [piece('overshirt'), piece('straight'), piece('loafer')], previewKey: 'night' },
  { id: 'weekend', number: '03', title: 'Weekend ease', vibe: 'Relaxed', description: 'Soft layers and warm neutrals. A little less structure, a little more room.', why: 'Demo styling: an easy knit with linen trousers.', scene: { a: '#ccc3b7', b: '#f1ede6' }, products: [piece('fine-knit'), piece('linen'), piece('runner')], previewKey: 'weekend' },
];
