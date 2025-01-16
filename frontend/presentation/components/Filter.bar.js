import React, { useState, useRef, useEffect } from 'react';
import { Box, Button, Icon, HStack, Input, Checkbox, Divider, Image, VStack, Radio } from 'native-base';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faSearch, faTimes, faChevronDown } from '@fortawesome/free-solid-svg-icons';
import { Modal, Pressable, Text, View, FlatList, ScrollView, StyleSheet, SafeAreaView } from 'react-native';
import { useCardData } from '../../infrastructure/context/CardDataContexte';
import { BlurView } from '@react-native-community/blur';
import { styles } from '../../infrastructure/theme/styles';
import { DATABASE_URL } from '@env';
import { Background } from '../../navigation/Background';

const FilterBar = ({ onFilterChange }) => {
  const { data } = useCardData();
  const [activeButton, setActiveButton] = useState('Tous'); // L'état pour suivre le bouton actif
  const [isSearchModalVisible, setSearchModalVisible] = useState(false);
  const [selectedFilters, setSelectedFilters] = useState([]);
  const [isInputFocused, setInputFocused] = useState(false); // Contrôle manuel du focus
  const inputRef = useRef(null); // Référence pour l'élément Input
  const [searchQuery, setSearchQuery] = useState(""); // État pour l'entrée de recherche
  const [filteredResults, setFilteredResults] = useState([]); // Résultats filtrés
  const [isOverlayVisible, setOverlayVisible] = useState(false);


  const profilePictureUrl = data.user?.profilePicture
    ? `${DATABASE_URL}${data.user.profilePicture}`
    : `${DATABASE_URL}/uploads/default.png`;



  // Nettoyage des données pour éviter les doublons ou les valeurs invalides
  const labels = [...new Set(data.map((card) => card.label?.trim()).filter(Boolean))];

  const handleCheckboxChange = (value) => {
    const updatedFilters = selectedFilters.includes(value)
      ? selectedFilters.filter((filter) => filter !== value)
      : [...selectedFilters, value];

    setSelectedFilters(updatedFilters);
    onFilterChange(updatedFilters); // Remonte les filtres au parent
  };

  const handleButtonClick = (buttonName) => {
    setActiveButton(buttonName);

    if (buttonName === 'Catégories') {
      setCategoriesModalVisible(true); // Affiche l'overlay pour les catégories
    }
  };

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

  const getTimeAgo = (createdAt) => {
    const diffTime = Date.now() - new Date(createdAt);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Aujourd'hui";
    if (diffDays === 1) return "Hier";
    if (diffDays < 7) return `Il y a ${diffDays} jours`;
    if (diffDays < 30) return `Il y a ${Math.floor(diffDays / 7)} semaine${Math.floor(diffDays / 7) > 1 ? 's' : ''}`;
    if (diffDays < 365) return `Il y a ${Math.floor(diffDays / 30)} mois`;
    return `Il y a ${Math.floor(diffDays / 365)} an${Math.floor(diffDays / 365) > 1 ? 's' : ''}`;
  };

  const truncateText = (text, maxLength) => {
    if (text.length <= maxLength) {
      return text;
    }
    return text.substring(0, maxLength) + '...';
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

      console.log("Requête de recherche:", searchQuery);
      console.log("Résultats de la recherche:", results);
      console.log("Données brutes:", data);
    }
  }, [searchQuery, data]);




  return (
    <Box width="100%" paddingY={2}>
      <HStack width='110%' space={1}>
        {/* Bouton pour ouvrir le filtre */}
        <View style={styles.containerFilter}>
          {/* Section pour le bouton de recherche et les boutons de filtrage */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scrollContainer}>
            {/* Bouton de recherche */}
            <Pressable
              onPress={() => {
                if (!isSearchModalVisible) {
                  openSearchModal();
                }
              }}
              style={styles.searchButton}
            >
              <View style={styles.iconContainer}>
                <Icon
                  as={<FontAwesomeIcon icon={faSearch} />}
                  size={24} // Taille logique de l'icône
                  color="black"
                  style={styles.icon} // Style dédié
                />
              </View>
            </Pressable>
            {/* Boutons de filtrage */}
            <Button
              marginRight={3}
              variant='secondary'
              style={[
                activeButton === 'Tous' ? styles.activeButton : styles.inactiveButton
              ]}
              onPress={() => handleButtonClick('Tous')}
            >
              <Text style={activeButton === 'Tous' ? styles.activeText : styles.inactiveText}>Tous</Text>
            </Button>
            <Button
              marginRight={3}
              variant='secondary'
              style={[
                activeButton === 'Contacts' ? styles.activeButton : styles.inactiveButton
              ]}
              onPress={() => handleButtonClick('Contacts')}
            >
              <Text style={activeButton === 'Contacts' ? styles.activeText : styles.inactiveText}>Contacts</Text>
            </Button>
            <Button
              marginRight={3}
              variant='secondary'
              style={[
                activeButton === 'Suivis' ? styles.activeButton : styles.inactiveButton
              ]}
              onPress={() => handleButtonClick('Suivis')}
            >
              <Text style={activeButton === 'Suivis' ? styles.activeText : styles.inactiveText}>Suivis</Text>
            </Button>
            <Button
              marginRight={16}
              variant="secondary"
              style={[
                activeButton === 'Catégories' ? styles.activeButton : styles.inactiveButton,
                { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' } // Assure l'alignement horizontal
              ]}
              onPress={() => setOverlayVisible(true)} // Ouvre la modale
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text
                  style={activeButton === 'Catégories' ? styles.activeText : styles.inactiveText}
                >
                  Catégories
                </Text>
                <FontAwesomeIcon
                  icon={faChevronDown} // Icône du chevron
                  size={16} // Taille de l'icône
                  color={activeButton === 'Catégories' ? styles.activeText.color : styles.inactiveText.color} // Couleur cohérente
                  style={{ marginLeft: 8 }} // Espacement entre texte et icône
                />
              </View>
            </Button>

          </ScrollView>
        </View>

        {/* Modale : Recherche */}
        <Modal
          animationType="swipe"
          transparent={true}
          visible={isSearchModalVisible}
          onRequestClose={closeSearchModal}
          zIndex='99'
        >
          <BlurView
            style={[
              styles.blurBackground,
              { backgroundColor: 'rgba(0, 0, 0, 0.2)' } // Fond noir transparent
            ]}
            blurType="light"
            blurAmount={8}
            reducedTransparencyFallbackColor="rgba(255, 255, 255, 0.8)" // Fallback pour Android
          >
            <SafeAreaView style={styles.overlayModal}>
              <View style={styles.overlayContent}>
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
                    paddingY={2}
                    borderRadius="full"
                    backgroundColor="white"
                    height='auto'
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



       {/* Résultats de la recherche */}
                <Box width="100%">
                  {filteredResults.length > 0 ? (
                    <FlatList
                      marginTop={20}
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
                          <HStack alignContent='center' alignItems='center' space={4} width='100%'>
                            <Image
                              source={{
                                uri: profilePictureUrl
                              }}
                              alt={data[0]?.title || 'Carte'}
                              width={45} // Ajustez la taille de l'image ici
                              height={45} // Ajustez la taille de l'image ici
                              borderRadius="full" // Rendre l'image ronde
                            />

                            <VStack flex={1}>
                              <HStack space={2} justifyContent="space-between" flexWrap="wrap" marginBottom={2}>
                                <Text style={{ ...styles.h4, color: "#FF78B2", flexShrink: 1 }}>
                                  {item.user.name}
                                </Text>
                                <Text style={{ ...styles.caption, color: '#94A3B8', fontSize: 14 }}>{getTimeAgo(item.createdAt)}</Text>
                              </HStack>

                              <HStack justifyContent='space-between' flex={1}>
                                <HStack space={1} alignItems="center">
                                  <Text style={{ color: "#FF78B2", fontWeight: 'bold' }}>Secret :</Text>
                                  <Text style={{ ...styles.caption, flexShrink: 1 }}>
                                    {truncateText(item.content, 20)}
                                  </Text>
                                </HStack>
                                <Text style={{ ...styles.caption, color: '#94A3B8', fontSize: 14 }}>{item.label}</Text>
                              </HStack>

                            </VStack>
                          </HStack>
                          <Divider opacity={0.5} color='#FF78B2' my="4" />
                        </Pressable>
                      )}
                    />
                  ) : (
                    searchQuery.trim() !== "" && (
                      <Text style={{...styles.h4, marginTop:'20px'}}>Aucun résultat</Text>
                    )
                  )}
                </Box>
              </View>
            </SafeAreaView>
          </BlurView>
        </Modal>







        {/* Première modale : Préférences */}
        <Modal
          animationType="swipe"
          transparent={true}
          visible={isOverlayVisible}
          onRequestClose={() => setOverlayVisible(false)}
        >

          <BlurView
            style={[
              styles.blurBackground,
              { backgroundColor: 'rgba(0, 0, 0, 0.2)' } // Fond noir transparent
            ]}
            blurType="light"
            blurAmount={8}
            reducedTransparencyFallbackColor="rgba(255, 255, 255, 0.8)" // Fallback pour Android
          >
            <SafeAreaView style={styles.overlayModal}>
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
                            borderColor: selectedFilters.includes(label)
                              ? '#FF78B2' // Bordure pour les cases cochées
                              : 'rgba(148, 163, 184, 0.5)', // Bordure semi-transparente quand non cochée
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
            </SafeAreaView>
          </BlurView>
        </Modal>

      </HStack>
    </Box>
  );
};





export default FilterBar;
