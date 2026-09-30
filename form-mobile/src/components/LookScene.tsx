import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, View } from 'react-native';
import type { Look } from '../domain/types';
import { colors, groundShadow } from '../theme/tokens';
import { family } from '../theme/typography';
import { Figure } from './Figure';

/**
 * A look's visual: its two-tone scene with the recolorable figure composed
 * into it, plus a ghosted plate number so the whole thing reads as an
 * editorial styling board rather than a centered product cutout.
 *
 * The parent sizes it; the scene fills. `align: 'right'` shifts the figure
 * off-axis — the asymmetry is the point. The plate number is quiet (ink at
 * ~8%): it should be found, not seen first.
 */
interface LookSceneProps {
  look: Look;
  figureScale: number;
  align?: 'center' | 'right';
  plate?: boolean;
}

export function LookScene({ look, figureScale: u, align = 'center', plate = false }: LookSceneProps) {
  const top = look.products.find(p => p.slot === 'top');
  const pants = look.products.find(p => p.slot === 'pants');
  const shoes = look.products.find(p => p.slot === 'shoes');
  return (
    <LinearGradient
      style={StyleSheet.absoluteFill}
      colors={[look.scene.b, look.scene.a]}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
    >
      {plate && (
        <Text style={styles.plate} selectable={false}>
          {look.number}
        </Text>
      )}
      <View
        style={[
          styles.figure,
          { paddingBottom: 1.4 * u },
          align === 'right' && { alignItems: 'flex-end', paddingRight: '14%' },
        ]}
      >
        <View>
          {/* ground ellipse — spans the stance, sits at the heels */}
          <View
            pointerEvents="none"
            style={[
              styles.ground,
              {
                bottom: -0.5 * u,
                width: 8.4 * u,
                height: 1.5 * u,
                marginLeft: -4.2 * u,
                borderRadius: 999,
                backgroundColor: groundShadow,
              },
            ]}
          />
          <Figure
            scale={u}
            garment={top?.hex ?? colors.accent}
            pants={pants?.hex ?? colors.accent}
            shoes={shoes?.hex ?? colors.card}
          />
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  figure: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ground: {
    position: 'absolute',
    left: '50%',
  },
  plate: {
    position: 'absolute',
    left: 18,
    bottom: -14,
    fontFamily: family.serifItalic,
    fontSize: 118,
    lineHeight: 132,
    color: 'rgba(25, 24, 19, 0.09)',
  },
});
