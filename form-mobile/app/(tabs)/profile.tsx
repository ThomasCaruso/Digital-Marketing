import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { formatMoney, styleLine } from '../../src/domain/selectors';
import { useFormStore } from '../../src/state/store';
import { colors } from '../../src/theme/tokens';
import { eyebrow, family, micro } from '../../src/theme/typography';

/**
 * Style identity — what FORM knows about you, read as a profile sheet rather
 * than app settings. Read-only in this checkpoint; editing arrives with
 * onboarding in the next phase.
 */
export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const profile = useFormStore(s => s.profile);
  const sessionCount = useFormStore(s => s.sessions.length);
  const savedCount = useFormStore(s => s.saved.length);
  const passedCount = useFormStore(s => s.passed.length);

  const sizing: [string, string][] = [
    ['Height', profile.height],
    ['Top', profile.topSize],
    ['Waist', profile.waist],
    ['Inseam', profile.inseam],
    ['Shoe', profile.shoe],
    ['Budget / look', formatMoney(profile.budgetCents)],
  ];

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + 24 }]}>
        <Text style={eyebrow}>Your FORM</Text>
        <Text style={styles.title}>Style identity</Text>

        {/* ---- Style DNA: the hero statement ---- */}
        <View style={styles.section}>
          <Text style={micro}>Style DNA</Text>
          <Text style={styles.dnaLine}>{styleLine(profile.styles)}</Text>
          <Text style={styles.dnaNames}>
            {profile.styles.map(s => s.toUpperCase()).join('  ·  ')}
          </Text>
        </View>

        <View style={styles.rule} />

        {/* ---- Sizing: a spec sheet, not a table ---- */}
        <View style={styles.section}>
          <Text style={micro}>Sizing</Text>
          <View style={styles.specGrid}>
            {sizing.map(([k, v]) => (
              <View key={k} style={styles.spec}>
                <Text style={styles.specKey}>{k}</Text>
                <Text style={styles.specValue}>{v}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.rule} />

        {/* ---- Shopping profile ---- */}
        <View style={styles.section}>
          <Text style={micro}>Shopping profile</Text>
          <View style={styles.prefRow}>
            <Text style={styles.prefKey}>Priority</Text>
            <Text style={styles.prefValue}>{profile.priority}</Text>
          </View>
          <View style={styles.prefRow}>
            <Text style={styles.prefKey}>Brands</Text>
            <Text style={styles.prefBrands}>
              {profile.brands.map(b => b.toUpperCase()).join('  ·  ')}
            </Text>
          </View>
        </View>

        <View style={styles.rule} />

        {/* ---- What FORM is learning ---- */}
        <View style={styles.section}>
          <Text style={micro}>Learned preferences</Text>
          {sessionCount + savedCount + passedCount === 0 ? (
            <Text style={styles.learnNote}>
              Nothing learned yet. Every brief you style — and every look you
              keep or pass on — sharpens the next one.
            </Text>
          ) : (
            <>
              <Text style={styles.learnLine}>
                {plural(sessionCount, 'brief')} styled · {plural(savedCount, 'look')} kept
                {passedCount > 0 ? ` · ${plural(passedCount, 'look')} passed` : ''}
              </Text>
              <Text style={styles.learnNote}>
                Keeps and passes shape what FORM reaches for next.
              </Text>
            </>
          )}
        </View>

        <Text style={styles.footnote}>
          Sample data in this build — editing arrives with onboarding.
        </Text>
      </ScrollView>
    </View>
  );
}

function plural(n: number, noun: string): string {
  return `${n} ${noun}${n === 1 ? '' : 's'}`;
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
  title: {
    fontFamily: family.serif,
    fontSize: 36,
    color: colors.ink,
    marginTop: 14,
    marginBottom: 26,
  },
  section: {
    gap: 14,
  },
  rule: {
    height: 1,
    backgroundColor: colors.line,
    marginVertical: 28,
  },

  /* ---- Style DNA ---- */
  dnaLine: {
    fontFamily: family.serifItalic,
    fontSize: 27,
    lineHeight: 33,
    color: colors.ink,
  },
  dnaNames: {
    fontFamily: family.sansSemiBold,
    fontSize: 11.5,
    letterSpacing: 2,
    color: colors.ink2,
  },

  /* ---- spec sheet ---- */
  specGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
  },
  spec: {
    width: '33.33%',
    gap: 7,
    paddingVertical: 8,
    paddingRight: 12,
  },
  specKey: {
    ...micro,
  },
  specValue: {
    fontFamily: family.sansMedium,
    fontSize: 16,
    color: colors.ink,
  },

  /* ---- shopping profile ---- */
  prefRow: {
    gap: 7,
  },
  prefKey: {
    ...micro,
  },
  prefValue: {
    fontFamily: family.sansMedium,
    fontSize: 16,
    color: colors.ink,
  },
  prefBrands: {
    fontFamily: family.sansSemiBold,
    fontSize: 11.5,
    letterSpacing: 2,
    color: colors.ink,
    lineHeight: 19,
  },

  /* ---- learning ---- */
  learnLine: {
    fontFamily: family.serif,
    fontSize: 19,
    color: colors.ink,
  },
  learnNote: {
    fontFamily: family.sans,
    fontSize: 13.5,
    lineHeight: 20,
    color: colors.muted,
  },
  footnote: {
    fontFamily: family.sans,
    fontSize: 12,
    color: colors.muted,
    marginTop: 44,
  },
});
