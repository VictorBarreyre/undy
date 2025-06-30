import React, { useState, useEffect, useContext } from 'react';
import { Alert, Linking, Platform, PermissionsAndroid, TouchableOpacity } from 'react-native';
import { Box, VStack, Text, HStack, Spinner } from 'native-base';
import SwipeDeck from '../components/SwipeDeck';
import FilterBar from '../components/Filter.bar';
import { styles } from '../../infrastructure/theme/styles';
import { Background } from '../../navigation/Background';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faRotate } from '@fortawesome/free-solid-svg-icons';
import { AuthContext } from '../../infrastructure/context/AuthContext';
import { useCardData } from '../../infrastructure/context/CardDataContexte';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';

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
  const [isDataLoading, setIsDataLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false); // Nouvel état pour l'animation de rechargement

  const typeTexts = {
    [t('filter.all')]: t('home.sourceTexts.everyone'),
    [t('filter.contacts')]: t('home.sourceTexts.fromContacts'),
    [t('filter.aroundMe')]: t('home.sourceTexts.fromNearby'),
    [t('filter.following')]: t('home.sourceTexts.fromFollowing')
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

  // Fonction pour demander la permission de localisation
  const requestLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status === 'granted') {
        // Permission accordée, récupérer la localisation
        const location = await Location.getCurrentPositionAsync({});
        setUserLocation(location);
        return true;
      } else {
        // Permission refusée, proposer les paramètres
        showLocationPermissionAlert();
        return false;
      }
    } catch (error) {
      console.error('Erreur lors de la demande de permission de localisation:', error);
      return false;
    }
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
        onPress: () => Linking.openSettings()
      }]

    );
  };

  useEffect(() => {
    // Chargement initial des données uniquement
    fetchUnpurchasedSecrets(true);
  }, []);

  // Effet pour charger les contacts
  useEffect(() => {
    const loadContacts = async () => {
      if (activeType === t('filter.contacts') && !isContactsLoaded) {
        try {

          const contacts = await getContacts();
          if (contacts && contacts.length > 0) {
            const phoneNumbers = contacts.flatMap((contact) =>
            contact.phoneNumbers.map((phone) => phone.number.replace(/\D/g, ''))
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

    // Ajouté pour recharger les données lorsque les filtres catégories changent
    if (activeType === t('filter.all')) {
      fetchUnpurchasedSecrets(true);
    }
  };

  const handleTypeChange = async (type) => {


    if (type === activeType) {

      return; // Éviter les doubles appels si le même filtre est sélectionné
    }

    setActiveType(type);
    setIsDataLoading(true); // Indique que le chargement des données est en cours

    try {
      if (type === t('filter.aroundMe')) {
        // Vérifier si la permission est déjà accordée
        const hasPermission = await checkLocationPermission();

        if (hasPermission) {
          // Si permission accordée, récupérer la localisation actuelle
          const location = await Location.getCurrentPositionAsync({});
          setUserLocation(location);


          // Charger les secrets à proximité
          await fetchSecretsByLocation(locationRadius);

        } else {

        }
      } else if (type === t('filter.contacts')) {
        // Le chargement des contacts est géré par le useEffect ci-dessus
        // On charge les données mais elles seront filtrées par SwipeDeck
        await fetchUnpurchasedSecrets(true);

      } else {
        // Pour les autres types de filtres (all, following)
        await fetchUnpurchasedSecrets(true);

      }
    } catch (error) {
      console.error('Erreur lors du changement de filtre:', error);
    } finally {
      setIsDataLoading(false); // Chargement terminé
    }
  };

  // Nouvelle fonction pour gérer le rechargement des données
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {


      if (activeType === t('filter.aroundMe')) {
        // Pour le filtre "Autour de moi", on doit vérifier la localisation
        const hasPermission = await checkLocationPermission();

        if (hasPermission) {
          // Mettre à jour la localisation actuelle
          const location = await Location.getCurrentPositionAsync({});
          setUserLocation(location);
          await fetchSecretsByLocation(locationRadius);
        } else {
          // Demander la permission si nécessaire
          const permissionGranted = await requestLocationPermission();
          if (permissionGranted) {
            await fetchSecretsByLocation(locationRadius);
          }
        }
      } else {
        // Pour les autres filtres, on recharge simplement les données
        await fetchUnpurchasedSecrets(true);
      }


    } catch (error) {
      console.error("Erreur lors du rechargement:", error);
      Alert.alert(
        t('home.errors.refreshTitle', 'Erreur'),
        t('home.errors.refreshFailed', "Impossible de recharger les secrets. Veuillez réessayer.")
      );
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <Background>
      <Box alignItems='center' alignContent='center' paddingTop={2} width="100%" style={{ overflow: 'visible' }}>
        <FilterBar
          onTypeChange={handleTypeChange}
          onFilterChange={handleFilterChange}
          activeButton={activeType} // Passe le bouton actif au composant FilterBar
        />
      </Box>
      <VStack style={styles.containerHome} space={4}>
        <VStack paddingLeft={1} space={0}>
          <HStack paddingTop={2} alignItems='center' justifyContent='space-between'>
            <Text paddingBottom={1} style={styles.h3}>{t('home.latestHushys')}</Text>
            <TouchableOpacity
              onPress={handleRefresh}
              disabled={isRefreshing}
              style={{
                marginRight: 10,
                padding: 5 // Ajoute une zone de toucher plus grande
              }}>

              {isRefreshing ?
              <Spinner size="sm" color="#FF78B2" /> :

              <FontAwesomeIcon
                icon={faRotate}
                size={18}
                color='#FF78B2' />

              }
            </TouchableOpacity>
          </HStack>
          <Text paddingBottom={1} color='#94A3B8' style={styles.caption}>
            {typeTexts[activeType] || t('home.sourceTexts.everyone')}
          </Text>
        </VStack>
        <Box flex={1} justifyContent="center" alignContent='center' alignItems="center">
          <SwipeDeck
            selectedFilters={selectedFilters}
            activeType={activeType}
            userContacts={userContacts}
            userLocation={userLocation}
            isDataLoading={isDataLoading}
            style={styles.swipper} />

        </Box>
      </VStack>
    </Background>);

};

export default Home;