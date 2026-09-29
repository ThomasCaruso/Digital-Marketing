import type { TextStyle } from 'react-native';

/**
 * Font family names as loaded in app/_layout.tsx via @expo-google-fonts packages.
 * The constants' runtime values ARE these font names (useFonts registers them under
 * the export name), so they must stay in sync with the useFonts call.
 */
export const family = {
  serif: 'InstrumentSerif_400Regular',
  serifItalic: 'InstrumentSerif_400Regular_Italic',
  sans: 'DMSans_400Regular',
  sansMedium: 'DMSans_500Medium',
  sansSemiBold: 'DMSans_600SemiBold',
  sansBold: 'DMSans_700Bold',
} as const;

/** Small uppercase tracked label — the web demo's `.eyebrow`. */
export const eyebrow: TextStyle = {
  fontFamily: family.sansSemiBold,
  fontSize: 11,
  letterSpacing: 2.4,
  textTransform: 'uppercase',
  color: '#7b766a',
};

/** Micro label — spec-sheet keys and quiet actions. Smaller and tighter than eyebrow. */
export const micro: TextStyle = {
  fontFamily: family.sansSemiBold,
  fontSize: 10,
  letterSpacing: 1.8,
  textTransform: 'uppercase',
  color: '#7b766a',
};
