import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, ReduceMotion } from 'react-native-reanimated';
import { formatMoney, lookTotalCents } from '../domain/selectors';
import type { Look } from '../domain/types';
import { AppButton } from './AppButton';
import { HeartIcon } from './icons';
import { LookScene } from './LookScene';
import { colors, radius, shadowCard } from '../theme/tokens';
import { eyebrow, family } from '../theme/typography';

interface LookCardProps {
  look: Look;
  index: number;
  saved: boolean;
  onOpen: () => void;
  onTryOn: () => void;
  onToggleSave: () => void;
}

/** A result card: scene visual, stylist copy, swatches, total, actions. */
export function LookCard({ look, index, saved, onOpen, onTryOn, onToggleSave }: LookCardProps) {
  const total = lookTotalCents(look);
  const brands = look.products.map(p => p.brand).join(', ');

  return (
    <Animated.View
      entering={FadeInDown.duration(450)
        .delay(index * 90)
        .reduceMotion(ReduceMotion.System)}
      style={[styles.card, shadowCard]}
    >
      <View style={styles.visual}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onOpen}
          accessibilityRole="button"
          accessibilityLabel={`View ${look.title}`}
        >
          <LookScene look={look} figureScale={8} />
        </Pressable>
        <View style={styles.vibePill} pointerEvents="none">
          <Text style={styles.vibeText}>{look.vibe}</Text>
        </View>
        <Pressable
          onPress={onToggleSave}
          style={({ pressed }) => [styles.heartButton, pressed && styles.heartPressed]}
          accessibilityRole="button"
          accessibilityLabel={saved ? `Remove ${look.title} from saved` : `Save ${look.title}`}
          hitSlop={8}
        >
          <HeartIcon color={saved ? colors.onAccent : colors.ink} filled={saved} />
        </Pressable>
      </View>

      <View style={styles.body}>
        <Text style={eyebrow}>Look {look.number}</Text>
        <Text style={styles.title}>{look.title}</Text>
        <Text style={styles.desc}>{look.description}</Text>
        <View style={styles.itemRow}>
          <View style={styles.swatches}>
            {look.products.map(p => (
              <View key={p.id} style={[styles.swatch, { backgroundColor: p.hex }]} />
            ))}
          </View>
          <Text style={styles.itemCount}>
            {look.products.length} pieces · {brands}
          </Text>
        </View>
      </View>

      <View style={styles.foot}>
        <Text style={styles.total}>
          {formatMoney(total)}
          <Text style={styles.totalUnit}> total</Text>
        </Text>
        <View style={styles.actions}>
          <AppButton label="View look" variant="ghost" small onPress={onOpen} />
          <AppButton label="Try on" small onPress={onTryOn} />
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    overflow: 'hidden',
  },
  visual: {
    height: 240,
  },
  vibePill: {
    position: 'absolute',
    top: 14,
    left: 14,
    backgroundColor: 'rgba(251, 249, 244, 0.92)',
    borderRadius: radius.pill,
    paddingVertical: 7,
    paddingHorizontal: 13,
  },
  vibeText: {
    fontFamily: family.sansSemiBold,
    fontSize: 10.5,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: colors.ink2,
  },
  heartButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(251, 249, 244, 0.92)',
    borderWidth: 1,
    borderColor: colors.line,
  },
  heartPressed: {
    transform: [{ scale: 1.08 }],
  },
  body: {
    padding: 20,
    paddingBottom: 18,
  },
  title: {
    fontFamily: family.serif,
    fontSize: 24,
    color: colors.ink,
    marginTop: 8,
  },
  desc: {
    fontFamily: family.sans,
    fontSize: 14.5,
    lineHeight: 21,
    color: colors.ink2,
    marginTop: 6,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 14,
  },
  swatches: {
    flexDirection: 'row',
  },
  swatch: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(25, 24, 19, 0.14)',
    marginLeft: -5,
  },
  itemCount: {
    fontFamily: family.sans,
    fontSize: 12.5,
    color: colors.muted,
    flexShrink: 1,
  },
  foot: {
    borderTopWidth: 1,
    borderTopColor: colors.line,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  total: {
    fontFamily: family.serif,
    fontSize: 21,
    color: colors.ink,
  },
  totalUnit: {
    fontFamily: family.sansMedium,
    fontSize: 12,
    color: colors.muted,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
});
