import type { ColorValue } from 'react-native';
import Svg, { Path } from 'react-native-svg';

/**
 * Minimal stroke iconography matching the web demo's 24px line icons.
 * The tab bar is text-only; icons appear only where a glyph carries meaning.
 */
interface IconProps {
  color: ColorValue;
  size?: number;
}

export function HeartIcon({ color, size = 17, filled = false }: IconProps & { filled?: boolean }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? color : 'none'}>
      <Path
        d="M12 21c-4.8-3.4-8.4-6.6-9.4-9.6C1.4 7.6 3.6 5 6.5 5c2.2 0 3.9 1.2 4.5 3 .6-1.8 2.3-3 4.5-3 2.9 0 5.1 2.6 3.9 6.4-1 3-4.6 6.2-9.4 9.6z"
        stroke={color}
        strokeWidth={1.6}
        strokeLinejoin="round"
      />
    </Svg>
  );
}
