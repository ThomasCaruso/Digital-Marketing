import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { createSavedSnapshot } from '../domain/transforms';
import type { Look, PassedLook, Profile, SavedLook, Session } from '../domain/types';

/** Bound local demo history so AsyncStorage stays small. */
const MAX_SESSIONS = 8;

export const DEFAULT_PROFILE: Profile = {
  name: 'Thomas',
  height: '6’0"',
  topSize: 'M',
  waist: '30',
  inseam: '32',
  shoe: '10',
  budgetCents: 30000,
  styles: ['Minimal', 'Elevated casual'],
  priority: 'Best overall look',
  brands: ['COS', 'Uniqlo', 'New Balance'],
};

interface FormState {
  onboardingComplete: boolean;
  profile: Profile;
  sessions: Session[];
  activeSessionId: string | null;
  /** Immutable snapshots — see SavedLook in domain/types. */
  saved: SavedLook[];
  passed: PassedLook[];
  hasHydrated: boolean;

  addSession: (session: Session) => void;
  setActiveSession: (id: string | null) => void;
  /** Returns true if the look is now saved. */
  toggleSaved: (look: Look, occasion: string) => boolean;
  removeSaved: (savedId: string) => void;
  markPassed: (look: Look, occasion: string) => void;
  setOnboardingComplete: (complete: boolean) => void;
  setHasHydrated: (hydrated: boolean) => void;
}

export const useFormStore = create<FormState>()(
  persist(
    (set, get) => ({
      onboardingComplete: false,
      profile: DEFAULT_PROFILE,
      sessions: [],
      activeSessionId: null,
      saved: [],
      passed: [],
      hasHydrated: false,

      addSession: session =>
        set(state => ({
          sessions: [session, ...state.sessions].slice(0, MAX_SESSIONS),
          activeSessionId: session.id,
        })),

      setActiveSession: id => set({ activeSessionId: id }),

      toggleSaved: (look, occasion) => {
        const exists = get().saved.some(entry => entry.id === look.id);
        if (exists) {
          set(state => ({ saved: state.saved.filter(entry => entry.id !== look.id) }));
          return false;
        }
        set(state => ({ saved: [createSavedSnapshot(look, occasion), ...state.saved] }));
        return true;
      },

      removeSaved: savedId =>
        set(state => ({ saved: state.saved.filter(entry => entry.id !== savedId) })),

      markPassed: (look, occasion) =>
        set(state =>
          state.passed.some(p => p.lookId === look.id)
            ? state
            : {
                passed: [
                  { lookId: look.id, title: look.title, occasion, passedAt: Date.now() },
                  ...state.passed,
                ],
              }
        ),

      setOnboardingComplete: complete => set({ onboardingComplete: complete }),
      setHasHydrated: hydrated => set({ hasHydrated: hydrated }),
    }),
    {
      name: 'form-mobile-v1',
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: state => ({
        onboardingComplete: state.onboardingComplete,
        profile: state.profile,
        sessions: state.sessions,
        activeSessionId: state.activeSessionId,
        saved: state.saved,
        passed: state.passed,
      }),
      onRehydrateStorage: () => state => {
        state?.setHasHydrated(true);
      },
    }
  )
);
