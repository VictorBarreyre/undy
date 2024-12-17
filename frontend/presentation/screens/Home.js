import React from 'react';
import { View, Text } from 'react-native';
import SwipeDeck from '../components/SwipeDeck'; 
import FilterBar from '../components/Filter.bar';


const Home = () => {
  const data = [
    { id: 1, text: 'Card 1' },
    { id: 2, text: 'Card 2' },
  ];

  const renderCard = item => (
    <View>
      <Text>{item.text}</Text>
    </View>
  );

  const onSwipeRight = item => {
    console.log('Swiped right on:', item);
  };

  const onSwipeLeft = item => {
    console.log('Swiped left on:', item);
  };

  return (
    <View style={{ flex: 1 }}>
      <FilterBar/>
      <SwipeDeck
        data={data}
        renderCard={renderCard}
        onSwipeRight={onSwipeRight}
        onSwipeLeft={onSwipeLeft}
      />
    </View>
  );
};

export default Home;