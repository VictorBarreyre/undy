import React, { useState, useRef, useEffect } from 'react';
import { Box, Button, Icon, HStack, Input, Checkbox, Divider } from 'native-base';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faSearch, faSlidersH, faTimes } from '@fortawesome/free-solid-svg-icons';
import { Modal, Pressable, Text, View, FlatList } from 'react-native';
import { useCardData } from '../../infrastructure/context/CardDataContexte';
import { BlurView } from '@react-native-community/blur';
import { styles } from '../../infrastructure/theme/styles';

const FilterBar = ({ onFilterChange }) => {
  const { data } = useCardData();
  const [isOverlayVisible, setOverlayVisible] = useState(false);
  const [isSearchModalVisible, setSearchModalVisible] = useState(false);
  const [selectedFilters, setSelectedFilters] = useState([]);
  const [isInputFocused, setInputFocused] = useState(false); // Contrôle manuel du focus
  const inputRef = useRef(null); // Référence pour l'élément Input
  const [searchQuery, setSearchQuery] = useState(""); // État pour l'entrée de recherche
  const [filteredResults, setFilteredResults] = useState([]); // Résultats filtrés



  // Nettoyage des données pour éviter les doublons ou les valeurs invalides
  const labels = [...new Set(data.map((card) => card.label?.trim()).filter(Boolean))];

  const handleCheckboxChange = (value) => {
    const updatedFilters = selectedFilters.includes(value)
      ? selectedFilters.filter((filter) => filter !== value)
      : [...selectedFilters, value];

    setSelectedFilters(updatedFilters);
    onFilterChange(updatedFilters); // Remonte les filtres au parent
  };

  console.log(isSearchModalVisible, isInputFocused)

  const closeSearchModal = () => {
    setSearchModalVisible(false);
    setInputFocused(false); // Indique que l'Input n'est plus actif
    inputRef.current?.blur(); // Force le champ à perdre le focus
  };

  const openSearchModal = () => {
    if (!isSearchModalVisible) {
      setSearchModalVisible(true);
      setInputFocused(true); // Marque l'Input comme actif
    }
  };


    // Filtrer les données en fonction de l'entrée utilisateur
    useEffect(() => {
      if (searchQuery.trim() === "") {
        setFilteredResults([]); // Si aucune recherche, pas de résultats
      } else {
        const query = searchQuery.toLowerCase();
        const results = data.filter(
          (item) =>
            item.content.toLowerCase().includes(query) || // Rechercher dans le contenu des secrets
            item.user?.name.toLowerCase().includes(query) // Rechercher dans les noms des utilisateurs
        );
        setFilteredResults(results);
      }
    }, [searchQuery, data]);
  

  return (
    <Box width="100%" paddingX={5} paddingY={2}>
      <HStack space={1} alignItems="center" width="100%">
        {/* Bouton pour ouvrir le filtre */}
        <Pressable
          onPress={() => setOverlayVisible(true)} // Ouvre la modale
          style={{
            padding: 10, // Facultatif : pour augmenter la zone cliquable
            borderRadius: 50, // Reproduit l'apparence arrondie du bouton
            backgroundColor: 'transparent', // Maintient un fond transparent
          }}
        >
          <Icon
            as={<FontAwesomeIcon icon={faSlidersH} />}
            size={18}
            color="black"
          />
        </Pressable>
        {/* Première modale : Préférences */}
        <Modal
          animationType="fade"
          transparent={true}
          visible={isOverlayVisible}
          onRequestClose={() => setOverlayVisible(false)}
        >

          <BlurView
            style={[
              styles.blurBackground,
              { backgroundColor: 'rgba(0, 0, 0, 0.1)' } // Fond noir transparent
            ]}
            blurType="light"
            blurAmount={8}
            reducedTransparencyFallbackColor="rgba(255, 255, 255, 0.8)" // Fallback pour Android
          >
            <View style={styles.overlayModal}>
              <Box style={styles.overlayContent}>
                <HStack paddingY={2} justifyContent="space-between" alignItems="center" width="100%">
                  <Text style={styles.h3}>Préférences</Text>
                  <Pressable
                    style={styles.closeButton}
                    onPress={() => setOverlayVisible(false)}
                  >
                    <FontAwesomeIcon icon={faTimes} size={24} color="black" />
                  </Pressable>
                </HStack>
                <Box marginTop={6} width="100%">
                  {labels.map((label, index) => (
                    <Box key={`${label}-${index}`}>
                      <HStack
                        width="100%"
                        justifyContent="space-between"
                        alignItems="center"
                        paddingY={5}
                      >
                        <Text style={styles.h5}>{label}</Text>
                        <Checkbox
                          value={label}
                          aria-label={label}
                          style={{
                            borderColor: selectedFilters.includes(label) ? '#FF78B2' : '#FF78B2',
                            borderWidth: 1,
                          }}
                          _checked={{
                            bg: '#FF78B2',
                            borderColor: '#FF78B2',
                            _icon: { color: 'white' },
                          }}
                          isChecked={selectedFilters.includes(label)}
                          onChange={() => handleCheckboxChange(label)}
                        />
                      </HStack>
                      <Divider opacity={30} bg="#94A3B8" />
                    </Box>
                  ))}
                </Box>
              </Box>
            </View>
          </BlurView>
        </Modal>

        {/* Barre de recherche */}
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
          <HStack
            alignItems="center"
            paddingX={4}
            paddingY={2}
          >
            {/* Icône */}
            <Icon
              as={<FontAwesomeIcon icon={faSearch} />}
              size="5"
              color="#94A3B8"
            />
            {/* Faux champ de saisie */}
            <Pressable
              flex={1}
              onPress={() => {
                if (!isSearchModalVisible) {
                  openSearchModal(); // Ouvrir la modale
                }
              }}
              style={{
                paddingVertical: 10,
                paddingHorizontal: 12,
                borderRadius: 4,
                backgroundColor: 'transparent', // Transparent ou couleur d'arrière-plan
              }}
            >
              <Text
                style={{
                  fontSize: 14,
                  color: '#94A3B8',
                }}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                Rechercher un secret ou un utilisateur
              </Text>
            </Pressable>
          </HStack>
        </Box>

        {/* Deuxième modale : Recherche */}
        <Modal
          animationType="fade"
          transparent={true}
          visible={isSearchModalVisible}
          onRequestClose={closeSearchModal}
          zIndex='99'
        >
          <BlurView
            style={[
              styles.blurBackground,
              { backgroundColor: 'rgba(0, 0, 0, 0.1)' } // Fond noir transparent
            ]}
            blurType="light"
            blurAmount={8}
            reducedTransparencyFallbackColor="rgba(255, 255, 255, 0.8)" // Fallback pour Android
          >
            <View style={styles.overlayModal}>
              <Box style={styles.overlayContent}>
                <HStack space={4} justifyContent="space-between" alignItems="center" width="100%" paddingRight={1} paddingBottom={4}>
                  <Pressable
                    style={styles.closeButton}
                    onPress={() => setSearchModalVisible(false)}
                  >
                    <FontAwesomeIcon icon={faTimes} size={24} color="black" />
                  </Pressable>

                  <HStack
                    alignItems="center"
                    paddingX={4}
                    paddingY={1}
                    borderRadius="full"
                    backgroundColor="white"
                    width="90%" // Limite la largeur à 90% de l'écran
                    maxWidth="100%" // Empêche tout dépassement
                  >
                    {/* Icône dans l'Input */}
                    <Icon
                      as={<FontAwesomeIcon icon={faSearch} />}
                      size="5"
                      color="#94A3B8"
                      marginRight={0}
                    // Ajoute un espace entre l'icône et le texte
                    />
                    {/* Champ de saisie */}
                    <Input
                      ref={inputRef}
                      flex={1}
                      placeholder="Rechercher un secret ou un utilisateur"
                      variant="unstyled"
                      fontSize="14"
                      paddingX={4}
                      paddingLeft={3}
                      _focus={{
                        borderColor: 'transparent', // Supprime la bordure focus
                      }}
                      placeholderTextColor="#94A3B8"
                      value={searchQuery}
                      onChangeText={setSearchQuery}
                    />
                  </HStack>

                </HStack>
                <Box marginTop={6} width="100%">

                {filteredResults.length > 0 ? (
                <FlatList
                  data={filteredResults}
                  keyExtractor={(item) => item._id}
                  renderItem={({ item }) => (
                    <Pressable
                      style={styles.resultItem}
                      onPress={() => {
                        console.log("Résultat sélectionné :", item);
                        // Gérer la redirection ou l'action ici
                      }}
                    >
                      <Text style={styles.resultText}>
                        {item.content} - {item.user?.name}
                      </Text>
                    </Pressable>
                  )}
                />
              ) : (
                searchQuery.trim() !== "" && (
                  <Text style={styles.noResultsText}>Aucun résultat trouvé</Text>
                )
              )}
                </Box>
              </Box>
            </View>
          </BlurView>
        </Modal>
      </HStack>
    </Box>
  );
};

export default FilterBar;
