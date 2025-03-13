import React, { useState, useEffect, useContext } from 'react';
import { Alert } from 'react-native';
import { Box, VStack, Text, HStack } from 'native-base';
import * as Location from 'expo-location';
import SwipeDeck from '../components/SwipeDeck';
import FilterBar from '../components/Filter.bar';
import { styles } from '../../infrastructure/theme/styles';
import { Background } from '../../navigation/Background';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faEllipsis } from '@fortawesome/free-solid-svg-icons';
import { AuthContext } from '../../infrastructure/context/AuthContext';
import { useCardData } from '../../infrastructure/context/CardDataContexte';
import { useTranslation } from 'react-i18next';
import { Linking } from 'react-native';


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
const requestLocationPermission = async () => {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    
    if (status === 'granted') {
      return true;
    } else {
      Alert.alert(
        t('location.alerts.permissionDenied.title'),
        t('location.alerts.permissionDenied.message'),
        [{ text: t('location.alerts.permissionDenied.ok') }]
      );
      return false;
    }
  } catch (error) {
    console.error(t('location.errors.permissionError'), error);
    return false;
  }
};

// Fonction pour obtenir la position actuelle
const getCurrentPosition = async () => {
  try {
    const position = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced
    });
    setUserLocation(position);
    return position;
  } catch (error) {
    console.error(t('location.errors.gettingPosition'), error);
    throw error;
  }
};

// Dans Home.js, ajoutez cet effet
useEffect(() => {
  const checkLocation = async () => {
    // Vérifiez si c'est la première fois que l'application est lancée
    const isFirstLaunch = await AsyncStorage.getItem('isFirstLaunch') === null;
    
    if (isFirstLaunch) {
      // Marquer que ce n'est plus la première exécution
      await AsyncStorage.setItem('isFirstLaunch', 'false');
      
      // Demander la permission uniquement à la première exécution
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
              try {
                await requestLocationPermission();
              } catch (error) {
                console.error(t('location.errors.permissionError'), error);
              }
            }
          }
        ]
      );
    }
  };
  
  checkLocation();
}, []);

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
    if (type === t('filter.aroundMe')) {
      try {
        const { granted } = await requestLocationPermission();
        
        if (!granted) {
          Alert.alert(
            t('location.alerts.permissionDenied.title'), 
            t('location.alerts.permissionDenied.message'), 
            [
              {
                text: t('location.alerts.permissionDenied.cancel'),
                onPress: () => {
                  // Revenir au filtre "Tous"
                  setActiveType(t('filter.all'));
                },
                style: 'cancel'
              },
              {
                text: t('location.alerts.permissionDenied.openSettings'),
                onPress: () => {
                  // Ouvrir les paramètres de l'appareil
                  Linking.openSettings();
                  
                  // Revenir au filtre "Tous"
                  setActiveType(t('filter.all'));
                }
              }
            ]
          );
        }
      } catch (error) {
        console.error('Location permission error:', error);
      }
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