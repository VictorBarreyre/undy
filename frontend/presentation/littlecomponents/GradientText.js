// GradientText.js
import React from 'react';
import Svg, { Text as SvgText, Defs, LinearGradient as SvgLinearGradient, Stop } from 'react-native-svg';

export function GradientText({ children, width = 200, height = 50, fontSize = 16, fontWeight = '400', fontFamily = 'System' }) {
  return (
    <Svg height={height} width={width}>
      <Defs>
        <SvgLinearGradient id="grad" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor="#F97794" />
          <Stop offset="1" stopColor="#623AA2" />
        </SvgLinearGradient>
      </Defs>
      <SvgText
        fill="url(#grad)"
        fontSize={fontSize}
        fontWeight={fontWeight}
        fontFamily={fontFamily}
        x={0}              // Positionnement horizontal
        y={fontSize * 1.2} // Positionnement vertical (un peu plus que la taille de la font)
      >
        {children}
      </SvgText>
    </Svg>
  );
}
