import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppButton } from '../../src/components/AppButton';
import { LookScene } from '../../src/components/LookScene';
import { dayLabel, formatMoney, lookTotalCents } from '../../src/domain/selectors';
import { useFormStore } from '../../src/state/store';
import { colors, radius } from '../../src/theme/tokens';
import { eyebrow, family } from '../../src/theme/typography';

/**
 * Checkpoint stub — proves the SavedLook snapshot + persistence layer works
 * across restarts. The full saved board (open / try-on / polish) is the next
 * phase, after the physical-device checkpoint.
 */
export default function SavedScreen() {
  const insets = useSafeAreaInsets();
  const saved = useFormStore(s => s.saved);
  const removeSaved = useFormStore(s => s.removeSaved);

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 20 }]}
      >
        <Text style={eyebrow}>Your wardrobe board</Text>
        <Text style={styles.title}>Saved looks</Text>

        {saved.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>Nothing saved yet</Text>
            <Text style={styles.emptyNote}>
              When a look lands, keep it here — exactly the version you saved, swaps
              and colors included.
            </Text>
            <AppButton label="Style something" variant="ghost" onPress={() => {}} />
          </View>
        ) : (
          <View style={styles.list}>
            {saved.map(entry => (
              <View key={entry.id} style={styles.row}>
                <View style={styles.thumb}>
                  <LookScene look={entry.look} figureScale={2.6} />
                </View>
                <View style={styles.rowBody}>
                  <Text style={styles.rowTitle}>{entry.look.title}</Text>
                  <Text style={styles.rowMeta}>
                    {formatMoney(lookTotalCents(entry.look))} total · Saved{' '}
                    {dayLabel(entry.savedAt)}
                  </Text>
                  <Pressable
                    onPress={() => removeSaved(entry.id)}
                    hitSlop={8}
                    accessibilityRole="button"
                  >
                    <Text style={styles.removeLink}>Remove</Text>
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
        )}
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
    marginBottom: 26,
  },
  empty: {
    borderWidth: 1,
    borderColor: colors.line2,
    borderStyle: 'dashed',
    borderRadius: radius.lg,
    padding: 40,
    alignItems: 'center',
    gap: 10,
  },
  emptyTitle: {
    fontFamily: family.serif,
    fontSize: 26,
    color: colors.ink,
  },
  emptyNote: {
    fontFamily: family.sans,
    fontSize: 14,
    lineHeight: 21,
    color: colors.muted,
    textAlign: 'center',
    marginBottom: 12,
  },
  list: {
    gap: 14,
  },
  row: {
    flexDirection: 'row',
    gap: 14,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    padding: 12,
  },
  thumb: {
    width: 64,
    height: 82,
    borderRadius: radius.sm,
    overflow: 'hidden',
  },
  rowBody: {
    flex: 1,
    justifyContent: 'center',
    gap: 4,
  },
  rowTitle: {
    fontFamily: family.serif,
    fontSize: 20,
    color: colors.ink,
  },
  rowMeta: {
    fontFamily: family.sans,
    fontSize: 12.5,
    color: colors.muted,
  },
  removeLink: {
    fontFamily: family.sansMedium,
    fontSize: 13,
    color: colors.ink2,
    textDecorationLine: 'underline',
    marginTop: 2,
  },
});
