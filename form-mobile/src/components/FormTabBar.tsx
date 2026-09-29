import { BottomTabBarHeightCallbackContext, type BottomTabBarProps } from 'expo-router/build/react-navigation/bottom-tabs';
import { useContext } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/tokens';
import { family } from '../theme/typography';

/**
 * FORM's tab bar — text-only, tracked uppercase, hairline top. Quiet chrome:
 * the labels are the interface.
 *
 * This replaces the stock uikit bar, which always reserves a 31×28 icon box
 * per tab and fixes its height at 49 — a label-only bar cannot be laid out
 * correctly through screenOptions alone.
 *
 * Import note: expo-router SDK 57 vendors react-navigation under
 * `expo-router/build/react-navigation/*` and publishes no exports map, so
 * that path is the supported surface for these internals in this SDK.
 */
export function FormTabBar({ state, navigation, descriptors, insets }: BottomTabBarProps) {
  const onHeightChange = useContext(BottomTabBarHeightCallbackContext);

  return (
    <View
      onLayout={e => onHeightChange?.(e.nativeEvent.layout.height)}
      style={[
        styles.bar,
        {
          height: 50 + insets.bottom,
          paddingBottom: insets.bottom,
          paddingHorizontal: Math.max(insets.left, insets.right),
        },
      ]}
    >
      {state.routes.map((route, index) => {
        const focused = index === state.index;
        const options = descriptors[route.key]?.options;
        const label =
          (typeof options?.tabBarLabel === 'string' && options.tabBarLabel) ||
          options?.title ||
          route.name;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });
          if (!focused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        return (
          <Pressable
            key={route.key}
            onPress={onPress}
            onLongPress={() => navigation.emit({ type: 'tabLongPress', target: route.key })}
            style={({ pressed }) => [styles.tab, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityState={{ selected: focused }}
            accessibilityLabel={
              options?.tabBarAccessibilityLabel ?? `${label}, tab ${index + 1} of ${state.routes.length}`
            }
          >
            <Text style={[styles.label, focused ? styles.labelActive : styles.labelIdle]}>
              {label.toUpperCase()}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    backgroundColor: 'rgba(244, 241, 234, 0.97)',
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.55,
  },
  label: {
    fontFamily: family.sansSemiBold,
    fontSize: 10,
    letterSpacing: 1.8,
  },
  labelActive: {
    color: colors.ink,
  },
  labelIdle: {
    color: colors.muted,
  },
});
