const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
require.extensions['.ts'] = (mod, filename) => {
  mod._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText, filename);
};
let engine;
try { engine = require('../src/domain/fixtureEngine.ts'); } catch { engine = {}; }
assert.equal(typeof engine.rankProducts, 'function', 'Fixture ranking must exist');
const { catalogProducts, fixtureLooks } = require('../src/data/catalog.ts');
const profile = { styles: ['Minimal', 'Classic'], brands: [], avoidedBrands: [], favoriteColors: [], avoidedColors: [], budgetCents: 50000, topSize: 'M', waist: '30', inseam: '32', shoe: '10' };
const ranked = engine.rankProducts(profile);
assert.notDeepEqual(ranked.map(p => p.id), engine.rankProducts({ ...profile, styles: ['Minimal'] }).map(p => p.id), 'Removing Classic changes ranking');
assert.ok(engine.rankProducts({ ...profile, avoidedBrands: ['COS'] }).every(p => p.brand !== 'COS'), 'Avoided brands excluded');
assert.ok(engine.rankProducts({ ...profile, budgetCents: 10000 }).every(p => p.priceCents <= 10000), 'Expensive pieces excluded');
assert.equal(engine.unseenProducts(ranked, Object.fromEntries(ranked.map(p => [p.id, 'passed'])), []).length, 0, 'Reviewed feed exhausts');
assert.equal(engine.unseenProducts(ranked, {}, [{ id: ranked[0].id }]).some(p => p.id === ranked[0].id), false, 'Saved pieces excluded');
const request = { occasion: 'Dinner in Manhattan', dressCode: 'Smart casual', budgetCents: 35000, location: 'New York', notes: 'Drinks after; understated.' };
const session = engine.buildFixtureSession(request, profile, 'test', 123);
assert.deepEqual(session.request, request, 'Session retains the actual request');
assert.equal(session.createdAt, 123);
assert.equal(session.looks.length, 3);
assert.ok(session.looks.every(l => l.products.reduce((sum, p) => sum + p.priceCents, 0) <= request.budgetCents), 'Whole looks fit request budget');
assert.ok(engine.buildFixtureSession({ ...request, budgetCents: 100 }, profile, 'empty', 1).looks.length === 0, 'Impossible budget is honest');
const expensive = fixtureLooks[0];
const refinementProfile = { ...profile, budgetCents: 100000 };
const cheaper = engine.refineFixtureLook(expensive, 'Lower price', refinementProfile);
const alternativeCheaper = engine.refineFixtureLook(expensive, 'Lower price', { ...refinementProfile, avoidedBrands: ['Uniqlo'] });
assert.notEqual(cheaper.id, alternativeCheaper.id, 'Different refined contents must not collide in Saved');
assert.ok(cheaper.products.reduce((s,p)=>s+p.priceCents,0) < expensive.products.reduce((s,p)=>s+p.priceCents,0), 'Lower price reduces total');
assert.notDeepEqual(engine.refineFixtureLook(expensive, 'Different shoes', refinementProfile).products, expensive.products);
for (const action of ['Less formal', 'More formal', 'Warmer', 'More relaxed']) {
  assert.notDeepEqual(engine.refineFixtureLook(expensive, action, refinementProfile).products, expensive.products, action + ' changes garments');
}
assert.equal(expensive.products[0].id, catalogProducts[0].id, 'Stable product identities');
assert.ok(engine.rankProducts({ ...profile, avoidedBrands: ['cos'] }).every(p => p.brand.toLowerCase() !== 'cos'));
assert.equal(typeof engine.refinementBudget, 'function', 'Saved request budget must survive source session trimming');
assert.equal(engine.refinementBudget('saved-look', { ...profile, budgetCents: 50000 }, [], [{ id: 'saved-look', request: { budgetCents: 20000 } }]), 20000, 'Saved request still caps adjustments after session removal');
console.log('PASS: fixture ranking, feedback exhaustion, request grounding, budgets, stable identities, six refinements');



