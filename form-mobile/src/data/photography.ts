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

const product = (source: ImageSourcePropType, aspect: number): ProductPhotography => ({ source, aspect });

/** Garment plates ship 4:5 portrait; shoes ship square. */
export const productPhotography: Record<string, ProductPhotography> = {
  jacket: product(require('../../assets/placeholders/products/outerwear/jacket.jpg'), 1200 / 1500),
  overshirt: product(require('../../assets/placeholders/products/outerwear/overshirt.jpg'), 2000 / 2500),
  crew: product(require('../../assets/placeholders/products/tops/crew.jpg'), 1080 / 1350),
  shirt: product(require('../../assets/placeholders/products/tops/shirt.jpg'), 2000 / 2500),
  'fine-knit': product(require('../../assets/placeholders/products/tops/fine-knit.jpg'), 1066 / 1333),
  'warm-knit': product(require('../../assets/placeholders/products/tops/warm-knit.jpg'), 1583 / 1976),
  pleat: product(require('../../assets/placeholders/products/bottoms/pleat.jpg'), 750 / 937),
  straight: product(require('../../assets/placeholders/products/bottoms/straight.jpg'), 800 / 1000),
  linen: product(require('../../assets/placeholders/products/bottoms/linen.jpg'), 567 / 708),
  relaxed: product(require('../../assets/placeholders/products/bottoms/relaxed.jpg'), 520 / 650),
  sneaker: product(require('../../assets/placeholders/products/shoes/sneaker.jpg'), 1),
  loafer: product(require('../../assets/placeholders/products/shoes/loafer.jpg'), 1),
  canvas: product(require('../../assets/placeholders/products/shoes/canvas.jpg'), 1),
  runner: product(require('../../assets/placeholders/products/shoes/runner.jpg'), 1),
};
