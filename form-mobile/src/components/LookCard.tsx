import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, ReduceMotion } from 'react-native-reanimated';
import { formatMoney, lookTotalCents } from '../domain/selectors';
import type { Look } from '../domain/types';
import { HeartIcon } from './icons';
import { LookScene } from './LookScene';
import { colors, radius } from '../theme/tokens';
import { eyebrow, family, micro } from '../theme/typography';

interface LookCardProps {
  look: Look;
  index: number;
  saved: boolean;
  onOpen: () => void;
  onTryOn: () => void;
  onToggleSave: () => void;
}

/**
 * An editorial look card. The type leads — number, title, rationale, the
 * curated stack — and the scene visual closes the card as a composed image,
 * not a hero toy figure. Actions are quiet text, not buttons.
 */
export function LookCard({ look, index, saved, onOpen, onTryOn, onToggleSave }: LookCardProps) {
  const total = lookTotalCents(look);

  return (
    <Animated.View
      entering={FadeInDown.duration(450)
        .delay(index * 90)
        .reduceMotion(ReduceMotion.System)}
      style={styles.card}
    >
      <Pressable onPress={onOpen} accessibilityRole="button" accessibilityLabel={`View ${look.title}`}>
        {/* ---- the type block ---- */}
        <View style={styles.body}>
          <View style={styles.headRow}>
            <Text style={styles.lookNo}>Look {look.number}</Text>
            <Text style={styles.vibe} numberOfLines={1}>
              {look.vibe}
            </Text>
          </View>
          <Text style={styles.title}>{look.title}</Text>
          <Text style={styles.desc}>{look.description}</Text>
        </View>

        {/* ---- curated item stack ---- */}
        <View style={styles.stack}>
          {look.products.map((p, i) => (
            <View key={p.id} style={[styles.stackRow, i > 0 && styles.stackRowLater]}>
              <Text style={styles.stackItem} numberOfLines={1}>
                <Text style={styles.stackBrand}>{p.brand}</Text>
                {'  '}
                {p.name}
              </Text>
              <Text style={styles.stackPrice}>{formatMoney(p.priceCents)}</Text>
            </View>
          ))}
        </View>

        {/* ---- composed scene, closing the card ---- */}
        <View style={styles.visual}>
          <LookScene look={look} figureScale={8.4} />
        </View>
      </Pressable>

      {/* ---- foot: total left, quiet actions right ---- */}
      <View style={styles.foot}>
        <Text style={styles.total}>
          {formatMoney(total)}
          <Text style={styles.totalUnit}> total</Text>
        </Text>
        <View style={styles.actions}>
          <Pressable
            onPress={onToggleSave}
            hitSlop={6}
            style={({ pressed }) => [styles.action, pressed && styles.actionPressed]}
            accessibilityRole="button"
            accessibilityLabel={saved ? `Remove ${look.title} from saved` : `Save ${look.title}`}
          >
            <HeartIcon color={saved ? colors.ink : colors.ink2} size={13} filled={saved} />
            <Text style={[styles.actionText, saved && styles.actionTextActive]}>
              {saved ? 'Saved' : 'Save'}
            </Text>
          </Pressable>
          <Pressable
            onPress={onTryOn}
            hitSlop={6}
            style={({ pressed }) => [styles.action, pressed && styles.actionPressed]}
            accessibilityRole="button"
            accessibilityLabel={`Try on ${look.title}`}
          >
            <Text style={styles.actionText}>Try on</Text>
          </Pressable>
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
  body: {
    padding: 22,
    paddingBottom: 18,
  },
  headRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 12,
  },
  lookNo: {
    ...eyebrow,
    color: colors.ink,
  },
  vibe: {
    fontFamily: family.serifItalic,
    fontSize: 14.5,
    color: colors.muted,
    flexShrink: 1,
    textAlign: 'right',
  },
  title: {
    fontFamily: family.serif,
    fontSize: 28,
    lineHeight: 32,
    color: colors.ink,
    marginTop: 10,
  },
  desc: {
    fontFamily: family.sans,
    fontSize: 14.5,
    lineHeight: 22,
    color: colors.ink2,
    marginTop: 8,
  },
  stack: {
    marginHorizontal: 22,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    paddingTop: 4,
  },
  stackRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 16,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  stackRowLater: {
    borderTopWidth: 0,
  },
  stackItem: {
    fontFamily: family.sans,
    fontSize: 14,
    color: colors.ink,
    flexShrink: 1,
  },
  stackBrand: {
    ...micro,
    color: colors.muted,
    textTransform: 'none',
    fontFamily: family.sansMedium,
    fontSize: 12.5,
    letterSpacing: 0.6,
  },
  stackPrice: {
    fontFamily: family.sansMedium,
    fontSize: 13.5,
    color: colors.ink2,
  },
  visual: {
    height: 200,
  },
  foot: {
    borderTopWidth: 1,
    borderTopColor: colors.line,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    paddingVertical: 15,
    paddingHorizontal: 22,
  },
  total: {
    fontFamily: family.serif,
    fontSize: 23,
    color: colors.ink,
  },
  totalUnit: {
    fontFamily: family.sansMedium,
    fontSize: 12,
    color: colors.muted,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24,
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionPressed: {
    opacity: 0.6,
  },
  actionText: {
    ...micro,
    color: colors.ink2,
  },
  actionTextActive: {
    color: colors.ink,
  },
});
