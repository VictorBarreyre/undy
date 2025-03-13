import React, { useState, useEffect, useContext } from 'react';
import { Alert } from 'react-native';
import { Box, VStack, Text, HStack } from 'native-base';
import SwipeDeck from '../components/SwipeDeck';
import FilterBar from '../components/Filter.bar';
import { styles } from '../../infrastructure/theme/styles';
import { Background } from '../../navigation/Background';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faEllipsis } from '@fortawesome/free-solid-svg-icons';
import { AuthContext } from '../../infrastructure/context/AuthContext';
import { useCardData } from '../../infrastructure/context/CardDataContexte';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';

const Home = ({ navigation }) => {
  const { t } = useTranslation();
  const { 
    requestLocationPermission, 
    checkLocationPermission 
  } = useContext(AuthContext);
  const { getContacts, userData } = useContext(AuthContext);
  const { data, fetchUnpurchasedSecrets, fetchSecretsByLocation } = useCardData();
  
  const [selectedFilters, setSelectedFilters] = useState([]);
  const [activeType, setActiveType] = useState(t('filter.all'));
  const [userContacts, setUserContacts] = useState([]);
  const [isContactsLoaded, setIsContactsLoaded] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [locationRadius, setLocationRadius] = useState(5); // km

  const typeTexts = {
    [t('filter.all')]: t('home.sourceTexts.everyone'),
    [t('filter.contacts')]: t('home.sourceTexts.fromContacts'),
    [t('filter.aroundMe')]: t('home.sourceTexts.fromNearby'),
    [t('filter.following')]: t('home.sourceTexts.fromFollowing')
  };

  // Effet pour la première vérification de localisation
  useEffect(() => {
    const checkLocation = async () => {
      const isFirstLaunch = await AsyncStorage.getItem('isFirstLaunch') === null;
      
      if (isFirstLaunch) {
        await AsyncStorage.setItem('isFirstLaunch', 'false');
        
        Alert.alert(
          t('location.alerts.welcome.title'),
          t('location.alerts.welcome.message'),
          [
            {
              text: t('location.alerts.welcome.no'),
              style: 'cancel'
            },
            {
              text: t('location.alerts.welcome.yes'),
              onPress: async () => {
                await requestLocationPermission();
              }
            }
          ]
        );
      }
    };
    
    checkLocation();
  }, []);

  // Effet pour charger les contacts
  useEffect(() => {
    const loadContacts = async () => {
      if (activeType === t('filter.contacts') && !isContactsLoaded) {
        try {
          const contacts = await getContacts();
          if (contacts && contacts.length > 0) {
            const phoneNumbers = contacts.flatMap(contact =>
              contact.phoneNumbers.map(phone => phone.number.replace(/\D/g, ''))
            );
            setUserContacts(phoneNumbers);
            setIsContactsLoaded(true);
          }
        } catch (error) {
          console.error(t('home.errors.contactsLoading'), error);
        }
      }
    };

    loadContacts();
  }, [activeType, getContacts, isContactsLoaded, t]);

  const handleFilterChange = (filters) => {
    setSelectedFilters(filters);
    console.log(t('home.logs.selectedFilters'), filters);
  };

  const handleTypeChange = async (type) => {
    setActiveType(type);
  
    if (type === t('filter.aroundMe')) {
      try {
        // Utiliser directement la méthode du contexte
        const { granted, needsSettings } = await requestLocationPermission();
        
        if (!granted) {
          if (needsSettings) {
            // Si l'utilisateur a choisi d'aller dans les paramètres
            setActiveType(t('filter.all'));
          }
        } else {
          // Permission accordée, charger les secrets à proximité
          await fetchSecretsByLocation(locationRadius);
        }
      } catch (error) {
        console.error('Location permission error:', error);
        setActiveType(t('filter.all'));
      }
    } else {
      // Pour les autres types de filtres
      await fetchUnpurchasedSecrets(true);
    }
  };

  return (
    <Background>
      <Box alignItems='center' alignContent='center' paddingTop={2} width="100%">
        <FilterBar 
          onTypeChange={handleTypeChange} 
          onFilterChange={handleFilterChange} 
        />
      </Box>
      <VStack style={styles.containerHome} space={4}>
        <VStack paddingLeft={1} space={0}>
          <HStack alignItems='center' justifyContent='space-between'>
            <Text paddingBottom={1} style={styles.h3}>{t('home.latestHushys')}</Text>
            <FontAwesomeIcon
              icon={faEllipsis}
              size={16}
              color='black'
              style={{ marginRight: 10 }}
            />
          </HStack>
          <Text paddingBottom={2} color='#94A3B8' style={styles.caption}>
            {typeTexts[activeType] || t('home.sourceTexts.everyone')}
          </Text>
        </VStack>
        <Box flex={1} justifyContent="center" alignContent='center' alignItems="center">
          <SwipeDeck
            selectedFilters={selectedFilters}
            activeType={activeType}
            userContacts={userContacts}
            userLocation={userLocation}
            style={styles.swipper}
          />
        </Box>
      </VStack>
    </Background>
  );
};

export default Home;