import React, { useState } from 'react';
import { Box, VStack } from 'native-base';
import SwipeDeck from '../components/SwipeDeck';
import FilterBar from '../components/Filter.bar';
import { CardDataProvider } from '../../infrastructure/context/CardDataContexte';
import { styles } from '../../infrastructure/theme/styles';
import { Background } from '../../navigation/Layout';

const Home = () => {

    const [selectedFilters, setSelectedFilters] = useState([]);

  return (
    <Background>
      <CardDataProvider>
        <Box paddingTop={2} width="100%">
          <FilterBar onFilterChange={setSelectedFilters} />
        </Box>
        <VStack style={styles.containerHome} space={4}>
          <Box flex={1} justifyContent="center" alignItems="center">
            <SwipeDeck selectedFilters={selectedFilters} style={styles.swipper} />
          </Box>
        </VStack>
      </CardDataProvider>
    </Background>
  );
};

export default Home;
