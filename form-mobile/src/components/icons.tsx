import type { ColorValue } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

/**
 * Minimal stroke icons matching the web demo's 24px line iconography.
 * Inline so the tab bar needs no icon-font dependency.
 */
interface IconProps {
  color: ColorValue;
  size?: number;
}

export function HomeIcon({ color, size = 22 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M3 10.5 12 3l9 7.5" stroke={color} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M5 9.5V21h14V9.5" stroke={color} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function BookmarkIcon({ color, size = 22 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M6 3h12v18l-6-4.5L6 21z" stroke={color} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function PersonIcon({ color, size = 22 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="8" r="4" stroke={color} strokeWidth={1.7} />
      <Path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" stroke={color} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
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
