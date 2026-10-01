import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Image, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { MotionPressable } from './MotionPressable';
import { FormIcon } from './FormIcon';
import { ProductVisual } from './ProductVisual';
import { productPhotography } from '../data/photography';
import { isUserUpload, slotLabel } from '../domain/garments';
import { formatMoney } from '../domain/selectors';
import type { Look, Product } from '../domain/types';
import { colors } from '../theme/tokens';
import { family } from '../theme/typography';

/**
 * A mood board, not a picture of clothes: the look's actual product
 * photography arranged as an asymmetrical collage — one dominant garment,
 * supporting pieces staggered around it, deliberate negative space, slight
 * rotations, occasional subtle overlap. Assembled at runtime from the
 * photography manifest, so any adjustment re-composes the board for free
 * and the imagery stays honest — real per-piece photographs, never a
 * synthesized composite of the whole look.
 *
 * Composition is deterministic: it responds only to the number of pieces,
 * their slots (which piece dominates), and each image's aspect ratio —
 * never to render order or randomness. Tiles size by image width; height
 * follows the image's own aspect, so portrait clothing shots, square
 * product shots, isolated shoes and landscape detail crops all place
 * without distortion. Declared aspects come from the photography manifest;
 * each loaded image is re-measured and corrects its tile if the real file
 * differs, so a dropped-in photo pack needs no code changes.
 */

/** x, y, w, maxH are percent of the board (heights clamp to maxH); r in degrees. */
interface Tile { x: number; y: number; w: number; maxH: number; r: number; z: number }
const LAYOUTS: Record<number, Tile[]> = {
  2: [
    { x: 8, y: 6, w: 52, maxH: 56, r: -2.0, z: 2 },
    { x: 44, y: 46, w: 44, maxH: 42, r: 2.2, z: 3 },
  ],
  // Sparse triangle: dominant top-left, secondary mid-right, tertiary below.
  3: [
    { x: 5, y: 5, w: 50, maxH: 58, r: -2.2, z: 2 },
    { x: 57, y: 26, w: 36, maxH: 36, r: 1.8, z: 3 },
    { x: 20, y: 66, w: 34, maxH: 28, r: -1.5, z: 1 },
  ],
  // Asymmetric 2+2: a tall left column against two staggered pieces right.
  4: [
    { x: 4, y: 4, w: 46, maxH: 54, r: -2.0, z: 2 },
    { x: 58, y: 8, w: 30, maxH: 26, r: 2.4, z: 1 },
    { x: 52, y: 42, w: 42, maxH: 46, r: -1.4, z: 3 },
    { x: 10, y: 62, w: 38, maxH: 32, r: 1.6, z: 1 },
  ],
  // One dominant garment; the rest support around it.
  5: [
    { x: 4, y: 4, w: 54, maxH: 60, r: -2.2, z: 3 },
    { x: 60, y: 6, w: 30, maxH: 24, r: 2.6, z: 1 },
    { x: 62, y: 38, w: 34, maxH: 34, r: -1.8, z: 2 },
    { x: 8, y: 66, w: 36, maxH: 26, r: 1.4, z: 1 },
    { x: 48, y: 74, w: 30, maxH: 22, r: -2.4, z: 2 },
  ],
};
/** Deterministic per-look mirroring, so boards vary between looks without randomness. */
function flipFor(look: Look): boolean {
  let hash = 0;
  for (const ch of look.id) hash = (hash * 31 + ch.charCodeAt(0)) % 997;
  return hash % 2 === 1;
}
/** Garments dominate; the first top leads, everything else follows catalog order. */
function orderedFor(look: Look): Product[] {
  const lead = look.products.find(p => p.slot === 'top') ?? look.products[0];
  return [lead, ...look.products.filter(p => p !== lead)];
}
function tileFor(look: Look, index: number): Tile {
  const count = Math.max(2, Math.min(5, look.products.length));
  const base = LAYOUTS[count];
  const tile = base[index % base.length];
  const drop = Math.floor(index / base.length) * 6;
  const flipped = flipFor(look);
  return { ...tile, x: flipped ? 100 - tile.x - tile.w : tile.x, r: flipped ? -tile.r : tile.r, y: tile.y + drop };
}
/** Portrait illustrated fallback; photography declares its own aspect. */
const FALLBACK_ASPECT = 280 / 300;

/**
 * `interactive` renders each piece as a tappable tile with the detail card;
 * `interactive={false}` is a quiet, non-pressable composition for thumbnails
 * and secondary surfaces. `fill` stretches to the parent instead of a fixed
 * height, so the same board scales from a 96dp thumbnail to a full screen.
 * `onRemovePiece` (uploads only) lets an editable surface take a user
 * garment back off the board.
 */
export function CollageBoard({ look, boardHeight = 420, interactive = true, fill = false, onSwap, onRemovePiece }: { look: Look; boardHeight?: number; interactive?: boolean; fill?: boolean; onSwap?: (product: Product) => void; onRemovePiece?: (product: Product) => void }) {
  const router = useRouter();
  const [active, setActive] = useState<Product | null>(null);
  const [revealRemove, setRevealRemove] = useState(false);
  const [frame, setFrame] = useState({ w: 0, h: 0 });
  const [measured, setMeasured] = useState<Record<string, number>>({});
  const [missing, setMissing] = useState<Record<string, boolean>>({});
  const ratio = frame.h ? frame.w / frame.h : 0.75;
  // Inspecting a piece always closes any pending remove confirm first.
  const inspect = (product: Product | null) => { setActive(product); setRevealRemove(false); };
  return <View onLayout={e => setFrame({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })} style={[styles.board, { height: fill ? '100%' : boardHeight }]}>
    {orderedFor(look).map((product, index) => {
      const tile = tileFor(look, index);
      const uploaded = isUserUpload(product);
      const aspect = measured[product.id] ?? (uploaded ? product.aspect : undefined) ?? productPhotography[product.id]?.aspect ?? FALLBACK_ASPECT;
      const height = Math.min(tile.w * ratio / aspect, tile.maxH, 98 - tile.y);
      const photo = productPhotography[product.id]?.source;
      const isActive = active?.id === product.id;
      const measure = (e: { nativeEvent: { source: { width: number; height: number } } }) => { const { width, height: ih } = e.nativeEvent.source; if (width && ih && Math.abs(width / ih - aspect) / aspect > 0.04) setMeasured(m => (m[product.id] === width / ih ? m : { ...m, [product.id]: width / ih })); };
      // Uploads always render the user's own photograph — never the illustrated garment fallback.
      const image = uploaded
        ? missing[product.id]
          ? <View style={styles.missing}><Text style={styles.missingText}>Photo{'\n'}unavailable</Text></View>
          : <Image source={{ uri: product.localUri }} resizeMode="cover" onError={() => setMissing(m => ({ ...m, [product.id]: true }))} onLoad={measure} style={styles.image} accessibilityLabel={product.name + ', your uploaded photo'} />
        : photo
          ? <Image source={photo} resizeMode="cover" onLoad={measure} style={styles.image} accessibilityLabel={product.name + ', product photograph'} />
          : <View style={styles.fallback}><ProductVisual product={product} /></View>;
      const geometry: ViewStyle = { left: `${tile.x}%`, top: `${tile.y}%`, width: `${tile.w}%`, height: `${height}%`, zIndex: tile.z, transform: [{ rotate: tile.r + 'deg' }] };
      if (!interactive) return <View key={product.id} style={[styles.tile, geometry]}>{image}</View>;
      return <MotionPressable key={product.id} accessibilityRole="button"
        accessibilityLabel={uploaded ? 'Inspect ' + product.name + ', your uploaded ' + slotLabel(product.slot).toLowerCase() : 'Inspect ' + product.brand + ' ' + product.name + ', ' + formatMoney(product.priceCents)}
        accessibilityState={{ expanded: isActive }}
        onPress={() => inspect(isActive ? null : product)}
        style={[styles.tile, geometry, isActive && styles.tileActive]}>
        {image}
      </MotionPressable>;
    })}
    {active && <View style={styles.card}>
      {isUserUpload(active) && revealRemove && onRemovePiece ? <View style={styles.confirmRow}>
        <Text numberOfLines={1} style={styles.confirmText}>Remove this piece?</Text>
        <MotionPressable accessibilityRole="button" accessibilityLabel={'Keep ' + active.name + ' on this board'} onPress={() => setRevealRemove(false)} style={styles.view}>
          <Text style={styles.viewText}>Keep</Text>
        </MotionPressable>
        <MotionPressable accessibilityRole="button" accessibilityLabel={'Remove ' + active.name + ' from this board'} onPress={() => { const piece = active; inspect(null); onRemovePiece(piece); }} style={styles.view}>
          <Text style={[styles.viewText, { color: '#9B6F61' }]}>Remove</Text>
        </MotionPressable>
      </View> : <>
      {isUserUpload(active) ? <View style={{ flex: 1 }}>
        <Text style={styles.brand}>YOUR PIECE</Text>
        <Text numberOfLines={2} style={styles.name}>{active.name}</Text>
        <Text numberOfLines={1} style={styles.meta}>{slotLabel(active.slot)}{active.color && active.color !== active.name ? ' · ' + active.color : ''}</Text>
      </View> : <View style={{ flex: 1 }}>
        <Text style={styles.brand}>{active.brand.toUpperCase()}</Text>
        <Text numberOfLines={2} style={styles.name}>{active.name}</Text>
        <Text numberOfLines={1} style={styles.meta}>{active.color} · {formatMoney(active.priceCents)}</Text>
      </View>}
      {!isUserUpload(active) && <MotionPressable accessibilityRole="button" accessibilityLabel={'View ' + active.name + ' details'} onPress={() => router.push({ pathname: '/product', params: { id: active.id } })} style={styles.view}>
        <Text style={styles.viewText}>View</Text><FormIcon name="arrow" size={16} color={colors.ink} />
      </MotionPressable>}
      {!isUserUpload(active) && onSwap && <MotionPressable accessibilityRole="button" accessibilityLabel={'Swap ' + active.name + ' for an alternative'} onPress={() => { const piece = active; inspect(null); onSwap(piece); }} style={styles.view}>
        <Text style={styles.viewText}>Swap</Text><FormIcon name="rewind" size={15} color={colors.ink} />
      </MotionPressable>}
      {isUserUpload(active) && onRemovePiece && <MotionPressable accessibilityRole="button" accessibilityLabel="More actions for this piece" onPress={() => setRevealRemove(true)} style={styles.overflow}>
        <FormIcon name="more" size={18} color={colors.ink} />
      </MotionPressable>}
      </>}
      <MotionPressable accessibilityRole="button" accessibilityLabel="Close piece details" onPress={() => inspect(null)} style={styles.close}>
        <FormIcon name="close" size={15} color={colors.muted} />
      </MotionPressable>
    </View>}
  </View>;
}
const styles = StyleSheet.create({
  board: { width: '100%' },
  tile: { position: 'absolute', overflow: 'hidden', borderRadius: 8, backgroundColor: colors.paper2, shadowColor: colors.ink, shadowOpacity: 0.12, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 3 },
  tileActive: { borderWidth: 1.5, borderColor: colors.ink },
  image: { width: '100%', height: '100%' },
  fallback: { flex: 1, backgroundColor: colors.card, padding: '6%' },
  missing: { flex: 1, backgroundColor: colors.paper2, alignItems: 'center', justifyContent: 'center', padding: 10 },
  missingText: { fontFamily: family.sans, fontSize: 11, lineHeight: 15, textAlign: 'center', color: colors.muted },
  card: { position: 'absolute', left: 10, right: 10, bottom: 10, zIndex: 40, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.card, borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.line, paddingHorizontal: 14, paddingVertical: 13, shadowColor: colors.ink, shadowOpacity: 0.06, shadowRadius: 14, shadowOffset: { width: 0, height: 4 }, elevation: 1 },
  brand: { fontFamily: family.sansMedium, fontSize: 9, letterSpacing: 1.8, color: colors.muted },
  name: { fontFamily: family.sansMedium, fontSize: 14, lineHeight: 19, color: colors.ink, marginTop: 2 },
  meta: { fontFamily: family.sans, fontSize: 12, lineHeight: 17, color: colors.muted, marginTop: 1 },
  view: { flexDirection: 'row', alignItems: 'center', gap: 5, minHeight: 44, paddingHorizontal: 4 },
  viewText: { fontFamily: family.sansMedium, fontSize: 13, color: colors.ink },
  overflow: { width: 32, height: 44, alignItems: 'center', justifyContent: 'center' },
  confirmRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  confirmText: { flex: 1, fontFamily: family.sansMedium, fontSize: 13, lineHeight: 18, color: colors.ink },
  close: { width: 32, height: 44, alignItems: 'center', justifyContent: 'center' },
});
