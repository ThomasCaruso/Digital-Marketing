import { MotionPressable } from '../../src/components/MotionPressable';
import { useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { EditorialScreen, editorial } from '../../src/components/Editorial';
import { CollageBoard } from '../../src/components/CollageBoard';
import { FormIcon } from '../../src/components/FormIcon';
import { showToast } from '../../src/components/Toast';
import { useCurrentEdit } from '../../src/hooks/useCurrentEdit';
import { formatMoney, lookTotalCents } from '../../src/domain/selectors';
import { refinementBudget, swapFixturePiece } from '../../src/domain/fixtureEngine';
import { removePieceFromLook } from '../../src/domain/garments';
import { useFormStore } from '../../src/state/store';
import { colors } from '../../src/theme/tokens';
import { family } from '../../src/theme/typography';

export default function EditsScreen() {
  const router = useRouter();
  const { height, width } = useWindowDimensions();
  const { looks, look, occasion } = useCurrentEdit();
  const selectLook = useFormStore(s => s.selectLook);
  const savedLooks = useFormStore(s => s.saved);
  const sessions = useFormStore(s => s.sessions);
  const setActive = useFormStore(s => s.setActiveSession);
  const pager = useRef<ScrollView>(null);
  const index = look ? looks.findIndex(l => l.id === look.id) : 0;
  const pageWidth = width - 52;
  const boardHeight = Math.round(Math.min(500, Math.max(340, height * 0.47)));
  useEffect(() => { pager.current?.scrollTo({ x: index * pageWidth, animated: false }); }, [index, pageWidth]);
  const saved = look ? savedLooks.some(s => s.id === look.id) : false;
  return <EditorialScreen>
    <View style={styles.header}><Text style={editorial.label}>Your Edit</Text><Text style={styles.counter}>{String(look ? index + 1 : 0).padStart(2, '0')} / {String(looks.length).padStart(2, '0')}</Text></View>
    {look ? <>
      <ScrollView horizontal pagingEnabled ref={pager} showsHorizontalScrollIndicator={false} onMomentumScrollEnd={e => { const next = looks[Math.round(e.nativeEvent.contentOffset.x / pageWidth)]; if (next) selectLook(next); }} style={styles.visual}>
        {looks.map(item => <View key={item.id} style={{ width: pageWidth, height: boardHeight + 20 }}><CollageBoard look={item} boardHeight={boardHeight} onSwap={piece => {
          const next = swapFixturePiece(item, piece.id, useFormStore.getState().profile, refinementBudget(item.id, useFormStore.getState().profile, sessions, savedLooks));
          if (!next) { showToast('No alternative piece within your preferences'); return; }
          const added = next.products.find(p => !item.products.some(q => q.id === p.id));
          selectLook(next); useFormStore.getState().replaceLook(item, next, occasion); showToast('Swapped in ' + (added?.name ?? 'a new piece'));
        }} onRemovePiece={piece => {
          const next = removePieceFromLook(item, piece.id);
          if (next === item) return;
          selectLook(next); useFormStore.getState().replaceLook(item, next, occasion); showToast('Removed from this board');
        }} /></View>)}
      </ScrollView>
      <Text maxFontSizeMultiplier={1.2} style={styles.title}>{look.title}</Text>
      <View style={styles.metaRow}><View style={styles.metaRule} /><Text style={styles.metaText}>{occasion.toUpperCase()} · {look.vibe.toUpperCase()}</Text><View style={styles.metaRule} /></View>
      <Text maxFontSizeMultiplier={1.2} style={styles.description}>{look.description}</Text>
      <View style={styles.totalRow}>
        <View style={styles.totalBlock}>
          <Text style={styles.totalLabel}>Total ({look.products.length} {look.products.length === 1 ? 'piece' : 'pieces'})</Text>
          <Text style={styles.totalPrice}>{formatMoney(lookTotalCents(look))}</Text>
        </View>
        <View style={styles.actions}>
          <MotionPressable accessibilityRole="button" accessibilityLabel={saved ? 'Remove saved look' : 'Save look'} accessibilityState={{ selected: saved }} onPress={() => { const nowSaved = useFormStore.getState().toggleSaved(look, occasion); showToast(nowSaved ? 'Look saved' : 'Look removed'); }} style={[styles.circle, saved && styles.circleActive]}>
            <FormIcon name="saved" size={19} color={saved ? colors.onAccent : colors.ink} filled={saved} />
          </MotionPressable>
          <MotionPressable accessibilityRole="button" accessibilityLabel={'Open ' + look.title + ' details'} onPress={() => router.push({ pathname: '/results', params: { lookId: look.id } })} style={styles.circle}>
            <FormIcon name="more" size={19} color={colors.ink} />
          </MotionPressable>
        </View>
      </View>
      <MotionPressable accessibilityRole="button" accessibilityLabel={'Try ' + look.title + ' on'} onPress={() => { selectLook(look); router.navigate('/tryon'); }} style={styles.tryButton}><Text style={styles.tryButtonText}>Try this on</Text></MotionPressable>
      <View style={styles.indicators}>{looks.map((item, i) => <MotionPressable key={item.id} accessibilityRole="button" accessibilityLabel={'Show look ' + (i + 1) + ', ' + item.title} accessibilityState={{ selected: i === index }} onPress={() => selectLook(item)} style={styles.indicatorTouch}><View style={[styles.indicator, i === index && styles.indicatorActive]} /></MotionPressable>)}</View>
    </> : <View style={{ paddingVertical: 70 }}><Text style={editorial.title}>No complete fixture look fits.</Text><Text style={editorial.secondary}>Try a higher budget or adjust your avoided brands and colors.</Text></View>}
    <View style={editorial.rule} />
    <MotionPressable accessibilityRole="button" onPress={() => router.push('/create-edit')} style={styles.create}><Text style={styles.createText}>Create an edit +</Text></MotionPressable>
    {!!sessions.length && <>{sessions.map(item => <MotionPressable key={item.id} accessibilityRole="button" accessibilityLabel={'Open recent edit for ' + item.occasion} onPress={() => { setActive(item.id); if (item.looks[0]) selectLook(item.looks[0]); }} style={styles.recent}><Text style={editorial.body}>{item.occasion}</Text><Text style={editorial.secondary}>{item.request?.dressCode ?? 'Fixture edit'} · {item.looks.length} looks</Text></MotionPressable>)}</>}
  </EditorialScreen>;
}
const styles = StyleSheet.create({
  header: { ...editorial.row, paddingBottom: 18 },
  counter: { ...editorial.secondary, fontVariant: ['tabular-nums'] },
  visual: { marginTop: 6 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 10 },
  metaRule: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: colors.line },
  metaText: { fontFamily: family.sans, fontSize: 9, letterSpacing: 1.8, color: colors.muted },
  title: { fontFamily: family.serif, fontSize: 34, lineHeight: 39, letterSpacing: -0.4, color: colors.ink, marginTop: 18 },
  description: { ...editorial.secondary, maxWidth: 300, marginTop: 6, lineHeight: 20 },
  totalRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, marginTop: 20 },
  totalBlock: { paddingBottom: 4 },
  totalLabel: { fontFamily: family.sans, fontSize: 9, letterSpacing: 1.8, color: colors.muted, textTransform: 'uppercase' },
  totalPrice: { fontFamily: family.serif, fontSize: 27, lineHeight: 31, color: colors.ink, marginTop: 4 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  tryButton: { marginTop: 16, height: 52, borderRadius: 26, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' },
  tryButtonText: { fontFamily: family.sansMedium, fontSize: 14, color: colors.paper },
  circle: { width: 48, height: 48, borderRadius: 24, borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(17,17,15,0.18)', backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
  circleActive: { backgroundColor: colors.ink, borderColor: colors.ink },
  indicators: { flexDirection: 'row', alignSelf: 'center', marginTop: 18 },
  indicatorTouch: { width: 48, height: 48, justifyContent: 'center', alignItems: 'center' },
  indicator: { height: 2, width: 23, backgroundColor: colors.line2 },
  indicatorActive: { backgroundColor: colors.ink },
  create: { minHeight: 48, justifyContent: 'center' },
  createText: { fontFamily: family.sansMedium, fontSize: 13, color: colors.ink },
  recent: { minHeight: 52, justifyContent: 'center', gap: 2, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
});
