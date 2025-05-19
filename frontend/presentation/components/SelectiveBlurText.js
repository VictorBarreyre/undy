import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, Platform, Animated, ActivityIndicator } from 'react-native';
import { BlurView } from '@react-native-community/blur';
import LinearGradient from 'react-native-linear-gradient';

// Fonction de hachage pour une distribution pseudo-aléatoire
const hashString = (str) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash;
};

// Génère les indices des mots à flouter
const generateBlurIndices = (textContent, preserveFirstNWords = 5) => {
  const words = textContent.split(' ');
  const totalWords = words.length;
  
  if (totalWords <= 2) return [totalWords - 1]; // Blur uniquement le dernier mot
  
  let blurIndices = [];
  
  // Commencer après les N premiers mots pour préserver le début
  for (let i = preserveFirstNWords; i < totalWords; i++) {
    const wordHash = hashString(words[i] + i.toString());
    const prevWordIsBlurred = blurIndices.includes(i - 1);
    
    // Augmenter la chance de floutage à mesure qu'on descend dans le texte
    const blurChance = Math.min(0.3 + (i / totalWords) * 0.7, 0.9);
    const shouldBlur = (!prevWordIsBlurred && Math.abs(wordHash % 100) / 100 < blurChance) || 
                      (prevWordIsBlurred && Math.abs(wordHash % 100) / 100 < 0.2);
    
    if (shouldBlur) {
      blurIndices.push(i);
    }
  }
  
  // Toujours blur le dernier mot, sauf si c'est "..."
  const lastWord = words[totalWords - 1];
  if (lastWord !== '...' && !blurIndices.includes(totalWords - 1)) {
    blurIndices.push(totalWords - 1);
  }
  
  return blurIndices.sort((a, b) => a - b);
};

// Composant pour un mot flouté
const BlurredWord = ({ word, isLast, textStyle }) => (
  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
    <View style={{ 
      position: 'relative',
      marginHorizontal: -5,
      paddingHorizontal: 10,
    }}>
      <Text style={textStyle}>{word}</Text>
      <View style={{
        position: 'absolute',
        top: 0,
        left: 5,
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

const BlurredTextComponent = ({ 
  content, 
  style, 
  textStyle, 
  maxWords = 30, 
  preserveFirstNWords = 5,  // Nombre de mots au début à ne jamais flouter
  gradientHeight = 0.2      // Hauteur du dégradé en pourcentage de la hauteur totale
}) => {
  // États pour gérer l'affichage et l'animation
  const [textHeight, setTextHeight] = useState(0);
  const [hasTextOverflow, setHasTextOverflow] = useState(false);
  const [isGradientLoaded, setIsGradientLoaded] = useState(false);
  const [isComponentReady, setIsComponentReady] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [isLoading, setIsLoading] = useState(true);
  
  // Traiter le contenu pour éviter les erreurs
  const safeContent = content || '';
  const words = safeContent.split(' ');
  const truncatedWords = words.slice(0, maxWords);
  const showEllipsis = words.length > maxWords;
  
  // Déterminer quels mots flouter (calculé une seule fois par changement de contenu)
  const blurredWordsIndices = useMemo(
    () => generateBlurIndices(truncatedWords.join(' '), preserveFirstNWords),
    [truncatedWords, preserveFirstNWords]
  );
  
  // Gérer le layout du conteneur de texte
  const handleTextContainerLayout = (event) => {
    const { height } = event.nativeEvent.layout;
    setTextHeight(height);
    setHasTextOverflow(height > 100 || words.length > maxWords);
  };

  // Marquer le dégradé comme chargé
  const handleGradientLoad = () => {
    setIsGradientLoaded(true);
  };

  // Effet pour simuler un court délai de chargement
  useEffect(() => {
    setIsLoading(true); // S'assurer que le loader est visible au début
    
    const timer = setTimeout(() => {
      setIsComponentReady(true);
    }, 50); // Légèrement prolongé pour voir le loader
    
    return () => clearTimeout(timer);
  }, [content]); // Réinitialiser le chargement quand le contenu change

  // Animation du fondu lorsque tout est prêt
  useEffect(() => {
    if (isComponentReady && (isGradientLoaded || !hasTextOverflow)) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true
      }).start(() => {
        // Masquer le loader une fois l'animation terminée
        setTimeout(() => {
          setIsLoading(false);
        }, 100);
      });
    }
  }, [isComponentReady, isGradientLoaded, hasTextOverflow, fadeAnim]);

  return (
    <View style={[styles.container, style]}>
      {/* Loader affiché pendant le chargement */}
      {isLoading && safeContent && (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="small" color="#FF78B2" />
        </View>
      )}
      
      {/* Conteneur principal du texte avec animation de fondu */}
      <Animated.View 
        style={[
          styles.textWrapper,
          { opacity: fadeAnim }
        ]} 
        onLayout={handleTextContainerLayout}
      >
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
            // Ne pas flouter les premiers mots
            const shouldBlur = index >= preserveFirstNWords && blurredWordsIndices.includes(index);
            
            return (
              <React.Fragment key={index}>
                {shouldBlur ? (
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
      </Animated.View>
      
      {/* Dégradé de fondu en bas (conditionnel) */}
      {hasTextOverflow && textHeight > 0 && (
        <LinearGradient
          colors={[
            'rgba(255,255,255,0)',     // Transparent en haut
            'rgba(255,255,255,0.4)',   // Semi-transparent
            'rgba(255,255,255,0.9)',   // Presque blanc
            'rgba(255,255,255,1)'      // Complètement blanc en bas
          ]}
          locations={[0, 0.5, 0.8, 1]}
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: textHeight * gradientHeight,  // Hauteur configurable
            width: '100%',
          }}
          pointerEvents="none"
          onLayout={handleGradientLoad}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    width: '100%',
    overflow: 'hidden',
    minHeight: 30, // Hauteur minimale pour éviter le flash
  },
  textWrapper: {
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
    width: '100%',
  },
  loaderContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    zIndex: 10, // S'assurer que le loader est au-dessus du texte
    borderRadius: 4,
  },
});

export default BlurredTextComponent;