import { MotionPressable } from '../../src/components/MotionPressable';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { EditorialScreen, editorial } from '../../src/components/Editorial';
import { FormIcon } from '../../src/components/FormIcon';
import { ProductVisual } from '../../src/components/ProductVisual';
import { LookVisual } from '../../src/components/LookVisual';
import { showToast } from '../../src/components/Toast';
import { addGarmentToLook, slotLabel } from '../../src/domain/garments';
import { formatMoney, lookTotalCents } from '../../src/domain/selectors';
import { useCurrentEdit } from '../../src/hooks/useCurrentEdit';
import { useFormStore } from '../../src/state/store';
import { removeGarmentWithFile } from '../../src/storage/garmentFiles';
import { colors } from '../../src/theme/tokens';
import { family } from '../../src/theme/typography';
type SavedTab = 'Looks' | 'Pieces' | 'Uploads';
export default function SavedScreen() {
  const router = useRouter();
  const [tab, setTab] = useState<SavedTab>('Looks');
  const state = useFormStore();
  const { look: currentLook, occasion } = useCurrentEdit();
  return <EditorialScreen><Text style={[editorial.heading, styles.heading]}>Saved</Text>
    <View style={styles.tabs}>{(['Looks', 'Pieces', 'Uploads'] as const).map(value => <MotionPressable key={value} accessibilityRole="tab" accessibilityState={{ selected: value === tab }} onPress={() => setTab(value)} style={[styles.tab, value === tab && styles.tabActive]}><Text style={[styles.tabText, value === tab && { color: colors.ink }]}>{value}</Text></MotionPressable>)}</View>
    {tab === 'Uploads' && <Text style={[editorial.secondary, styles.uploadsNote]}>Your photo stays on this device in this demo.</Text>}
    <View style={styles.list}>
      {tab === 'Looks' && state.saved.map(entry => <View key={entry.id} style={styles.row}><MotionPressable accessibilityRole="button" accessibilityLabel={'Open saved edit ' + entry.look.title} onPress={() => { state.selectLook(entry.look); router.push({ pathname: '/results', params: { lookId: entry.id, savedId: entry.id } }); }} style={styles.open}><View style={styles.thumbnail}><LookVisual look={entry.look} photograph /></View><View style={styles.rowBody}><Text style={styles.rowTitle}>{entry.look.title}</Text><Text numberOfLines={1} style={styles.meta}>{entry.look.products.length} {entry.look.products.length === 1 ? 'piece' : 'pieces'} · {formatMoney(lookTotalCents(entry.look))} · {entry.occasion}</Text></View></MotionPressable><MotionPressable accessibilityRole="button" accessibilityLabel={'Remove ' + entry.look.title + ' from saved'} onPress={() => state.removeSaved(entry.id)} style={styles.more}><FormIcon name="close" size={18} color={colors.muted} /></MotionPressable></View>)}
      {tab === 'Pieces' && state.savedPieces.map(entry => <View key={entry.id} style={styles.row}><MotionPressable accessibilityRole="button" accessibilityLabel={'Open saved piece ' + entry.product.name} onPress={() => router.push({ pathname: '/product', params: { id: entry.id } })} style={styles.open}><View style={styles.thumbnail}><ProductVisual product={entry.product} /></View><View style={styles.rowBody}><Text style={styles.rowTitle}>{entry.product.name}</Text><Text numberOfLines={1} style={styles.meta}>{entry.product.brand} · {entry.product.color} · {formatMoney(entry.product.priceCents)}</Text></View></MotionPressable><MotionPressable accessibilityRole="button" accessibilityLabel={'Remove ' + entry.product.name + ' from saved'} onPress={() => state.togglePiece(entry.product)} style={styles.more}><FormIcon name="close" size={18} color={colors.muted} /></MotionPressable></View>)}
      {tab === 'Uploads' && state.userGarments.map(garment => {
        const selected = state.tryOnSelection.some(item => item.source === 'user_upload' && item.id === garment.id);
        return <View key={garment.id} style={styles.row}>
          <MotionPressable accessibilityRole="button" accessibilityLabel={'Edit ' + (garment.name ?? slotLabel(garment.slot)) + ', your uploaded piece'} onPress={() => router.push({ pathname: '/add-piece', params: { editId: garment.id } })} style={styles.open}>
            <View style={styles.thumbnail}><Image source={{ uri: garment.localUri }} resizeMode="cover" style={styles.uploadThumb} accessibilityLabel={(garment.name ?? slotLabel(garment.slot)) + ', your uploaded photo'} /></View>
            <View style={styles.rowBody}>
              <Text style={styles.rowTitle}>{garment.name ?? slotLabel(garment.slot)}</Text>
              <Text numberOfLines={1} style={styles.meta}>{slotLabel(garment.slot)}{garment.color ? ' · ' + garment.color : ''} · On this device</Text>
              <View style={styles.chipRow}>
                <MotionPressable accessibilityRole="button" accessibilityState={{ selected }} accessibilityLabel={selected ? 'Selected for preview' : 'Select for try on'} onPress={() => state.toggleTryOnSelection({ source: 'user_upload', id: garment.id })} style={[styles.chip, selected && styles.chipActive]}><Text numberOfLines={1} style={[styles.chipText, selected && styles.chipTextActive]}>{selected ? 'Selected for preview' : 'Select for Try On'}</Text></MotionPressable>
                <MotionPressable accessibilityRole="button" accessibilityLabel={'Add ' + (garment.name ?? slotLabel(garment.slot)) + ' to your edit board'} onPress={() => {
                  if (!currentLook) return;
                  const next = addGarmentToLook(currentLook, garment);
                  if (next === currentLook) { showToast('Already on Your Edit'); return; }
                  state.replaceLook(currentLook, next, occasion);
                  showToast('Added to Your Edit');
                }} style={styles.chip}><Text numberOfLines={1} style={styles.chipText}>Add to Your Edit</Text></MotionPressable>
              </View>
            </View>
          </MotionPressable>
          <MotionPressable accessibilityRole="button" accessibilityLabel={'Remove ' + (garment.name ?? slotLabel(garment.slot)) + ' and delete its photo'} onPress={() => { void removeGarmentWithFile(garment); showToast('Piece removed'); }} style={[styles.more, styles.moreTouch]}><FormIcon name="close" size={18} color={colors.muted} /></MotionPressable>
        </View>;
      })}
      {((tab === 'Looks' && !state.saved.length) || (tab === 'Pieces' && !state.savedPieces.length) || (tab === 'Uploads' && !state.userGarments.length)) && <View style={styles.empty}><Text style={editorial.title}>{tab === 'Looks' ? 'Room for your next look.' : tab === 'Pieces' ? 'Keep what feels like you.' : 'Your uploads will live here.'}</Text><Text style={[editorial.secondary, styles.emptyCopy]}>{tab === 'Looks' ? 'Save a complete look to find it here.' : tab === 'Pieces' ? 'Your saved pieces will find a home here.' : 'Photograph a piece of clothing to keep it close.'}</Text><MotionPressable accessibilityRole="button" accessibilityLabel={tab === 'Uploads' ? 'Add a piece' : 'Explore'} onPress={() => tab === 'Uploads' ? router.push('/add-piece') : router.navigate(tab === 'Looks' ? '/edits' : '/home')} style={styles.discover}><Text style={styles.discoverText}>{tab === 'Looks' ? 'Explore your edit' : tab === 'Pieces' ? 'Discover pieces' : 'Add a piece +'}{tab === 'Uploads' ? '' : ' →'}</Text></MotionPressable></View>}
    </View>
  </EditorialScreen>;
}
const styles = StyleSheet.create({
  heading: { marginTop: 20, marginBottom: 20 }, tabs: { flexDirection: 'row', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line, gap: 36 },
  tab: { minHeight: 48, minWidth: 48, justifyContent: 'center', paddingBottom: 10, borderBottomWidth: 1.5, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: colors.ink }, tabText: { fontFamily: family.sans, fontSize: 15, color: colors.muted },
  uploadsNote: { marginTop: 14 },
  list: { paddingTop: 24, gap: 24 }, row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  open: { flex: 1, flexDirection: 'row', gap: 18, alignItems: 'center' },
  thumbnail: { width: 96, height: 128, borderRadius: 10, overflow: 'hidden', backgroundColor: colors.paper2 },
  uploadThumb: { width: '100%', height: '100%' },
  rowBody: { flex: 1, gap: 6, paddingVertical: 8 }, rowTitle: { fontFamily: family.sansMedium, fontSize: 15, lineHeight: 21, color: colors.ink },
  meta: { ...editorial.secondary, fontSize: 12, lineHeight: 18 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 2 },
  chip: { minHeight: 48, paddingHorizontal: 14, borderRadius: 24, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.line2, backgroundColor: colors.card, justifyContent: 'center', maxWidth: '100%' },
  chipActive: { backgroundColor: colors.ink, borderColor: colors.ink },
  chipText: { fontFamily: family.sansMedium, fontSize: 11, lineHeight: 16, color: colors.ink },
  chipTextActive: { color: colors.paper },
  more: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center', marginRight: -6 },
  moreTouch: { width: 48, height: 48, marginRight: -10 },
  empty: { paddingVertical: 76 }, emptyCopy: { marginTop: 10 }, discover: { marginTop: 22, minHeight: 48, justifyContent: 'center' },
  discoverText: { fontFamily: family.sansMedium, fontSize: 14, color: colors.ink },
});
