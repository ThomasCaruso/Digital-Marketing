import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { FadeInDown, ReduceMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppButton } from '../../src/components/AppButton';
import { BuildingOverlay } from '../../src/components/BuildingOverlay';
import { LookScene } from '../../src/components/LookScene';
import { STARTING_POINTS } from '../../src/data/looks';
import { dayLabel, greeting, truncate } from '../../src/domain/selectors';
import { getLooksProvider } from '../../src/providers';
import { useFormStore } from '../../src/state/store';
import { colors, radius } from '../../src/theme/tokens';
import { eyebrow, family, micro } from '../../src/theme/typography';

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
  const [activeStart, setActiveStart] = useState<number | null>(null);

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

  const [featured, ...earlier] = sessions;

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 24 }]}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={eyebrow}>{greeting(profile.name)}</Text>
        <Text style={styles.title}>What are you dressing{'\n'}for?</Text>

        {/* The brief — an open writing surface, not a form field. */}
        <View style={styles.brief}>
          <Text style={styles.briefLabel}>The brief</Text>
          <TextInput
            style={styles.input}
            value={occasion}
            onChangeText={text => {
              setOccasion(text);
              setActiveStart(null);
            }}
            placeholder={PLACEHOLDER}
            placeholderTextColor={colors.muted}
            multiline
            underlineColorAndroid="transparent"
          />
          <View style={styles.briefFoot}>
            <Text style={styles.briefHint}>Describe the moment — FORM handles the rest.</Text>
            <AppButton label="Style me" small onPress={() => void styleMe()} disabled={building} />
          </View>
        </View>

        {/* Four hand-picked starting points — type, not chips. */}
        <View style={styles.starts}>
          <Text style={styles.startsLabel}>Or begin with</Text>
          <View style={styles.startsGrid}>
            {STARTING_POINTS.map((point, i) => {
              const active = activeStart === i;
              return (
                <Pressable
                  key={point.label}
                  onPress={() => {
                    setOccasion(point.prompt);
                    setActiveStart(i);
                  }}
                  style={({ pressed }) => [styles.startCell, (active || pressed) && styles.startCellActive]}
                  accessibilityRole="button"
                  accessibilityLabel={`Fill brief: ${point.label}`}
                >
                  <Text style={[styles.startText, active && styles.startTextActive]}>
                    {point.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <Text style={styles.sectionTitle}>Recently styled</Text>
            <View style={styles.sectionRule} />
            <Text style={styles.sectionCount}>{sessions.length}</Text>
          </View>

          {sessions.length === 0 ? (
            <Text style={styles.quietNote}>
              Nothing yet. The briefs FORM builds for you will collect here.
            </Text>
          ) : (
            <>
              {/* Latest session, featured — a single composed visual, not a thumbnail grid. */}
              <Animated.View entering={FadeInDown.duration(350).reduceMotion(ReduceMotion.System)}>
                <Pressable
                  onPress={() => openSession(featured.id)}
                  style={({ pressed }) => [styles.feature, pressed && styles.pressed]}
                  accessibilityRole="button"
                  accessibilityLabel={`Open looks for ${featured.occasion}`}
                >
                  <View style={styles.featureVisual}>
                    <LookScene look={featured.looks[0]} figureScale={6.6} />
                  </View>
                  <View style={styles.featureBody}>
                    <View style={styles.featureText}>
                      <Text style={styles.featureTitle}>“{truncate(featured.occasion, 46)}”</Text>
                      <Text style={styles.featureMeta}>
                        {featured.looks.length} looks · {dayLabel(featured.createdAt)}
                      </Text>
                    </View>
                    <Text style={micro}>Open</Text>
                  </View>
                </Pressable>
              </Animated.View>

              {earlier.length > 0 && (
                <View style={styles.earlier}>
                  {earlier.map(session => (
                    <Pressable
                      key={session.id}
                      onPress={() => openSession(session.id)}
                      style={({ pressed }) => [styles.earlierRow, pressed && styles.pressed]}
                      accessibilityRole="button"
                      accessibilityLabel={`Open looks for ${session.occasion}`}
                    >
                      <Text style={styles.earlierTitle}>
                        “{truncate(session.occasion, 38)}”
                      </Text>
                      <Text style={styles.earlierMeta}>
                        {session.looks.length} looks · {dayLabel(session.createdAt)}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              )}
            </>
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
    paddingHorizontal: 24,
    paddingBottom: 56,
  },
  pressed: {
    opacity: 0.75,
  },
  title: {
    fontFamily: family.serif,
    fontSize: 42,
    lineHeight: 45,
    color: colors.ink,
    marginTop: 14,
    marginBottom: 34,
  },

  /* ---- the brief ---- */
  brief: {
    borderTopWidth: 1,
    borderTopColor: colors.line2,
    paddingTop: 18,
  },
  briefLabel: {
    ...micro,
    marginBottom: 12,
  },
  input: {
    fontFamily: family.sans,
    fontSize: 18.5,
    lineHeight: 28,
    color: colors.ink,
    minHeight: 116,
    textAlignVertical: 'top',
    padding: 0,
  },
  briefFoot: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 14,
    marginTop: 10,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  briefHint: {
    fontFamily: family.sans,
    fontSize: 12.5,
    lineHeight: 18,
    color: colors.muted,
    flexShrink: 1,
  },

  /* ---- starting points ---- */
  starts: {
    marginTop: 30,
  },
  startsLabel: {
    ...micro,
    marginBottom: 4,
  },
  startsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  startCell: {
    width: '50%',
    paddingVertical: 14,
    paddingRight: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'transparent',
  },
  startCellActive: {
    borderBottomColor: colors.line2,
  },
  startText: {
    fontFamily: family.serif,
    fontSize: 18.5,
    color: colors.muted,
  },
  startTextActive: {
    color: colors.ink,
    fontStyle: 'italic',
  },

  /* ---- recently styled ---- */
  section: {
    marginTop: 52,
  },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 18,
  },
  sectionTitle: {
    fontFamily: family.serif,
    fontSize: 25,
    color: colors.ink,
  },
  sectionRule: {
    flex: 1,
    height: 1,
    backgroundColor: colors.line,
  },
  sectionCount: {
    fontFamily: family.sansSemiBold,
    fontSize: 12,
    color: colors.muted,
  },
  quietNote: {
    fontFamily: family.sans,
    fontSize: 13.5,
    lineHeight: 20,
    color: colors.muted,
  },
  feature: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  featureVisual: {
    height: 210,
  },
  featureBody: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 14,
    padding: 18,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  featureText: {
    flexShrink: 1,
    gap: 4,
  },
  featureTitle: {
    fontFamily: family.serif,
    fontSize: 19,
    lineHeight: 24,
    color: colors.ink,
  },
  featureMeta: {
    fontFamily: family.sans,
    fontSize: 12,
    color: colors.muted,
  },
  earlier: {
    marginTop: 6,
  },
  earlierRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 16,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  earlierTitle: {
    fontFamily: family.serif,
    fontSize: 17,
    color: colors.ink2,
    flexShrink: 1,
  },
  earlierMeta: {
    fontFamily: family.sans,
    fontSize: 12,
    color: colors.muted,
  },
});
