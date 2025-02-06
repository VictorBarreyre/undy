import React, { useMemo } from 'react';
import { View, Text, Platform } from 'react-native';
import { BlurView } from '@react-native-community/blur';
import { styles } from '../../infrastructure/theme/styles';
import LinearGradient from 'react-native-linear-gradient';

const hashString = (str) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash;
  };

  const generateBlurIndices = (textContent) => {
    const words = textContent.split(' ');
    const totalWords = words.length;

    if (totalWords <= 2) return [0];

    let blurIndices = [0]; // Premier mot toujours flouté

    for (let i = 1; i < totalWords; i++) {
      // Utilise le hash du mot et sa position pour déterminer s'il doit être flouté
      const wordHash = hashString(words[i] + i.toString());
      const prevWordIsBlurred = blurIndices.includes(i - 1);

      // Décision déterministe basée sur le hash
      const shouldBlur = !prevWordIsBlurred || (wordHash % 2 === 0);

      if (shouldBlur) {
        blurIndices.push(i);
      }
    }

    // Vérifie les deux derniers mots
    const lastIndex = totalWords - 1;
    if (!blurIndices.includes(lastIndex) && !blurIndices.includes(lastIndex - 1)) {
      blurIndices.push(lastIndex);
    }

    return blurIndices.sort((a, b) => a - b);
  };

  const BlurredWord = ({ word, isLast, textStyle }) => (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <View style={{ 
            position: 'relative',
            marginHorizontal: -6, // Étend la zone de blur sur les côtés
            paddingHorizontal: 10, // Maintient l'espacement du texte
        }}>
            <Text style={textStyle}>{word}</Text>
            <View style={{
                position: 'absolute',
                top: 0,
                left: 6,
                right: 0,
                bottom: 0,
                overflow: 'hidden',
            }}>
                <BlurView
                    style={{
                        position: 'absolute',
                        top: -50,
                        left: -50,
                        bottom: -50,
                        right: -50,
                    }}
                    blurType="light"
                    blurAmount={5}
                    backgroundColor='rgba(255, 255, 255, 0.6)'
                    reducedTransparencyFallbackColor="rgba(255, 255, 255, 0.8)"
                />
                {/* Dégradé horizontal */}
                <LinearGradient
                    colors={[
                        'rgba(255,255,255,0.6)',
                        'rgba(255,255,255,0.2)',
                        'rgba(255,255,255,0.2)',
                        'rgba(255,255,255,0.6)',
                    ]}
                    locations={[0, 0.2, 0.8, 1]}
                    start={{ x: 0, y: 0.5 }}
                    end={{ x: 1, y: 0.5 }}
                    style={{
                        position: 'absolute',
                        width: '100%',
                        height: '100%',
                    }}
                />
                {/* Dégradé vertical pour adoucir haut/bas */}
                <LinearGradient
                    colors={[
                        'rgba(255,255,255,0.4)',
                        'rgba(255,255,255,0.2)',
                        'rgba(255,255,255,0.2)',
                        'rgba(255,255,255,0.4)',
                    ]}
                    locations={[0, 0.2, 0.8, 1]}
                    start={{ x: 0.5, y: 0 }}
                    end={{ x: 0.5, y: 1 }}
                    style={{
                        position: 'absolute',
                        width: '100%',
                        height: '100%',
                    }}
                />
            </View>
        </View>
        {isLast && <Text style={textStyle}>...</Text>}
    </View>
);

const BlurredTextComponent = ({ content, maxWords = 30, textStyle }) => {
  const words = content.split(' ');
  const truncatedWords = words.slice(0, maxWords);
  const showEllipsis = words.length > maxWords;
  
  const blurredWordsIndices = useMemo(
      () => generateBlurIndices(truncatedWords.join(' ')),
      [truncatedWords]
  );

  return (
      <View style={{ 
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: 4,
          alignItems: 'flex-start',
          justifyContent: 'flex-start',
          width: '100%'
      }}>
          {truncatedWords.map((word, index) => {
              const isLast = showEllipsis && index === maxWords - 1;
              return (
                  <React.Fragment key={index}>
                      {blurredWordsIndices.includes(index) ? (
                          <BlurredWord 
                              word={word} 
                              isLast={isLast} 
                              textStyle={textStyle}
                          />
                      ) : (
                          <Text style={textStyle}>
                              {word}{isLast ? '...' : ''}
                          </Text>
                      )}
                  </React.Fragment>
              );
          })}
      </View>
  );
};

export default BlurredTextComponent;