import { BottomTabBarHeightCallbackContext, type BottomTabBarProps } from 'expo-router/build/react-navigation/bottom-tabs';
import { useContext } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/tokens';
import { family } from '../theme/typography';
import { FormIcon, type FormIconName } from './FormIcon';
import { MotionPressable } from './MotionPressable';
import { tactile } from '../utils/haptics';
const icons: Record<string, FormIconName> = { home: 'home', edits: 'edits', tryon: 'tryon', saved: 'saved', profile: 'user' };
/** The nav almost disappears: bare icons and labels on the page itself, no container. */
export function FormTabBar({ state, navigation, descriptors, insets }: BottomTabBarProps) {
  const onHeightChange = useContext(BottomTabBarHeightCallbackContext);
  return <View onLayout={event => onHeightChange?.(event.nativeEvent.layout.height)} style={[styles.container, { paddingBottom: insets.bottom + 6, paddingHorizontal: Math.max(insets.left, insets.right) + 8 }]}>
    {state.routes.map((route, index) => {
      const focused = index === state.index;
      const options = descriptors[route.key]?.options;
      const label = options?.title ?? route.name;
      return <MotionPressable key={route.key} haptic={false} onPress={() => {
        const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
        if (!focused && !event.defaultPrevented) { tactile('selection'); navigation.navigate(route.name); }
      }} onLongPress={() => navigation.emit({ type: 'tabLongPress', target: route.key })} style={styles.tab} accessibilityRole="tab" accessibilityState={{ selected: focused }} accessibilityLabel={`${label}, tab ${index + 1} of 5`}>
        <FormIcon name={icons[route.name] ?? 'home'} size={21} color={focused ? colors.ink : colors.muted} filled={focused} />
        <Text style={[styles.label, focused && styles.selectedLabel]}>{label}</Text>
      </MotionPressable>;
    })}
  </View>;
}
const styles = StyleSheet.create({
  container: { flexDirection: 'row', backgroundColor: colors.paper, paddingTop: 10 },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 4 },
  label: { fontFamily: family.sans, fontSize: 10, lineHeight: 13, color: colors.muted, textAlign: 'center' },
  selectedLabel: { fontFamily: family.sansMedium, color: colors.ink },
});
