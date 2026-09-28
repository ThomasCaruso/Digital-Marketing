import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LookCard } from '../src/components/LookCard';
import { showToast } from '../src/components/Toast';
import { useFormStore } from '../src/state/store';
import { colors } from '../src/theme/tokens';
import { eyebrow, family } from '../src/theme/typography';

/** Three directions for the occasion, pushed from Home. */
export default function ResultsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const { sessionId } = useLocalSearchParams<{ sessionId?: string }>();

  const hasHydrated = useFormStore(s => s.hasHydrated);
  const session = useFormStore(s => s.sessions.find(x => x.id === sessionId) ?? null);
  const saved = useFormStore(s => s.saved);
  const toggleSaved = useFormStore(s => s.toggleSaved);

  if (!hasHydrated) return null;
  if (!session) return <Redirect href="/home" />;

  const handleToggleSave = (lookId: string, occasion: string) => {
    const look = session.looks.find(l => l.id === lookId);
    if (!look) return;
    const nowSaved = toggleSaved(look, occasion);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    showToast(nowSaved ? 'Saved — added to your board' : 'Removed from Saved');
  };

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + 16 }]}>
        <Pressable onPress={() => router.back()} hitSlop={10} accessibilityRole="button">
          <Text style={styles.backLink}>← New request</Text>
        </Pressable>
        <Text style={[eyebrow, styles.eyebrowGap]}>Styled for</Text>
        <Text style={styles.title}>“{session.occasion}”</Text>
        <Text style={styles.sub}>Three directions, filtered for your fit, taste, and budget.</Text>

        <View style={styles.grid}>
          {session.looks.map((look, i) => (
            <LookCard
              key={look.id}
              look={look}
              index={i}
              saved={saved.some(entry => entry.id === look.id)}
              onOpen={() => showToast('Look detail arrives at the next checkpoint')}
              onTryOn={() => showToast('Try-on arrives at the next checkpoint')}
              onToggleSave={() => handleToggleSave(look.id, session.occasion)}
            />
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.paper,
  },
  content: {
    paddingHorizontal: 22,
    paddingBottom: 48,
  },
  backLink: {
    fontFamily: family.sansMedium,
    fontSize: 14,
    color: colors.ink2,
    alignSelf: 'flex-start',
    borderBottomWidth: 1,
    borderBottomColor: colors.line2,
    paddingBottom: 1,
    marginBottom: 14,
  },
  eyebrowGap: {
    marginTop: 8,
  },
  title: {
    fontFamily: family.serif,
    fontSize: 34,
    lineHeight: 38,
    color: colors.ink,
    marginTop: 10,
  },
  sub: {
    fontFamily: family.sans,
    fontSize: 14.5,
    color: colors.muted,
    marginTop: 6,
    marginBottom: 26,
  },
  grid: {
    gap: 22,
  },
});
