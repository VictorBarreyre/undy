import React, { useState, useEffect, useContext } from 'react';
import { Box, Button, Checkbox, Divider } from 'native-base';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faTimes, faChevronDown } from '@fortawesome/free-solid-svg-icons';
import { Modal, Pressable, Text, View, ScrollView, SafeAreaView, Alert, Platform,PermissionsAndroid, Linking } from 'react-native';
import { useCardData } from '../../infrastructure/context/CardDataContexte';
import { AuthContext } from '../../infrastructure/context/AuthContext';
import { BlurView } from '@react-native-community/blur';
import { styles } from '../../infrastructure/theme/styles';
import LinearGradient from 'react-native-linear-gradient';
import { useNavigation } from "@react-navigation/native";
import InviteContactsModal from './InviteContactsModals';
import { useTranslation } from 'react-i18next';
import Contacts from 'react-native-contacts';


const FilterBar = ({ onFilterChange, onTypeChange }) => {
  const { t } = useTranslation();
  const { data } = useCardData();
  const { getContacts, userData, contactsAccessEnabled, updateContactsAccess } = useContext(AuthContext);
  const [activeButton, setActiveButton] = useState(t('filter.all'));
  const [selectedFilters, setSelectedFilters] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredResults, setFilteredResults] = useState([]);
  const [isOverlayVisible, setOverlayVisible] = useState(false);
  const [userContacts, setUserContacts] = useState([]);
  const [hasContactPermission, setHasContactPermission] = useState(userData?.contacts || false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [contactsData, setContactsData] = useState([]);

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

  const getContactsWithAppStatus = async () => {
    try {
      const contacts = await getContacts();
      // Assuming a function or property that checks if contacts use the app
      const hasAppUsers = contacts.some(contact => contact.usesApp === true);
      return { contacts, hasAppUsers };
    } catch (error) {
      console.error('Error checking contacts:', error);
      return { contacts: [], hasAppUsers: false };
    }
  };

  const handleButtonClickType = async (buttonName) => {
    console.log(`[FilterBar] Bouton ${buttonName} cliqué, accès contacts: ${contactsAccessEnabled}`);
    
    if (buttonName === t('filter.contacts')) {
      // Vérifier si la permission a déjà été accordée
      try {
        // Vérifier d'abord si la permission est déjà accordée dans le système (pas juste notre état local)
        let permissionCheck;
        
        if (Platform.OS === 'ios') {
          permissionCheck = await Contacts.checkPermission();
        } else {
          permissionCheck = await PermissionsAndroid.check(
            PermissionsAndroid.PERMISSIONS.READ_CONTACTS
          );
        }
        
        console.log(`[FilterBar] État de la permission système: ${permissionCheck}`);
        
        // Gérer le cas où la permission a été refusée précédemment sur iOS
  if (Platform.OS === 'ios' && permissionCheck === 'denied') {
                      Alert.alert(
                        t('filter.contactSettings.title'),
                        t('filter.contactSettings.message'),
                        [
                          { text: t('filter.contactSettings.cancel'), style: "cancel" },
                          { 
                            text: t('filter.contactSettings.openSettings'), 
                            onPress: () => {
                              // Essayez d'abord d'ouvrir directement les paramètres de l'app
                              Linking.openURL('app-settings:').catch(() => {
                                // Si cela échoue, ouvrez les paramètres généraux
                                Linking.openSettings();
                              });
                            } 
                          }
                        ]
                      );
                      return;
                    }
        
        // Si la permission n'est pas accordée au niveau du système, la demander
        if (!permissionCheck || permissionCheck === 'denied' || permissionCheck === false) {
          Alert.alert(
            t('filter.contactAccess.title'),
            t('filter.contactAccess.message'),
            [
              { text: t('filter.contactAccess.cancel'), style: "cancel" },
              {
                text: t('filter.contactAccess.authorize'),
                onPress: async () => {
                  try {
                    // Demander la permission au système
                    let permission;
                    if (Platform.OS === 'ios') {
                      permission = await Contacts.requestPermission();
                    } else {
                      permission = await PermissionsAndroid.request(
                        PermissionsAndroid.PERMISSIONS.READ_CONTACTS
                      );
                    }
                    
                    console.log(`[FilterBar] Résultat de la demande de permission: ${permission}`);
                    
                    // Vérifier si la permission a été accordée
                    const isGranted = 
                      permission === 'authorized' || 
                      permission === PermissionsAndroid.RESULTS.GRANTED;
                    
                    if (isGranted) {
                      // Mettre à jour l'état dans le contexte
                      const success = await updateContactsAccess(true);
                      console.log(`[FilterBar] Mise à jour du contexte: ${success}`);
                      
                      if (success) {
                        // Charger les contacts et vérifier si certains utilisent l'app
                        const contactsResult = await getContactsWithAppStatus();
                        setContactsData(contactsResult.contacts || []);
                        
                        if (!contactsResult.hasAppUsers && contactsResult.contacts.length > 0) {
                          setShowInviteModal(true);
                        }
                        
                        // Dans tous les cas, on change le filtre actif
                        setActiveButton(buttonName);
                        onTypeChange(buttonName);
                      }
                    } else if (Platform.OS === 'ios' && permission === 'denied') {
                      // Si l'utilisateur a refusé sur iOS, proposer d'aller dans les paramètres
                      Alert.alert(
                        t('filter.contactDenied.title'),
                        t('filter.contactDenied.message'),
                        [
                          { text: t('filter.contactDenied.cancel'), style: "cancel" },
                          { text: t('filter.contactDenied.openSettings'), onPress: () => Linking.openSettings() }
                        ]
                      );
                    }
                  } catch (error) {
                    console.error('[FilterBar] Erreur lors de la demande de permission:', error);
                  }
                }
              }
            ]
          );
          return;
        } else {
          // Permission déjà accordée au niveau système mais pas dans notre contexte
          if (!contactsAccessEnabled) {
            const success = await updateContactsAccess(true);
            console.log(`[FilterBar] Mise à jour du contexte pour une permission déjà accordée: ${success}`);
          }
          
          // Charger les contacts et vérifier
          const contactsResult = await getContactsWithAppStatus();
          setContactsData(contactsResult.contacts || []);
          
          if (!contactsResult.hasAppUsers && contactsResult.contacts.length > 0) {
            setShowInviteModal(true);
          }
        }
      } catch (error) {
        console.error('[FilterBar] Erreur lors de la vérification des permissions:', error);
      }
    }
    
    // Dans tous les cas, on change le filtre actif
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

  const buttonTypes = [
    t('filter.all'), 
    t('filter.contacts'), 
    t('filter.aroundMe'), 
    t('filter.categories')
  ];

  return (
    <Box width="100%" paddingY={2} marginLeft={4}>
      <View style={{ flexDirection: 'row', width: '100%' }}>
        <View style={styles.containerFilter}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scrollContainer}>
            {buttonTypes.map((type) => {
              if (type === t('filter.categories')) {
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