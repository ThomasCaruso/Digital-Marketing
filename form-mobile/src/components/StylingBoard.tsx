import Svg, { Defs, G, Image, Line, Path, Pattern, Rect } from 'react-native-svg';
import type { Look } from '../domain/types';
import { colors } from '../theme/tokens';

/** An illustrated styling board, composed from the actual demo garment colors.
 * Deliberately a drawing: never a simulated product photograph or try-on. */
export function StylingBoard({ look }: { look: Look }) {
  const knit = look.products.find(piece => piece.slot === 'top');
  const trouser = look.products.find(piece => piece.slot === 'pants');
  const shoe = look.products.find(piece => piece.slot === 'shoes');
  const polo = /polo|zip/i.test(knit?.name ?? '');
  const loafer = /loafer/i.test(shoe?.name ?? '');
  const knitShape = 'M76 49 L107 39 Q122 54 137 39 L168 49 L205 66 L225 153 L198 161 L175 102 L174 220 Q123 230 69 220 L68 102 L43 159 L16 150 L38 67 Z';

  return (
    <Svg width="100%" height="100%" viewBox="0 0 360 460" accessible={false}>
      <Defs>
        <Pattern id="knit-rib" width="3" height="5" patternUnits="userSpaceOnUse">
          <Path d="M1 0 L1 5" stroke={colors.paper} strokeOpacity="0.055" strokeWidth="0.6" />
        </Pattern>
      </Defs>
      {/* A long clean line: the trouser sits behind the knit, off axis. */}
      {trouser?.imageUri ? (
        <Image href={{ uri: trouser.imageUri }} x="194" y="115" width="125" height="310" preserveAspectRatio="xMidYMid meet" />
      ) : <G transform="translate(194 115) rotate(5 66 140)">
        <Path d="M14 9 Q64 2 111 9 L119 77 L110 294 L68 294 L60 103 L48 294 L6 294 L5 76 Z" fill={trouser?.hex ?? colors.ink2} />
        <Path d="M14 9 Q64 2 111 9 L112 23 Q62 18 12 23 Z" fill={colors.ink} opacity="0.18" />
        <Path d="M18 26 L35 35 L19 65 M106 26 L88 34 L106 63" fill="none" stroke={colors.paper} strokeOpacity="0.16" strokeWidth="0.8" />
        <Path d="M62 22 L65 61 Q65 70 59 73 M31 65 L24 280 M88 65 L88 280" fill="none" stroke={colors.paper} strokeOpacity="0.13" strokeWidth="0.8" />
        <Path d="M61 100 L49 290 M60 104 L68 291" fill="none" stroke={colors.ink} strokeOpacity="0.3" strokeWidth="1" />
        <Path d="M8 282 L48 282 M69 282 L111 282" stroke={colors.paper} strokeOpacity="0.15" strokeWidth="0.8" />
        <Path d="M31 10 L30 24 M91 9 L92 24" stroke={colors.paper} strokeOpacity="0.22" strokeWidth="2" />
      </G>}
      {/* The knit has the largest area; sleeve, cuff and collar carry its shape. */}
      {knit?.imageUri ? (
        <Image href={{ uri: knit.imageUri }} x="8" y="35" width="230" height="235" preserveAspectRatio="xMidYMid meet" />
      ) : <G transform="translate(4 17) rotate(-9 122 135)">
        <Path d={knitShape} fill={knit?.hex ?? colors.ink} />
        <Path d={knitShape} fill="url(#knit-rib)" />
        <Path d="M72 210 Q122 219 173 210 L174 220 Q122 230 69 220 Z" fill={colors.ink} opacity="0.18" />
        <Path d="M18 141 L45 150 L43 159 L16 150 Z M197 152 L223 144 L225 153 L198 161 Z" fill={colors.ink} opacity="0.2" />
        <Path d="M67 80 L68 101 M175 80 L175 102 M72 210 Q122 218 172 210" fill="none" stroke={colors.paper} strokeOpacity="0.12" strokeWidth="0.8" />
        {polo ? (
          <G>
            <Path d="M105 39 L120 58 L105 69 L94 45 Z M137 39 L121 58 L137 69 L150 46 Z" fill={knit?.hex ?? colors.ink} stroke={colors.paper} strokeOpacity="0.2" strokeWidth="0.9" />
            <Line x1="121" y1="58" x2="121" y2="98" stroke={colors.paper} strokeOpacity="0.35" strokeWidth="1" />
            <Rect x="119.5" y="61" width="3" height="7" fill={colors.paper} opacity="0.45" />
          </G>
        ) : (
          <Path d="M107 39 Q122 65 137 39 M105 41 Q122 70 140 41" fill="none" stroke={colors.paper} strokeOpacity="0.25" strokeWidth="2" />
        )}
      </G>}
      {/* Two low shoes, separated from the garments rather than attached to a body. */}
      {shoe?.imageUri ? (
        <Image href={{ uri: shoe.imageUri }} x="16" y="325" width="195" height="125" preserveAspectRatio="xMidYMid meet" />
      ) : [{ x: 24, y: 331, angle: -15 }, { x: 51, y: 387, angle: -5 }].map((position, index) => (
        <G key={index} transform={`translate(${position.x} ${position.y}) rotate(${position.angle} 75 25)`}>
          <Path d="M6 31 L10 7 L28 10 Q42 33 61 25 L76 18 Q97 28 111 31 L138 35 Q147 38 146 47 L5 47 Z" fill={shoe?.hex ?? colors.card} stroke={colors.ink2} strokeOpacity="0.35" strokeWidth="0.8" />
          <Path d="M5 43 Q70 48 146 43 L146 51 Q82 57 5 51 Z" fill={loafer ? colors.ink : '#b7a084'} />
          {loafer ? (
            <Path d="M49 25 Q76 20 100 34 M48 27 L96 36" fill="none" stroke={colors.paper} strokeOpacity="0.3" strokeWidth="2" />
          ) : (
            <G>
              <Path d="M6 31 L24 31 L31 43 L6 43 M111 31 Q122 35 141 36 L144 42 L110 41 Z" fill={colors.ink2} opacity="0.12" />
              <Path d="M49 31 L58 43 M61 29 L71 43 M74 27 L84 43" stroke={colors.ink} strokeOpacity="0.75" strokeWidth="4" />
              <Path d="M74 21 L84 24 M81 25 L92 28 M89 28 L100 31" stroke={colors.paper} strokeWidth="2" />
              <Path d="M29 14 Q32 28 48 29" fill="none" stroke={colors.ink} strokeOpacity="0.25" strokeWidth="1" />
            </G>
          )}
        </G>
      ))}
    </Svg>
  );
}
