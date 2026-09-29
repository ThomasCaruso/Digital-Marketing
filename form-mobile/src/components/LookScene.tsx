import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';
import type { Look } from '../domain/types';
import { colors, groundShadow } from '../theme/tokens';
import { Figure } from './Figure';

/**
 * A look's visual: its two-tone scene gradient with the recolorable figure
 * centered. The parent sizes it; the scene fills.
 *
 * The figure sits on a soft ground ellipse so it reads as composed in the
 * scene rather than floating — and the parent passes a figureScale that fills
 * the space, so the silhouette is a large abstract presence, not a thumbnail.
 */
interface LookSceneProps {
  look: Look;
  figureScale: number;
}

export function LookScene({ look, figureScale: u }: LookSceneProps) {
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
      <View style={[styles.center, { paddingBottom: 1.4 * u }]}>
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
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ground: {
    position: 'absolute',
    left: '50%',
  },
});
