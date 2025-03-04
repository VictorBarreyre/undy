import React, { useState, useRef, useEffect, useContext } from 'react';
import { Box, Button, Icon, HStack, Input, Checkbox, Divider, Image, VStack, Radio } from 'native-base';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faSearch, faTimes, faChevronDown } from '@fortawesome/free-solid-svg-icons';
import { Modal, Pressable, Text, View, FlatList, ScrollView, StyleSheet, SafeAreaView, Alert } from 'react-native';
import { useCardData } from '../../infrastructure/context/CardDataContexte';
import { AuthContext } from '../../infrastructure/context/AuthContext';
import { BlurView } from '@react-native-community/blur';
import { styles } from '../../infrastructure/theme/styles';
import LinearGradient from 'react-native-linear-gradient';
import { useNavigation } from "@react-navigation/native";

const FilterBar = ({ onFilterChange, onTypeChange }) => {
  const { data } = useCardData();
  const { getContacts, userData } = useContext(AuthContext);
  const [activeButton, setActiveButton] = useState('Tous');
  const [selectedFilters, setSelectedFilters] = useState([]);
  const [selectedType, setSelectedType] = useState('Tous');
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredResults, setFilteredResults] = useState([]);
  const [isOverlayVisible, setOverlayVisible] = useState(false);
  const [userContacts, setUserContacts] = useState([]);
  const [hasContactPermission, setHasContactPermission] = useState(userData?.contacts || false);

  const navigation = useNavigation();

  // Nettoyage des données pour éviter les doublons ou les valeurs invalides
  const labels = [...new Set(data.map((card) => card.label?.trim()).filter(Boolean))];

  const handleCheckboxChange = (value) => {
    const updatedFilters = selectedFilters.includes(value)
      ? selectedFilters.filter((filter) => filter !== value)
      : [...selectedFilters, value];

    setSelectedFilters(updatedFilters);
    onFilterChange(updatedFilters);
  };

  const handleContactsPermission = async () => {
    try {
      if (!hasContactPermission) {
        // Demander l'autorisation d'accès aux contacts
        const contacts = await getContacts();
        if (contacts && contacts.length > 0) {
          setHasContactPermission(true);
          setUserContacts(contacts);
          // Mettre à jour le type et filtrer les données
          setActiveButton('Contacts');
          onTypeChange('Contacts');
          return true;
        } else {
          return false;
        }
      }
      return true;
    } catch (error) {
      console.error('Erreur lors de la demande d\'accès aux contacts:', error);
      Alert.alert(
        "Erreur",
        "Impossible d'accéder à vos contacts. Veuillez vérifier les permissions de l'application."
      );
      return false;
    }
  };

  const handleButtonClickType = async (buttonName) => {
    if (buttonName === 'Contacts') {
      const hasPermission = await handleContactsPermission();
      if (!hasPermission) {
        return; // Ne pas continuer si l'autorisation n'est pas accordée
      }
      // Si l'utilisateur a accordé l'accès, le code continue normalement
    }

    setActiveButton(buttonName);
    onTypeChange(buttonName);
  };

  // Filtrer les données en fonction de l'entrée utilisateur
  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredResults([]);
    } else {
      const query = searchQuery.toLowerCase();
      const results = data.filter(
        (item) =>
          item.content.toLowerCase().includes(query) ||
          item.user?.name.toLowerCase().includes(query)
      );
      setFilteredResults(results);
    }
  }, [searchQuery, data]);

  // Charger les contacts si l'utilisateur a déjà accordé l'autorisation
  useEffect(() => {
    const loadContacts = async () => {
      if (userData?.contacts) {
        try {
          const contacts = await getContacts();
          setUserContacts(contacts);
          setHasContactPermission(true);
        } catch (error) {
          console.error('Erreur lors du chargement des contacts:', error);
        }
      }
    };

    loadContacts();
  }, [userData?.contacts]);

  const buttonTypes = ['Tous', 'Contacts', 'Catégories'];

  return (
    <Box width="100%" paddingY={2} marginLeft={4}>
      <HStack width='100%' space={1}>
        <View style={styles.containerFilter}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scrollContainer}>
            {buttonTypes.map((type, index) => {
              if (type === 'Catégories') {
                return (
                  <Button
                    key={type}
                    marginRight={16}
                    variant="secondary"
                    style={[
                      activeButton === type ? styles.activeButton : styles.inactiveButton,
                      {
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        paddingHorizontal: 26,
                        paddingVertical: 8,
                        borderRadius: 999,
                      }
                    ]}
                    onPress={() => setOverlayVisible(true)}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Text style={activeButton === type ? styles.activeText : styles.inactiveText}>
                        {type}
                      </Text>
                      <FontAwesomeIcon
                        icon={faChevronDown}
                        size={16}
                        color={activeButton === type ? styles.activeText.color : styles.inactiveText.color}
                        style={{ marginLeft: 8 }}
                      />
                    </View>
                  </Button>
                );
              }

              return (
                <Pressable
                  key={type}
                  marginRight={12}
                  onPress={() => handleButtonClickType(type)}
                >
                  {activeButton === type ? (
                    <LinearGradient
                      colors={['#FF587E', '#CC4B8D']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 0.8, y: 1 }}
                      style={{
                        paddingHorizontal: 26,
                        paddingVertical: 8,
                        borderRadius: 999,
                      }}
                    >
                      <Text style={styles.activeText}>{type}</Text>
                    </LinearGradient>
                  ) : (
                    <View
                      style={[
                        styles.inactiveButton,
                        {
                          paddingHorizontal: 26,
                          paddingVertical: 8,
                          borderRadius: 999,
                        }
                      ]}
                    >
                      <Text style={styles.inactiveText}>{type}</Text>
                    </View>
                  )}
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* Modale des préférences */}
        <Modal
          animationType="swipe"
          transparent={true}
          visible={isOverlayVisible}
          onRequestClose={() => setOverlayVisible(false)}
        >
          <BlurView
            style={[
              styles.blurBackground,
              { backgroundColor: 'rgba(0, 0, 0, 0.2)' }
            ]}
            blurType="light"
            blurAmount={8}
            reducedTransparencyFallbackColor="rgba(255, 255, 255, 0.8)"
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
                              ? '#FF78B2'
                              : 'rgba(148, 163, 184, 0.5)',
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