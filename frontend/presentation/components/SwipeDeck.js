import React, { useState, useRef } from 'react';
import { Animated, PanResponder, Dimensions, StyleSheet, Text } from 'react-native';
import { Box } from 'native-base';
import { useCardData } from '../../infrastructure/context/CardDataContexte'; // Importer le hook pour accéder au contexte
import CardHome from './CardHome'; // Le composant CardHome qui va consommer les données du contexte

const SCREEN_WIDTH = Dimensions.get('window').width;
const SCREEN_HEIGHT = Dimensions.get('window').height;
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
    const x = direction === 'right' ? SCREEN_WIDTH : -SCREEN_WIDTH;
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
    setIndex((prevIndex) => prevIndex + 1);
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
      outputRange: ['-10deg', '0deg', '10deg'],
    });

    return {
      ...position.getLayout(),
      transform: [{ rotate }],
    };
  };

  const renderCards = () => {
    return data
    .map((item, i) => {
      if (i < index) {
        // Les cartes déjà swipées ne sont pas affichées
        return null;
      }

      if (i >= index + 4) {
        // Ne rend que les 5 cartes suivantes après l'index
        return null;
      }

        const isCurrentCard = i === index;
        const shadowOpacity = isCurrentCard
        ? 0.3 // Ombre plus forte pour la carte en haut
        : 0.1 * (5 - (i - index)); // Ombre plus douce pour les cartes en arrière-plan
        const style = isCurrentCard
          ? [getCardStyle(), styles.cardStyle]
          : [
              styles.cardStyle,
              { shadowOpacity,
                shadowColor: 'violet',
                shadowRadius: 5,
                elevation: 3,
                top: 25 * (i - index), // Décale les cartes suivantes
                transform: [{ scale: 1 - 0.05 * (i - index) }], // Réduit légèrement la taille des cartes suivantes
              },
            ];

        return (
          
          <Animated.View
            key={item.id || i}
            style={style}
            {...(isCurrentCard ? panResponder.panHandlers : {})}
          >
            <CardHome data={item} />
          </Animated.View>
          
        );
      })
      .reverse(); // Empile les cartes dans l'ordre correct
  };

  if (index >= data.length) {
    return (
      <Box style={styles.container}>
        <Text>No more cards</Text>
      </Box>
    );
  }

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
    height:"auto",
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default SwipeDeck;
