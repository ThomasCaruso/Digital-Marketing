import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { MotionPressable } from './MotionPressable';
import { editorial } from './Editorial';
import { FormIcon } from './FormIcon';
import { colors } from '../theme/tokens';
export function DetailHeader({ title }: { title: string }) {
  const router = useRouter();
  return <View style={styles.header}><MotionPressable accessibilityRole="button" accessibilityLabel="Back" onPress={() => router.canGoBack() ? router.back() : router.replace('/edits')} style={styles.back}><FormIcon name="back" /></MotionPressable><Text style={editorial.label}>{title}</Text><View style={styles.back} /></View>;
}
const styles = StyleSheet.create({ header: { ...editorial.row, paddingBottom: 14 }, back: { width: 48, height: 48, justifyContent: 'center' } });
export function TextAction({ label, onPress, dark = false, disabled = false }: { label: string; onPress: () => void; dark?: boolean; disabled?: boolean }) {
  return <MotionPressable accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled} onPress={onPress} style={{ minHeight: 48, paddingHorizontal: 18, borderRadius: 26, justifyContent: 'center', alignItems: 'center', backgroundColor: dark ? colors.ink : 'transparent' }}><Text style={[editorial.body, dark && { color: colors.paper }]}>{label}</Text></MotionPressable>;
}
