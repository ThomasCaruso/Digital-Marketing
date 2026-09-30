const assert = require('node:assert/strict');
require('./test-product-loop.cjs');
const { swipeExitVector } = require('../src/domain/discoveryGesture.ts');
assert.equal(typeof swipeExitVector, 'function', 'Swipe exit must preserve the gesture direction');
for (const [dx, dy] of [[200, -80], [200, 80], [-200, -80], [-200, 80]]) {
  const end = swipeExitVector(dx, dy, 390, 844);
  assert.ok(Math.abs(end.y / end.x - dy / dx) < 1e-10, 'Exit follows the exact slope');
  assert.equal(Math.sign(end.x), Math.sign(dx));
  assert.equal(Math.sign(end.y), Math.sign(dy));
  assert.ok(Math.abs(end.x) >= 390 * 1.5 || Math.abs(end.y) >= 844, 'Exit clears the viewport');
}
assert.equal(swipeExitVector(120, 0, 390, 844).y, 0, 'Horizontal swipe has no downward drift');
assert.deepEqual(swipeExitVector(0, 0, 390, 844), { x: 0, y: 0 }, 'Stationary gesture is finite');
const { verticalDragOffset } = require('../src/domain/discoveryGesture.ts');
assert.equal(typeof verticalDragOffset, 'function', 'Vertical drag needs controlled resistance');
assert.equal(verticalDragOffset(0), 0);
for (const dy of [10, 100, 1000]) {
  assert.ok(verticalDragOffset(dy) > 0 && verticalDragOffset(dy) <= 14, 'Vertical movement is limited to 14dp');
  assert.ok(verticalDragOffset(dy) < dy, 'Vertical travel is resisted');
  assert.equal(verticalDragOffset(-dy), -verticalDragOffset(dy), 'Resistance is symmetric');
}
assert.ok(Math.abs(verticalDragOffset(101) - verticalDragOffset(100)) < 0.2, 'Resistance stays continuous without a hard stop');
console.log('PASS: exit direction, viewport clearance and smooth vertical resistance');

