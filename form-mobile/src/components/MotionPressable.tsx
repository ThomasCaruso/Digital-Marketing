import { useEffect, useState, type ReactNode } from 'react';
import { Animated, type StyleProp, type ViewStyle } from 'react-native';
import { Pressable, type PressableProps } from 'react-native-gesture-handler';
import { useReduceMotion } from '../hooks/useReduceMotion';
import { tactile } from '../utils/haptics';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
type Props = Omit<PressableProps, 'style' | 'children'> & {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  haptic?: 'selection' | 'soft' | false;
  dimWhenDisabled?: boolean;
};
/** A small, damped press response shared by primary controls. */
export function MotionPressable({ children, style, haptic = 'soft', dimWhenDisabled = true, onPress, onPressIn, onPressOut, disabled, ...props }: Props) {
  const [scale] = useState(() => new Animated.Value(1));
  const reduced = useReduceMotion();
  useEffect(() => () => scale.stopAnimation(), [scale]);
  const settle = (toValue: number) => {
    scale.stopAnimation();
    if (reduced || disabled) { scale.setValue(1); return; }
    Animated.spring(scale, { toValue, stiffness: 450, damping: 32, mass: 0.6, useNativeDriver: true }).start();
  };
  return <AnimatedPressable {...props} disabled={disabled} style={[style, { opacity: disabled && dimWhenDisabled ? 0.42 : 1, transform: [{ scale: reduced || disabled ? 1 : scale }] }]}
    onPressIn={event => { settle(0.965); onPressIn?.(event); }}
    onPressOut={event => { settle(1); onPressOut?.(event); }}
    onPress={event => { if (haptic) tactile(haptic); onPress?.(event); }}>
    {children}
  </AnimatedPressable>;
}


