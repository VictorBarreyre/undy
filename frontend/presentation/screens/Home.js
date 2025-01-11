import React, { useState } from 'react';
import { Box, VStack } from 'native-base';
import SwipeDeck from '../components/SwipeDeck';
import FilterBar from '../components/Filter.bar';
import { styles } from '../../infrastructure/theme/styles';
import { Background } from '../../navigation/Background';
import { useCardData } from '../../infrastructure/context/CardDataContexte';

const Home = () => {

    const [selectedFilters, setSelectedFilters] = useState([]);

    return (
      <Background>
        <Box paddingTop={2} width="100%">
          <FilterBar onFilterChange={setSelectedFilters} />
        </Box>
        <VStack style={styles.containerHome} space={4}>
          <Box flex={1} justifyContent="center" alignContent='center' alignItems="center">
            <SwipeDeck selectedFilters={selectedFilters} style={styles.swipper} />
          </Box>
        </VStack>
      </Background>
    );
  };

export default Home;
