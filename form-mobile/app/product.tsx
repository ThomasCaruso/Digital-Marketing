import { MotionPressable } from '../src/components/MotionPressable';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { EditorialScreen, SectionLabel, editorial } from '../src/components/Editorial';
import { DetailHeader, TextAction } from '../src/components/DetailHeader';
import { ProductVisual } from '../src/components/ProductVisual';
import { showToast } from '../src/components/Toast';
import { catalogProducts } from '../src/data/catalog';
import { fixtureReason, recommendedSize, relatedFixtureLook } from '../src/domain/fixtureEngine';
import { formatMoney, lookTotalCents } from '../src/domain/selectors';
import { demoRetailerDestination } from '../src/providers/retailerDestination';
import { useFormStore } from '../src/state/store';
import { colors } from '../src/theme/tokens';
export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const state = useFormStore();
  const { width } = useWindowDimensions();
  const [page, setPage] = useState(0);
  const product = catalogProducts.find(p => p.id === id) ?? state.savedPieces.find(p => p.id === id)?.product ?? state.sessions.flatMap(s => s.looks.flatMap(l => l.products)).find(p => p.id === id) ?? state.saved.flatMap(s => s.look.products).find(p => p.id === id);
  if (!product) return <EditorialScreen><DetailHeader title="Piece" /><Text style={editorial.title}>This piece is unavailable.</Text></EditorialScreen>;
  const saved = state.savedPieces.some(p => p.id === product.id);
  const relatedSession = state.sessions.find(s => s.looks.some(l => l.products.some(p => p.id === product.id)));
  const related = relatedSession?.looks.find(l => l.products.some(p => p.id === product.id)) ?? relatedFixtureLook(product);
  return <EditorialScreen><DetailHeader title="The piece" />
    <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} style={styles.gallery} onMomentumScrollEnd={e => setPage(Math.round(e.nativeEvent.contentOffset.x / (width - 52)))}>
      {[0, 1].map(i => <View key={i} style={{ width: width - 52, height: 380, overflow: 'hidden' }}><ProductVisual product={product} gallery={i} /></View>)}
    </ScrollView>
    <Text style={styles.galleryNote}>{page + 1} / 2 · {page ? 'Detail crop' : 'Full view'} · Fixture imagery</Text>
    <SectionLabel>{product.brand}</SectionLabel><Text style={editorial.title}>{product.name}</Text>
    <View style={[editorial.row, { marginVertical: 12 }]}><Text style={editorial.body}>{product.color}</Text><Text style={editorial.body}>{formatMoney(product.priceCents)}</Text></View>
    <Text style={editorial.secondary}>{product.material ?? product.details}</Text><View style={editorial.rule} />
    <SectionLabel>Available sizes · demo</SectionLabel><View style={styles.sizes}>{(product.availableSizes ?? [product.size]).map(size => <Text key={size} style={styles.size}>{size}</Text>)}</View>
    <Text style={editorial.body}>FORM recommended size: {recommendedSize(product, state.profile)}</Text><Text style={editorial.secondary}>Demo suggestion from your saved measurements. Fit is not verified.</Text>
    <View style={editorial.rule} /><SectionLabel>Why this was picked</SectionLabel><Text style={[editorial.body, { marginTop: 8 }]}>{fixtureReason(product, state.profile)}</Text><Text style={editorial.secondary}>Demo fixture reasoning · your stated preferences</Text>
    {related && <><View style={editorial.rule} /><SectionLabel>A complete look</SectionLabel><MotionPressable accessibilityRole="button" accessibilityLabel={'Open related edit ' + related.title} onPress={() => { state.selectLook(related); if (relatedSession) state.setActiveSession(relatedSession.id); router.push({ pathname: '/results', params: { lookId: related.id } }); }} style={styles.related}><View><Text style={editorial.title}>{related.title}</Text><Text style={editorial.secondary}>{formatMoney(lookTotalCents(related))} · Complete fixture look</Text></View><Text style={editorial.body}>→</Text></MotionPressable></>}
    {!related && <><View style={editorial.rule} /><TextAction label="Create a complete edit →" onPress={() => router.push({ pathname: '/create-edit', params: {} })} /></>}
    <View style={editorial.rule} /><View style={editorial.row}><TextAction label={saved ? 'Saved piece' : 'Save piece'} onPress={() => { const nowSaved = state.togglePiece(product); showToast(nowSaved ? 'Piece saved' : 'Piece removed'); }} /><TextAction label="Not for me" onPress={() => { state.passPiece(product); showToast('Passed · removed from selection'); router.back(); }} /></View>
    <TextAction dark label="View at retailer →" onPress={() => { void demoRetailerDestination.viewProduct(product); }} /><Text style={[editorial.secondary, { marginTop: 10, textAlign: 'center' }]}>Demo destination · no live stock information</Text>
  </EditorialScreen>;
}
const styles = StyleSheet.create({
  gallery: { marginVertical: 8 }, galleryNote: { ...editorial.secondary, textAlign: 'center', marginBottom: 24 },
  sizes: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginVertical: 12 },
  size: { ...editorial.body, padding: 10, minWidth: 42, textAlign: 'center', borderWidth: StyleSheet.hairlineWidth, borderColor: colors.line2, borderRadius: 8 },
  related: { ...editorial.row, minHeight: 72, paddingVertical: 12 },
});


