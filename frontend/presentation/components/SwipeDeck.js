import React, { useState, useRef, useEffect } from 'react';
import { Animated, PanResponder, Dimensions, StyleSheet, Pressable } from 'react-native';
import { Box, HStack, Text, VStack } from 'native-base';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faUnlock } from '@fortawesome/free-solid-svg-icons';
import { useCardData } from '../../infrastructure/context/CardDataContexte';
import CardHome from './CardHome';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SCREEN_HEIGHT = Dimensions.get('window').height;
const SWIPE_THRESHOLD = 0.25 * SCREEN_WIDTH;
const SWIPE_OUT_DURATION = 300;

const SwipeDeck = ({ selectedFilters = [] }) => {
  const { data } = useCardData();
  const position = useRef(new Animated.ValueXY()).current;
  const [index, setIndex] = useState(0);
  const [filteredData, setFilteredData] = useState(data);
  const [currentItem, setCurrentItem] = useState(null);


  useEffect(() => {
    const filtered = selectedFilters.length > 0
      ? data.filter((card) => selectedFilters.includes(card.label))
      : data;

    setFilteredData(filtered);

    if (filtered.length > 0) {
      setCurrentItem(filtered[index % filtered.length]);
    } else {
      setCurrentItem(null);
    }
  }, [selectedFilters, data, index]);


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

  const onSwipeComplete = () => {
    setIndex((prevIndex) => (prevIndex + 1) % filteredData.length); // Boucle sur les cartes
    position.setValue({ x: 0, y: 0 });
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
      const cardIndex = (index + i) % filteredData.length; // Boucler avec mod (%)
      const card = filteredData[cardIndex];
      const isCurrentCard = i === 0;

      const cardStyle = isCurrentCard
        ? [getCardStyle(), styles.cardStyle]
        : [
          styles.cardStyle,
          {
            top: 25 * i,
            transform: [{ scale: 1 - 0.05 * i }],
          },
        ];

      return (
        <Animated.View
          key={`${card.id}-${cardIndex}-${i}`} // Assurez-vous que chaque clé est unique
          style={cardStyle}
          {...(isCurrentCard ? panResponder.panHandlers : {})}
        >
          <CardHome cardData={filteredData[cardIndex]} />
        </Animated.View>
      );
    });

    return cardsToRender.reverse();
  };

  if (!filteredData.length) {
    return (
      <Box style={styles.container}>
        <Text>Aucune donnée disponible</Text>
      </Box>
    );
  }

  return (
    <VStack style={styles.container}> 
    <Box style={styles.cardContainer}> 
       {renderCards()}
       </Box>
      <Pressable
        onPress={() => {
          console.log('Bouton cliqué !');
        }}
        style={({ pressed }) => [
          {
            backgroundColor: pressed ? 'gray.800' : 'black',
            transform: pressed ? [{ scale: 0.96 }] : [{ scale: 1 }],
            borderRadius: 20,
          },
          { width: '100%', alignSelf: 'center', padding: 18, borderRadius: 30 },
        ]}
      >
        <HStack alignItems="center" justifyContent="center" space={2}>
          <FontAwesomeIcon icon={faUnlock} size={20} color="white" />
          <Text fontSize="md" color="white" fontWeight="bold">
            {currentItem
              ? `Dévoiler le secret pour ${currentItem.price || '0.00'} €`
              : 'Chargement...'}
          </Text>
        </HStack>
      </Pressable>
    </VStack>
  );
};

const styles = StyleSheet.create({
  container: {
    display: 'flex',
    flex: 1,
    height: SCREEN_HEIGHT,
    width: '100%',
    justifyContent: 'space-between', // Ajoute de l'espace entre les éléments
    alignItems: 'center',
  },

  cardContainer: {
    position: 'relative', // Conserve les cartes avec position absolue à l'intérieur
    width: '100%',
    height: '92%', // modifie la taille des cartes pour espace ac cta à jour avec cardStyle
  },

  cardStyle: {
    width: SCREEN_WIDTH * 0.9,
    position: 'absolute',
    height: '80%', // modifie la taille des cartes pour espace ac cta
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 10,
    shadowColor: 'violet',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,

  },
});

export default SwipeDeck;