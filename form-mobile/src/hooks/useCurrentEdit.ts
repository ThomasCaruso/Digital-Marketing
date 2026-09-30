import { fixtureLooks } from '../data/catalog';
import { useFormStore } from '../state/store';
export function useCurrentEdit() {
  const state = useFormStore();
  const session = state.sessions.find(s => s.id === state.activeSessionId);
  const looks = session ? session.looks : fixtureLooks;
  const look = looks.find(l => l.id === state.selectedLook?.id) ?? looks[0];
  return { session, looks, look, occasion: session?.occasion ?? 'Curated for you' };
}
