// DynamicGradientText.js
import React, { useState } from 'react';
import { View, Text } from 'react-native';
import { GradientText } from './GradientText'; // chemin vers votre GradientText

export function DynamicGradientText({ children, fontSize = 16, fontWeight = '400', fontFamily = 'System' }) {
  const [textWidth, setTextWidth] = useState(null);

  return (
    <View>
      {textWidth === null ? (
        // Étape 1 : on affiche un <Text> invisible pour mesurer la largeur
        <Text
          style={{ 
            position: 'absolute', 
            opacity: 0, 
            fontSize, 
            fontWeight, 
            fontFamily 
          }}
          onLayout={(event) => {
            const { width } = event.nativeEvent.layout;
            setTextWidth(width);
          }}
        >
          {children}
        </Text>
      ) : (
        // Étape 2 : maintenant qu'on a la largeur, on rend GradientText
        // On ajoute une marge pour être sûr que le texte ne touche pas le bord
        <GradientText
          width={textWidth}
          height={fontSize * 3} // Ajustez la hauteur selon votre besoin
          fontSize={fontSize}
          fontWeight={fontWeight}
          fontFamily={fontFamily}
        >
          {children}
        </GradientText>
      )}
    </View>
  );
}
