import { StyleSheet, View } from 'react-native';
import { colors } from '../theme/tokens';

/**
 * TEMPORARY placeholder figure — the CSS mannequin from the web demo, rebuilt
 * as absolutely-positioned Views. Deliberately simple so it can be deleted
 * wholesale when real product imagery / try-on arrives.
 *
 * The web version scaled via font-size em units; here `scale` is pixels per
 * design unit (the figure is 11 units wide, 22.6 units tall).
 */
interface FigureProps {
  scale: number;
  garment: string;
  pants: string;
  shoes: string;
}

const W = 11;
const H = 22.6;

export function Figure({ scale: u, garment, pants, shoes }: FigureProps) {
  const shoe = (left: number) => ({
    position: 'absolute' as const,
    top: 20.5 * u,
    left: left * u,
    width: 3.4 * u,
    height: 1.6 * u,
    backgroundColor: shoes,
    borderTopLeftRadius: 0.8 * u,
    borderTopRightRadius: 0.9 * u,
    borderBottomLeftRadius: 0.5 * u,
    borderBottomRightRadius: 0.5 * u,
  });

  return (
    <View style={[styles.root, { width: W * u, height: H * u }]}>
      <View
        style={[
          styles.block,
          {
            backgroundColor: colors.skin,
            left: 3.95 * u,
            top: 0,
            width: 3.1 * u,
            height: 3.7 * u,
            borderRadius: 1.4 * u,
          },
        ]}
      />
      <View
        style={[
          styles.block,
          {
            backgroundColor: colors.hair,
            left: 3.73 * u,
            top: -0.59 * u,
            width: 3.53 * u,
            height: 1.78 * u,
            borderRadius: 0.89 * u,
          },
        ]}
      />
      <View
        style={[
          styles.block,
          {
            backgroundColor: colors.skin,
            left: 4.85 * u,
            top: 3.3 * u,
            width: 1.3 * u,
            height: 1.4 * u,
          },
        ]}
      />
      <View
        style={[
          styles.block,
          {
            backgroundColor: garment,
            left: 1.2 * u,
            top: 4.4 * u,
            width: 8.6 * u,
            height: 8.4 * u,
            borderTopLeftRadius: 1.6 * u,
            borderTopRightRadius: 1.6 * u,
            borderBottomLeftRadius: 1 * u,
            borderBottomRightRadius: 1 * u,
          },
        ]}
      >
        {/* collar light */}
        <View
          style={[
            styles.block,
            {
              backgroundColor: 'rgba(255, 253, 248, 0.16)',
              left: (8.6 - 2.8) / 2 * u,
              top: 0,
              width: 2.8 * u,
              height: 1 * u,
              borderBottomLeftRadius: 0.5 * u,
              borderBottomRightRadius: 0.5 * u,
            },
          ]}
        />
      </View>
      <View
        style={[
          styles.block,
          {
            backgroundColor: pants,
            left: 1.6 * u,
            top: 12.6 * u,
            width: 7.8 * u,
            height: 8.1 * u,
            borderTopLeftRadius: 0.4 * u,
            borderTopRightRadius: 0.4 * u,
            borderBottomLeftRadius: 0.6 * u,
            borderBottomRightRadius: 0.6 * u,
          },
        ]}
      >
        {/* trouser crease */}
        <View
          style={[
            styles.block,
            {
              backgroundColor: 'rgba(0, 0, 0, 0.24)',
              left: (7.8 - 0.55) / 2 * u,
              top: 0,
              width: 0.55 * u,
              height: 8.1 * u,
            },
          ]}
        />
      </View>
      <View style={[styles.block, shoe(1.75)]} />
      <View style={[styles.block, shoe(5.85)]} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: 'relative',
    shadowColor: '#191813',
    shadowOpacity: 0.16,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
  },
  block: {
    position: 'absolute',
  },
});
