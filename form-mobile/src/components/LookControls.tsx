import { MotionPressable } from './MotionPressable';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SectionLabel, editorial } from './Editorial';
import { TextAction } from './DetailHeader';
import { showToast } from './Toast';
import { refineFixtureLook, refinementBudget } from '../domain/fixtureEngine';
import { formatMoney } from '../domain/selectors';
import type { Look, Refinement } from '../domain/types';
import { useFormStore } from '../state/store';
import { colors } from '../theme/tokens';
const adjustments: Refinement[] = ['Less formal', 'More formal', 'Lower price', 'Different shoes', 'Warmer', 'More relaxed'];
export function LookPieces({ look }: { look: Look }) {
  const router = useRouter();
  return <View><SectionLabel>The pieces</SectionLabel>{look.products.map((product, index) => <MotionPressable key={product.id} accessibilityRole="button" accessibilityLabel={'Inspect ' + product.brand + ' ' + product.name} onPress={() => router.push({ pathname: '/product', params: { id: product.id } })} style={styles.piece}><Text style={editorial.secondary}>{String(index + 1).padStart(2, '0')}</Text><View style={{ flex: 1 }}><Text style={editorial.body}>{product.name}</Text><Text style={editorial.secondary}>{product.brand} · {product.color}</Text></View><Text style={editorial.secondary}>{formatMoney(product.priceCents)} →</Text></MotionPressable>)}</View>;
}
export function LookActions({ look, occasion, onAdjusted }: { look: Look; occasion: string; onAdjusted?: (look: Look) => void }) {
  const router = useRouter();
  const state = useFormStore();
  const [adjusting, setAdjusting] = useState(false);
  const saved = state.saved.some(s => s.id === look.id);

  return <View style={{ marginTop: 16 }}>
    <View style={editorial.row}><TextAction dark label="Try this on" onPress={() => { state.selectLook(look); router.navigate('/tryon'); }} /><TextAction label={saved ? 'Saved look' : 'Save look'} onPress={() => { const nowSaved = state.toggleSaved(look, occasion); showToast(nowSaved ? 'Look saved' : 'Look removed'); }} /></View>
    <MotionPressable accessibilityRole="button" accessibilityState={{ expanded: adjusting }} onPress={() => setAdjusting(!adjusting)} style={styles.adjust}><Text style={editorial.secondary}>{adjusting ? 'Close adjustments' : 'Adjust →'}</Text></MotionPressable>
    {adjusting && <View>{adjustments.map(action => <MotionPressable key={action} accessibilityRole="button" onPress={() => {
      const next = refineFixtureLook(look, action, state.profile, refinementBudget(look.id, state.profile, state.sessions, state.saved));
      if (next === look) { showToast('No matching fixture adjustment within your preferences'); return; }
      state.replaceLook(look, next, occasion); onAdjusted?.(next); setAdjusting(false); showToast(action + ' · demo adjustment');
    }} style={styles.option}><Text style={editorial.body}>{action}</Text><Text style={editorial.secondary}>→</Text></MotionPressable>)}</View>}
  </View>;
}
const styles = StyleSheet.create({
  piece: { flexDirection: 'row', gap: 14, alignItems: 'center', minHeight: 64, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
  adjust: { minHeight: 48, justifyContent: 'center', alignItems: 'flex-end' },
  option: { ...editorial.row, minHeight: 48, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
});

