import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { dayLabel, formatMoney, lookTotalCents } from '../../src/domain/selectors';
import { useFormStore } from '../../src/state/store';
import { colors, radius } from '../../src/theme/tokens';
import { eyebrow, family, micro } from '../../src/theme/typography';

/**
 * The wardrobe board — saved looks as a personal collection. Entries are
 * immutable snapshots (see SavedLook); the full board interactions (open /
 * try-on / polish) arrive with the next phase.
 */
export default function SavedScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const saved = useFormStore(s => s.saved);
  const removeSaved = useFormStore(s => s.removeSaved);

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + 24 }]}>
        <Text style={eyebrow}>Your wardrobe board</Text>
        <View style={styles.headRow}>
          <Text style={styles.title}>Saved looks</Text>
          {saved.length > 0 && (
            <Text style={styles.count}>
              {saved.length} kept
            </Text>
          )}
        </View>

        {saved.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>Nothing kept, yet.</Text>
            <Text style={styles.emptyNote}>
              When a look lands, keep it here — exactly the version you saved,
              colors and swaps included.
            </Text>
            <Pressable
              onPress={() => router.push('/home')}
              style={({ pressed }) => [styles.emptyAction, pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityLabel="Style something new"
            >
              <Text style={styles.emptyActionText}>Style the first look</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.list}>
            {saved.map(entry => (
              <View key={entry.id} style={styles.row}>
                {/* abstract color study of the look — not a mannequin thumb */}
                <View style={styles.study}>
                  {entry.look.products.map(p => (
                    <View key={p.id} style={[styles.studyBlock, { backgroundColor: p.hex }]} />
                  ))}
                </View>
                <View style={styles.rowBody}>
                  <Text style={styles.rowTitle}>{entry.look.title}</Text>
                  <Text style={styles.rowMeta}>
                    {formatMoney(lookTotalCents(entry.look))} · Kept {dayLabel(entry.savedAt)}
                  </Text>
                </View>
                <Pressable
                  onPress={() => removeSaved(entry.id)}
                  hitSlop={8}
                  style={({ pressed }) => [styles.remove, pressed && styles.pressed]}
                  accessibilityRole="button"
                  accessibilityLabel={`Remove ${entry.look.title} from saved`}
                >
                  <Text style={styles.removeText}>Remove</Text>
                </Pressable>
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
    paddingHorizontal: 24,
    paddingBottom: 56,
  },
  pressed: {
    opacity: 0.6,
  },
  headRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 12,
  },
  title: {
    fontFamily: family.serif,
    fontSize: 36,
    color: colors.ink,
    marginTop: 14,
    marginBottom: 30,
  },
  count: {
    fontFamily: family.sansMedium,
    fontSize: 12,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: colors.muted,
  },

  /* ---- empty: whitespace and type, no dashed box ---- */
  empty: {
    alignItems: 'center',
    paddingVertical: 64,
    gap: 14,
  },
  emptyTitle: {
    fontFamily: family.serifItalic,
    fontSize: 32,
    color: colors.ink,
  },
  emptyNote: {
    fontFamily: family.sans,
    fontSize: 14,
    lineHeight: 22,
    color: colors.muted,
    textAlign: 'center',
    maxWidth: 280,
    marginBottom: 18,
  },
  emptyAction: {
    borderBottomWidth: 1,
    borderBottomColor: colors.line2,
    paddingBottom: 3,
  },
  emptyActionText: {
    ...micro,
    color: colors.ink,
  },

  /* ---- the board ---- */
  list: {
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  study: {
    flexDirection: 'row',
    gap: 4,
  },
  studyBlock: {
    width: 22,
    height: 46,
    borderRadius: radius.sm / 2,
  },
  rowBody: {
    flex: 1,
    gap: 5,
  },
  rowTitle: {
    fontFamily: family.serif,
    fontSize: 21,
    color: colors.ink,
  },
  rowMeta: {
    fontFamily: family.sans,
    fontSize: 12.5,
    color: colors.muted,
  },
  remove: {
    alignSelf: 'stretch',
    justifyContent: 'center',
  },
  removeText: {
    fontFamily: family.sansMedium,
    fontSize: 12,
    color: colors.muted,
    textDecorationLine: 'underline',
  },
});
