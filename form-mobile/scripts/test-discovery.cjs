const assert = require('node:assert/strict');
require('./test-product-loop.cjs');
const Module = require('node:module');
const originalLoad = Module._load;
const memory = new Map();
Module._load = function(request, parent, main) {
  if (request === '@react-native-async-storage/async-storage') return { __esModule: true, default: {
    getItem: async key => memory.get(key) ?? null,
    setItem: async (key, value) => { memory.set(key, value); },
    removeItem: async key => { memory.delete(key); },
  } };
  return originalLoad.call(this, request, parent, main);
};
async function run() {
  const file = require.resolve('../src/state/store.ts');
  let store = require(file).useFormStore;
  await store.persist.rehydrate();
  const { catalogProducts } = require('../src/data/catalog.ts');
  const [piece, other] = catalogProducts;
  assert.equal(typeof store.getState().reviewPiece, 'function', 'Discovery decisions need an atomic commit');
  store.getState().togglePiece(other);
  const otherSnapshot = store.getState().savedPieces[0];
  assert.equal(store.getState().reviewPiece(piece, 'saved'), true);
  assert.equal(store.getState().reviewPiece(piece, 'saved'), false, 'Rapid duplicate save is ignored');
  assert.equal(store.getState().reviewPiece(piece, 'passed'), false, 'Conflicting rapid decision is ignored');
  assert.equal(store.getState().savedPieces.filter(p => p.id === piece.id).length, 1);
  assert.equal(store.getState().undoPieceReview(), piece.id);
  assert.equal(store.getState().recommendationReview[piece.id], undefined);
  assert.deepEqual(store.getState().savedPieces, [otherSnapshot], 'Undo preserves unrelated saves');
  assert.equal(store.getState().undoPieceReview(), null, 'Undo is single use');
  store.getState().reviewPiece(piece, 'passed');
  assert.equal(store.getState().undoPieceReview(), piece.id, 'Pass can be undone');
  store.getState().reviewPiece(piece, 'passed');
  store.getState().refreshSelection();
  assert.equal(store.getState().undoPieceReview(), null, 'Refresh invalidates undo');
  store.getState().reviewPiece(piece, 'saved');
  store.getState().updateProfile({ ...store.getState().profile, budgetCents: 10000 });
  assert.equal(store.getState().undoPieceReview(), null, 'Preference changes invalidate undo');
  store.getState().togglePiece(piece);
  store.getState().refreshSelection();
  store.getState().reviewPiece(piece, 'saved');
  store.getState().togglePiece(other);
  assert.equal(store.getState().undoPieceReview(), null, 'External save mutations invalidate undo');
  store.getState().refreshSelection();
  store.getState().reviewPiece(catalogProducts[2], 'passed');
  await new Promise(resolve => setTimeout(resolve, 10));
  delete require.cache[file];
  store = require(file).useFormStore;
  await store.persist.rehydrate();
  assert.equal(store.getState().discoveryUndo, null, 'Undo is transient across restarts');
  assert.equal(store.getState().recommendationReview[catalogProducts[2].id], 'passed', 'Decision persists');
  const { swipeDecision, shouldCaptureSwipe } = require('../src/domain/discoveryGesture.ts');
  assert.equal(shouldCaptureSwipe(8, 1), false, 'Tiny motion does not steal a tap');
  assert.equal(shouldCaptureSwipe(30, 40), false, 'Vertical scrolling remains available');
  assert.equal(shouldCaptureSwipe(30, 4), true);
  assert.equal(swipeDecision(40, 2, 360), null, 'Short swipe cancels');
  assert.equal(swipeDecision(120, 8, 360), 'saved');
  assert.equal(swipeDecision(-120, 8, 360), 'passed');
  assert.equal(swipeDecision(120, 140, 360), null, 'Diagonal vertical motion cannot commit');
  console.log('PASS: atomic discovery, single-use undo, save isolation, invalidation, persistence, gesture intent');
}
run().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => { Module._load = originalLoad; });
