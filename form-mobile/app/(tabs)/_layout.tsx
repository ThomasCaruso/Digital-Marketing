import { Tabs } from 'expo-router';
import { FormTabBar } from '../../src/components/FormTabBar';
export default function TabsLayout() {
  // Render an element: SDK 57 calls the tabBar function outside React rendering.
  return <Tabs tabBar={props => <FormTabBar {...props} />} screenOptions={{ headerShown: false }}>
    <Tabs.Screen name="home" options={{ title: 'For You' }} />
    <Tabs.Screen name="edits" options={{ title: 'Edits' }} />
    <Tabs.Screen name="tryon" options={{ title: 'Try On' }} />
    <Tabs.Screen name="saved" options={{ title: 'Saved' }} />
    <Tabs.Screen name="profile" options={{ title: 'You' }} />
  </Tabs>;
}
