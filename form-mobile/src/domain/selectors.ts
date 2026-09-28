import type { Look, Session } from './types';

/** Money is integer cents; only the UI edge formats it. */
export function formatMoney(cents: number): string {
  if (cents % 100 === 0) return `$${cents / 100}`;
  return `$${(cents / 100).toFixed(2)}`;
}

export function lookTotalCents(look: Look): number {
  return look.products.reduce((sum, p) => sum + p.priceCents, 0);
}

export function findSession(sessions: Session[], id: string | undefined): Session | null {
  if (!id) return null;
  return sessions.find(s => s.id === id) ?? null;
}

export function findLook(session: Session, lookId: string): Look | null {
  return session.looks.find(l => l.id === lookId) ?? null;
}

export function greeting(name: string): string {
  const h = new Date().getHours();
  const part = h < 12 ? 'morning' : h < 18 ? 'afternoon' : 'evening';
  return `Good ${part}, ${name}`;
}

export function dayLabel(ts: number): string {
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}

export function budgetNote(totalCents: number, budgetCents: number): string {
  return totalCents <= budgetCents
    ? 'It sits inside your usual budget.'
    : `It runs a little over your usual ${formatMoney(budgetCents)} — chosen for the occasion.`;
}

export function styleLine(styles: string[]): string {
  const has = (...names: string[]) => names.some(n => styles.includes(n));
  const calm = has('Minimal', 'Classic', 'Elevated casual', 'Formal');
  const edge = has('Streetwear', 'Rugged', 'Bold');
  const fun = has('Playful');
  if (calm && edge) return 'Clean lines with a relaxed edge.';
  if (edge && fun) return 'Confident color, easy shapes.';
  if (calm) return 'Lean, neutral, quietly structured.';
  if (edge) return 'Honest materials, easy confidence.';
  if (fun) return 'Open to color and pattern.';
  return 'Still learning your direction.';
}
