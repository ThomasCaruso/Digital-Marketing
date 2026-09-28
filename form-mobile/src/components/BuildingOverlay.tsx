import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  FadeIn,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { LOADING_MESSAGES } from '../data/looks';
import { colors } from '../theme/tokens';
import { eyebrow, family } from '../theme/typography';

const BAR_WIDTH = 200;
const BAR_DURATION_MS = 1500;
const LINE_ROTATE_MS = 380;

/**
 * Full-screen "Building your looks" state — the web demo's loading overlay,
 * with its rotating status lines and thin progress bar.
 */
export function BuildingOverlay() {
  const [step, setStep] = useState(0);
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(1, {
      duration: BAR_DURATION_MS,
      reduceMotion: ReduceMotion.System,
    });
    const rotate = setInterval(() => {
      setStep(current => Math.min(current + 1, LOADING_MESSAGES.length - 1));
    }, LINE_ROTATE_MS);
    return () => clearInterval(rotate);
  }, [progress]);

  const barStyle = useAnimatedStyle(() => ({
    width: progress.value * BAR_WIDTH,
  }));

  return (
    <Animated.View entering={FadeIn.duration(180)} style={styles.root}>
      <Text style={eyebrow}>Building your looks</Text>
      <Text key={step} style={styles.line}>
        {LOADING_MESSAGES[step]}
      </Text>
      <View style={styles.barTrack}>
        <Animated.View style={[styles.barFill, barStyle]} />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(244, 241, 234, 0.97)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    zIndex: 50,
    elevation: 50,
  },
  line: {
    fontFamily: family.serif,
    fontSize: 30,
    color: colors.ink,
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  barTrack: {
    width: BAR_WIDTH,
    height: 2,
    borderRadius: 2,
    backgroundColor: colors.line,
    overflow: 'hidden',
  },
  barFill: {
    height: 2,
    backgroundColor: colors.ink,
  },
});
