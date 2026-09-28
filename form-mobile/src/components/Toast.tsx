import { useEffect, useMemo, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius } from '../theme/tokens';
import { family } from '../theme/typography';

type Listener = (message: string) => void;

let listener: Listener | null = null;
let hideTimer: ReturnType<typeof setTimeout> | undefined;

/** Fire a transient confirmation, e.g. "Saved — added to your board". */
export function showToast(message: string): void {
  listener?.(message);
}

const VISIBLE_MS = 2200;

/** Mounted once in the root layout; renders above everything. */
export function Toast() {
  const insets = useSafeAreaInsets();
  const [message, setMessage] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);
  // Stable Animated.Values (useMemo, not useRef — they're read during render).
  const opacity = useMemo(() => new Animated.Value(0), []);
  const offset = useMemo(() => new Animated.Value(10), []);

  useEffect(() => {
    listener = (msg: string) => {
      setMessage(msg);
      setVisible(true);
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: true }),
        Animated.timing(offset, { toValue: 0, duration: 220, useNativeDriver: true }),
      ]).start();
      if (hideTimer) clearTimeout(hideTimer);
      hideTimer = setTimeout(() => {
        Animated.timing(opacity, { toValue: 0, duration: 260, useNativeDriver: true }).start(() => {
          setVisible(false);
        });
      }, VISIBLE_MS);
    };
    return () => {
      listener = null;
      if (hideTimer) clearTimeout(hideTimer);
    };
  }, [opacity, offset]);

  if (!visible || !message) return null;

  return (
    <View pointerEvents="none" style={[styles.root, { bottom: insets.bottom + 28 }]}>
      <Animated.View
        style={[
          styles.pill,
          { opacity, transform: [{ translateY: offset }] },
        ]}
      >
        <Text style={styles.text}>{message}</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 100,
    elevation: 100,
  },
  pill: {
    backgroundColor: colors.ink,
    borderRadius: radius.pill,
    paddingVertical: 12,
    paddingHorizontal: 20,
    maxWidth: '88%',
  },
  text: {
    fontFamily: family.sansMedium,
    fontSize: 14,
    color: colors.paper,
    textAlign: 'center',
  },
});
