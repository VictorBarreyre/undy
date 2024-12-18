// components/SwipeDeck.js
import React, { useState, useRef } from 'react';
import { Animated, PanResponder, Dimensions, StyleSheet, Text } from 'react-native';
import { Box } from 'native-base'; 
import { useCardData } from '../../infrastructure/context/CardDataContexte'; // Importer le hook pour accéder au contexte
import CardHome from './CardHome'; // Le composant CardHome qui va consommer les données du contexte

const SCREEN_WIDTH = Dimensions.get('window').width;
const SCREEN_HEIGHT = Dimensions.get('window').height;  // Récupérer la hauteur de l'écran
const SWIPE_THRESHOLD = 0.25 * SCREEN_WIDTH;
const SWIPE_OUT_DURATION = 550;

const SwipeDeck = ({ onSwipeRight, onSwipeLeft }) => {
  const { data } = useCardData(); // Accéder aux données du contexte

  const [index, setIndex] = useState(0);
  const position = useRef(new Animated.ValueXY()).current;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gesture) => {
        position.setValue({ x: gesture.dx, y: gesture.dy });
      },
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dx > SWIPE_THRESHOLD) {
          forceSwipe('right');
        } else if (gesture.dx < -SWIPE_THRESHOLD) {
          forceSwipe('left');
        } else {
          resetPosition();
        }
      }
    })
  ).current;

  const forceSwipe = (direction) => {
    const x = direction === 'right' ? SCREEN_WIDTH : -SCREEN_WIDTH;  // Déplacement horizontal
    Animated.timing(position, {
      toValue: { x, y: 0 },
      duration: SWIPE_OUT_DURATION,
      useNativeDriver: false,
    }).start(() => onSwipeComplete(direction));
  };

  const onSwipeComplete = (direction) => {
    const item = data[index];
    direction === 'right' ? onSwipeRight(item) : onSwipeLeft(item);
    position.setValue({ x: 0, y: 0 });
    setIndex(prevIndex => prevIndex + 1);  // Mise à jour de l'index
  };

  const resetPosition = () => {
    Animated.spring(position, {
      toValue: { x: 0, y: 0 },
      useNativeDriver: false,
    }).start();
  };

  const getCardStyle = () => {
    const rotate = position.x.interpolate({
      inputRange: [-SCREEN_WIDTH * 1.5, 0, SCREEN_WIDTH * 1.5],
      outputRange: ['-120deg', '0deg', '120deg']
    });

    return {
      ...position.getLayout(),
      transform: [{ rotate }]  // Applique la rotation pendant l'animation
    };
  };

  if (index >= data.length) {
    return (
      <Box style={styles.container}>
        <Text>No more cards</Text>
      </Box>
    );
  }

  return (
    <Box style={styles.container}>
      <Animated.View
        style={[getCardStyle(), styles.cardStyle]}
        {...panResponder.panHandlers}
      >
        <CardHome />
      </Animated.View>
    </Box>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    height: SCREEN_HEIGHT,  // Utilisez la hauteur totale de l'écran
    width: '100%',
    justifyContent: 'center',  // Centrer verticalement
    alignItems: 'center',      // Centrer horizontalement
  },

  cardStyle: {
    width: SCREEN_WIDTH * 0.9,  // Carte de 90% de la largeur de l'écran
    position: 'absolute',       // Positionner la carte de manière absolue
    height: '80%',              // Définit une hauteur relative pour la carte
    justifyContent: 'center',
    alignItems: 'center',
    // Supprimez `left: '5%'`, afin que la carte puisse bouger librement pendant l'animation
  }
});

export default SwipeDeck;
