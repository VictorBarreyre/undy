import React, { useState, useEffect, useContext } from 'react';
import { Box, Button, Checkbox, Divider } from 'native-base';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faTimes, faChevronDown } from '@fortawesome/free-solid-svg-icons';
import { Modal, Pressable, Text, View, ScrollView, SafeAreaView, Alert, Platform, PermissionsAndroid, Linking } from 'react-native';
import { useCardData } from '../../infrastructure/context/CardDataContexte';
import { AuthContext } from '../../infrastructure/context/AuthContext';
import { BlurView } from '@react-native-community/blur';
import { styles } from '../../infrastructure/theme/styles';
import LinearGradient from 'react-native-linear-gradient';
import { useNavigation } from "@react-navigation/native";
import InviteContactsModal from './InviteContactsModals';
import { useTranslation } from 'react-i18next';
import * as Location from 'expo-location';
import * as ExpoContacts from 'expo-contacts';

const FilterBar = ({ onFilterChange, onTypeChange, activeButton }) => {
  const { t } = useTranslation();
  const { data, fetchUnpurchasedSecrets, fetchSecretsByLocation } = useCardData();
  const { getContacts, userData } = useContext(AuthContext);
  const [selectedFilters, setSelectedFilters] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredResults, setFilteredResults] = useState([]);
  const [isOverlayVisible, setOverlayVisible] = useState(false);
  const [contactsData, setContactsData] = useState([]);
  const [showInviteModal, setShowInviteModal] = useState(false);

  const navigation = useNavigation();

  // Style d'ombre pour les boutons inactifs
  const inactiveShadowStyle = {
    shadowColor: '#94A3B8',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 2,
  };

  // Nettoyage des données pour éviter les doublons ou les valeurs invalides
  const labels = [...new Set(data.map((card) => card.label?.trim()).filter(Boolean))];

  // Effet pour synchroniser avec activeButton du parent
  useEffect(() => {
    console.log(`FilterBar: activeButton mis à jour: ${activeButton}`);
  }, [activeButton]);

  const handleCheckboxChange = (value) => {
    const updatedFilters = selectedFilters.includes(value)
      ? selectedFilters.filter((filter) => filter !== value)
      : [...selectedFilters, value];

    setSelectedFilters(updatedFilters);
    onFilterChange(updatedFilters);
  };

  // Fonction pour vérifier les permissions de contacts
  const checkContactsPermission = async () => {
    try {
      const { status } = await ExpoContacts.getPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      console.error('Erreur lors de la vérification des permissions de contacts:', error);
      return false;
    }
  };

  // Fonction pour vérifier les permissions de localisation
  const checkLocationPermission = async () => {
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      console.error('Erreur lors de la vérification des permissions de localisation:', error);
      return false;
    }
  };

  // Fonction pour ouvrir les paramètres système
  const openSettings = () => {
    Linking.openSettings();
  };

  // Fonction pour demander la permission de contacts et gérer le résultat
  const requestContactsPermission = async () => {
    try {
      const { status } = await ExpoContacts.requestPermissionsAsync();
      
      if (status === 'granted') {
        handleContactsPermissionSuccess();
      } else {
        showContactsPermissionAlert();
      }
    } catch (error) {
      console.error('Erreur lors de la demande de permission de contacts:', error);
      showContactsPermissionAlert();
    }
  };

  // Fonction pour demander la permission de localisation et gérer le résultat
  const requestLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status === 'granted') {
        handleLocationPermissionSuccess();
      } else {
        showLocationPermissionAlert();
      }
    } catch (error) {
      console.error('Erreur lors de la demande de permission de localisation:', error);
      showLocationPermissionAlert();
    }
  };

  // Actions à effectuer lorsque la permission de contacts est accordée
  const handleContactsPermissionSuccess = async () => {
    try {
      console.log("Permission de contacts accordée, chargement...");
      const contacts = await getContacts();
      setContactsData(contacts);
      
      const hasAppUsers = contacts.some(contact => contact.usesApp === true);
      
      if (!hasAppUsers && contacts.length > 0) {
        setShowInviteModal(true);
      }
      
      onTypeChange(t('filter.contacts'));
      console.log("Notification de changement vers contacts envoyée au parent");
    } catch (error) {
      console.error('Erreur lors du chargement des contacts:', error);
      Alert.alert(
        t('permissions.errorTitle'),
        t('permissions.contactsLoadError'),
        [{ text: t('permissions.ok') }]
      );
    }
  };

  // Actions à effectuer lorsque la permission de localisation est accordée
  const handleLocationPermissionSuccess = async () => {
    try {
      console.log("Permission de localisation accordée");
      onTypeChange(t('filter.aroundMe'));
      console.log("Notification de changement vers aroundMe envoyée au parent");
    } catch (error) {
      console.error('Erreur lors de la gestion de la permission de localisation:', error);
      Alert.alert(
        t('permissions.errorTitle'),
        t('permissions.locationError'),
        [{ text: t('permissions.ok') }]
      );
    }
  };

  // Alerte pour informer l'utilisateur que l'accès aux contacts est nécessaire
  const showContactsPermissionAlert = () => {
    Alert.alert(
      t('permissions.contactsNeededTitle'),
      t('permissions.contactsNeededMessage'),
      [
        { 
          text: t('permissions.cancel'), 
          style: 'cancel' 
        },
        { 
          text: t('permissions.openSettings'), 
          onPress: openSettings 
        }
      ]
    );
  };

  // Alerte pour informer l'utilisateur que l'accès à la localisation est nécessaire
  const showLocationPermissionAlert = () => {
    Alert.alert(
      t('permissions.locationNeededTitle'),
      t('permissions.locationNeededMessage'),
      [
        { 
          text: t('permissions.cancel'), 
          style: 'cancel' 
        },
        { 
          text: t('permissions.openSettings'), 
          onPress: openSettings 
        }
      ]
    );
  };

  // Fonction pour gérer le clic sur un bouton de type
  const handleButtonClickType = async (buttonName) => {
    console.log(`Clic sur le bouton: ${buttonName}`);
    
    if (buttonName === activeButton) {
      console.log("Ce filtre est déjà actif, aucune action");
      return;
    }
    
    if (buttonName === t('filter.contacts')) {
      const hasPermission = await checkContactsPermission();
      
      if (hasPermission) {
        handleContactsPermissionSuccess();
      } else {
        requestContactsPermission();
      }
    } 
    else if (buttonName === t('filter.aroundMe')) {
      const hasPermission = await checkLocationPermission();
      
      if (hasPermission) {
        handleLocationPermissionSuccess();
      } else {
        requestLocationPermission();
      }
    } 
    else {
      onTypeChange(buttonName);
      console.log(`Notification de changement vers ${buttonName} envoyée au parent`);
    }
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

  const buttonTypes = [
    t('filter.all'),
    t('filter.contacts'),
    t('filter.aroundMe'),
    t('filter.categories')
  ];

  return (
    <Box width="100%" paddingTop={1} paddingBottom={2} >
      <View style={{ flexDirection: 'row', width: '100%'}}>
        <View style={styles.containerFilter}>
          <ScrollView paddingLeft={6} horizontal showsHorizontalScrollIndicator={false} style={styles.scrollContainer}   contentContainerStyle={{
    paddingBottom: 4, // Ajouter de l'espace pour l'ombre
       // Un peu d'espace en haut aussi
  }}>
            {buttonTypes.map((type) => {
              if (type === t('filter.categories')) {
                return (
                  <Button
                    key={type}
                    marginRight={4}
                    marginLeft={3}
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
                        // Ombre seulement si le bouton est inactif
                        ...(activeButton !== type && inactiveShadowStyle)
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
                  marginRight={4}
                  marginLeft={12}
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
                          ...inactiveShadowStyle // Ombre appliquée ici
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

        <InviteContactsModal
          isVisible={showInviteModal}
          onClose={() => setShowInviteModal(false)}
          contacts={contactsData}
        />

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
                <View style={{ flexDirection: 'row', paddingVertical: 8, justifyContent: "space-between", alignItems: "center", width: "100%" }}>
                  <Text style={styles.h3}>{t('filter.preferences')}</Text>
                  <Pressable
                    style={styles.closeButton}
                    onPress={() => setOverlayVisible(false)}
                  >
                    <FontAwesomeIcon icon={faTimes} size={24} color="black" />
                  </Pressable>
                </View>
                <Box marginTop={6} width="100%">
                  {labels.map((label, index) => (
                    <Box key={`${label}-${index}`}>
                      <View
                        style={{
                          width: "100%",
                          flexDirection: "row",
                          justifyContent: "space-between",
                          alignItems: "center",
                          paddingVertical: 20
                        }}
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
                      </View>
                      <Divider opacity={30} bg="#94A3B8" />
                    </Box>
                  ))}
                </Box>
              </Box>
            </SafeAreaView>
          </BlurView>
        </Modal>
      </View>
    </Box>
  );
};

export default FilterBar;