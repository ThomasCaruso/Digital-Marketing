import { Easing } from 'react-native-reanimated';

/**
 * FORM design tokens — ported from ai-stylist-mvp/styles.css :root.
 * Warm paper, charcoal ink, hairlines. Do not introduce colors outside this file.
 */
export const colors = {
  paper: '#f4f1ea',
  paper2: '#ece7dc',
  card: '#fbf9f4',
  ink: '#191813',
  ink2: '#43413a',
  muted: '#7b766a',
  line: '#ded7c9',
  line2: '#cbc2b1',
  accent: '#23241f',
  onAccent: '#fbf9f4',
  skin: '#d9b28f',
  hair: '#2e2b26',
  scrim: 'rgba(25, 24, 19, 0.45)',
} as const;

export const radius = {
  sm: 10,
  md: 16,
  lg: 24,
  pill: 999,
} as const;

/** iOS-style soft shadow; elevation keeps it legible on Android. */
export const shadowCard = {
  shadowColor: colors.ink,
  shadowOpacity: 0.1,
  shadowRadius: 18,
  shadowOffset: { width: 0, height: 10 },
  elevation: 2,
} as const;

/** The web demo's easing, cubic-bezier(0.22, 0.61, 0.2, 1), approximated for RN. */
export const easing = {
  standard: Easing.out(Easing.cubic),
} as const;
