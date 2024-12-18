// screens/Home.js
import React from 'react';
import { View, Text } from 'react-native';
import SwipeDeck from '../components/SwipeDeck'; 
import FilterBar from '../components/Filter.bar';
import { CardDataProvider } from '../../infrastructure/context/CardDataContexte';  // Importer le fournisseur du contexte
import {styles} from '../../infrastructure/theme/styles'

const Home = () => {
  const onSwipeRight = item => {
    console.log('Swiped right on:', item);
  };

  const onSwipeLeft = item => {
    console.log('Swiped left on:', item);
  };

  return (
    <CardDataProvider>
      <View style={styles.containerHome}>
        <FilterBar/>
        <SwipeDeck 
          onSwipeRight={onSwipeRight}
          onSwipeLeft={onSwipeLeft}
        />
      </View>
    </CardDataProvider>
  );
};

export default Home;
