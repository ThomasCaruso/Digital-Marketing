import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';
import type { Look } from '../domain/types';
import { colors } from '../theme/tokens';
import { Figure } from './Figure';

/**
 * A look's visual: its two-tone scene gradient with the recolorable figure
 * centered. The parent sizes it; the scene fills.
 */
interface LookSceneProps {
  look: Look;
  figureScale: number;
}

export function LookScene({ look, figureScale }: LookSceneProps) {
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
      <View style={styles.center}>
        <Figure
          scale={figureScale}
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
});
