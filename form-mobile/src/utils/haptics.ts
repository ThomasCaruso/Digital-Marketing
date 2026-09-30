import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
export function tactile(kind: 'selection' | 'soft' | 'saved' = 'selection') {
  try {
    // A short impact also works on Android devices without semantic haptic
    // support (including the A14), where performHapticFeedback is a no-op.
    const task = Platform.OS === 'android'
      ? Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
      : kind === 'selection' ? Haptics.selectionAsync() : Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft);
    void task.catch(() => {});
  } catch { /* Unsupported devices keep the interaction available. */ }
}