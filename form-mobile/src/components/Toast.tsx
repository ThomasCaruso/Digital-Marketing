import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useReduceMotion } from '../hooks/useReduceMotion';
import { colors, radius } from '../theme/tokens';
import { family } from '../theme/typography';
import { FormIcon } from './FormIcon';
type Listener = (message: string) => void;
let listener: Listener | null = null;
export function showToast(message: string): void { listener?.(message); }
export function Toast() {
  const insets = useSafeAreaInsets();
  const reduced = useReduceMotion();
  const motionPreference = useRef(reduced);
  useEffect(() => { motionPreference.current = reduced; }, [reduced]);
  const [opacity] = useState(() => new Animated.Value(0));
  const [message, setMessage] = useState<string | null>(null);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    listener = msg => {
      if (timer) clearTimeout(timer);
      opacity.stopAnimation();
      setMessage(msg);
      AccessibilityInfo.announceForAccessibility(msg);
      opacity.setValue(motionPreference.current ? 1 : 0);
      if (!motionPreference.current) Animated.timing(opacity, { toValue: 1, duration: 160, useNativeDriver: true }).start();
      timer = setTimeout(() => {
        if (motionPreference.current) { setMessage(null); return; }
        Animated.timing(opacity, { toValue: 0, duration: 140, useNativeDriver: true }).start(({ finished }) => { if (finished) setMessage(null); });
      }, 2200);
    };
    return () => { listener = null; if (timer) clearTimeout(timer); opacity.stopAnimation(); };
  }, [opacity]);
  if (!message) return null;
  return <View pointerEvents="none" style={[styles.root, { bottom: insets.bottom + 76 }]}><Animated.View style={[styles.pill, { opacity: reduced ? 1 : opacity, transform: [{ translateY: reduced ? 0 : opacity.interpolate({ inputRange: [0, 1], outputRange: [5, 0] }) }] }]}><FormIcon name="check" size={15} color={colors.paper} /><Text style={styles.text}>{message}</Text></Animated.View></View>;
}
const styles = StyleSheet.create({
  root: { position: 'absolute', left: 0, right: 0, alignItems: 'center', zIndex: 100, elevation: 100 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 9, backgroundColor: colors.ink, borderRadius: radius.pill, paddingVertical: 12, paddingHorizontal: 18, maxWidth: '88%' },
  text: { fontFamily: family.sansMedium, fontSize: 12, lineHeight: 18, color: colors.paper, textAlign: 'center', flexShrink: 1 },
});
