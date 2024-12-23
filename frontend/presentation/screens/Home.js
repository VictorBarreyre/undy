import React, { useState } from 'react';
import { View } from 'react-native';
import { Text, VStack, Box, Button, Icon } from 'native-base'; // Import NativeBase components
import SwipeDeck from '../components/SwipeDeck';
import FilterBar from '../components/Filter.bar';
import { CardDataProvider } from '../../infrastructure/context/CardDataContexte'; // Importer le fournisseur du contexte
import { styles } from '../../infrastructure/theme/styles';
import { Background } from '../../navigation/Layout'; // Import du composant Background
import { faUnlock } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';

const Home = () => {

  const [currentPrice, setCurrentPrice] = useState('2,90€'); // État pour le prix


  const onSwipeRight = (item) => {
    console.log('Swiped right on:', item);
    setCurrentPrice(`${item.price}€`); // Met à jour le prix en fonction de la carte swipée
  };

  const onSwipeLeft = (item) => {
    console.log('Swiped left on:', item);
    setCurrentPrice(`${item.price}€`); // Met à jour le prix en fonction de la carte swipée
  };


  return (
    <Background>
      <CardDataProvider>
        <Box paddingTop={2} width="100%" >
          <FilterBar />
        </Box>
        <VStack style={styles.containerHome} space={4}>
          <Box flex={1} justifyContent="center" alignItems="center">
            <SwipeDeck
              style={styles.swipper}
              onSwipeRight={onSwipeRight}
              onSwipeLeft={onSwipeLeft}
            />
            <Button
              leftIcon={
                <Icon
                  as={<FontAwesomeIcon icon={faUnlock} />}
                  size="sm"
                  color="white"
                  marginRight={1}
                />
              }
              variant="primary" // Utilise le style "primary" défini dans votre thème
            >
              Dévoiler le secret pour {currentPrice}
            </Button>
          </Box>
        </VStack>
      </CardDataProvider>
    </Background>
  );
};

export default Home;
