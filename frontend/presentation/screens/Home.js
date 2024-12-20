// screens/Home.js
import React from 'react';
import { View } from 'react-native';
import { Button, Text, VStack } from 'native-base'; // Import NativeBase components
import SwipeDeck from '../components/SwipeDeck'; 
import FilterBar from '../components/Filter.bar';
import { CardDataProvider } from '../../infrastructure/context/CardDataContexte'; // Importer le fournisseur du contexte
import { styles } from '../../infrastructure/theme/styles';

const Home = () => {
  const onSwipeRight = item => {
    console.log('Swiped right on:', item);
  };

  const onSwipeLeft = item => {
    console.log('Swiped left on:', item);
  };

  const handleRevealSecret = () => {
    console.log('Secret revealed!');
  };

  return (
    <CardDataProvider>
      <VStack style={styles.containerHome} space={4}>
        <FilterBar />
        <SwipeDeck 
          style={styles.swipper}
          onSwipeRight={onSwipeRight}
          onSwipeLeft={onSwipeLeft}
        />
        <Button
          onPress={handleRevealSecret}
          borderRadius="full"
          variant="primary"
          alignSelf="center"
          mt={6}
        >
          Dévoiler le secret 👀
        </Button>
      </VStack>
    </CardDataProvider>
  );
};

export default Home;
