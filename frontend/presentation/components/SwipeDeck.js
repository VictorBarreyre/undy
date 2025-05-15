import React, { useState, useRef, useEffect, useContext } from 'react';
import { Animated, PanResponder, Dimensions, StyleSheet, View } from 'react-native';
import { Box, Spinner, Text, VStack } from 'native-base';
import { useCardData } from '../../infrastructure/context/CardDataContexte';
import { AuthContext } from '../../infrastructure/context/AuthContext';
import CardHome from './CardHome';
import { useNavigation } from '@react-navigation/native';
import PaymentSheet from './PaymentSheet';
import TypewriterSpinner from './TypewriterSpinner';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import TestNotificationButton from '../Notifications/TestNotificationButton';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SCREEN_HEIGHT = Dimensions.get('window').height
const SWIPE_THRESHOLD = 0.25 * SCREEN_WIDTH;
const SWIPE_OUT_DURATION = 300;

const SwipeDeck = ({ selectedFilters = [], activeType, userContacts, userLocation, isDataLoading }) => {
  const { data, purchaseAndAccessConversation, isLoadingData, fetchUnpurchasedSecrets } = useCardData();
  const { isLoggedIn } = useContext(AuthContext);
  const position = useRef(new Animated.ValueXY()).current;
  const [currentIndex, setCurrentIndex] = useState(0);
  const [filteredData, setFilteredData] = useState([]);
  const [currentItem, setCurrentItem] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasAttemptedRefresh, setHasAttemptedRefresh] = useState(false);
  const navigation = useNavigation();
  const [isTransitioning, setIsTransitioning] = useState(false);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const { t } = useTranslation();
  const prevActiveType = useRef(activeType);
  const prevSelectedFilters = useRef(selectedFilters);

  useFocusEffect(
    React.useCallback(() => {
      setIsTransitioning(false);
      setIsLoading(false);
      fadeAnim.setValue(1);
    }, [])
  );

  // Effet pour charger les données initiales quand l'utilisateur est connecté
  useEffect(() => {
    const loadInitialData = async () => {
      if (isLoggedIn && data.length === 0 && !isDataLoading) {
        try {
          setIsLoading(true);
          await fetchUnpurchasedSecrets();
          console.log("Chargement initial des données effectué");
        } catch (error) {
          console.error(t('swipeDeck.errors.initialLoading'), error);
        } finally {
          setIsLoading(false);
        }
      }
    };
  
    loadInitialData();
  }, [isLoggedIn, data.length, isDataLoading]);

  // Effet pour détecter les changements de filtres et réinitialiser l'index
  useEffect(() => {
    const hasActiveTypeChanged = prevActiveType.current !== activeType;
    const hasSelectedFiltersChanged = JSON.stringify(prevSelectedFilters.current) !== JSON.stringify(selectedFilters);
    
    if (hasActiveTypeChanged || hasSelectedFiltersChanged) {
      console.log(`Filtres changés - activeType: ${activeType}, selectedFilters: ${selectedFilters.join(', ')}`);
      console.log(`Réinitialisation de l'index (était: ${currentIndex})`);
      setCurrentIndex(0); // Réinitialiser l'index lorsque les filtres changent
      position.setValue({ x: 0, y: 0 }); // Réinitialiser la position
      
      // Mettre à jour les références
      prevActiveType.current = activeType;
      prevSelectedFilters.current = [...selectedFilters];
    }
  }, [activeType, selectedFilters]);

  // Effet pour filtrer les données en fonction des filtres et des types
  useEffect(() => {
    const processData = () => {
      console.log(`Traitement des données: ${data.length} éléments, activeType: ${activeType}`);
      
      let filtered = [...data]; // Créer une copie pour éviter de modifier l'original

      // D'abord appliquer les filtres de catégorie
      if (selectedFilters.length > 0) {
        filtered = filtered.filter((card) => {
          return card.label && selectedFilters.includes(card.label);
        });
        console.log(`Après filtre par catégorie: ${filtered.length} éléments`);
      }

      // Puis appliquer les filtres par type
      if (activeType === t('filter.contacts') && userContacts && userContacts.length > 0) {
        filtered = filtered.filter((card) => {
          // S'assurer que les numéros de téléphone sont dans un format standard pour la comparaison
          if (!card.user || !card.user.phoneNumber) return false;
          const cardPhoneNumber = card.user.phoneNumber.replace(/\D/g, '');
          return userContacts.includes(cardPhoneNumber);
        });
        console.log(`Après filtre contacts: ${filtered.length} éléments`);
      } else if (activeType === t('filter.aroundMe') && userLocation) {
        // Les données devraient déjà être filtrées par localisation via l'API
        console.log(`Données de localisation: ${filtered.length} éléments proches`);
      }

      setFilteredData(filtered);
      if (filtered.length > 0) {
        // Utiliser 0 comme index après un changement de filtre
        const actualIndex = currentIndex % filtered.length;
        setCurrentItem(filtered[actualIndex]);
        console.log(`Élément courant défini: ${filtered[actualIndex]?.label || 'Sans étiquette'}`);
      } else {
        setCurrentItem(null);
        console.log("Aucun élément disponible après filtrage");
      }
      setIsLoading(false);
    };

    // Effectuer le filtrage uniquement si les données sont disponibles et pas en cours de chargement
    if (!isLoadingData && data.length > 0) {
      processData();
    } else if (!isLoadingData && data.length === 0) {
      setFilteredData([]);
      setCurrentItem(null);
      setIsLoading(false);
      console.log("Aucune donnée disponible");
    }
  }, [selectedFilters, data, currentIndex, isLoadingData, activeType, userContacts, userLocation, t]);

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

  const onSwipeComplete = (direction) => {
    setCurrentIndex(prevIndex => {
      const newIndex = prevIndex + 1;

      // Mise à jour du currentItem
      if (filteredData.length > 0) {
        const nextItemIndex = newIndex % filteredData.length;
        setCurrentItem(filteredData[nextItemIndex]);
        console.log(`Passage à l'élément suivant, index: ${nextItemIndex}`);
      }

      return newIndex;
    });
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
    if (filteredData.length === 0) {
      return null;  // Ceci sera géré par la condition qui suit plus bas
    }

    const cardsToRender = Math.min(5, filteredData.length);

    return [...Array(cardsToRender)].map((_, i) => {
      // Calcul de l'index actuel
      const cardIndex = (currentIndex + i) % filteredData.length;
      const card = filteredData[cardIndex];
      const isCurrentCard = i === 0;

      if (!card) return null;

      const cardHeight = getCardHeight();

      const cardStyle = isCurrentCard
        ? [getCardStyle(), styles.cardStyle]
        : [
          styles.cardStyle,
          {
            marginTop: 0, // Annule la marge par défaut
            position: 'absolute',
            height: cardHeight,
            top: 25 * i, // Utiliser i directement pour l'échelonnage
            transform: [{ scale: 1 - (0.05 * i) }],
          }
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

  // Afficher un message si aucune donnée n'est disponible après filtrage
  if (filteredData.length === 0) {
    return (
      <VStack flex={1} justifyContent="center" alignItems="center" p={4}>
        <Text style={styles.h3} textAlign="center">
        {t('swipeDeck.noSecrets')}
        </Text>
        <Text style={styles.caption} textAlign="center" color="#94A3B8" mt={2}>
          {selectedFilters.length > 0
              ? t('swipeDeck.tryChangingFilters')
            : activeType === t('filter.contacts')
              ? t('swipeDeck.noContactsUsingApp')
              : activeType === t('filter.aroundMe')
                ? t('swipeDeck.noSecretsNearby') 
                : t('swipeDeck.checkBackLater')}
        </Text>
        <TestNotificationButton />
      </VStack>
    );
  }

  // Afficher un indicateur de chargement pendant le chargement des données
  if (isLoading || isDataLoading) {
    return <TypewriterSpinner text="hushy..." />;
  }

  // Afficher un indicateur pendant la transition (achat)
  if (isTransitioning) {
    return <TypewriterSpinner text="hushy..." />;
  }

  const handlePaymentSuccess = async (paymentId) => {
    try {
      setIsTransitioning(true); // Démarre la transition

      // Animation de fondu
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(async () => {
        setIsLoading(true);

        // Une fois le fondu terminé, procéder à l'achat
        const { conversationId, conversation } = await purchaseAndAccessConversation(
          currentItem._id,
          currentItem.price,
          paymentId
        );

        // Navigation vers le chat
        navigation.navigate('ChatTab', {
          screen: 'Chat',
          params: {
            conversationId,
            secretData: currentItem,
            conversation,
            showModalOnMount: true
          }
        });
      });
    } catch (error) {
      console.error(t('swipeDeck.errors.purchase'), error);
      setIsLoading(false);
      setIsTransitioning(false);
      // Réinitialiser l'animation en cas d'erreur
      fadeAnim.setValue(1);
    }
  };

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <VStack style={styles.container}>
        <Box style={styles.cardContainer}>
          {renderCards()}
        </Box>
        {currentItem && (
          <PaymentSheet
            secret={currentItem}
            onPaymentSuccess={handlePaymentSuccess}
            onPaymentError={(error) => {
              console.error(t('swipeDeck.errors.payment'), error);
              setIsLoading(false);
              setIsTransitioning(false);
              fadeAnim.setValue(1);
            }}
          />
        )}
      </VStack>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    display: 'flex',
    flex: 1,
    height: '100%',
    width: '100%',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  cardContainer: {
    position: 'relative',
    width: '100%',
    height: '92%',
  },

  cardStyle: {
    width: SCREEN_WIDTH * 0.9,
    position: 'absolute',
    height: SCREEN_HEIGHT * 0.45,
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