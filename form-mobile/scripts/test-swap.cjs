const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
require.extensions['.ts'] = (mod, filename) => {
  mod._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText, filename);
};
const engine = require('../src/domain/fixtureEngine.ts');
assert.equal(typeof engine.swapFixturePiece, 'function', 'Per-piece swap must exist');
const { catalogProducts } = require('../src/data/catalog.ts');
const profile = { styles: ['Minimal', 'Classic'], brands: [], avoidedBrands: [], favoriteColors: [], avoidedColors: [], budgetCents: 50000, topSize: 'M', waist: '30', inseam: '32', shoe: '10' };
const request = { occasion: 'Dinner in Manhattan', dressCode: 'Smart casual', budgetCents: 35000, location: 'New York', notes: '' };
const look = engine.buildFixtureSession(request, profile, 'swap', 7).looks[0];
const total = () => look.products.reduce((s, p) => s + p.priceCents, 0);

// Happy path: same look shape, exactly one piece changed, same slot, eligible, within budget.
const piece = look.products[1];
const next = engine.swapFixturePiece(look, piece.id, profile, 35000);
assert.ok(next, 'A swap must exist for a mid-look piece');
assert.equal(next.products.length, look.products.length, 'Swap keeps the piece count');
next.products.forEach((p, i) => {
  if (p.id === look.products[i].id) assert.deepEqual(p, look.products[i], 'Untouched pieces stay identical');
  else {
    assert.equal(i, look.products.findIndex(q => q.id === piece.id), 'Only the swapped position changed');
    assert.equal(p.slot, piece.slot, 'Replacement fills the same slot');
  }
});
assert.ok(next.products.reduce((s, p) => s + p.priceCents, 0) <= 35000, 'Swapped look respects the whole-look budget');
assert.ok(engine.eligibleProduct(next.products.find(p => p.id !== piece.id && look.products.every(q => q.id !== p.id)), profile), 'Replacement passes the profile filters');
assert.ok(next.id.includes('-swap-' + piece.id + '-'), 'Swapped id names the piece');
assert.notEqual(next.id, look.id, 'Swapped id must not collide with the source look');
assert.equal(next.previewKey, undefined, 'Swapped looks never reuse fixture photography');
assert.ok(next.why.includes('swap'), 'Swap records an honest why line');
// Replacement carries a recommended size.
assert.ok(next.products.find(p => !look.products.some(q => q.id === p.id)).size.length > 0, 'Replacement gets a recommended size');

// Determinism: same inputs, same id — no Saved collisions.
assert.equal(engine.swapFixturePiece(look, piece.id, profile, 35000).id, next.id, 'Swap is deterministic');

// The remaining pieces may also swap: two different pieces produce distinct ids.
const other = look.products[0];
const nextOther = engine.swapFixturePiece(look, other.id, profile, 35000);
assert.ok(nextOther && nextOther.id !== next.id, 'Different swapped pieces must not collide');

// Chained swaps keep one base id, not a growing chain.
const chain = engine.swapFixturePiece(next, next.products.find(p => !look.products.some(q => q.id === p.id)).id, profile, 35000);
if (chain) assert.ok(chain.id.startsWith(next.id.split('-swap-')[0] + '-'), 'Chained swap reuses the base id');

// Preference steering: avoiding the first replacement's brand changes or removes it.
const replacement = next.products.find(p => !look.products.some(q => q.id === p.id));
const steered = engine.swapFixturePiece(look, piece.id, { ...profile, avoidedBrands: [replacement.brand] }, 35000);
if (steered) assert.ok(steered.products.every(p => p.brand !== replacement.brand || look.products.some(q => q.id === p.id)), 'Avoided brands are excluded from the replacement');

// Budget wall: when no same-slot alternative fits the remaining room, the swap is null.
const candidates = catalogProducts.filter(c => c.slot === piece.slot && c.id !== piece.id && engine.eligibleProduct(c, profile));
const cheapest = Math.min(...candidates.map(c => c.priceCents));
const wall = total() - piece.priceCents + cheapest - 1;
assert.equal(engine.swapFixturePiece(look, piece.id, profile, wall), null, 'No fitting alternative is an honest null');

// Unknown piece is an honest null too.
assert.equal(engine.swapFixturePiece(look, 'no-such-piece', profile), null, 'Unknown piece id returns null');
console.log('PASS: per-piece swap — slot integrity, whole-look budget, eligibility, deterministic ids, honest nulls');
