import { useId } from 'react';
import { Image, type ImageSourcePropType } from 'react-native';
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, Stop } from 'react-native-svg';
import { garmentAssets, previewAssets } from '../data/preview';
import type { Product } from '../domain/types';
/** Garment photography first; cutouts and drawings remain as honest fallbacks. */
export function ProductVisual({ product, gallery = 0, fit = 'contain' }: { product: Product; gallery?: number; fit?: 'contain' | 'cover' }) {
  const sheen = 'fabric' + useId().replace(/[^a-zA-Z0-9]/g, '');
  const garment = garmentAssets[product.id];
  if (garment) return <Image source={garment} resizeMode={fit} style={{ width: '100%', height: '100%', transform: [{ scale: gallery ? 1.22 : 1 }] }} accessibilityLabel={product.name + (gallery ? ', fixture detail crop' : ', product photograph')} />;
  const assets: Record<string, ImageSourcePropType> = { jacket: previewAssets.jacket, knit: previewAssets.knit, trousers: previewAssets.trousers };
  if (product.assetKey && assets[product.assetKey]) return <Image source={assets[product.assetKey]} resizeMode="contain" style={{ width: '100%', height: '100%', transform: [{ scale: gallery ? 1.22 : 1 }] }} accessibilityLabel={product.name + (gallery ? ', fixture detail crop' : ', fixture image')} />;
  const top = product.slot === 'top', pants = product.slot === 'pants';
  const path = top ? 'M76 49 L107 39 Q122 54 137 39 L168 49 L205 66 L225 153 L198 161 L175 102 L174 220 Q123 230 69 220 L68 102 L43 159 L16 150 L38 67 Z'
    : pants ? 'M44 20 L183 20 L191 79 L180 260 L122 260 L114 114 L98 260 L40 260 L37 79 Z'
    : 'M25 140 L35 88 L69 94 Q95 153 124 135 L160 118 Q190 145 212 149 L250 154 Q267 165 258 186 L24 186 Z';
  return <Svg width="100%" height="100%" viewBox="0 0 280 300" accessibilityLabel={product.name + ', demo garment illustration'}>
    <Defs><LinearGradient id={sheen} x1="0%" y1="10%" x2="100%" y2="70%"><Stop offset="0" stopColor="#ffffff" stopOpacity={0.14} /><Stop offset="0.45" stopColor="#ffffff" stopOpacity={0.02} /><Stop offset="1" stopColor="#201f1c" stopOpacity={0.12} /></LinearGradient></Defs>
    <G transform={gallery ? 'translate(-12 -12) scale(1.12)' : 'translate(12 10)'}>
      <Ellipse cx={pants ? 113 : 125} cy={pants ? 278 : top ? 239 : 204} rx={pants ? 72 : 87} ry={3.5} fill="#201f1c" opacity={0.045} />
      <Path d={path} fill={product.hex} stroke="#201f1c" strokeOpacity={0.28} strokeWidth={0.8} strokeLinejoin="round" />
      <Path d={path} fill={`url(#${sheen})`} />
      {top ? <G fill="none" stroke="#201f1c" strokeOpacity={0.18} strokeWidth={0.75}>
        <Path d="M104 41 Q122 62 140 41 M76 49 68 102 M168 49 175 102 M20 144 45 153 M197 154 223 146 M71 214 Q122 224 172 214" />
        <Path d="M84 106 Q80 157 83 200 M161 109 Q167 160 158 199" strokeOpacity={0.08} />
        {product.id === 'overshirt' || product.id === 'shirt' ? <><Path d="M122 52 122 220 M87 82h22v28H87Z M136 82h23v28h-23Z" />{[76, 103, 130, 157, 184, 211].map(cy => <Circle key={cy} cx={122} cy={cy} r={1.3} fill="#201f1c" opacity={0.35} />)}</> : null}
      </G> : pants ? <G fill="none" stroke="#201f1c" strokeOpacity={0.22} strokeWidth={0.8}>
        <Path d="M44 29h140 M61 31 Q62 50 43 64 M163 31 Q163 50 187 64 M112 29v53q0 13 9 19 M42 253h56 M122 253h59" />
        <Path d="M79 92 69 246 M152 94 152 246" strokeOpacity={0.13} />
        <Circle cx={114} cy={24.5} r={1.3} fill="#201f1c" />
      </G> : <G fill="none" stroke="#201f1c" strokeOpacity={0.25} strokeWidth={0.9}>
        <Path d="M26 175h232 M35 94 52 127 Q79 165 121 145 M162 127 202 154 M26 157 Q92 180 151 154 M62 112l29-8 M69 122l32-10 M81 133l31-12" />
        <Path d="M44 180h19m9 0h20m9 0h20m9 0h20m9 0h20m9 0h20m9 0h20" strokeOpacity={0.15} />
      </G>}
    </G>
  </Svg>;
}
