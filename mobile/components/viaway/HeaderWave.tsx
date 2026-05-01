import { Dimensions } from 'react-native';
import Svg, { Defs, LinearGradient as SvgGrad, Path, Rect, Stop } from 'react-native-svg';
import { ViaColors } from '@/constants/viaway-theme';

const W = Dimensions.get('window').width;

/**
 * Onda SVG que faz a transição do header navy para o body claro.
 * Inclua como último elemento do header (fora do paddingHorizontal).
 */
export function HeaderWave() {
  return (
    <Svg
      width={W}
      height={64}
      viewBox={`0 0 ${W} 64`}
      style={{ display: 'flex' }}>
      <Path
        d={`M0,0 L0,38 Q${W * 0.15},64 ${W * 0.35},50 Q${W * 0.55},30 ${W * 0.72},52 Q${W * 0.87},68 ${W},34 L${W},0 Z`}
        fill={ViaColors.navy}
      />
      <Path
        d={`M0,38 Q${W * 0.15},64 ${W * 0.35},50 Q${W * 0.55},30 ${W * 0.72},52 Q${W * 0.87},68 ${W},34 L${W},64 L0,64 Z`}
        fill="#F8FAFC"
      />
    </Svg>
  );
}
