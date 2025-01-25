import React, { useState } from 'react';
import { Box, VStack, Text, HStack } from 'native-base';
import SwipeDeck from '../components/SwipeDeck';
import FilterBar from '../components/Filter.bar';
import { styles } from '../../infrastructure/theme/styles';
import { Background } from '../../navigation/Background';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faEllipsis } from '@fortawesome/free-solid-svg-icons';

const Home = () => {

  const [selectedFilters, setSelectedFilters] = useState([]);
  const [activeType, setActiveType] = useState('Tous'); // Gère le type de contenu sélectionné

  const typeTexts = {
    Tous: "De tout le monde",
    Contacts: "De vos contacts",
    Suivis: "Des personnes que vous suivez"
  };

  const handleFilterChange = (filters) => {
    setSelectedFilters(filters);
    console.log("Filtres sélectionnés :", filters);
  };

  const handleTypeChange = (type) => {
    setActiveType(type);
    console.log("Type sélectionné :", type);
  };

  return (
    <Background>

      <Box alignItems='center' alignContent='center' paddingTop={2} width="100%">
      <FilterBar onTypeChange={setActiveType} onFilterChange={setSelectedFilters} />
      </Box>
      <VStack style={styles.containerHome} space={4}>
        <VStack paddingLeft={1} space={0}>
          <HStack alignItems='center' justifyContent='space-between'>
            <Text paddingBottom={1} style={styles.h3}>Les derniers Undy </Text>
            <FontAwesomeIcon
              icon={faEllipsis} // Icône des trois points
              size={16}
              color='black'
              style={{ marginRight: 10 }}
            />
          </HStack>
          <Text paddingBottom={2} color='#94A3B8' style={styles.caption}>{typeTexts[activeType]} </Text>
        </VStack>
        <Box flex={1} justifyContent="center" alignContent='center' alignItems="center">
          <SwipeDeck selectedFilters={selectedFilters} style={styles.swipper} />
        </Box>
      </VStack>
    </Background>
  );
};

export default Home;
