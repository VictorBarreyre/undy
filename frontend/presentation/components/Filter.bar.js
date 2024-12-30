import React, { useState } from 'react';
import { Box, Button, Icon, HStack, Input, Checkbox, Divider } from 'native-base';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faSearch, faSlidersH, faTimes } from '@fortawesome/free-solid-svg-icons';
import { Modal, Pressable, Text, View } from 'react-native';
import { useCardData } from '../../infrastructure/context/CardDataContexte';
import { BlurView } from '@react-native-community/blur';
import { styles } from '../../infrastructure/theme/styles';



const FilterBar = ({ onFilterChange }) => {
  const { data } = useCardData();
  const [isOverlayVisible, setOverlayVisible] = useState(false);
  const [selectedFilters, setSelectedFilters] = useState([]);

  const labels = [...new Set(data.map((card) => card.label))];

  const handleCheckboxChange = (value) => {
    const updatedFilters = selectedFilters.includes(value)
      ? selectedFilters.filter((filter) => filter !== value)
      : [...selectedFilters, value];

    setSelectedFilters(updatedFilters);
    onFilterChange(updatedFilters); // Remonte les filtres au parent
  };

  return (
    <Box width="100%" paddingRight={5} paddingY={2}>
      <HStack space={0} alignItems="center" width="100%">
        <Button
          variant="outline"
          backgroundColor="transparent"
          rounded="full"
          borderColor="transparent"
          onPress={() => setOverlayVisible(true)}
          leftIcon={<FontAwesomeIcon icon={faSlidersH} size={18} color="black" />}
        />
        <Modal
          animationType="slide"
          transparent={true}
          visible={isOverlayVisible}
          onRequestClose={() => setOverlayVisible(false)}
        >
          <BlurView
            style={styles.blurBackground}
            blurType="light"
            blurAmount={8}
            reducedTransparencyFallbackColor="rgba(255, 255, 255, 0.8)"
          >
            <View style={styles.overlayModal}>
              <Box style={styles.overlayContent}>
                <HStack justifyContent="space-between" alignItems="center" width="100%">
                  <Text style={styles.h3}>Préférences</Text>
                  <Pressable
                    style={styles.closeButton}
                    onPress={() => setOverlayVisible(false)}
                  >
                    <FontAwesomeIcon icon={faTimes} size={24} color="black" />
                  </Pressable>
                </HStack>
                <Box marginTop={6} width="100%">
                  {labels.map((label) => (
                    <Box key={label}>
                      <HStack
                        width="100%"
                        justifyContent="space-between"
                        alignItems="center"
                        paddingY={5}
                      >
                        <Text>{label}</Text>
                        <Checkbox
                          value={label}
                          _unchecked={{
                            borderColor: 'gray.500',
                            borderWidth: 2,
                            bg: 'transparent',
                          }}
                          _checked={{
                            bg: 'black',
                            borderColor: 'black',
                            _icon: { color: 'white' },
                          }}
                          isChecked={selectedFilters.includes(label)}
                          onChange={() => handleCheckboxChange(label)}
                        />
                      </HStack>
                      <Divider bg="#94A3B8" />
                    </Box>
                  ))}
                </Box>
              </Box>
            </View>
          </BlurView>
        </Modal>
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
          <HStack alignItems="center" paddingX={4} paddingY={2}>
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
