const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
require.extensions['.ts'] = (mod, filename) => {
  mod._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText, filename);
};
const Module = require('node:module');
const originalLoad = Module._load;
const memory = new Map();
const storage = { getItem: async key => memory.get(key) ?? null, setItem: async (key, value) => { memory.set(key, value); }, removeItem: async key => memory.delete(key) };
Module._load = function(request, parent, main) {
  if (request === '@react-native-async-storage/async-storage') return { __esModule: true, default: storage };
  return originalLoad.call(this, request, parent, main);
};
async function run() {
  const { slotLabel, INTAKE_SLOTS, newGarmentId, userGarmentToProduct, addGarmentToLook, removePieceFromLook, isUserUpload, selectionKey, selectionFromProduct } = require('../src/domain/garments.ts');
  const { catalogProducts, fixtureLooks } = require('../src/data/catalog.ts');

  // Slot vocabulary: the five model slots, intake order matching the add-a-piece screen.
  assert.deepEqual(INTAKE_SLOTS, ['top', 'pants', 'outerwear', 'shoes']);
  assert.equal(slotLabel('pants'), 'Bottom');
  assert.equal(slotLabel('outerwear'), 'Outerwear');
  assert.notEqual(newGarmentId(), newGarmentId(), 'Garment ids never collide');

  // Uploads keep their identity as a Product view: source stays user_upload, photo stays the local URI.
  const garment = { id: newGarmentId(), source: 'user_upload', localUri: 'file:///documents/garments/a.jpg', slot: 'pants', color: 'Charcoal', createdAt: 1 };
  const view = userGarmentToProduct(garment);
  assert.equal(view.source, 'user_upload');
  assert.equal(view.localUri, garment.localUri);
  assert.equal(isUserUpload(view), true);
  assert.equal(view.name, 'Bottom', 'Missing optional name falls back to the slot label');
  assert.equal(view.color, 'Charcoal');
  assert.equal(userGarmentToProduct({ ...garment, color: undefined }).color, '', 'Missing optional color is never fabricated');
  assert.equal(view.priceCents, 0, 'Uploads carry no price');
  const named = userGarmentToProduct({ ...garment, name: 'Charcoal pleats' });
  assert.equal(named.name, 'Charcoal pleats');

  // Mixed boards: catalog jacket + uploaded trousers on one look, fixture never mutated.
  const base = fixtureLooks[0];
  const mixed = addGarmentToLook(base, garment);
  assert.notEqual(mixed, base, 'Adding a piece returns a new look');
  assert.equal(base.products.length, 3, 'Fixture look is never mutated');
  assert.deepEqual(mixed.products.slice(0, 3), base.products, 'Original pieces stay in place');
  assert.equal(mixed.products[3].source, 'user_upload');
  assert.equal(addGarmentToLook(mixed, garment), mixed, 'Duplicate add is a no-op');
  const trimmed = removePieceFromLook(mixed, garment.id);
  assert.deepEqual(trimmed.products, base.products, 'Remove takes only the upload back off');

  // Try-on selection keys: catalog and upload identities never alias.
  assert.equal(selectionKey({ source: 'catalog', product: catalogProducts[0] }), 'catalog:jacket');
  assert.equal(selectionKey({ source: 'user_upload', id: garment.id }), 'user_upload:' + garment.id);
  assert.equal(selectionKey(selectionFromProduct(view)), 'user_upload:' + garment.id, 'Upload product views resolve to the garment identity');
  assert.equal(selectionKey(selectionFromProduct(catalogProducts[0])), 'catalog:jacket');

  const file = require.resolve('../src/state/store.ts');
  let store = require(file).useFormStore;
  await store.persist.rehydrate();
  store.getState().clearTryOnSelection();

  // Store: add, update, remove; removal also clears the try-on selection entry.
  store.getState().addUserGarment(garment);
  assert.equal(store.getState().userGarments.length, 1);
  store.getState().toggleTryOnSelection({ source: 'user_upload', id: garment.id });
  store.getState().toggleTryOnSelection({ source: 'catalog', product: catalogProducts[0] });
  assert.equal(store.getState().tryOnSelection.length, 2, 'Catalog piece and upload can sit in one selection');
  store.getState().updateUserGarment(garment.id, { name: 'Charcoal pleats', color: 'Charcoal' });
  assert.equal(store.getState().userGarments[0].name, 'Charcoal pleats');
  store.getState().removeUserGarment('no-such-id');
  assert.equal(store.getState().userGarments.length, 1, 'Unknown removal is a no-op');

  // Metadata edits propagate to working-session looks already carrying the piece.
  const sessionLook = { ...fixtureLooks[0], id: 'look-live', products: [...addGarmentToLook(fixtureLooks[0], store.getState().userGarments[0]).products] };
  store.getState().selectLook(sessionLook);
  store.getState().updateUserGarment(store.getState().userGarments[0].id, { color: 'Stone' });
  const liveView = store.getState().selectedLook.products.find(p => p.source === 'user_upload');
  assert.equal(liveView.color, 'Stone', 'Board view of an upload follows metadata edits');
  assert.equal(liveView.name, 'Charcoal pleats', 'Board view of an upload follows renames');
  store.getState().selectLook(null);
  store.getState().removeUserGarment(garment.id);
  assert.equal(store.getState().userGarments.length, 0);
  assert.equal(store.getState().tryOnSelection.length, 1, 'Removing a garment clears only its own selection entry');
  assert.equal(store.getState().tryOnSelection[0].source, 'catalog');

  // Persistence: metadata + URIs survive a restart; the temporary selection does not.
  store.getState().addUserGarment({ ...garment, id: newGarmentId() });
  store.getState().toggleTryOnSelection({ source: 'user_upload', id: store.getState().userGarments[0].id });
  await new Promise(resolve => setTimeout(resolve, 10));
  delete require.cache[file];
  store = require(file).useFormStore;
  await store.persist.rehydrate();
  assert.equal(store.getState().userGarments.length, 1, 'Uploaded garment metadata persists');
  assert.equal(store.getState().userGarments[0].localUri, 'file:///documents/garments/a.jpg');
  assert.deepEqual(store.getState().tryOnSelection, [], 'Try-on selection is temporary and never persists');

  // Local-only: what reaches AsyncStorage is metadata and URIs — never base64 or data URIs.
  const persisted = JSON.stringify(memory.get('form-mobile-v1'));
  assert.ok(persisted.includes('file:///documents/garments/a.jpg'), 'Local URI is persisted');
  assert.ok(!persisted.includes('base64') && !persisted.includes('data:image'), 'No image bytes are ever persisted');

  console.log('PASS: user garments — slots, upload identity, mixed boards, selection keys, removal, persistence, local-only storage');
}
run().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => { Module._load = originalLoad; });
