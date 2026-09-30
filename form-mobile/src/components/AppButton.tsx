import { StyleSheet, Text, type ViewStyle } from 'react-native';
import { MotionPressable } from './MotionPressable';
import { colors } from '../theme/tokens';
import { family } from '../theme/typography';

interface AppButtonProps {
  label: string;
  onPress: () => void;
  /** dark = solid ink conviction; ghost = quiet type-only action. */
  variant?: 'dark' | 'ghost';
  small?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
}

/**
 * The demo's button pair, tuned down: pill radius, medium-weight label, and a
 * ghost variant that is plain type — no outlined bubble.
 */
export function AppButton({ label, onPress, variant = 'dark', small, disabled, style }: AppButtonProps) {
  return (
    <MotionPressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      accessibilityState={{ disabled: !!disabled }}
      onPress={onPress}
      style={[
        styles.base,
        small && styles.small,
        variant === 'dark' ? styles.dark : styles.ghost,
        disabled && styles.disabled,
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
    </MotionPressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    paddingHorizontal: 26,
    borderRadius: 999,
  },
  small: {
    paddingVertical: 10,
    paddingHorizontal: 18,
  },
  dark: {
    backgroundColor: colors.accent,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  disabled: {
    opacity: 0.5,
  },
  pressed: {
    opacity: 0.72,
  },
  label: {
    fontFamily: family.sansMedium,
    fontSize: 14.5,
    color: colors.ink,
  },
  labelSmall: {
    fontSize: 13.5,
  },
  labelDark: {
    color: colors.onAccent,
  },
  labelGhost: {
    color: colors.ink2,
  },
});
