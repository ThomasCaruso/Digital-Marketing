import type { ImageSourcePropType } from 'react-native';

/**
 * The one mapping from catalog product id to bundled product photography.
 * Real imagery drops in by overwriting the file under
 * assets/placeholders/products/<category>/<productId>.<ext> and, if the
 * extension changes, updating the require path here — nothing else.
 *
 * `aspect` is the source image's width ÷ height. It steers CollageBoard
 * composition; the board re-measures each loaded image and corrects the
 * layout when the actual file differs, so a swapped-in photo pack with
 * different dimensions still composes correctly without touching code.
 * Photography always wins over the illustrated fallback, which now only
 * covers products with no photograph at all.
 */
export interface ProductPhotography {
  source: ImageSourcePropType;
  aspect: number;
}

/** Stand-ins ship at 4:5 portrait (400 × 500). */
const STAND_IN_ASPECT = 400 / 500;

const product = (source: ImageSourcePropType): ProductPhotography => ({ source, aspect: STAND_IN_ASPECT });

export const productPhotography: Record<string, ProductPhotography> = {
  jacket: product(require('../../assets/placeholders/products/outerwear/jacket.png')),
  overshirt: product(require('../../assets/placeholders/products/outerwear/overshirt.png')),
  crew: product(require('../../assets/placeholders/products/tops/crew.png')),
  shirt: product(require('../../assets/placeholders/products/tops/shirt.png')),
  'fine-knit': product(require('../../assets/placeholders/products/tops/fine-knit.png')),
  'warm-knit': product(require('../../assets/placeholders/products/tops/warm-knit.png')),
  pleat: product(require('../../assets/placeholders/products/bottoms/pleat.png')),
  straight: product(require('../../assets/placeholders/products/bottoms/straight.png')),
  linen: product(require('../../assets/placeholders/products/bottoms/linen.png')),
  relaxed: product(require('../../assets/placeholders/products/bottoms/relaxed.png')),
  sneaker: product(require('../../assets/placeholders/products/shoes/sneaker.png')),
  loafer: product(require('../../assets/placeholders/products/shoes/loafer.png')),
  canvas: product(require('../../assets/placeholders/products/shoes/canvas.png')),
  runner: product(require('../../assets/placeholders/products/shoes/runner.png')),
};
