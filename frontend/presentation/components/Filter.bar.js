import React, { useState } from 'react';
import { Box, Button, Icon, HStack, Input, Checkbox, Divider } from 'native-base';
import { FontAwesome5 } from '@expo/vector-icons';
import { faSearch, faSlidersH, faTimes } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { styles } from '../../infrastructure/theme/styles';
import { Modal, Pressable, Text, View } from 'react-native';
import { BlurView } from '@react-native-community/blur';

const FilterBar = () => {
  const [selectedFilter, setSelectedFilter] = useState(null);
  const [isOverlayVisible, setOverlayVisible] = useState(false); // État pour l'overlay
  const [selectedFilters, setSelectedFilters] = useState({
    partenaire: false,
  });

  return (
    <Box width="100%" paddingRight={5} paddingY={2}>
      <HStack space={0} alignItems="center" width="100%">
        {/* Bouton pour les filtres */}
        <Button
          variant="outline"
          backgroundColor="transparent"
          rounded="full"
          borderColor="transparent"
          onPress={() => setOverlayVisible(true)} // Ouvre l'overlay
          leftIcon={<FontAwesomeIcon icon={faSlidersH} size={18} color="black" />}
        ></Button>

        <Modal
          width="100%"
          animationType="slide"
          transparent={true}
          visible={isOverlayVisible}
          onRequestClose={() => setOverlayVisible(false)} // Gérer le retour Android
        >
          <BlurView
            style={styles.blurBackground}
            blurType="light"
            blurAmount={8}
            reducedTransparencyFallbackColor="rgba(255, 255, 255, 0.8)"
          >
            <View style={styles.overlayModal}>
              {/* Contenu de la modal */}
              <Box style={styles.overlayContent}>
                {/* Bouton fermer */}
                <HStack justifyContent="space-between" alignItems="center" width="100%">
                  {/* Titre */}
                  <Text style={styles.h3}>Préférences</Text>

                  {/* Bouton fermer */}
                  <Pressable
                    style={styles.closeButton}
                    onPress={() => setOverlayVisible(false)}
                  >
                    <FontAwesomeIcon icon={faTimes} size={24} color="black" />
                  </Pressable>
                </HStack>

                {/* Liste des checkboxes */}
                <Checkbox.Group>
                  <Box width="100%">
                    {/* Première option */}
                    <HStack
                      marginTop={4}
                      alignItems="center"
                      justifyContent="space-between"
                      width="100%"
                      paddingY={2}
                    >
                      <Text style={styles.filterOption}>Option 1</Text>
                      <Checkbox
                        value="option1"
                        _checked={{
                          bg: 'black',
                          borderColor: 'black',
                          _icon: { color: 'white' },
                        }}
                      />
                    </HStack>
                    <Divider bg="black" thickness="1" />
                    {/* Deuxième option */}
                    <HStack
                      marginTop={4}
                      alignItems="center"
                      justifyContent="space-between"
                      width="100%"
                      paddingY={2}
                    >
                      <Text style={styles.filterOption}>Option 2</Text>
                      <Checkbox
                        value="option2"
                        _checked={{
                          bg: 'black',
                          borderColor: 'black',
                          _icon: { color: 'white' },
                        }}
                      />
                    </HStack>
                    <Divider bg="black" thickness="1" />
                  </Box>
                </Checkbox.Group>
              </Box>
            </View>
          </BlurView>
        </Modal>

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
