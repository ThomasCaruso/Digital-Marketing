import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CardUndoButton } from '../../src/components/CardUndoButton';
import { DiscoveryCard } from '../../src/components/DiscoveryCard';
import { MotionPressable } from '../../src/components/MotionPressable';
import { FormIcon } from '../../src/components/FormIcon';
import { showToast } from '../../src/components/Toast';
import { rankProducts, unseenProducts, fixtureReason } from '../../src/domain/fixtureEngine';
import { useFormStore } from '../../src/state/store';
import { colors } from '../../src/theme/tokens';
import { family } from '../../src/theme/typography';

export default function ForYouScreen() {
  const router = useRouter();
  const state = useFormStore();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const ranked = rankProducts(state.profile);
  const unseen = unseenProducts(ranked, state.recommendationReview, state.savedPieces);
  const piece = unseen[0];
  const reviewed = ranked.length - unseen.length;
  const [availableHeight, setAvailableHeight] = useState(0);
  // The tab navigator supplies the actual remaining scene height. Home never scrolls.
  const cardHeight = Math.max(280, Math.min(720, (availableHeight || height - insets.bottom - 88) - insets.top - 84));
  const compact = cardHeight < 470;
  const undo = () => { if (state.undoPieceReview()) showToast('Last decision undone'); };
  return <View style={styles.root} onLayout={event => setAvailableHeight(event.nativeEvent.layout.height)}>
    <View style={[styles.content, { paddingTop: insets.top + 14 }]}>
      <View style={styles.masthead}><Text style={styles.wordmark}>FORM</Text><Text style={styles.counter}>{String(piece ? reviewed + 1 : reviewed).padStart(2, '0')}<Text style={styles.counterTotal}> / {String(ranked.length).padStart(2, '0')}</Text></Text></View>
      {piece ? <DiscoveryCard key={state.recommendationSession} product={piece} reason={fixtureReason(piece, state.profile)} cardHeight={cardHeight}
        canUndo={!!state.discoveryUndo} onUndo={undo}
        onOpen={() => router.push({ pathname: '/product', params: { id: piece.id } })}
        onReview={status => { if (useFormStore.getState().reviewPiece(piece, status)) showToast(status === 'saved' ? 'Saved to your pieces' : 'Passed'); }} />
        : <View style={[styles.complete, { height: cardHeight }, compact && { paddingVertical: 16 }]}>
          <CardUndoButton disabled={!state.discoveryUndo} onPress={undo} />
          {!compact && <FormIcon name="check" size={22} color={colors.muted} />}
          <Text maxFontSizeMultiplier={1.2} style={[styles.completeTitle, compact && { fontSize: 28, lineHeight: 32 }]}>{ranked.length ? "A good place to pause." : 'Room to explore.'}</Text>
          <Text maxFontSizeMultiplier={1.2} numberOfLines={compact ? 2 : 3} style={styles.completeCopy}>{ranked.length ? 'You have seen today’s selection. Keep building with the pieces you saved.' : 'Try adjusting your preferences to discover more pieces.'}</Text>
          <MotionPressable accessibilityRole="button" onPress={() => router.navigate(ranked.length ? '/saved' : '/profile')} style={styles.completeLink}>
            <Text style={styles.completeLinkText}>{ranked.length ? 'View saved pieces' : 'Your preferences'}</Text><FormIcon name="arrow" size={16} color={colors.ink} />
          </MotionPressable>
          <MotionPressable accessibilityRole="button" onPress={state.refreshSelection} style={styles.refresh}><Text style={styles.quietText}>Refresh selection</Text></MotionPressable>
        </View>}
    </View>
  </View>;
}
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.paper },
  content: { paddingHorizontal: 24, paddingBottom: 8, flex: 1 },
  masthead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingHorizontal: 2, paddingBottom: 26 },
  wordmark: { fontFamily: family.sansMedium, fontSize: 17, letterSpacing: 4.5, color: colors.ink },
  counter: { fontFamily: family.sans, fontSize: 12, color: colors.ink, fontVariant: ['tabular-nums'] },
  counterTotal: { color: colors.muted },
  complete: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16, paddingVertical: 30 },
  completeTitle: { fontFamily: family.serif, fontSize: 34, lineHeight: 39, color: colors.ink, textAlign: 'center', marginTop: 18 },
  completeCopy: { fontFamily: family.sans, fontSize: 13, lineHeight: 21, color: colors.muted, textAlign: 'center', marginTop: 12, maxWidth: 260 },
  completeLink: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 48, marginTop: 18, paddingHorizontal: 12 },
  completeLinkText: { fontFamily: family.sansMedium, fontSize: 13, color: colors.ink },
  refresh: { minHeight: 44, justifyContent: 'center', marginTop: 4 },
  quietText: { fontFamily: family.sans, fontSize: 12, color: colors.muted },
});
