import { Easing } from 'react-native-reanimated';

/** Native FORM: near-white warm neutral, true near-black, one quiet gray. Clothing supplies color. */
export const colors = {
  paper: '#F7F5F1',
  paper2: '#EFEBE5',
  card: '#FCFBF8',
  ink: '#11110F',
  ink2: '#3E3C37',
  muted: '#68655F',
  line: '#E8E4DE',
  line2: '#DBD6CE',
  accent: '#11110F',
  onAccent: '#FAF9F6',
  skin: '#d9b28f',
  hair: '#2e2b26',
  scrim: 'rgba(17, 17, 15, 0.45)',
} as const;

export const radius = { sm: 8, md: 16, lg: 16, pill: 999 } as const;
export const groundShadow = 'rgba(17, 17, 15, 0.06)' as const;
export const easing = { standard: Easing.out(Easing.cubic) } as const;
