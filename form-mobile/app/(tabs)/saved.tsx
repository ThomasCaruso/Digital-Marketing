import { MotionPressable } from '../../src/components/MotionPressable';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { EditorialScreen, editorial } from '../../src/components/Editorial';
import { FormIcon } from '../../src/components/FormIcon';
import { ProductVisual } from '../../src/components/ProductVisual';
import { LookVisual } from '../../src/components/LookVisual';
import { formatMoney, lookTotalCents } from '../../src/domain/selectors';
import { useFormStore } from '../../src/state/store';
import { colors } from '../../src/theme/tokens';
import { family } from '../../src/theme/typography';
export default function SavedScreen() {
  const router = useRouter();
  const [tab, setTab] = useState<'Looks' | 'Pieces'>('Looks');
  const state = useFormStore();
  return <EditorialScreen><Text style={[editorial.heading, styles.heading]}>Saved</Text>
    <View style={styles.tabs}>{(['Looks', 'Pieces'] as const).map(value => <MotionPressable key={value} accessibilityRole="tab" accessibilityState={{ selected: value === tab }} onPress={() => setTab(value)} style={[styles.tab, value === tab && styles.tabActive]}><Text style={[styles.tabText, value === tab && { color: colors.ink }]}>{value}</Text></MotionPressable>)}</View>
    <View style={styles.list}>
      {tab === 'Looks' && state.saved.map(entry => <View key={entry.id} style={styles.row}><MotionPressable accessibilityRole="button" accessibilityLabel={'Open saved edit ' + entry.look.title} onPress={() => { state.selectLook(entry.look); router.push({ pathname: '/results', params: { lookId: entry.id, savedId: entry.id } }); }} style={styles.open}><View style={styles.thumbnail}><LookVisual look={entry.look} photograph /></View><View style={styles.rowBody}><Text style={styles.rowTitle}>{entry.look.title}</Text><Text numberOfLines={1} style={styles.meta}>{entry.look.products.length} {entry.look.products.length === 1 ? 'piece' : 'pieces'} · {formatMoney(lookTotalCents(entry.look))} · {entry.occasion}</Text></View></MotionPressable><MotionPressable accessibilityRole="button" accessibilityLabel={'Remove ' + entry.look.title + ' from saved'} onPress={() => state.removeSaved(entry.id)} style={styles.more}><FormIcon name="close" size={18} color={colors.muted} /></MotionPressable></View>)}
      {tab === 'Pieces' && state.savedPieces.map(entry => <View key={entry.id} style={styles.row}><MotionPressable accessibilityRole="button" accessibilityLabel={'Open saved piece ' + entry.product.name} onPress={() => router.push({ pathname: '/product', params: { id: entry.id } })} style={styles.open}><View style={styles.thumbnail}><ProductVisual product={entry.product} /></View><View style={styles.rowBody}><Text style={styles.rowTitle}>{entry.product.name}</Text><Text numberOfLines={1} style={styles.meta}>{entry.product.brand} · {entry.product.color} · {formatMoney(entry.product.priceCents)}</Text></View></MotionPressable><MotionPressable accessibilityRole="button" accessibilityLabel={'Remove ' + entry.product.name + ' from saved'} onPress={() => state.togglePiece(entry.product)} style={styles.more}><FormIcon name="close" size={18} color={colors.muted} /></MotionPressable></View>)}
      {((tab === 'Looks' && !state.saved.length) || (tab === 'Pieces' && !state.savedPieces.length)) && <View style={styles.empty}><Text style={editorial.title}>{tab === 'Looks' ? 'Room for your next look.' : 'Keep what feels like you.'}</Text><Text style={[editorial.secondary, styles.emptyCopy]}>{tab === 'Looks' ? 'Save a complete look to find it here.' : 'Your saved pieces will find a home here.'}</Text><MotionPressable accessibilityRole="button" onPress={() => router.navigate(tab === 'Looks' ? '/edits' : '/home')} style={styles.discover}><Text style={styles.discoverText}>{tab === 'Looks' ? 'Explore your edit' : 'Discover pieces'} →</Text></MotionPressable></View>}
    </View>
  </EditorialScreen>;
}
const styles = StyleSheet.create({
  heading: { marginTop: 20, marginBottom: 20 }, tabs: { flexDirection: 'row', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line, gap: 36 },
  tab: { minHeight: 48, minWidth: 48, justifyContent: 'center', paddingBottom: 10, borderBottomWidth: 1.5, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: colors.ink }, tabText: { fontFamily: family.sans, fontSize: 15, color: colors.muted },
  list: { paddingTop: 24, gap: 24 }, row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  open: { flex: 1, flexDirection: 'row', gap: 18, alignItems: 'center' },
  thumbnail: { width: 96, height: 128, borderRadius: 10, overflow: 'hidden', backgroundColor: colors.paper2 },
  rowBody: { flex: 1, gap: 6, paddingVertical: 8 }, rowTitle: { fontFamily: family.sansMedium, fontSize: 15, lineHeight: 21, color: colors.ink },
  meta: { ...editorial.secondary, fontSize: 12, lineHeight: 18 },
  more: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center', marginRight: -6 },
  empty: { paddingVertical: 76 }, emptyCopy: { marginTop: 10 }, discover: { marginTop: 22, minHeight: 48, justifyContent: 'center' },
  discoverText: { fontFamily: family.sansMedium, fontSize: 14, color: colors.ink },
});
