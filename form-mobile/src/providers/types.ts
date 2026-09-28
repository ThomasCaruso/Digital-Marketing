import type { Profile, Session } from '../domain/types';

/**
 * The seam between the UI and whatever produces looks.
 *
 * Phase 1 implements this with demo data and a simulated delay. Later the
 * real FORM orchestrator (services/orchestrator boundaries, contracts/)
 * implements the same interface and no screen changes.
 */
export interface LooksProvider {
  buildLooks(occasion: string, profile: Profile): Promise<Session>;
}
