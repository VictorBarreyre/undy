import React, { useState } from 'react';
import { Box, ScrollView, Button, Icon, HStack, Text } from 'native-base';
import { FontAwesome5 } from '@expo/vector-icons';

const FilterBar = () => {
  const [selectedFilter, setSelectedFilter] = useState(null);

  const filters = [
    { id: 'love', label: 'Amour', icon: 'heart', color: 'black' },
    { id: 'work', label: 'Travail', icon: 'hammer', color: 'black' },
    { id: 'events', label: 'Events', icon: 'glass-cheers', color: 'black' },
    { id: 'family', label: 'Famille', icon: 'home', color: 'black' },
  ];

  return (
    <Box>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        _contentContainerStyle={{ px: 4, py: 2 }}
      >
        <HStack space={4}>
          <Button
            variant="outline"
            backgroundColor="transparent"
            rounded="full"
            borderColor="white"
            width="2%"
            onPress={() => console.log('Filter settings clicked')}
          >
            <Icon as={FontAwesome5} name="sliders-h" size="md" color="black" />
          </Button>

          {filters.map((filter) => (
            <Button
              key={filter.id}
              onPress={() => setSelectedFilter(filter.id)}
              variant={selectedFilter === filter.id ? 'solid' : 'outline'}
              bg={selectedFilter === filter.id ? filter.color : 'white'}
              borderColor='white'
              rounded="full"
              px={4}
              _text={{
                color: selectedFilter === filter.id ? 'white' : 'black',
                fontWeight: 'bold',
              }}
              startIcon={
                <Icon
                  as={FontAwesome5}
                  name={filter.icon}
                  size="sm"
                  color={selectedFilter === filter.id ? 'white' : filter.color}
                />
              }
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
