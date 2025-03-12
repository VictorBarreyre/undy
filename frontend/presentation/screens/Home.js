import React, { useState, useEffect, useContext } from 'react';
import { Alert } from 'react-native';
import { Box, VStack, Text, HStack } from 'native-base';
import Geolocation from '@react-native-community/geolocation';
import SwipeDeck from '../components/SwipeDeck';
import FilterBar from '../components/Filter.bar';
import { styles } from '../../infrastructure/theme/styles';
import { Background } from '../../navigation/Background';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faEllipsis } from '@fortawesome/free-solid-svg-icons';
import { AuthContext } from '../../infrastructure/context/AuthContext';
import { useCardData } from '../../infrastructure/context/CardDataContexte';
import { useTranslation } from 'react-i18next';

const Home = ({ navigation }) => {
  const { t } = useTranslation();
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

  // Fonction pour demander la permission de localisation
  const requestLocationPermission = () => {
    return new Promise((resolve) => {
      Geolocation.requestAuthorization(
        () => resolve(true),
        () => {
          Alert.alert(
            t('location.alerts.permissionDenied.title'),
            t('location.alerts.permissionDenied.message'),
            [{ text: t('location.alerts.permissionDenied.ok') }]
          );
          resolve(false);
        }
      );
    });
  };

  // Fonction pour obtenir la position actuelle
  const getCurrentPosition = () => {
    return new Promise((resolve, reject) => {
      Geolocation.getCurrentPosition(
        position => {
          setUserLocation(position);
          resolve(position);
        },
        error => {
          console.error(t('location.errors.gettingPosition'), error);
          reject(error);
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
      );
    });
  };

  // Effet pour charger les contacts quand le filtre "Contacts" est activé
  useEffect(() => {
    const loadContacts = async () => {
      if (activeType === t('filter.contacts') && !isContactsLoaded) {
        try {
          const contacts = await getContacts();
          if (contacts && contacts.length > 0) {
            // Extraire les numéros de téléphone et éliminer les caractères non numériques
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
    console.log(t('home.logs.selectedType'), type);
    
    // Gestion spécifique pour le type "Autour de moi"
    if (type === t('filter.aroundMe')) {
      try {
        const hasPermission = await requestLocationPermission();
        if (hasPermission) {
          const position = await getCurrentPosition();
          // Chargement des secrets à proximité
          await fetchSecretsByLocation(locationRadius);
        } else {
          // Si permission refusée, revenir au type "Tous"
          setActiveType(t('filter.all'));
        }
      } catch (error) {
        console.error(t('location.errors.locationError'), error);
        setActiveType(t('filter.all'));
        Alert.alert(
          t('location.alerts.error.title'),
          t('location.alerts.error.message')
        );
      }
    } else if (type === t('filter.contacts')) {
      // Gestion des contacts
      if (!isContactsLoaded) {
        setIsContactsLoaded(false);
      }
      // Charger tous les secrets pour filtrer par contacts côté client
      await fetchUnpurchasedSecrets(true);
    } else {
      // Pour les autres types, utiliser la requête standard
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