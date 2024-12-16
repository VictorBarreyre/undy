import React from 'react';
import { Dimensions, FlatList, StyleSheet, View, Text } from 'react-native';
import { Box, HStack } from 'native-base';
import CardHome from '../components/CardHome';
import FilterBar from '../components/Filter.bar';
import { styles } from '../../infrastructure/theme/styles';

const { width } = Dimensions.get('window'); // Largeur de l'écran

export default function Home() {
  const cards = Array.from({ length: 10 }); // Crée un tableau avec 10 cartes

  const renderItem = () => (
    <View style={styles.cardContainer}>
      <CardHome />
    </View>
  );

  return (
    <Box flex={1} bg="transparent" alignItems="flex-start" px={4}>
      {/* Barre de filtres */}
      <Box width="100%" bg="transparent" py={4} alignItems="flex-start">
        <HStack space={2}>
          <FilterBar />
        </HStack>
      </Box>

      {/* Texte et slider */}
      <Box flex={1} bg="transparent" alignItems="flex-start" width="100%">
        {/* Texte "Alice Dupont" */}
        <Text style={styles.h2}>Alice Dupont</Text>

        {/* Slider horizontal */}
        <Box flex={1} bg="transparent" py={4}>
          <FlatList
            data={cards}
            renderItem={renderItem}
            keyExtractor={(_, index) => index.toString()}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={[styles.listContainer, { alignItems: 'flex-start' }]}
            snapToInterval={width * 0.75}
            decelerationRate="fast"
            snapToAlignment="center"
            inactiveSlideOpacity={0.7}
          />
        </Box>
      </Box>
    </Box>
  );
}


