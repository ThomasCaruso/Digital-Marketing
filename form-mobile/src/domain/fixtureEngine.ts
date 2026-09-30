import { catalogProducts, fixtureLooks } from '../data/catalog';
import type { EditRequest, Look, Product, Profile, Refinement, ReviewStatus, SavedLook, SavedPiece, Session } from './types';
const normalized = (value: string) => value.trim().toLowerCase();
const includes = (values: string[] | undefined, value: string) => (values ?? []).some(v => normalized(v) === normalized(value));
export function eligibleProduct(product: Product, profile: Profile) {
  return !includes(profile.avoidedBrands, product.brand) && !includes(profile.avoidedColors, product.color) && product.priceCents <= profile.budgetCents;
}
/** Explicit demo rules, never inference about the wearer. */
export function fixtureReason(product: Product, profile: Profile): string {
  if (product.priceCents > profile.budgetCents) return 'Above your current look budget; kept as a demo reference.';
  if (includes(profile.brands, product.brand)) return product.brand + ' is in your preferred brands.';
  if (includes(profile.favoriteColors, product.color)) return product.color + ' is in your favorite colors.';
  const style = product.styleTags?.find(tag => includes(profile.styles, tag));
  if (style) return 'Matches your ' + style.toLowerCase() + ' preference.';
  return 'Inside your ' + '$' + profile.budgetCents / 100 + ' look budget.';
}
export function rankProducts(profile: Profile): Product[] {
  const score = (p: Product) => (p.styleTags ?? []).reduce((sum, tag) => sum + (includes(profile.styles, tag) ? (tag === 'Classic' ? 40 : 10) : 0), 0)
    + (includes(profile.brands, p.brand) ? 8 : 0) + (includes(profile.favoriteColors, p.color) ? 12 : 0);
  return catalogProducts.filter(p => eligibleProduct(p, profile)).sort((a, b) => score(b) - score(a) || catalogProducts.indexOf(a) - catalogProducts.indexOf(b));
}
export function unseenProducts(products: Product[], review: Record<string, ReviewStatus>, saved: Pick<SavedPiece, 'id'>[]) {
  return products.filter(p => !review[p.id] && !saved.some(s => s.id === p.id));
}
export function recommendedSize(product: Product, profile: Profile) {
  return product.slot === 'top' ? profile.topSize : product.slot === 'pants' ? profile.waist + ' × ' + profile.inseam : profile.shoe;
}
export function buildFixtureSession(request: EditRequest, profile: Profile, seed: string, createdAt = Date.now()): Session {
  const effective = { ...profile, budgetCents: Math.min(request.budgetCents, profile.budgetCents) };
  const candidates = rankProducts(effective);
  const formal = /formal|business|black tie/i.test(request.dressCode) && !/casual/i.test(request.dressCode);
  const casual = /relaxed|casual/i.test(request.dressCode) && !/smart/i.test(request.dressCode);
  const combinations: Product[][] = [];
  for (const top of candidates.filter(p => p.slot === 'top'))
    for (const pants of candidates.filter(p => p.slot === 'pants'))
      for (const shoes of candidates.filter(p => p.slot === 'shoes'))
        if (top.priceCents + pants.priceCents + shoes.priceCents <= effective.budgetCents) combinations.push([top, pants, shoes]);
  const rank = new Map(candidates.map((p, i) => [p.id, i]));
  const score = (ps: Product[]) => ps.reduce((s, p) => s + (rank.get(p.id) ?? 0) + (formal ? 3 - (p.formality ?? 0) : casual ? p.formality ?? 0 : Math.abs(1 - (p.formality ?? 0))) * 8, 0);
  combinations.sort((a, b) => score(a) - score(b) || a.map(p=>p.id).join().localeCompare(b.map(p=>p.id).join()));
  const picks: Product[][] = [];
  for (const ps of combinations) {
    if (!picks.length || !picks.some(p => p[0].id === ps[0].id)) picks.push(ps);
    if (picks.length === 3) break;
  }
  for (const ps of combinations) {
    if (picks.length === 3) break;
    if (!picks.includes(ps)) picks.push(ps);
  }
  return {
    id: 'session-' + seed, occasion: request.occasion, request: { ...request }, createdAt,
    looks: picks.map((products, i) => ({
      ...fixtureLooks[i], id: 'look-' + seed + '-' + i, number: String(i + 1).padStart(2, '0'),
      products: products.map(p => ({ ...p, size: recommendedSize(p, profile) })), previewKey: undefined,
      why: 'Demo fixture styling for ' + request.occasion + ' · ' + request.dressCode + '.',
    })),
  };
}
export function refineFixtureLook(look: Look, action: Refinement, profile: Profile, budgetCents = profile.budgetCents): Look {
  const total = look.products.reduce((s, p) => s + p.priceCents, 0);
  const products = look.products.map(p => {
    const options = catalogProducts.filter(candidate => candidate.slot === p.slot && candidate.id !== p.id && eligibleProduct(candidate, profile) && total - p.priceCents + candidate.priceCents <= budgetCents);
    let replacement: Product | undefined;
    if (action === 'Lower price') replacement = options.filter(c => c.priceCents < p.priceCents).sort((a,b) => a.priceCents - b.priceCents)[0];
    if (action === 'Different shoes' && p.slot === 'shoes') replacement = options[0];
    if (action === 'More formal') replacement = options.filter(c => (c.formality ?? 0) > (p.formality ?? 0)).sort((a,b) => (b.formality ?? 0) - (a.formality ?? 0))[0];
    if (action === 'Less formal') replacement = options.filter(c => (c.formality ?? 0) < (p.formality ?? 0)).sort((a,b) => (a.formality ?? 0) - (b.formality ?? 0))[0];
    if (action === 'Warmer' && p.slot === 'top') replacement = options.find(c => c.id === 'warm-knit' || c.id === 'overshirt');
    if (action === 'More relaxed') replacement = options.find(c => c.id === (p.slot === 'top' ? 'fine-knit' : p.slot === 'pants' ? 'relaxed' : 'runner'));
    return replacement ? { ...replacement, size: recommendedSize(replacement, profile) } : p;
  });
  // Changing several pieces independently must still respect the whole-look cap.
  const result: Product[] = [...look.products];
  products.forEach((p, i) => {
    if (result.reduce((s, item) => s + item.priceCents, 0) - result[i].priceCents + p.priceCents <= budgetCents) result[i] = p;
  });
  if (result.every((p,i) => p.id === look.products[i].id)) return look;
  return { ...look, id: look.id.split('-adjust-')[0] + '-adjust-' + action.toLowerCase().replaceAll(' ', '-') + '-' + result.map(p => [p.id, p.brand, p.priceCents, p.color, p.size].join('.')).join('_'), products: result, previewKey: undefined, why: 'Demo fixture adjustment: ' + action.toLowerCase() + '.', refinements: [...(look.refinements ?? []), action] };
}

/** Swap one piece for the highest-ranked same-slot alternative within the look's budget; null when nothing qualifies. */
export function swapFixturePiece(look: Look, pieceId: string, profile: Profile, budgetCents = profile.budgetCents): Look | null {
  const current = look.products.find(p => p.id === pieceId);
  if (!current) return null;
  const total = look.products.reduce((s, p) => s + p.priceCents, 0);
  const preferred = new Set(rankProducts(profile).map(p => p.id));
  const replacement = catalogProducts
    .filter(candidate => candidate.slot === current.slot && candidate.id !== current.id && eligibleProduct(candidate, profile) && total - current.priceCents + candidate.priceCents <= budgetCents)
    .sort((a, b) => (preferred.has(a.id) ? 0 : 1) - (preferred.has(b.id) ? 0 : 1) || catalogProducts.indexOf(a) - catalogProducts.indexOf(b))[0];
  if (!replacement) return null;
  const products = look.products.map(p => p.id === pieceId ? { ...replacement, size: recommendedSize(replacement, profile) } : p);
  const base = look.id.split('-adjust-')[0].split('-swap-')[0];
  return { ...look, id: base + '-swap-' + pieceId + '-' + products.map(p => [p.id, p.brand, p.priceCents, p.color, p.size].join('.')).join('_'), products, previewKey: undefined, why: 'Demo fixture swap: ' + replacement.name.toLowerCase() + ' for ' + current.name.toLowerCase() + '.' };
}

/** A complete fixture pairing for every catalog piece; no profile inference. */
export function relatedFixtureLook(product: Product): Look {
  return fixtureLooks.find(l => l.products.some(p => p.id === product.id)) ?? {
    id: 'related-' + product.id, number: '01', title: 'A considered pairing', vibe: 'Demo complete look',
    description: 'An understated fixture pairing around this piece.', why: 'Demo styling: one piece in each garment slot.',
    scene: { a: '#b8b1a5', b: '#e9e4da' },
    products: (['top', 'pants', 'shoes'] as const).map(slot => slot === product.slot ? product : catalogProducts.filter(p => p.slot === slot).sort((a,b) => a.priceCents - b.priceCents)[0]),
  };
}



export function refinementBudget(lookId: string, profile: Profile, sessions: Session[], saved: SavedLook[]): number {
  const request = sessions.find(s => s.looks.some(l => l.id === lookId))?.request ?? saved.find(s => s.id === lookId)?.request;
  return Math.min(request?.budgetCents ?? profile.budgetCents, profile.budgetCents);
}

