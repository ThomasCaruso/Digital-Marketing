import { Pressable, StyleSheet, Text, type ViewStyle } from 'react-native';
import { colors } from '../theme/tokens';
import { family } from '../theme/typography';

interface AppButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'dark' | 'ghost';
  small?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
}

/** The web demo's .btn / .btn-dark / .btn-ghost, native-shaped. */
export function AppButton({ label, onPress, variant = 'dark', small, disabled, style }: AppButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        small && styles.small,
        variant === 'dark' ? styles.dark : styles.ghost,
        disabled && styles.disabled,
        pressed && styles.pressed,
        style,
      ]}
    >
      <Text
        style={[
          styles.label,
          small && styles.labelSmall,
          variant === 'dark' ? styles.labelDark : styles.labelGhost,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  small: {
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  dark: {
    backgroundColor: colors.accent,
  },
  ghost: {
    borderWidth: 1,
    borderColor: colors.line2,
    backgroundColor: 'transparent',
  },
  disabled: {
    opacity: 0.55,
  },
  pressed: {
    opacity: 0.85,
  },
  label: {
    fontFamily: family.sansSemiBold,
    fontSize: 15,
    color: colors.ink,
  },
  labelSmall: {
    fontSize: 13,
  },
  labelDark: {
    color: colors.onAccent,
  },
  labelGhost: {
    color: colors.ink,
  },
});
