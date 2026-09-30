import type { ComponentProps, ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Pressable } from 'react-native-gesture-handler';
import type { Product, ReviewStatus } from '../domain/types';
import { formatMoney } from '../domain/selectors';
import { colors } from '../theme/tokens';
import { family } from '../theme/typography';
import { CardUndoButton } from './CardUndoButton';
import { FormIcon } from './FormIcon';
import { MotionPressable } from './MotionPressable';
import { ProductVisual } from './ProductVisual';

interface Props {
  product: Product; reason: string; cardHeight: number; interactive?: boolean;
  busy?: boolean; canUndo?: boolean; onUndo?: () => void;
  onTouch?: () => void; onOpen?: () => void; onReview?: (status: ReviewStatus) => void;
  onLayout?: (event: { nativeEvent: { layout: { height: number } } }) => void; children?: ReactNode;
}
function CardControl({ interactive, staticPress = false, children, style, ...props }: ComponentProps<typeof MotionPressable> & { interactive: boolean; staticPress?: boolean }) {
  if (!interactive) return <View style={style}>{children}</View>;
  if (staticPress) {
    const { haptic, dimWhenDisabled, ...pressProps } = props;
    void haptic; void dimWhenDisabled;
    return <Pressable {...pressProps} style={style}>{children}</Pressable>;
  }
  return <MotionPressable {...props} dimWhenDisabled={false} style={style}>{children}</MotionPressable>;
}
/** The screen is the card: a bare garment photograph, a quiet caption, two floating decisions. */
export function DiscoveryCardFace({ product, reason, cardHeight, interactive = false, busy = false, canUndo = false, onUndo, onTouch, onOpen, onReview, onLayout, children }: Props) {
  const compact = cardHeight < 470;
  return <View collapsable={false} accessibilityElementsHidden={!interactive} importantForAccessibility={interactive ? 'auto' : 'no-hide-descendants'} onLayout={onLayout} style={[styles.card, { height: cardHeight }]}>
      <View style={styles.stage}>
        <CardControl staticPress interactive={interactive} haptic={false} disabled={!interactive || busy} onPressIn={onTouch} onPress={onOpen}
          accessibilityRole="button" accessibilityLabel={'View ' + product.name + ' details'}
          accessibilityHint="Tap for details. Swipe right to save or left to pass."
          style={styles.visualTouch}>
          <View pointerEvents="none" style={StyleSheet.absoluteFill}><ProductVisual product={product} fit="cover" /></View>
        </CardControl>
        {children}
        {interactive && <CardUndoButton disabled={!canUndo || busy} onPressIn={onTouch} onPress={() => onUndo?.()} />}
      </View>
      <View style={styles.copy}>
        <Text style={styles.brand}>{product.brand.toUpperCase()}</Text>
        <CardControl staticPress interactive={interactive} haptic={false} disabled={!interactive || busy} accessibilityRole="button" accessibilityLabel={'View ' + product.name + ' details'} onPressIn={onTouch} onPress={onOpen} style={styles.titleTouch}>
          <Text maxFontSizeMultiplier={1.25} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={[styles.name, compact && { fontSize: 25, lineHeight: 29 }]}>{product.name}</Text>
        </CardControl>
        <Text maxFontSizeMultiplier={1.2} style={styles.meta}>{formatMoney(product.priceCents)} · {product.color}</Text>
        <Text maxFontSizeMultiplier={1.25} numberOfLines={compact ? 1 : 2} style={styles.reason}>{reason}</Text>
      </View>
      <View style={styles.actions}>
      <CardControl staticPress interactive={interactive} haptic={false} disabled={!interactive || busy} accessibilityRole="button" accessibilityLabel={'Pass on ' + product.name} accessibilityState={{ disabled: !interactive || busy }} onPressIn={onTouch} onPress={() => onReview?.('passed')} style={styles.circle}>
        <FormIcon name="close" size={20} />
      </CardControl>
      <CardControl staticPress interactive={interactive} haptic={false} disabled={!interactive || busy} accessibilityRole="button" accessibilityLabel={'Save ' + product.name} accessibilityState={{ disabled: !interactive || busy }} onPressIn={onTouch} onPress={() => onReview?.('saved')} style={styles.circle}>
        <FormIcon name="heart" size={20} />
      </CardControl>
      </View>
  </View>;
}
const styles = StyleSheet.create({
  card: { backgroundColor: 'transparent' },
  stage: { flex: 1, overflow: 'hidden' },
  visualTouch: { flex: 1 },
  copy: { paddingTop: 18, paddingHorizontal: 6 },
  brand: { fontFamily: family.sansMedium, fontSize: 10, letterSpacing: 1.8, color: colors.muted },
  titleTouch: { paddingVertical: 2 },
  name: { fontFamily: family.serif, fontSize: 30, lineHeight: 35, letterSpacing: -0.3, color: colors.ink },
  meta: { fontFamily: family.sans, fontSize: 13, lineHeight: 19, color: colors.muted, marginTop: 3 },
  reason: { fontFamily: family.sans, fontSize: 12, lineHeight: 19, color: colors.muted, marginTop: 10 },
  actions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 16, paddingHorizontal: 6 },
  circle: { width: 52, height: 52, borderRadius: 26, borderWidth: 1, borderColor: 'rgba(17,17,15,0.22)', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.card },
});
