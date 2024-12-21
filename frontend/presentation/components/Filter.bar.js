import React, { useState } from 'react';
import { Box, ScrollView, Button, Icon, HStack, Image } from 'native-base';
import { FontAwesome5 } from '@expo/vector-icons';

const FilterBar = () => {
  const [selectedFilter, setSelectedFilter] = useState(null);

  const filters = [
    { id: 'love', label: 'Amour', icon: require('../../assets/icons/coeur.png') },
    { id: 'work', label: 'Travail', icon: require('../../assets/icons/taff.png') },
    { id: 'events', label: 'Events',icon: require('../../assets/icons/teuf.png') },
    { id: 'family', label: 'Famille', icon: require('../../assets/icons/fam.png') },
    { id: 'hot', label: 'Hot', icon: require('../../assets/icons/chaud.png') }
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
            _text={{ fontSize: 'sm' }} // Reduce text size
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
           
              startIcon={
                <Image source={filter.icon} alt="icon" style={{ width: 20, height: 20 }} /> // Display custom image icon
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
