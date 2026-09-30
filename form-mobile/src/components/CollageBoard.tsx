import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { MotionPressable } from './MotionPressable';
import { FormIcon } from './FormIcon';
import { ProductVisual } from './ProductVisual';
import { garmentAssets } from '../data/preview';
import { formatMoney } from '../domain/selectors';
import type { Look, Product } from '../domain/types';
import { colors } from '../theme/tokens';
import { family } from '../theme/typography';

/**
 * A mood board, not a picture of clothes: the look's actual product
 * photography arranged as an asymmetrical collage — unequal sizes, slight
 * rotations, deliberate overlap, heavy negative space. Assembled at runtime
 * from the garment manifest, so any adjustment re-composes the board for free
 * and the imagery stays honest — real per-piece photographs, never a
 * synthesized composite of the whole look.
 */
interface Tile { x: number; y: number; w: number; h: number; r: number; z: number }
const LAYOUTS: Record<number, Tile[]> = {
  2: [
    { x: 6, y: 8, w: 56, h: 52, r: -2.2, z: 2 },
    { x: 44, y: 46, w: 46, h: 42, r: 2.4, z: 1 },
  ],
  3: [
    { x: 5, y: 7, w: 54, h: 44, r: -2.4, z: 2 },
    { x: 42, y: 36, w: 50, h: 46, r: 1.8, z: 3 },
    { x: 10, y: 68, w: 44, h: 25, r: -1.6, z: 1 },
  ],
  4: [
    { x: 4, y: 6, w: 50, h: 42, r: -2.2, z: 2 },
    { x: 56, y: 3, w: 38, h: 26, r: 2.8, z: 1 },
    { x: 44, y: 40, w: 48, h: 42, r: 1.6, z: 3 },
    { x: 8, y: 66, w: 42, h: 27, r: -1.8, z: 1 },
  ],
  5: [
    { x: 4, y: 5, w: 48, h: 40, r: -2.2, z: 2 },
    { x: 56, y: 2, w: 36, h: 24, r: 3, z: 1 },
    { x: 48, y: 32, w: 44, h: 38, r: 1.8, z: 3 },
    { x: 6, y: 56, w: 42, h: 26, r: -1.6, z: 1 },
    { x: 30, y: 76, w: 34, h: 21, r: 2.2, z: 2 },
  ],
};
/** Deterministic per-look mirroring, so boards vary between looks without randomness. */
function flipFor(look: Look): boolean {
  let hash = 0;
  for (const ch of look.id) hash = (hash * 31 + ch.charCodeAt(0)) % 997;
  return hash % 2 === 1;
}
function tileFor(look: Look, index: number): Tile {
  const count = Math.max(2, Math.min(5, look.products.length));
  const base = LAYOUTS[count];
  const tile = base[index % base.length];
  const drop = Math.floor(index / base.length) * 6;
  const flipped = flipFor(look);
  return { ...tile, x: flipped ? 100 - tile.x - tile.w : tile.x, r: flipped ? -tile.r : tile.r, y: tile.y + drop };
}

/**
 * `interactive` renders each piece as a tappable tile with the detail card;
 * `interactive={false}` is a quiet, non-pressable composition for thumbnails
 * and secondary surfaces. `fill` stretches to the parent instead of a fixed
 * height, so the same board scales from a 96dp thumbnail to a full screen.
 */
export function CollageBoard({ look, boardHeight = 420, interactive = true, fill = false, onSwap }: { look: Look; boardHeight?: number; interactive?: boolean; fill?: boolean; onSwap?: (product: Product) => void }) {
  const router = useRouter();
  const [active, setActive] = useState<Product | null>(null);
  return <View style={[styles.board, { height: fill ? '100%' : boardHeight }]}>
    {look.products.map((product, index) => {
      const tile = tileFor(look, index);
      const isActive = active?.id === product.id;
      const image = garmentAssets[product.id]
        ? <Image source={garmentAssets[product.id]} resizeMode="cover" style={styles.image} accessibilityLabel={product.name + ', product photograph'} />
        : <View style={styles.fallback}><ProductVisual product={product} /></View>;
      if (!interactive) return <View key={product.id} style={[styles.tile, { left: `${tile.x}%`, top: `${tile.y}%`, width: `${tile.w}%`, height: `${tile.h}%`, zIndex: tile.z, transform: [{ rotate: tile.r + 'deg' }] }]}>{image}</View>;
      return <MotionPressable key={product.id} accessibilityRole="button"
        accessibilityLabel={'Inspect ' + product.brand + ' ' + product.name + ', ' + formatMoney(product.priceCents)}
        accessibilityState={{ expanded: isActive }}
        onPress={() => setActive(isActive ? null : product)}
        style={[styles.tile, { left: `${tile.x}%`, top: `${tile.y}%`, width: `${tile.w}%`, height: `${tile.h}%`, zIndex: tile.z, transform: [{ rotate: tile.r + 'deg' }] }]}>
        {image}
      </MotionPressable>;
    })}
    {active && <View style={styles.card}>
      <View style={{ flex: 1 }}>
        <Text style={styles.brand}>{active.brand.toUpperCase()}</Text>
        <Text numberOfLines={2} style={styles.name}>{active.name}</Text>
        <Text numberOfLines={1} style={styles.meta}>{active.color} · {formatMoney(active.priceCents)}</Text>
      </View>
      <MotionPressable accessibilityRole="button" accessibilityLabel={'View ' + active.name + ' details'} onPress={() => router.push({ pathname: '/product', params: { id: active.id } })} style={styles.view}>
        <Text style={styles.viewText}>View</Text><FormIcon name="arrow" size={16} color={colors.ink} />
      </MotionPressable>
      {onSwap && <MotionPressable accessibilityRole="button" accessibilityLabel={'Swap ' + active.name + ' for an alternative'} onPress={() => { const piece = active; setActive(null); onSwap(piece); }} style={styles.view}>
        <Text style={styles.viewText}>Swap</Text><FormIcon name="rewind" size={15} color={colors.ink} />
      </MotionPressable>}
      <MotionPressable accessibilityRole="button" accessibilityLabel="Close piece details" onPress={() => setActive(null)} style={styles.close}>
        <FormIcon name="close" size={15} color={colors.muted} />
      </MotionPressable>
    </View>}
  </View>;
}
const styles = StyleSheet.create({
  board: { width: '100%' },
  tile: { position: 'absolute', overflow: 'hidden' },
  image: { width: '100%', height: '100%' },
  fallback: { flex: 1, backgroundColor: colors.card, padding: '6%' },
  card: { position: 'absolute', left: 10, right: 10, bottom: 10, zIndex: 40, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.card, borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.line, paddingHorizontal: 14, paddingVertical: 13, shadowColor: colors.ink, shadowOpacity: 0.06, shadowRadius: 14, shadowOffset: { width: 0, height: 4 }, elevation: 1 },
  brand: { fontFamily: family.sansMedium, fontSize: 9, letterSpacing: 1.8, color: colors.muted },
  name: { fontFamily: family.sansMedium, fontSize: 14, lineHeight: 19, color: colors.ink, marginTop: 2 },
  meta: { fontFamily: family.sans, fontSize: 12, lineHeight: 17, color: colors.muted, marginTop: 1 },
  view: { flexDirection: 'row', alignItems: 'center', gap: 5, minHeight: 44, paddingHorizontal: 4 },
  viewText: { fontFamily: family.sansMedium, fontSize: 13, color: colors.ink },
  close: { width: 32, height: 44, alignItems: 'center', justifyContent: 'center' },
});
