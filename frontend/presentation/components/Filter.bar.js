import React, { useState } from 'react';
import { Box, ScrollView, Button, Icon, HStack, Image } from 'native-base';
import { FontAwesome5 } from '@expo/vector-icons';

const FilterBar = () => {
  const [selectedFilter, setSelectedFilter] = useState(null);

  const filters = [
    { id: 'love', label: 'Amour' },
    { id: 'work', label: 'Travail' },
    { id: 'events', label: 'Events'},
    { id: 'family', label: 'Famille' },
    { id: 'hot', label: 'Hot' }
  ];

  return (
    <Box paddingLeft='4' paddingTop='4' >
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        _contentContainerStyle={{ py: 2 }}
      >
        <HStack space={2}>
          <Button
            variant="outline"
            backgroundColor="transparent"
            rounded="full"
            borderColor="transparent"
            width="1.5%"
            paddingLeft='2'
            onPress={() => console.log('Filter settings clicked')}
            _icon={{ size: 'xs' }}  // Reduce icon size
          >
            <Icon as={FontAwesome5} name="sliders-h" size="md" color="black" />
          </Button>

          {filters.map((filter) => (
            <Button
              key={filter.id}
              onPress={() => setSelectedFilter(filter.id)}
              variant="secondary"          
              bg='white'
              borderColor={selectedFilter === filter.id ? '#F3B8A8' : 'transparent'}
              rounded="full"
           
            
            >
              {filter.label}
            </Button>
          ))}
        </HStack>
      </ScrollView>
    </Box>
  );
};

export default FilterBar;
