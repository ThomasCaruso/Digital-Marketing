import { Image } from 'react-native';
import type { Look } from '../domain/types';
import { previewAssets } from '../data/preview';
import { CollageBoard } from './CollageBoard';
/** Curated photography only for original fixture looks. Adjusted looks re-compose as a static board of the actual pieces. */
export function LookVisual({ look, photograph = false }: { look: Look; photograph?: boolean }) {
  if (look.previewKey) return <Image source={photograph ? previewAssets[look.previewKey] : look.previewKey === 'quiet' ? previewAssets.outfit : previewAssets[look.previewKey]} resizeMode={photograph ? 'cover' : 'contain'} style={{ width: '100%', height: '100%' }} accessibilityLabel={look.title + ', reference fixture photograph'} />;
  return <CollageBoard look={look} interactive={false} fill />;
}
