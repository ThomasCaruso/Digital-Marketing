import { MotionPressable } from '../../src/components/MotionPressable';
import { useFocusEffect, useRouter } from 'expo-router';
import { setStatusBarStyle } from 'expo-status-bar';
import { useCallback, useState, type ReactNode } from 'react';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FormIcon } from '../../src/components/FormIcon';
import { LookVisual } from '../../src/components/LookVisual';
import { ProductVisual } from '../../src/components/ProductVisual';
import { showToast } from '../../src/components/Toast';
import { previewAssets } from '../../src/data/preview';
import { productPhotography } from '../../src/data/photography';
import { isUserUpload, selectionFromProduct, selectionKey, slotLabel, userGarmentToProduct } from '../../src/domain/garments';
import type { Product } from '../../src/domain/types';
import { useCurrentEdit } from '../../src/hooks/useCurrentEdit';
import { useFormStore } from '../../src/state/store';
import { colors } from '../../src/theme/tokens';
import { family } from '../../src/theme/typography';

type TryOnView = 'Looks' | 'Pieces' | 'Upload';

function GarmentTile({ label, sub, selected, accent, onPress, children }: { label: string; sub: string; selected: boolean; accent: string; onPress: () => void; children: ReactNode }) {
  return <MotionPressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ selected }} onPress={onPress} style={[styles.tile, selected && { borderColor: accent, backgroundColor: 'rgba(252,251,248,0.9)' }]}>
    <View style={styles.tileMedia}>{children}</View>
    {selected && <View style={styles.tileCheck}><FormIcon name="check" size={11} color={colors.paper} /></View>}
    <Text numberOfLines={1} style={styles.tileSub}>{sub}</Text>
  </MotionPressable>;
}

function PieceImage({ product }: { product: Product }) {
  if (isUserUpload(product)) return <Image source={{ uri: product.localUri }} resizeMode="cover" style={styles.tileImg} accessibilityLabel={product.name + ', your uploaded photo'} />;
  const photo = productPhotography[product.id]?.source;
  if (photo) return <Image source={photo} resizeMode="cover" style={styles.tileImg} accessibilityLabel={product.name + ', product photograph'} />;
  return <ProductVisual product={product} />;
}

export default function TryOnScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [view, setView] = useState<TryOnView>('Looks');
  const [mode, setMode] = useState<'Original' | 'Preview'>('Preview');
  const { looks, occasion } = useCurrentEdit();
  const state = useFormStore();
  const choices = [...(state.selectedLook ? [state.selectedLook] : []), ...looks, ...state.saved.map(s => s.look)].filter((l,i,all) => all.findIndex(item => item.id === l.id) === i);
  const look = state.selectedLook ?? choices[0];
  const saved = !!look && state.saved.some(s => s.id === look.id);
  const board = mode === 'Preview' && (!look?.previewKey || look.previewKey === 'weekend');
  const onPhoto = !board;
  useFocusEffect(useCallback(() => { setStatusBarStyle(board ? 'dark' : 'light'); return () => setStatusBarStyle('dark'); }, [board]));

  // Try-on pieces: everything already in play — the current edit, saved looks, saved pieces, uploads.
  const pieceChoices: Product[] = [];
  for (const source of [look, ...state.saved.map(s => s.look)]) {
    if (!source) continue;
    for (const p of source.products) if (!pieceChoices.some(q => q.id === p.id)) pieceChoices.push(p);
  }
  for (const p of state.savedPieces.map(entry => entry.product)) if (!pieceChoices.some(q => q.id === p.id)) pieceChoices.push(p);
  for (const g of state.userGarments) if (!pieceChoices.some(q => q.id === g.id)) pieceChoices.push(userGarmentToProduct(g));
  const selectedCount = state.tryOnSelection.length;
  const selectionIncludesUpload = state.tryOnSelection.some(item => item.source === 'user_upload');

  if (!look) return <View style={[styles.root, { backgroundColor: colors.paper, justifyContent: 'center', padding: 26 }]}><Text style={styles.emptyText}>Create or save a look to preview.</Text></View>;
  // The Looks view carries two segment rows, so the board starts below them; other views keep one row.
  const boardTop = view === 'Looks' ? 216 : 158;
  return <View style={[styles.root, board && { backgroundColor: colors.paper }]}>
    {mode === 'Original' ? <Image source={previewAssets.weekend} resizeMode="cover" style={StyleSheet.absoluteFill} accessibilityLabel="Original reference model photograph · demo" /> : board ? <View style={[styles.board, { top: boardTop }]}><LookVisual look={{ ...look, previewKey: undefined }} /></View> : <View style={StyleSheet.absoluteFill}><LookVisual look={look} photograph /></View>}
    {!board && <LinearGradient colors={['rgba(22,19,15,0.55)', 'transparent', 'rgba(22,19,15,0.72)']} locations={[0, 0.42, 1]} style={StyleSheet.absoluteFill} pointerEvents="none" />}
    <View style={[styles.header, { paddingTop: insets.top + 12 }]}><MotionPressable accessibilityRole="button" accessibilityLabel="Back to Your Edit" onPress={() => router.navigate('/edits')} style={styles.back}><FormIcon name="back" color={board ? colors.ink : colors.paper} /></MotionPressable><Text style={[styles.headerTitle, board && { color: colors.ink }]}>TRY ON</Text><View style={styles.back} /></View>
    <View style={styles.segment}>{(['Looks', 'Pieces', 'Upload'] as const).map(value => <MotionPressable key={value} accessibilityRole="tab" accessibilityState={{ selected: view === value }} onPress={() => setView(value)} style={[styles.segmentButton, view === value && styles.segmentActive]}><Text style={[styles.segmentText, view === value && styles.segmentTextActive]}>{value}</Text></MotionPressable>)}</View>
    {view === 'Looks' && <View style={[styles.segment, styles.modeSegment]}>{(['Original', 'Preview'] as const).map(value => <MotionPressable key={value} accessibilityRole="tab" accessibilityState={{ selected: mode === value }} onPress={() => setMode(value)} style={[styles.segmentButton, mode === value && styles.segmentActive]}><Text style={[styles.segmentText, mode === value && styles.segmentTextActive]}>{value}</Text></MotionPressable>)}</View>}
    <View style={styles.footer}>
      {view === 'Looks' && <>
        <Text style={[styles.caption, onPhoto && styles.captionOnPhoto]}>{mode === 'Original' ? 'Original · reference model' : board ? 'Styling board preview' : 'Try-on preview · demo'}</Text>
        <Text style={[styles.captionNote, onPhoto && styles.captionOnPhoto]}>{board ? 'Composed from the actual pieces · no try-on image for this edit' : 'Static fixture on a reference model · fit and sizing not verified'}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.selectors}>{choices.map(item => <MotionPressable key={item.id} accessibilityRole="button" accessibilityLabel={'Preview ' + item.title + (state.saved.some(s => s.id === item.id) ? ', saved look' : ', current look')} accessibilityState={{ selected: look.id === item.id }} onPress={() => { state.selectLook(item); setMode('Preview'); }} style={[styles.selector, item.id === look.id && { borderColor: board ? colors.ink : colors.card }]}><LookVisual look={item} /></MotionPressable>)}</ScrollView>
        <Text style={[styles.lookTitle, onPhoto && styles.lookTitleOnPhoto]}>{look.title}</Text>
        <View style={styles.actions}><MotionPressable accessibilityRole="button" accessibilityLabel={saved ? 'Look already saved' : 'Save ' + look.title} onPress={() => { if (!saved) state.toggleSaved(look, state.saved.find(s => s.id === look.id)?.occasion ?? state.sessions.find(s => s.looks.some(l => l.id === look.id))?.occasion ?? occasion); showToast(saved ? 'This look is in Saved' : 'Look saved'); }} style={styles.save}><Text style={styles.saveText}>{saved ? 'Saved look' : 'Save look'}</Text>{saved && <FormIcon name="check" size={16} color={colors.paper} />}</MotionPressable><MotionPressable accessibilityRole="button" accessibilityLabel="View look details" onPress={() => router.push({ pathname: '/results', params: { lookId: look.id, savedId: saved ? look.id : '' } })} style={[styles.more, onPhoto ? styles.moreOnPhoto : styles.moreOnBoard]}><FormIcon name="more" color={board ? colors.ink : colors.paper} size={20} /></MotionPressable></View>
        <MotionPressable accessibilityRole="button" accessibilityLabel="Upload a piece" onPress={() => router.push('/add-piece')} style={styles.uploadAction}><Text style={[styles.uploadActionText, onPhoto && styles.captionOnPhoto]}>Upload a piece +</Text></MotionPressable>
      </>}
      {view === 'Pieces' && <>
        <Text style={[styles.caption, onPhoto && styles.captionOnPhoto]}>Pieces from your edit, saved looks and uploads</Text>
        <Text style={[styles.captionNote, onPhoto && styles.captionOnPhoto]}>Select pieces for a future try-on</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.selectors}>{pieceChoices.map(product => {
          const item = selectionFromProduct(product);
          const selected = state.tryOnSelection.some(entry => selectionKey(entry) === selectionKey(item));
          return <GarmentTile key={product.id} label={(selected ? 'Selected for preview. ' : '') + (isUserUpload(product) ? product.name + ', your uploaded ' + slotLabel(product.slot).toLowerCase() : product.name + ' by ' + product.brand)} sub={isUserUpload(product) ? product.name : product.brand} selected={selected} accent={board ? colors.ink : colors.card} onPress={() => state.toggleTryOnSelection(item)}><PieceImage product={product} /></GarmentTile>;
        })}</ScrollView>
        <Text style={[styles.selectedLine, onPhoto && styles.captionOnPhoto]}>{selectedCount ? 'Selected for preview · ' + selectedCount + (selectedCount === 1 ? ' piece' : ' pieces') : 'Nothing selected yet'}</Text>
        <MotionPressable accessibilityRole="button" accessibilityLabel={selectedCount ? 'Try selected pieces on · demo scaffold' : 'Select pieces first'} disabled={!selectedCount} onPress={() => showToast('Try-on generation is not connected in this build.')} style={styles.save}><Text style={styles.saveText}>{selectedCount ? 'Try this on' : 'Select pieces to try on'}</Text></MotionPressable>
        {selectionIncludesUpload && <Text accessibilityRole="alert" style={[styles.honestNote, onPhoto && styles.captionOnPhoto]}>Try-on generation is not connected in this build.</Text>}
      </>}
      {view === 'Upload' && <>
        <Text style={[styles.caption, onPhoto && styles.captionOnPhoto]}>Your uploads</Text>
        <Text style={[styles.captionNote, onPhoto && styles.captionOnPhoto]}>Your photo stays on this device in this demo.</Text>
        {state.userGarments.length ? <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.selectors}>{state.userGarments.map(garment => {
          const selected = state.tryOnSelection.some(item => item.source === 'user_upload' && item.id === garment.id);
          return <GarmentTile key={garment.id} label={(selected ? 'Selected for preview. ' : '') + 'Your uploaded ' + slotLabel(garment.slot).toLowerCase() + (garment.name ? ', ' + garment.name : '')} sub={garment.name ?? slotLabel(garment.slot)} selected={selected} accent={board ? colors.ink : colors.card} onPress={() => state.toggleTryOnSelection({ source: 'user_upload', id: garment.id })}><Image source={{ uri: garment.localUri }} resizeMode="cover" style={styles.tileImg} accessibilityLabel={garment.name ?? slotLabel(garment.slot) + ', your uploaded photo'} /></GarmentTile>;
        })}</ScrollView> : <View style={styles.uploadEmpty}><Text style={[styles.uploadEmptyText, onPhoto && styles.captionOnPhoto]}>Nothing uploaded yet.</Text></View>}
        <MotionPressable accessibilityRole="button" accessibilityLabel="Upload a piece" onPress={() => router.push('/add-piece')} style={[styles.save, styles.uploadPrimary]}><Text style={styles.saveText}>Upload a piece +</Text></MotionPressable>
        {selectionIncludesUpload && <Text accessibilityRole="alert" style={[styles.honestNote, onPhoto && styles.captionOnPhoto]}>Try-on generation is not connected in this build.</Text>}
        {!!state.userGarments.length && <MotionPressable accessibilityRole="button" accessibilityLabel="Manage uploads in Saved" onPress={() => router.navigate('/saved')} style={styles.uploadAction}><Text style={[styles.uploadActionText, onPhoto && styles.captionOnPhoto]}>Manage uploads in Saved →</Text></MotionPressable>}
      </>}
    </View>
  </View>;
}
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#A99F90' }, board: { position: 'absolute', top: 150, left: 26, right: 26, bottom: 290 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 22 },
  back: { width: 48, height: 48, justifyContent: 'center' }, headerTitle: { fontFamily: family.sans, fontSize: 10, letterSpacing: 2, color: colors.paper },
  segment: { alignSelf: 'center', flexDirection: 'row', backgroundColor: 'rgba(252,251,248,0.8)', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(17,17,15,0.12)', borderRadius: 999, padding: 3, marginTop: 12 },
  modeSegment: { marginTop: 8 },
  segmentButton: { minWidth: 92, height: 40, justifyContent: 'center', alignItems: 'center', borderRadius: 999 },
  segmentActive: { backgroundColor: colors.card },
  segmentText: { fontFamily: family.sans, fontSize: 12, color: colors.muted },
  segmentTextActive: { color: colors.ink },
  footer: { position: 'absolute', bottom: 18, left: 22, right: 22 },
  caption: { fontFamily: family.sans, fontSize: 11, lineHeight: 16, textAlign: 'center', color: colors.ink, marginBottom: 2 },
  captionNote: { fontFamily: family.sans, fontSize: 10, lineHeight: 15, textAlign: 'center', color: colors.muted, marginBottom: 12 },
  captionOnPhoto: { color: 'rgba(250,249,246,0.94)', textShadowColor: 'rgba(17,17,15,0.6)', textShadowRadius: 6 },
  selectors: { gap: 14, paddingHorizontal: 2 }, selector: { width: 64, height: 80, borderRadius: 10, overflow: 'hidden', backgroundColor: colors.paper2, borderWidth: 1.5, borderColor: 'transparent' },
  tile: { width: 64, borderRadius: 10, borderWidth: 1.5, borderColor: 'transparent' },
  tileMedia: { width: 64, height: 64, borderRadius: 9, overflow: 'hidden', backgroundColor: colors.paper2 },
  tileImg: { width: '100%', height: '100%' },
  tileCheck: { position: 'absolute', top: 4, right: 4, width: 18, height: 18, borderRadius: 9, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' },
  tileSub: { fontFamily: family.sans, fontSize: 9, lineHeight: 13, textAlign: 'center', color: colors.ink, marginTop: 3 },
  selectedLine: { fontFamily: family.sansMedium, fontSize: 11, lineHeight: 16, textAlign: 'center', color: colors.ink, marginTop: 10 },
  honestNote: { fontFamily: family.sans, fontSize: 10, lineHeight: 15, textAlign: 'center', color: colors.ink, marginTop: 10 },
  uploadEmpty: { height: 64, justifyContent: 'center' }, uploadEmptyText: { fontFamily: family.sans, fontSize: 12, textAlign: 'center', color: colors.muted },
  uploadPrimary: { marginTop: 10 },
  lookTitle: { fontFamily: family.sansMedium, fontSize: 13, letterSpacing: 0.2, textAlign: 'center', color: colors.ink, marginTop: 10, marginBottom: 16 },
  lookTitleOnPhoto: { color: colors.paper, textShadowColor: 'rgba(17,17,15,0.55)', textShadowRadius: 8 },
  actions: { flexDirection: 'row', gap: 10 }, save: { flex: 1, height: 52, borderRadius: 26, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
  saveText: { fontFamily: family.sansMedium, fontSize: 14, color: colors.paper },
  more: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  moreOnPhoto: { backgroundColor: 'rgba(17,17,15,0.32)', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(250,249,246,0.4)' },
  moreOnBoard: { backgroundColor: colors.card, borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(17,17,15,0.18)' },
  uploadAction: { minHeight: 48, justifyContent: 'center', alignItems: 'center', marginTop: 4 },
  uploadActionText: { fontFamily: family.sansMedium, fontSize: 12, color: colors.ink },
  emptyText: { fontFamily: family.serif, fontSize: 26, lineHeight: 32, color: colors.ink },
});
