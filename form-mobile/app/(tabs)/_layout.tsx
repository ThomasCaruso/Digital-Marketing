import { Tabs } from 'expo-router';
import { FormTabBar } from '../../src/components/FormTabBar';

/** Home / Saved / Your FORM — quiet text-only chrome via FormTabBar. */
export default function TabsLayout() {
  // SDK 57 invokes `tabBar` as a plain function, so it must return an element
  // (like the stock renderTabBarDefault does) — passing the component itself
  // would run its hooks outside a React render and throw "Invalid hook call".
  return (
    <Tabs tabBar={props => <FormTabBar {...props} />} screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="home" options={{ title: 'Home' }} />
      <Tabs.Screen name="saved" options={{ title: 'Saved' }} />
      <Tabs.Screen name="profile" options={{ title: 'Your FORM' }} />
    </Tabs>
  );
}
