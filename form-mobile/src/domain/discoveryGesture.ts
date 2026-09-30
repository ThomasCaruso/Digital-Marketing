import type { ReviewStatus } from './types';
/** Establish horizontal intent before taking control from a scroll view. */
export function shouldCaptureSwipe(dx: number, dy: number): boolean {
  return Math.abs(dx) > 12 && Math.abs(dx) > Math.abs(dy) * 1.5;
}
/** Distance, rather than a velocity spike, makes a discovery decision deliberate. */
export function swipeDecision(dx: number, dy: number, width: number): ReviewStatus | null {
  'worklet';
  const threshold = Math.max(80, Math.min(120, width * 0.28));
  if (Math.abs(dx) < threshold || Math.abs(dx) < Math.abs(dy) * 1.5) return null;
  return dx > 0 ? 'saved' : 'passed';
}
/** Extend the release vector along the same ray until the whole card clears. */
export function swipeExitVector(dx: number, dy: number, width: number, height: number): { x: number; y: number } {
  'worklet';
  if (dx === 0 && dy === 0) return { x: 0, y: 0 };
  const travel = Math.min(dx === 0 ? Infinity : width * 1.6 / Math.abs(dx), dy === 0 ? Infinity : height * 1.35 / Math.abs(dy));
  return { x: dx * travel, y: dy * travel };
}

/** Smooth resistance keeps vertical drift small without hitting a rigid stop. */
export function verticalDragOffset(dy: number): number {
  'worklet';
  return 14 * Math.tanh(dy / 90);
}
