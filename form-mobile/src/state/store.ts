import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { createSavedSnapshot } from '../domain/transforms';
import type { Look, PassedLook, Product, Profile, ReviewStatus, SavedLook, SavedPiece, Session } from '../domain/types';
export const DEFAULT_PROFILE: Profile = {
  name: 'Thomas', height: '6′0″', topSize: 'M', waist: '30', inseam: '32', shoe: '10',
  budgetCents: 50000, styles: ['Minimal', 'Elevated casual', 'Classic'],
  priority: 'Best overall look', brands: ['COS', 'Uniqlo', 'New Balance'],
  favoriteColors: ['Soft black', 'Taupe', 'Bone', 'Grey', 'Navy'], avoidedColors: [], avoidedBrands: [],
};
interface DiscoveryUndo { productId: string; session: number; }
interface FormState {
  onboardingComplete: boolean; profile: Profile; sessions: Session[]; activeSessionId: string | null;
  saved: SavedLook[]; passed: PassedLook[]; savedPieces: SavedPiece[];
  recommendationReview: Record<string, ReviewStatus>; recommendationSession: number;
  discoveryUndo: DiscoveryUndo | null;
  reviewPiece: (product: Product, status: ReviewStatus) => boolean; undoPieceReview: () => string | null;
  selectedLook: Look | null; hasHydrated: boolean; storageError: boolean;
  addSession: (session: Session) => void; setActiveSession: (id: string | null) => void;
  selectLook: (look: Look) => void; replaceLook: (before: Look, after: Look, occasion: string) => void;
  toggleSaved: (look: Look, occasion: string) => boolean; removeSaved: (id: string) => void;
  markPassed: (look: Look, occasion: string) => void;
  togglePiece: (product: Product) => boolean; passPiece: (product: Product) => void; refreshSelection: () => void;
  updateProfile: (profile: Profile) => void;
  setOnboardingComplete: (complete: boolean) => void; setHasHydrated: (hydrated: boolean) => void;
}
export const useFormStore = create<FormState>()(persist((set, get) => ({
  onboardingComplete: false, profile: DEFAULT_PROFILE, sessions: [], activeSessionId: null,
  saved: [], passed: [], savedPieces: [], recommendationReview: {}, recommendationSession: 1,
  discoveryUndo: null,
  selectedLook: null, hasHydrated: false, storageError: false,
  addSession: session => set(state => ({ sessions: [session, ...state.sessions].slice(0, 8), activeSessionId: session.id, selectedLook: session.looks[0] ?? null })),
  setActiveSession: id => set({ activeSessionId: id }),
  selectLook: look => set({ selectedLook: look }),
  replaceLook: (before, after, occasion) => {
    const active = get().sessions.find(s => s.id === get().activeSessionId);
    if (active?.looks.some(l => l.id === before.id)) {
      set(state => ({ selectedLook: after, sessions: state.sessions.map(s => s.id === active.id ? { ...s, looks: s.looks.map(l => l.id === before.id ? after : l) } : s) }));
    } else {
      const sourceRequest = get().sessions.find(s => s.looks.some(l => l.id === before.id))?.request ?? get().saved.find(s => s.id === before.id)?.request;
      const session: Session = { id: 'adjusted-' + Date.now(), occasion, request: sourceRequest, createdAt: Date.now(), looks: [after] };
      get().addSession(session);
    }
  },
  toggleSaved: (look, occasion) => {
    const exists = get().saved.some(entry => entry.id === look.id);
    set(state => ({ saved: exists ? state.saved.filter(entry => entry.id !== look.id) : [{ ...createSavedSnapshot(look, occasion), request: state.sessions.find(s => s.looks.some(l => l.id === look.id))?.request }, ...state.saved] }));
    return !exists;
  },
  removeSaved: id => set(state => ({ saved: state.saved.filter(entry => entry.id !== id) })),
  markPassed: (look, occasion) => set(state => ({ passed: [{ lookId: look.id, title: look.title, occasion, passedAt: Date.now() }, ...state.passed.filter(p => p.lookId !== look.id)].slice(0, 100) })),
  togglePiece: product => {
    const exists = get().savedPieces.some(p => p.id === product.id);
    set(state => ({
      discoveryUndo: null,
      savedPieces: exists ? state.savedPieces.filter(p => p.id !== product.id) : [{ id: product.id, product: { ...product }, savedAt: Date.now() }, ...state.savedPieces],
      recommendationReview: { ...state.recommendationReview, [product.id]: exists ? 'passed' : 'saved' },
    }));
    return !exists;
  },
  reviewPiece: (product, status) => {
    const current = get();
    if (current.recommendationReview[product.id] || current.savedPieces.some(p => p.id === product.id)) return false;
    set(state => ({
      discoveryUndo: { productId: product.id, session: state.recommendationSession },
      recommendationReview: { ...state.recommendationReview, [product.id]: status },
      savedPieces: status === 'saved' ? [{ id: product.id, product: { ...product }, savedAt: Date.now() }, ...state.savedPieces] : state.savedPieces,
    }));
    return true;
  },
  undoPieceReview: () => {
    const undo = get().discoveryUndo;
    if (!undo || undo.session !== get().recommendationSession) return null;
    set(state => {
      const review = { ...state.recommendationReview };
      delete review[undo.productId];
      return { discoveryUndo: null, recommendationReview: review, savedPieces: state.savedPieces.filter(p => p.id !== undo.productId) };
    });
    return undo.productId;
  },
  passPiece: product => set(state => ({
    discoveryUndo: null,
    recommendationReview: { ...state.recommendationReview, [product.id]: 'passed' },
    savedPieces: state.savedPieces.filter(p => p.id !== product.id),
  })),
  refreshSelection: () => set(state => ({ discoveryUndo: null, recommendationReview: {}, recommendationSession: state.recommendationSession + 1 })),
  updateProfile: profile => set({ discoveryUndo: null, profile: { ...profile } }),
  setOnboardingComplete: complete => set({ onboardingComplete: complete }),
  setHasHydrated: hydrated => set({ hasHydrated: hydrated }),
}), {
  name: 'form-mobile-v1', version: 1,
  storage: createJSONStorage(() => ({
    getItem: key => AsyncStorage.getItem(key),
    setItem: async (key, value) => { try { await AsyncStorage.setItem(key, value); } catch (error) { if (!useFormStore.getState().storageError) useFormStore.setState({ storageError: true }); console.warn('FORM local save failed', error); } },
    removeItem: key => AsyncStorage.removeItem(key),
  })),
  merge: (persisted, current) => {
    const previous = persisted as Partial<FormState>;
    return { ...current, ...previous, profile: { ...DEFAULT_PROFILE, ...previous?.profile } };
  },
  partialize: state => ({
    onboardingComplete: state.onboardingComplete, profile: state.profile, sessions: state.sessions,
    activeSessionId: state.activeSessionId, saved: state.saved, passed: state.passed,
    savedPieces: state.savedPieces, recommendationReview: state.recommendationReview,
    recommendationSession: state.recommendationSession, selectedLook: state.selectedLook,
  }),
  onRehydrateStorage: () => (state, error) => {
    if (state) state.setHasHydrated(true);
    if (error) queueMicrotask(() => useFormStore.setState({ hasHydrated: true, storageError: true }));
  },
}));

