import { useLocalSearchParams, useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { EditorialScreen, SectionLabel, editorial } from '../src/components/Editorial';
import { DetailHeader } from '../src/components/DetailHeader';
import { CollageBoard } from '../src/components/CollageBoard';
import { LookActions, LookPieces } from '../src/components/LookControls';
import { showToast } from '../src/components/Toast';
import { fixtureLooks } from '../src/data/catalog';
import { refinementBudget, swapFixturePiece } from '../src/domain/fixtureEngine';
import { removePieceFromLook } from '../src/domain/garments';
import { formatMoney, lookTotalCents } from '../src/domain/selectors';
import { useFormStore } from '../src/state/store';
import { colors } from '../src/theme/tokens';
import { family } from '../src/theme/typography';
export default function LookDetailsScreen() {
  const router = useRouter();
  const { lookId, savedId } = useLocalSearchParams<{ lookId?: string; savedId?: string }>();
  const state = useFormStore();
  const saved = savedId ? state.saved.find(s => s.id === savedId) : undefined;
  const session = state.sessions.find(s => s.looks.some(l => l.id === lookId));
  const look = saved?.look ?? session?.looks.find(l => l.id === lookId) ?? fixtureLooks.find(l => l.id === lookId) ?? (state.selectedLook?.id === lookId || !lookId ? state.selectedLook : undefined);
  if (!look) return <EditorialScreen><DetailHeader title="Your edit" /><Text style={editorial.title}>This edit is no longer available.</Text></EditorialScreen>;
  const request = saved?.request ?? session?.request;
  const occasion = saved?.occasion ?? session?.occasion ?? 'Curated for you';
  return <EditorialScreen><DetailHeader title="Your edit" />
    <Text style={editorial.heading}>{look.title}</Text><Text style={[editorial.secondary, { marginTop: 10 }]}>{look.description}</Text>
    <View style={{ marginTop: 20 }}><CollageBoard look={look} boardHeight={420} onSwap={piece => {
      const next = swapFixturePiece(look, piece.id, state.profile, refinementBudget(look.id, state.profile, state.sessions, state.saved));
      if (!next) { showToast('No alternative piece within your preferences'); return; }
      const added = next.products.find(p => !look.products.some(q => q.id === p.id));
      state.replaceLook(look, next, occasion); router.setParams({ lookId: next.id, savedId: '' }); showToast('Swapped in ' + (added?.name ?? 'a new piece'));
    }} onRemovePiece={piece => {
      const next = removePieceFromLook(look, piece.id);
      if (next === look) return;
      state.replaceLook(look, next, occasion); router.setParams({ lookId: next.id, savedId: '' }); showToast('Removed from this board');
    }} /></View>
    <View style={styles.totalRow}><Text style={editorial.label}>Total ({look.products.length} {look.products.length === 1 ? 'piece' : 'pieces'})</Text><Text style={styles.totalPrice}>{formatMoney(lookTotalCents(look))}</Text></View>
    {request && <View style={{ marginTop: 20 }}><SectionLabel>Your request</SectionLabel><Text style={editorial.body}>{request.occasion} · {request.dressCode}</Text><Text style={editorial.secondary}>{request.location}{request.location ? ' · ' : ''}Budget {formatMoney(request.budgetCents)}</Text>{!!request.notes && <Text style={editorial.secondary}>{request.notes}</Text>}</View>}
    <View style={{ marginTop: 24 }}><LookPieces look={look} /></View><View style={editorial.rule} /><SectionLabel>Why this edit</SectionLabel><Text style={[editorial.body, { marginTop: 8 }]}>{look.why}</Text><Text style={editorial.secondary}>Demo fixture styling</Text>
    <LookActions look={look} occasion={occasion} onAdjusted={next => router.setParams({ lookId: next.id, savedId: '' })} />
  </EditorialScreen>;
}
const styles = StyleSheet.create({
  totalRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, marginTop: 20, paddingBottom: 4 },
  totalPrice: { fontFamily: family.serif, fontSize: 27, lineHeight: 31, color: colors.ink },
});
