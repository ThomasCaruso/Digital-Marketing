import {
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_600SemiBold,
  DMSans_700Bold,
} from '@expo-google-fonts/dm-sans';
import {
  InstrumentSerif_400Regular,
  InstrumentSerif_400Regular_Italic,
} from '@expo-google-fonts/instrument-serif';
import { SplashScreen, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Toast } from '../src/components/Toast';
import { colors } from '../src/theme/tokens';
import { View, Text } from 'react-native';
import { useFormStore } from '../src/state/store';
import { useReduceMotion } from '../src/hooks/useReduceMotion';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const hydrated = useFormStore(s => s.hasHydrated);
  const storageError = useFormStore(s => s.storageError);
  const reduceMotion = useReduceMotion();
  const [fontsLoaded, fontError] = useFonts({
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_600SemiBold,
    DMSans_700Bold,
    InstrumentSerif_400Regular,
    InstrumentSerif_400Regular_Italic,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded, fontError]);

  if (fontError) {
    // Proceed with system fallbacks rather than blocking the app on fonts.
    console.warn('FORM: custom fonts failed to load', fontError);
  }
  if (!fontsLoaded && !fontError) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="dark" />
      {storageError && <View style={{ padding: 24, backgroundColor: colors.paper }}><Text accessibilityRole="alert" style={{ color: colors.ink }}>Local storage is unavailable. Changes may not survive a restart.</Text></View>}
      {!hydrated ? <View style={{ flex: 1, backgroundColor: colors.paper, justifyContent: 'center', alignItems: 'center' }}><Text style={{ color: colors.ink }}>Opening your wardrobe…</Text></View> : <Stack screenOptions={{ headerShown: false, animation: reduceMotion ? 'none' : 'default', contentStyle: { backgroundColor: colors.paper } }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="results" />
      </Stack>}
      <Toast />
    </GestureHandlerRootView>
  );
}

