import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { FadeInDown, ReduceMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppButton } from '../../src/components/AppButton';
import { BuildingOverlay } from '../../src/components/BuildingOverlay';
import { LookScene } from '../../src/components/LookScene';
import { OCCASION_CHIPS } from '../../src/data/looks';
import { dayLabel, greeting, truncate } from '../../src/domain/selectors';
import { getLooksProvider } from '../../src/providers';
import { useFormStore } from '../../src/state/store';
import { colors, radius, shadowCard } from '../../src/theme/tokens';
import { eyebrow, family } from '../../src/theme/typography';

const PLACEHOLDER =
  'Dinner in SoHo Saturday. 55°F. I want to look expensive but not overdressed. Under $350.';

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const profile = useFormStore(s => s.profile);
  const sessions = useFormStore(s => s.sessions);
  const addSession = useFormStore(s => s.addSession);
  const setActiveSession = useFormStore(s => s.setActiveSession);

  const [occasion, setOccasion] = useState('');
  const [building, setBuilding] = useState(false);
  const [activeChip, setActiveChip] = useState<number | null>(null);

  const styleMe = useCallback(async () => {
    if (building) return;
    setBuilding(true);
    try {
      const session = await getLooksProvider().buildLooks(occasion, profile);
      addSession(session);
      router.push({ pathname: '/results', params: { sessionId: session.id } });
    } finally {
      setBuilding(false);
    }
  }, [building, occasion, profile, addSession, router]);

  const openSession = (id: string) => {
    setActiveSession(id);
    router.push({ pathname: '/results', params: { sessionId: id } });
  };

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 20 }]}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={eyebrow}>{greeting(profile.name)}</Text>
        <Text style={styles.title}>What are you dressing{'\n'}for?</Text>

        <View style={styles.promptBox}>
          <TextInput
            style={styles.input}
            value={occasion}
            onChangeText={setOccasion}
            placeholder={PLACEHOLDER}
            placeholderTextColor={colors.muted}
            multiline
            underlineColorAndroid="transparent"
          />
          <View style={styles.promptFoot}>
            <Text style={styles.promptHint}>Describe the moment — FORM handles the rest.</Text>
            <AppButton label="Style me" onPress={() => void styleMe()} disabled={building} />
          </View>
        </View>

        <View style={styles.chipRow}>
          {OCCASION_CHIPS.map((chip, i) => {
            const filled = activeChip === i;
            return (
              <Pressable
                key={chip.label}
                onPress={() => {
                  setOccasion(chip.prompt);
                  setActiveChip(i);
                }}
                style={({ pressed }) => [styles.chip, (filled || pressed) && styles.chipFilled]}
              >
                <Text style={[styles.chipText, filled && styles.chipTextFilled]}>
                  {chip.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recently styled</Text>
          {sessions.length === 0 ? (
            <Text style={styles.quietNote}>
              Nothing yet. The looks FORM builds for you will live here.
            </Text>
          ) : (
            <View style={styles.miniGrid}>
              {sessions.map((session, i) => (
                <Animated.View
                  key={session.id}
                  entering={FadeInDown.duration(350)
                    .delay(i * 60)
                    .reduceMotion(ReduceMotion.System)}
                  style={styles.miniCardWrap}
                >
                  <Pressable
                    onPress={() => openSession(session.id)}
                    style={({ pressed }) => [styles.miniCard, pressed && styles.miniPressed]}
                    accessibilityRole="button"
                    accessibilityLabel={`Open looks for ${session.occasion}`}
                  >
                    <View style={styles.miniVisual}>
                      <LookScene look={session.looks[0]} figureScale={4.6} />
                    </View>
                    <View style={styles.miniBody}>
                      <Text style={styles.miniTitle}>“{truncate(session.occasion, 42)}”</Text>
                      <Text style={styles.miniMeta}>
                        {session.looks.length} looks · {dayLabel(session.createdAt)}
                      </Text>
                    </View>
                  </Pressable>
                </Animated.View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {building && <BuildingOverlay />}
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
  title: {
    fontFamily: family.serif,
    fontSize: 40,
    lineHeight: 43,
    color: colors.ink,
    marginTop: 12,
    marginBottom: 24,
  },
  promptBox: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.lg,
    padding: 20,
    paddingBottom: 16,
    ...shadowCard,
  },
  input: {
    fontFamily: family.sans,
    fontSize: 17,
    lineHeight: 25,
    color: colors.ink,
    minHeight: 76,
    textAlignVertical: 'top',
    padding: 0,
  },
  promptFoot: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 14,
    marginTop: 12,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  promptHint: {
    fontFamily: family.sans,
    fontSize: 13,
    color: colors.muted,
    flexShrink: 1,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 20,
  },
  chip: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderWidth: 1,
    borderColor: colors.line2,
    borderRadius: radius.pill,
  },
  chipFilled: {
    backgroundColor: colors.ink,
    borderColor: colors.ink,
  },
  chipText: {
    fontFamily: family.sansMedium,
    fontSize: 14,
    color: colors.ink2,
  },
  chipTextFilled: {
    color: colors.paper,
  },
  section: {
    marginTop: 56,
  },
  sectionTitle: {
    fontFamily: family.serif,
    fontSize: 26,
    color: colors.ink,
    marginBottom: 16,
  },
  quietNote: {
    fontFamily: family.sans,
    fontSize: 14,
    color: colors.muted,
  },
  miniGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 14,
  },
  miniCardWrap: {
    width: '48.5%',
  },
  miniCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  miniPressed: {
    opacity: 0.85,
  },
  miniVisual: {
    height: 120,
  },
  miniBody: {
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  miniTitle: {
    fontFamily: family.serif,
    fontSize: 16,
    color: colors.ink,
  },
  miniMeta: {
    fontFamily: family.sans,
    fontSize: 11.5,
    color: colors.muted,
    marginTop: 3,
  },
});
