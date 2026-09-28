import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { formatMoney, styleLine } from '../../src/domain/selectors';
import { useFormStore } from '../../src/state/store';
import { colors, radius } from '../../src/theme/tokens';
import { eyebrow, family } from '../../src/theme/typography';

/**
 * Checkpoint stub — read-only view of the persisted profile so the store is
 * verifiable on device. Profile editing, reference photos, and learning
 * signals arrive with onboarding in the next phase.
 */
export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const profile = useFormStore(s => s.profile);

  const facts: [string, string][] = [
    ['Height', profile.height],
    ['Top', profile.topSize],
    ['Waist', profile.waist],
    ['Inseam', profile.inseam],
    ['Shoe', profile.shoe],
    ['Comfort zone', `${formatMoney(profile.budgetCents)} per look`],
    ['Priority', profile.priority],
    ['Brands', profile.brands.join(', ')],
  ];

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + 20 }]}>
        <Text style={eyebrow}>Your FORM</Text>
        <Text style={styles.title}>What FORM knows about you</Text>
        <Text style={styles.note}>
          Demo profile — in this build it is sample data. Editing arrives with onboarding.
        </Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Style DNA</Text>
          <View style={styles.chipStack}>
            {profile.styles.map(s => (
              <View key={s} style={styles.chip}>
                <Text style={styles.chipText}>{s}</Text>
              </View>
            ))}
          </View>
          <Text style={styles.styleLine}>{styleLine(profile.styles)}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Sizing &amp; shopping</Text>
          {facts.map(([k, v]) => (
            <View key={k} style={styles.factRow}>
              <Text style={styles.factKey}>{k}</Text>
              <Text style={styles.factValue}>{v}</Text>
            </View>
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
  title: {
    fontFamily: family.serif,
    fontSize: 34,
    color: colors.ink,
    marginTop: 10,
  },
  note: {
    fontFamily: family.sans,
    fontSize: 13.5,
    color: colors.muted,
    marginTop: 6,
    marginBottom: 24,
  },
  card: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.lg,
    padding: 22,
    marginBottom: 18,
  },
  cardTitle: {
    fontFamily: family.sansSemiBold,
    fontSize: 11,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: colors.muted,
    marginBottom: 14,
  },
  chipStack: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    borderWidth: 1,
    borderColor: colors.line2,
    borderRadius: radius.pill,
    paddingVertical: 7,
    paddingHorizontal: 14,
  },
  chipText: {
    fontFamily: family.sansMedium,
    fontSize: 13,
    color: colors.ink2,
  },
  styleLine: {
    fontFamily: family.serif,
    fontSize: 20,
    color: colors.ink2,
    marginTop: 14,
  },
  factRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    paddingVertical: 10,
  },
  factKey: {
    fontFamily: family.sansSemiBold,
    fontSize: 10.5,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: colors.muted,
    marginTop: 3,
  },
  factValue: {
    fontFamily: family.sansMedium,
    fontSize: 15,
    color: colors.ink,
    flex: 1,
    textAlign: 'right',
  },
});
