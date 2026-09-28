import { MockLooksProvider } from './mockLooksProvider';
import type { LooksProvider } from './types';

export type { LooksProvider } from './types';

let provider: LooksProvider | null = null;

/**
 * Screens call this instead of importing mock data directly.
 * Swapping to the real orchestrator is a one-file change right here.
 */
export function getLooksProvider(): LooksProvider {
  if (!provider) provider = new MockLooksProvider();
  return provider;
}
