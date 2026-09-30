import type { EditRequest, Profile, Session } from '../domain/types';
export interface LooksProvider {
  buildLooks(request: EditRequest, profile: Profile): Promise<Session>;
}
