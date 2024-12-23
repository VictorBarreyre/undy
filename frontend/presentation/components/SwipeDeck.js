import React, { useState, useRef } from 'react';
import { Animated, PanResponder, Dimensions, StyleSheet, Text } from 'react-native';
import { Box } from 'native-base';
import { useCardData } from '../../infrastructure/context/CardDataContexte'; // Importer le hook pour accéder au contexte
import CardHome from './CardHome'; // Le composant CardHome qui va consommer les données du contexte

const SCREEN_WIDTH = Dimensions.get('window').width;
const SCREEN_HEIGHT = Dimensions.get('window').height;
const SWIPE_THRESHOLD = 0.25 * SCREEN_WIDTH;
const SWIPE_OUT_DURATION = 300;

const SwipeDeck = ({ onSwipeRight, onSwipeLeft }) => {
  const { data } = useCardData();
  const position = useRef(new Animated.ValueXY()).current;
  const [index, setIndex] = useState(0);

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
      },
    })
  ).current;

  const forceSwipe = (direction) => {
    const x = direction === 'right' ? SCREEN_WIDTH : -SCREEN_WIDTH;
    Animated.timing(position, {
      toValue: { x, y: 0 },
      duration: SWIPE_OUT_DURATION,
      useNativeDriver: false,
    }).start(() => onSwipeComplete(direction));
  };

  const onSwipeComplete = (direction) => {
    const currentItem = data[index % data.length];
    direction === 'right' ? onSwipeRight(currentItem) : onSwipeLeft(currentItem);

    setIndex((prevIndex) => (prevIndex + 1) % data.length); // Réinitialise l'index pour boucle infinie
    position.setValue({ x: 0, y: 0 }); // Réinitialise la position
  };

  const resetPosition = () => {
    Animated.spring(position, {
      toValue: { x: 0, y: 0 },
      friction: 8,
      tension: 50,
      useNativeDriver: false,
    }).start();
  };

  const getCardStyle = () => {
    const rotate = position.x.interpolate({
      inputRange: [-SCREEN_WIDTH, 0, SCREEN_WIDTH],
      outputRange: ['-10deg', '0deg', '10deg'],
    });

    return {
      ...position.getLayout(),
      transform: [{ rotate }],
    };
  };

  const renderCards = () => {
    const cardsToRender = [...Array(5)].map((_, i) => {
      const cardIndex = (index + i) % data.length;
      const isCurrentCard = i === 0;

      const cardStyle = isCurrentCard
        ? [getCardStyle(), styles.cardStyle]
        : [
            styles.cardStyle,
            {
              top: 25 * i, // Décale verticalement les cartes suivantes
              transform: [{ scale: 1 - 0.05 * i }], // Réduit légèrement la taille des cartes suivantes
            },
          ];

      return (
        <Animated.View
          key={cardIndex}
          style={cardStyle}
          {...(isCurrentCard ? panResponder.panHandlers : {})}
        >
          <CardHome data={data[cardIndex]} />
        </Animated.View>
      );
    });

    return cardsToRender.reverse(); // Empile les cartes dans l'ordre correct
  };

  return <Box style={styles.container}>{renderCards()}</Box>;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    height: SCREEN_HEIGHT,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardStyle: {
    width: SCREEN_WIDTH * 0.9,
    position: 'absolute',
    height: 'auto',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 10,
    shadowColor: 'violet',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 5,
  },
});

export default SwipeDeck;
