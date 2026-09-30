import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';

/** Translucent lens finish for Android: layered tint, sheen and beveled edges. */
export function GlassMaterial({ radius = 28, dark = false }: { radius?: number; dark?: boolean }) {
  return <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
    style={[StyleSheet.absoluteFill, styles.surface, { borderRadius: radius, backgroundColor: dark ? 'rgba(38,42,35,0.94)' : 'rgba(249,249,244,0.48)' }]}>
    <LinearGradient colors={dark ? ['rgba(132,144,118,0.40)', 'rgba(63,69,56,0.15)', 'rgba(10,16,12,0.18)'] : ['rgba(255,255,255,0.82)', 'rgba(255,255,255,0.18)', 'rgba(205,213,196,0.20)']}
      locations={[0, 0.46, 1]} start={{ x: 0.15, y: 0 }} end={{ x: 0.85, y: 1 }} style={StyleSheet.absoluteFill} />
    <View style={[StyleSheet.absoluteFill, styles.edge, { borderRadius: radius, borderTopColor: dark ? 'rgba(231,239,221,0.42)' : 'rgba(255,255,255,0.96)', borderLeftColor: dark ? 'rgba(231,239,221,0.20)' : 'rgba(255,255,255,0.75)' }]} />
    <View style={[styles.innerEdge, { borderRadius: Math.max(0, radius - 2), borderColor: dark ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.36)' }]} />
  </View>;
}
const styles = StyleSheet.create({
  surface: { overflow: 'hidden' },
  edge: { borderWidth: 1, borderRightColor: 'rgba(255,255,255,0.32)', borderBottomColor: 'rgba(89,103,79,0.17)' },
  innerEdge: { position: 'absolute', top: 2, bottom: 2, left: 2, right: 2, borderWidth: StyleSheet.hairlineWidth },
});
