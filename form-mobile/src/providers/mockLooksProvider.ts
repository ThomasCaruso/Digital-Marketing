import { freshLooks } from '../data/looks';
import type { Profile, Session } from '../domain/types';
import type { LooksProvider } from './types';

/** The theatrical delay from the web demo — it sells the work being done. */
const STYLING_DELAY_MS = 1550;

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

let sessionCounter = 0;

export class MockLooksProvider implements LooksProvider {
  async buildLooks(occasion: string, _profile: Profile): Promise<Session> {
    await delay(STYLING_DELAY_MS);
    const seed = `${Date.now().toString(36)}${sessionCounter++}`;
    return {
      id: `session-${seed}`,
      occasion: occasion.trim() || 'Your occasion',
      looks: freshLooks(seed),
      createdAt: Date.now(),
    };
  }
}
