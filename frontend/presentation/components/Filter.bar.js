import React, { useState } from 'react';
import { Box, Button, Icon, HStack, Input } from 'native-base';
import { FontAwesome5 } from '@expo/vector-icons';
import { faSearch } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';


const FilterBar = () => {
  const [selectedFilter, setSelectedFilter] = useState(null);

  return (
    <Box width="100%" paddingRight={5} paddingY={2}>
      <HStack space={0} alignItems="center" width="100%">
        {/* Bouton pour les filtres */}
        <Button
          variant="outline"
          backgroundColor="transparent"
          rounded="full"
          borderColor="transparent"
          onPress={() => console.log('Filter settings clicked')}
        >
          <Icon as={FontAwesome5} name="sliders-h" size="md" color="black" />
        </Button>

        {/* Champ de recherche */}
        <Box
          
          flex={1} // Prend tout l'espace disponible
          borderRadius="full"
          overflow="hidden"
          shadow={2}
          backgroundColor="white"
          maxWidth="100%"
          style={{
            shadowColor: '#000',
            shadowOffset: { width: -4, height: -4 }, // Décalage de l'ombre intérieure
            shadowOpacity: 0.1,
            shadowRadius: 6,
            elevation: 2, // Ombre Android
          }}
        >
          <HStack  alignItems="center" paddingX={4} paddingY={2}>
            {/* Icône */}
            <Icon
              as={<FontAwesomeIcon icon={faSearch} />}
              size="5"
              color="gray.400"
            />
            {/* Champ de saisie */}
            <Input
              flex={1}
              placeholder="Rechercher un secret ou un utilisateur"
              variant="unstyled"
              fontSize="14"
              _focus={{
                borderColor: 'transparent', // Supprime la bordure focus
              }}
              placeholderTextColor="gray.400"
            />
          </HStack>
        </Box>
      </HStack>
    </Box>
  );
};

export default FilterBar;
