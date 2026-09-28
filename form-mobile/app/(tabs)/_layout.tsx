import { Tabs } from 'expo-router';
import { BookmarkIcon, HomeIcon, PersonIcon } from '../../src/components/icons';
import { colors } from '../../src/theme/tokens';
import { family } from '../../src/theme/typography';

/** Home / Saved / Your FORM — the web demo's bottom nav, native. */
export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.ink,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
          backgroundColor: 'rgba(251, 249, 244, 0.96)',
          borderTopColor: colors.line,
        },
        tabBarLabelStyle: {
          fontFamily: family.sansSemiBold,
          fontSize: 11,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: 'Home', tabBarIcon: ({ color }) => <HomeIcon color={color} /> }}
      />
      <Tabs.Screen
        name="saved"
        options={{ title: 'Saved', tabBarIcon: ({ color }) => <BookmarkIcon color={color} /> }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: 'Your FORM', tabBarIcon: ({ color }) => <PersonIcon color={color} /> }}
      />
    </Tabs>
  );
}
