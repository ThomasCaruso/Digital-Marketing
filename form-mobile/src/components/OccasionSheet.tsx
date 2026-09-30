import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { STARTING_POINTS } from '../data/looks';
import { colors } from '../theme/tokens';
import { family, type } from '../theme/typography';

interface OccasionSheetProps {
  visible: boolean;
  busy: boolean;
  onClose: () => void;
  onSubmit: (brief: string) => void;
}

/** The optional occasion request lives behind discovery, rather than on Home. */
export function OccasionSheet({ visible, busy, onClose, onSubmit }: OccasionSheetProps) {
  const insets = useSafeAreaInsets();
  const [brief, setBrief] = useState('');
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityRole="button" accessibilityLabel="Close occasion request" />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 20 }]}>
          <View style={styles.heading}>
            <Text style={styles.title}>Something coming up?</Text>
            <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Close" style={styles.close}>
              <Text style={styles.closeText}>×</Text>
            </Pressable>
          </View>
          <Text style={styles.subtitle}>Tell FORM the moment. Get an edit for it.</Text>
          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <TextInput
              value={brief}
              onChangeText={setBrief}
              placeholder={'Dinner Saturday.\nSomething understated, under $300.'}
              placeholderTextColor={colors.muted}
              style={styles.input}
              accessibilityLabel="Describe your occasion"
              multiline
              underlineColorAndroid="transparent"
              editable={!busy}
              selectionColor={colors.ink2}
            />
            <View style={styles.starts}>
              {STARTING_POINTS.map((point, index) => (
                <Pressable key={point.label} onPress={() => setBrief(point.prompt)} disabled={busy} accessibilityRole="button" style={styles.start}>
                  <Text style={styles.startText}>{index === 1 ? 'NIGHT OUT' : point.label.toUpperCase()}</Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>
          <Pressable
            onPress={() => onSubmit(brief.trim() || 'An understated dinner look, under $300.')}
            disabled={busy}
            accessibilityRole="button"
            accessibilityState={{ disabled: busy, busy }}
            style={({ pressed }) => [styles.submit, (pressed || busy) && styles.pressed]}
          >
            <Text style={styles.submitText}>{busy ? 'Creating your edit…' : 'Create my edit'}</Text>
            <Text style={styles.submitText}>→</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: colors.scrim },
  sheet: { backgroundColor: colors.paper, padding: 24, maxHeight: '85%' },
  heading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  title: { fontFamily: family.serif, fontSize: 29, lineHeight: 34, color: colors.ink, flex: 1 },
  close: { minWidth: 44, minHeight: 44, alignItems: 'flex-end', justifyContent: 'center' },
  closeText: { ...type.body, fontSize: 27 },
  subtitle: { ...type.caption, marginTop: 4 },
  input: { fontFamily: family.sans, fontSize: 17, lineHeight: 26, color: colors.ink, minHeight: 130, marginTop: 28, padding: 0, textAlignVertical: 'top' },
  starts: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  start: { minHeight: 44, justifyContent: 'center' },
  startText: { fontFamily: family.sansMedium, fontSize: 10, letterSpacing: 0.7, color: colors.muted },
  submit: { minHeight: 52, paddingHorizontal: 18, backgroundColor: colors.ink, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 16 },
  submitText: { fontFamily: family.sansMedium, fontSize: 15, color: colors.paper },
  pressed: { opacity: 0.6 },
});