import type { TextStyle } from 'react-native';
import { colors } from './tokens';

export const family = {
  serif: 'InstrumentSerif_400Regular',
  serifItalic: 'InstrumentSerif_400Regular_Italic',
  sans: 'DMSans_400Regular',
  sansMedium: 'DMSans_500Medium',
  sansSemiBold: 'DMSans_600SemiBold',
  sansBold: 'DMSans_700Bold',
} as const;

export const type = {
  display: { fontFamily: family.serif, fontSize: 64, lineHeight: 64, color: colors.ink },
  title: { fontFamily: family.serif, fontSize: 48, lineHeight: 50, color: colors.ink },
  editorial: { fontFamily: family.serif, fontSize: 30, lineHeight: 34, color: colors.ink },
  body: { fontFamily: family.sans, fontSize: 14, lineHeight: 22, color: colors.ink2 },
  caption: { fontFamily: family.sans, fontSize: 12, lineHeight: 18, color: colors.muted },
} satisfies Record<string, TextStyle>;

export const eyebrow: TextStyle = {
  fontFamily: family.sansMedium,
  fontSize: 10,
  lineHeight: 16,
  letterSpacing: 2,
  textTransform: 'uppercase',
  color: colors.muted,
};
export const micro: TextStyle = { ...eyebrow, letterSpacing: 1.4 };
