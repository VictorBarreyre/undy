import React from 'react';
import { View } from 'react-native';
import { Text, VStack, Box, Button } from 'native-base'; // Import NativeBase components
import SwipeDeck from '../components/SwipeDeck';
import FilterBar from '../components/Filter.bar';
import { CardDataProvider } from '../../infrastructure/context/CardDataContexte'; // Importer le fournisseur du contexte
import { styles } from '../../infrastructure/theme/styles';
import { Background } from '../../navigation/Layout'; // Import du composant Background

const Home = () => {
  const onSwipeRight = item => {
    console.log('Swiped right on:', item);
  };

  const onSwipeLeft = item => {
    console.log('Swiped left on:', item);
  };


  return (
    <Background>
      <CardDataProvider>
        <FilterBar />
        <VStack style={styles.containerHome} space={4}>
        <Text style={styles.h3}>Les derniers secrets</Text>
          <Box flex={1} justifyContent="center" alignItems="center">
            <SwipeDeck
              style={styles.swipper}
              onSwipeRight={onSwipeRight}
              onSwipeLeft={onSwipeLeft}
            />
            <Button>Dévoiler le secret pour 2,90€</Button>
          </Box>
        </VStack>
      </CardDataProvider>
    </Background>
  );
};

export default Home;
