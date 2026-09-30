import type { ImageSourcePropType } from 'react-native';
/** Temporary reference-inspired content. No live catalog or generated try-on data. */
export const previewAssets = {
  jacket: require('../../assets/placeholders/jacket-cutout.png'),
  knit: require('../../assets/placeholders/knit.jpg'),
  trousers: require('../../assets/placeholders/trousers.jpg'),
  outfit: require('../../assets/placeholders/outfit-cutout.png'),
  quiet: require('../../assets/placeholders/quiet-confidence.jpg'),
  night: require('../../assets/placeholders/night-out.jpg'),
  weekend: require('../../assets/placeholders/weekend-ease.jpg'),
  portrait: require('../../assets/placeholders/portrait.jpg'),
};

/**
 * One image slot per catalog product id, keyed in src/data/catalog.ts order.
 * Slots ship as tonal stand-ins (scripts/make-standins.cjs); the real studio
 * pack drops in by overwriting assets/placeholders/garments/<id>.png.
 */
export const garmentAssets: Record<string, ImageSourcePropType> = {
  jacket: require('../../assets/placeholders/garments/jacket.png'),
  crew: require('../../assets/placeholders/garments/crew.png'),
  pleat: require('../../assets/placeholders/garments/pleat.png'),
  sneaker: require('../../assets/placeholders/garments/sneaker.png'),
  overshirt: require('../../assets/placeholders/garments/overshirt.png'),
  shirt: require('../../assets/placeholders/garments/shirt.png'),
  straight: require('../../assets/placeholders/garments/straight.png'),
  loafer: require('../../assets/placeholders/garments/loafer.png'),
  'fine-knit': require('../../assets/placeholders/garments/fine-knit.png'),
  linen: require('../../assets/placeholders/garments/linen.png'),
  canvas: require('../../assets/placeholders/garments/canvas.png'),
  'warm-knit': require('../../assets/placeholders/garments/warm-knit.png'),
  relaxed: require('../../assets/placeholders/garments/relaxed.png'),
  runner: require('../../assets/placeholders/garments/runner.png'),
};
