import React, { useState, useRef, useEffect } from 'react';
import { Animated, PanResponder, Dimensions, StyleSheet, View } from 'react-native';
import { Box, Spinner, Text, VStack } from 'native-base';
import { useCardData } from '../../infrastructure/context/CardDataContexte';
import CardHome from './CardHome';
import { useNavigation } from '@react-navigation/native';
import PaymentSheet from './PaymentSheet';
import TypewriterSpinner from './TypewriterSpinner'

const SCREEN_WIDTH = Dimensions.get('window').width;
const SCREEN_HEIGHT = Dimensions.get('window').height
const SWIPE_THRESHOLD = 0.25 * SCREEN_WIDTH;
const SWIPE_OUT_DURATION = 300;

const SwipeDeck = ({ selectedFilters = [] }) => {
  const { data, purchaseAndAccessConversation, isLoadingData, fetchUnpurchasedSecrets } = useCardData();
  const position = useRef(new Animated.ValueXY()).current;
  const [currentIndex, setCurrentIndex] = useState(0);
  const [filteredData, setFilteredData] = useState([]);
  const [currentItem, setCurrentItem] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasAttemptedRefresh, setHasAttemptedRefresh] = useState(false);
  const didInitialFetch = useRef(false);
  const navigation = useNavigation();

  // Effet pour la gestion initiale du chargement et filtrage des données
  useEffect(() => {
    if (!isLoadingData && data.length > 0) {
      const filtered = selectedFilters.length > 0
        ? data.filter((card) => selectedFilters.includes(card.label))
        : data;

      setFilteredData(filtered);
      if (filtered.length > 0) {
        const actualIndex = currentIndex % filtered.length;
        setCurrentItem(filtered[actualIndex]);
      }
      setIsLoading(false);
    }
  }, [selectedFilters, data, currentIndex, isLoadingData]);

  // Effet pour la tentative unique de rafraîchissement
  useEffect(() => {
    const attemptInitialFetch = async () => {
      if (!didInitialFetch.current && !isLoadingData && filteredData.length === 0) {
        setIsLoading(true);
        try {
          await fetchUnpurchasedSecrets();
          didInitialFetch.current = true;
        } catch (error) {
          console.error('Erreur lors du chargement initial:', error);
        } finally {
          setIsLoading(false);
          setHasAttemptedRefresh(true);
        }
      }
    };

    attemptInitialFetch();
  }, [isLoadingData, filteredData.length]);

  const getCardHeight = () => {
    switch (true) {
      case filteredData.length === 1: return SCREEN_HEIGHT * 0.51;
      case filteredData.length === 2: return SCREEN_HEIGHT * 0.50;
      case filteredData.length === 3: return SCREEN_HEIGHT * 0.48;
      case filteredData.length === 4: return SCREEN_HEIGHT * 0.47;
      default: return SCREEN_HEIGHT * 0.45;
    }
  };

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
    setCurrentIndex(prevIndex => prevIndex + 1);
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
    if (filteredData.length === 0) return null;

    return [...Array(Math.min(5, filteredData.length))].map((_, i) => {
      const cardIndex = (currentIndex + i) % filteredData.length;
      const card = filteredData[cardIndex];
      const isCurrentCard = i === 0;
      if (!card) return null;

      const cardStyle = isCurrentCard
        ? [getCardStyle(), styles.cardStyle]
        : [
          styles.cardStyle,
          {
            height: getCardHeight(filteredData.length),
            top: 25 * i,
            transform: [{ scale: 1 - 0.05 * i }],
          },
        ];

      return (
        <Animated.View
          key={`${card._id}-${cardIndex}`}
          style={cardStyle}
          {...(isCurrentCard ? panResponder.panHandlers : {})}
        >
          <CardHome cardData={card} />
        </Animated.View>
      );
    }).reverse();
  };

  if (isLoading) {
    return <TypewriterSpinner text="Undy..." />;
  }

  if (hasAttemptedRefresh && filteredData.length === 0) {
    return (
      <VStack flex={1} justifyContent="center" alignItems="center" p={4}>
        <Text style={styles.h3} textAlign="center">
          Aucun secret disponible
        </Text>
        <Text style={styles.caption} textAlign="center" color="gray.500" mt={2}>
          {selectedFilters.length > 0 
            ? "Essayez de modifier vos filtres"
            : "Revenez plus tard pour découvrir de nouveaux secrets"}
        </Text>
      </VStack>
    );
  }

  return (
    <VStack style={styles.container}>
      <Box style={styles.cardContainer}>
        {renderCards()}
      </Box>
      <PaymentSheet
        secret={currentItem}
        onPaymentSuccess={async (paymentId) => {
          try {
            setIsLoading(true);
            const { conversationId, conversation } = await purchaseAndAccessConversation(
              currentItem._id,
              currentItem.price,
              paymentId
            );

            setTimeout(() => {
              navigation.navigate('ChatTab', {
                screen: 'Chat',
                params: {
                  conversationId,
                  secretData: currentItem,
                  conversation,
                  showModalOnMount: true
                }
              });
              setIsLoading(false);
            }, 1500);
          } catch (error) {
            console.error('Erreur lors de l\'achat:', error);
            setIsLoading(false);
          }
        }}
        onPaymentError={(error) => {
          console.error('Erreur de paiement:', error);
          setIsLoading(false);
        }}
      />
    </VStack>
  );
};


const styles = StyleSheet.create({
  container: {
    display: 'flex',
    flex: 1,
    height: '100%',
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
    height: SCREEN_HEIGHT * 0.45, //    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 10,
    shadowColor: 'violet',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,

  },

  h3: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '700',
    fontFamily: 'SF-Pro-Display-Bold',
  },

  caption: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '500',
    fontFamily: 'SF-Pro-Display-Medium',
  },


});

export default SwipeDeck;