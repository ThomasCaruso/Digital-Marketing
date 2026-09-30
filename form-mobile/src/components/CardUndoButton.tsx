import { StyleSheet } from 'react-native';
import { colors } from '../theme/tokens';
import { FormIcon } from './FormIcon';
import { MotionPressable } from './MotionPressable';

export function CardUndoButton({ disabled, onPress, onPressIn }: { disabled: boolean; onPress: () => void; onPressIn?: () => void }) {
  return <MotionPressable accessibilityRole="button" accessibilityLabel="Undo last decision"
    accessibilityState={{ disabled }} disabled={disabled} onPress={onPress} onPressIn={onPressIn}
    style={[styles.button, disabled && styles.disabled]}>
    <FormIcon name="rewind" size={17} color={colors.ink2} />
  </MotionPressable>;
}
const styles = StyleSheet.create({
  button: { position: 'absolute', top: 10, right: 10, width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(252,251,248,0.88)', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(17,17,15,0.14)' },
  disabled: { opacity: 0.3 },
});
