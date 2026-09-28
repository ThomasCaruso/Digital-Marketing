import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, ReduceMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppButton } from '../src/components/AppButton';
import { colors, radius } from '../src/theme/tokens';
import { eyebrow, family } from '../src/theme/typography';

/** Quiet editorial entry — the demo cover, native. */
export default function CoverScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.root, { paddingTop: insets.top + 22, paddingBottom: insets.bottom + 26 }]}>
      <StatusBar style="dark" />
      <View style={styles.topRow}>
        <Text style={styles.wordmark}>FORM</Text>
        <View style={styles.pill}>
          <Text style={styles.pillText}>Demo preview</Text>
        </View>
      </View>

      <Animated.View
        entering={FadeInDown.duration(500)
          .reduceMotion(ReduceMotion.System)}
        style={styles.body}
      >
        <Text style={eyebrow}>Personal styling, quietly done</Text>
        <Text style={styles.title}>
          A stylist that{'\n'}
          <Text style={styles.titleEm}>actually knows you.</Text>
        </Text>
        <Text style={styles.copy}>
          FORM learns your proportions, your taste, and your budget — then builds
          complete looks for real occasions, from pieces you can actually buy.
        </Text>
      </Animated.View>

      <View style={styles.actions}>
        <AppButton label="Open FORM" onPress={() => router.replace('/home')} />
        <Text style={styles.footNote}>Demo experience — no accounts, nothing is purchased.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.paper,
    paddingHorizontal: 26,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  wordmark: {
    fontFamily: family.sansBold,
    fontSize: 15,
    letterSpacing: 5,
    color: colors.ink,
  },
  pill: {
    borderWidth: 1,
    borderColor: colors.line2,
    borderRadius: radius.pill,
    paddingVertical: 5,
    paddingHorizontal: 11,
  },
  pillText: {
    fontFamily: family.sansSemiBold,
    fontSize: 10.5,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: colors.muted,
  },
  body: {
    flex: 1,
    justifyContent: 'center',
    maxWidth: 560,
  },
  title: {
    fontFamily: family.serif,
    fontSize: 44,
    lineHeight: 46,
    color: colors.ink,
    marginTop: 18,
    marginBottom: 20,
  },
  titleEm: {
    fontFamily: family.serifItalic,
    fontStyle: 'italic',
  },
  copy: {
    fontFamily: family.sans,
    fontSize: 16,
    lineHeight: 25,
    color: colors.ink2,
  },
  actions: {
    gap: 16,
  },
  footNote: {
    fontFamily: family.sans,
    fontSize: 12.5,
    color: colors.muted,
  },
});
