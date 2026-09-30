import { useCallback, type PropsWithChildren } from 'react';
import { useFocusEffect } from 'expo-router';
import { ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { setStatusBarStyle } from 'expo-status-bar';
import { colors } from '../theme/tokens';
import { family } from '../theme/typography';
import { MotionPressable } from './MotionPressable';
import { FormIcon, type FormIconName } from './FormIcon';

export function EditorialScreen({ children }: PropsWithChildren) {
  useFocusEffect(useCallback(() => { setStatusBarStyle('dark'); }, []));
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  return <View style={editorial.root}><ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={[editorial.content, { paddingTop: insets.top + 24, minHeight: height - 64 - insets.bottom }]}>{children}</ScrollView></View>;
}
export function CircleAction({ icon, label, onPress, selected = false, small = false }: { icon: FormIconName; label: string; onPress: () => void; selected?: boolean; small?: boolean }) {
  return <MotionPressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ selected }} onPress={onPress} hitSlop={small ? 4 : 0} style={[editorial.circle, small && editorial.smallCircle, selected && { backgroundColor: colors.paper2 }]}><FormIcon name={icon} size={small ? 20 : 28} filled={selected} /></MotionPressable>;
}
export function SectionLabel({ children }: PropsWithChildren) { return <Text style={editorial.label}>{children}</Text>; }
export const editorial = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.paper },
  content: { paddingHorizontal: 26, paddingBottom: 24, flexGrow: 1 },
  heading: { fontFamily: family.serif, fontSize: 40, lineHeight: 46, color: colors.ink, letterSpacing: -0.6 },
  title: { fontFamily: family.serif, fontSize: 31, lineHeight: 36, color: colors.ink },
  label: { fontFamily: family.sans, fontSize: 11, lineHeight: 18, letterSpacing: 1.8, color: colors.muted, textTransform: 'uppercase' },
  body: { fontFamily: family.sans, fontSize: 14, lineHeight: 22, color: colors.ink },
  secondary: { fontFamily: family.sans, fontSize: 12, lineHeight: 20, color: colors.muted },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  circle: { width: 60, height: 60, borderRadius: 30, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.line2, alignItems: 'center', justifyContent: 'center' },
  smallCircle: { width: 48, height: 48, borderRadius: 24 },
  rule: { height: StyleSheet.hairlineWidth, backgroundColor: colors.line, marginVertical: 24 },
});


