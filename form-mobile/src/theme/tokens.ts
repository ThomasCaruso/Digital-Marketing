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

/**
 * Grounding shadow for the figure inside a LookScene — a soft ellipse at its
 * feet, since RN shadows on nested transparent Views render as boxes on Android.
 */
export const groundShadow = 'rgba(25, 24, 19, 0.14)' as const;

/** The web demo's easing, cubic-bezier(0.22, 0.61, 0.2, 1), approximated for RN. */
export const easing = {
  standard: Easing.out(Easing.cubic),
} as const;
