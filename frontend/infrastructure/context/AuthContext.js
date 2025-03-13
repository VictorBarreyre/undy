import React, { createContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAxiosInstance, getAxiosInstance } from '../../data/api/axiosInstance';
import { DeviceEventEmitter, Alert, PermissionsAndroid, Platform, Linking } from 'react-native';
import Contacts from 'react-native-contacts';
import { useCardData } from './CardDataContexte';
import i18n from 'i18next'; // Importation directe de i18n
import ContactsPermissionModal from '../../presentation/components/ContactsPermissionsModal';
import { useTranslation } from 'react-i18next';
import * as Location from 'expo-location'; // Ajoutez cette ligne




export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userToken, setUserToken] = useState(null);
  const [userData, setUserData] = useState(null);
  const [isLoadingUserData, setIsLoadingUserData] = useState(true);
  const [contactsAccessEnabled, setContactsAccessEnabled] = useState(false);
  const [contactsPermissionModalVisible, setContactsPermissionModalVisible] = useState(false);
  const [contactPermissionResolve, setContactPermissionResolve] = useState(null);
  const [locationPermission, setLocationPermission] = useState(null);
  const [locationEnabled, setLocationEnabled] = useState(userData?.location || false);
  const { t } = useTranslation(); // Déclarez le hook ici

  useEffect(() => {
    const initAxios = async () => {
      console.log('[AuthProvider] Initialisation...');
      try {
        console.log('[AuthProvider] Création de l\'instance Axios');
        await createAxiosInstance();
        console.log('[AuthProvider] Chargement des données stockées');
        await loadStoredData();
      } catch (error) {
        console.error('[AuthProvider] Erreur d\'initialisation:', error);
        setIsLoadingUserData(false);
      }
    };

    const handleAuthError = async (event) => {
      console.log('[AuthProvider] Erreur d\'authentification détectée:', event);
      try {
        console.log('[AuthProvider] Tentative de déconnexion...');
        await logout();
        console.log('[AuthProvider] Déconnexion réussie');

        Alert.alert(
          i18n.t('auth.alerts.sessionExpired.title'),
          event.message,
          [{
            text: i18n.t('auth.alerts.ok'),
            onPress: () => console.log('[AuthProvider] Alerte acquittée par l\'utilisateur')
          }]
        );
      } catch (error) {
        console.error('[AuthProvider] Erreur lors du traitement de l\'erreur d\'auth:', error);
      }
    };

    console.log('[AuthProvider] Mise en place des event listeners');
    // Utiliser DeviceEventEmitter au lieu de window.addEventListener
    const subscription = DeviceEventEmitter.addListener('authError', handleAuthError);

    initAxios();

    return () => {
      console.log('[AuthProvider] Nettoyage des event listeners');
      subscription.remove(); // Nettoyer l'écouteur d'événements
    };
  }, []);

  const cleanProfilePicture = (profilePicture) => {
    if (!profilePicture) return null;

    // Pour les images Cloudinary
    if (profilePicture.includes('cloudinary.com')) {
      return profilePicture; // Retourner l'URL complète
    }

    // Pour les anciennes images en base64
    if (profilePicture.startsWith('data:image')) {
      return profilePicture;
    }

    // Pour les anciennes images stockées sur votre serveur
    if (profilePicture.includes('herokuapp.com')) {
      if (profilePicture.includes('data:image')) {
        return profilePicture.split('herokuapp.com').pop();
      }
      return profilePicture;
    }

    return null;
  };

  const cleanUserData = (data) => {
    if (!data) return null;
    return {
      ...data,
      profilePicture: cleanProfilePicture(data.profilePicture)
    };
  };

  const loadStoredData = async () => {
    console.log('[AuthProvider] Début du chargement des données stockées');
    try {
      const [accessToken, refreshToken, storedUserData] = await Promise.all([
        AsyncStorage.getItem('accessToken'),
        AsyncStorage.getItem('refreshToken'),
        AsyncStorage.getItem('userData')
      ]);

      console.log('[AuthProvider] Tokens récupérés:', {
        hasAccessToken: !!accessToken,
        hasRefreshToken: !!refreshToken,
        hasStoredData: !!storedUserData
      });

      if (accessToken) {
        const instance = getAxiosInstance();
        if (instance) {
          console.log('[AuthProvider] Mise à jour du header Authorization');
          instance.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
        }

        setUserToken(accessToken);
        setIsLoggedIn(true);

        if (storedUserData) {
          console.log('[AuthProvider] Chargement des données utilisateur stockées');
          const parsedData = JSON.parse(storedUserData);
          setUserData(cleanUserData(parsedData));
        }

        if (refreshToken) {
          console.log('[AuthProvider] Tentative de récupération des données fraîches');
          try {
            await fetchUserData();
            console.log('[AuthProvider] Données utilisateur mises à jour avec succès');
          } catch (error) {
            console.error('[AuthProvider] Erreur fetchUserData:', error);
          }
        }
      } else {
        console.log('[AuthProvider] Aucun token trouvé');
      }
    } catch (error) {
      console.error('[AuthProvider] Erreur loadStoredData:', error);
    } finally {
      console.log('[AuthProvider] Fin du chargement des données');
      setIsLoadingUserData(false);
    }
  };

  const fetchUserData = async () => {
    console.log('[AuthProvider] Début fetchUserData');
    const instance = getAxiosInstance();
    if (!instance) {
      throw new Error(i18n.t('auth.errors.axiosNotInitialized'));
    }

    try {
      const response = await instance.get('/api/users/profile');
      const cleanedData = cleanUserData(response.data);
      setUserData(cleanedData);

      setContactsAccessEnabled(cleanedData.contacts || false);

      await AsyncStorage.setItem('userData', JSON.stringify(cleanedData));

      setUserData({
        ...cleanedData,
        totalEarnings: response.data.totalEarnings
      });

      console.log('[AuthProvider] Données utilisateur mises à jour avec succès');
    } catch (error) {
      console.error('[AuthProvider] Erreur fetchUserData:', error);
      // Si l'erreur n'est pas liée à l'authentification, on la propage
      if (!error.response?.data?.shouldRefresh) {
        throw error;
      }
    }
  };

  const handleProfileImageUpdate = async (imageFile) => {
    const instance = getAxiosInstance();
    if (!instance) {
      throw new Error(i18n.t('auth.errors.axiosNotInitialized'));
    }

    try {
      // Préparer l'image pour Cloudinary
      let imageData;
      if (imageFile.base64) {
        imageData = `data:${imageFile.type};base64,${imageFile.base64}`;
      } else if (imageFile.uri) {
        // Si pas de base64, on peut soit:
        // 1. Convertir l'URI en base64 (comme montré dans mon code précédent)
        // 2. Ou, pour simplifier ici, utiliser une librairie comme FileSystem d'Expo
        const response = await fetch(imageFile.uri);
        const blob = await response.blob();
        const reader = new FileReader();

        // Créer une promesse pour la lecture asynchrone
        const base64 = await new Promise((resolve, reject) => {
          reader.onload = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });

        imageData = base64;
      }

      // Envoyer l'image au point d'API de mise à jour de profil
      const response = await instance.post('/api/users/profile-picture', {
        image: imageData
      });

      if (response?.data?.profilePicture) {
        const updatedUserData = {
          ...userData,
          // Utiliser directement l'URL Cloudinary retournée par le serveur
          profilePicture: response.data.profilePicture
        };

        setUserData(updatedUserData);
        await AsyncStorage.setItem('userData', JSON.stringify(updatedUserData));
        return updatedUserData;
      }

      throw new Error(i18n.t('auth.errors.noImageUrlReceived'));
    } catch (error) {
      console.error(i18n.t('auth.errors.uploadError'), error);
      throw error;
    }
  };

  const updateUserData = async (updatedData, isContactsUpdate = false) => {
    const instance = getAxiosInstance();
    if (!instance) {
      throw new Error(i18n.t('auth.errors.axiosNotInitialized'));
    }
    try {
      // Ne prendre que les champs qui ont changé
      const changedFields = {};
      Object.keys(updatedData).forEach(key => {
        if (userData[key] !== updatedData[key]) {
          changedFields[key] = updatedData[key];
        }
      });
  
      if (Object.keys(changedFields).length === 0) {
        return { success: true, message: i18n.t('auth.success.noChangeNeeded') };
      }
  
      // Ajouter l'ID pour l'identification
      changedFields._id = userData._id;
  
      const response = await instance.put('/api/users/profile', changedFields);
  
      // Mettre à jour le state local avec toutes les données
      setUserData({ ...userData, ...response.data });
      await AsyncStorage.setItem('userData', JSON.stringify({ ...userData, ...response.data }));
  
      // Ne mettre à jour contactsAccessEnabled que si ce n'est pas déjà un appel depuis updateContactsAccess
      if (updatedData.contacts !== undefined && !isContactsUpdate) {
        setContactsAccessEnabled(updatedData.contacts);
      }
  
      return { success: true, message: i18n.t('auth.success.profileUpdated') };
    } catch (error) {
      console.error(i18n.t('auth.errors.updatingUserData'), error);
      return { success: false, message: i18n.t('auth.errors.profileUpdateFailed') };
    }
  };


  const updateContactsAccess = async (enabled) => {
    console.log(`[AuthProvider] Début updateContactsAccess avec enabled=${enabled}`);
    
    try {
      if (enabled) {
        // Vérifier et demander la permission si nécessaire
        const permissionResult = await checkAndRequestContactsPermission();
        
        if (!permissionResult.granted) {
          console.log('[AuthProvider] Permission non accordée');
          return false;
        }
        
        // Tenter de récupérer les contacts pour vérifier l'accès
        try {
          const contacts = await Contacts.getAll();
          console.log(`[AuthProvider] ${contacts.length} contacts récupérés`);
          
          // Passer isContactsUpdate=true pour éviter la récursion
          const result = await updateUserData({ contacts: true }, true);
          
          if (result.success) {
            // Mettre à jour l'état local manuellement
            setContactsAccessEnabled(true);
            
            return true;
          }
          
          return false;
        } catch (contactError) {
          console.error('[AuthProvider] Erreur lors de la récupération des contacts:', contactError);
          return false;
        }
      } else {
        // Même approche pour désactiver
        const result = await updateUserData({ contacts: false }, true);
        
        if (result.success) {
          setContactsAccessEnabled(false);
          return true;
        }
        
        return false;
      }
    } catch (error) {
      console.error('[AuthProvider] Erreur dans updateContactsAccess:', error);
      return false;
    }
  };

  useEffect(() => {
    if (userData) {
      setContactsAccessEnabled(userData.contacts || false);
    }
  }, [userData]);


  const getContactsWithAppStatus = async () => {
    console.log('[AuthProvider] Début getContactsWithAppStatus');
    
    try {
      // Vérifier d'abord si la permission est accordée au niveau système
      let permissionCheck;
      
      if (Platform.OS === 'ios') {
        permissionCheck = await Contacts.checkPermission();
      } else {
        permissionCheck = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.READ_CONTACTS
        );
      }
      
      console.log(`[AuthProvider] Permission check: ${permissionCheck}`);
      
      const isGranted = 
        permissionCheck === 'authorized' || 
        permissionCheck === PermissionsAndroid.RESULTS.GRANTED ||
        permissionCheck === true;
        
      if (!isGranted) {
        console.log('[AuthProvider] Permission non accordée, retour sans contacts');
        return { contacts: [], hasAppUsers: false };
      }
      
      // Récupérer les contacts du téléphone
      const phoneContacts = await Contacts.getAll();
      console.log(`[AuthProvider] ${phoneContacts.length} contacts récupérés`);
      
      if (!phoneContacts || phoneContacts.length === 0) {
        return { contacts: [], hasAppUsers: false };
      }
      
      // Récupérer les numéros de téléphone formatés
      const phoneNumbers = phoneContacts.flatMap(contact => {
        if (!contact.phoneNumbers || contact.phoneNumbers.length === 0) {
          return [];
        }
        
        return contact.phoneNumbers.map(phone => ({
          contactId: contact.recordID,
          contactName: `${contact.givenName || ''} ${contact.familyName || ''}`.trim() || 'Sans nom',
          phoneNumber: phone.number.replace(/\D/g, '')
        }));
      }).filter(entry => entry.phoneNumber && entry.phoneNumber.length > 0);
      
      console.log(`[AuthProvider] ${phoneNumbers.length} numéros de téléphone extraits`);
      
      if (phoneNumbers.length === 0) {
        return { contacts: [], hasAppUsers: false };
      }
      
      // Appel à l'API pour vérifier quels numéros sont associés à des utilisateurs
      const instance = getAxiosInstance();
      
      if (!instance) {
        console.error('[AuthProvider] Instance Axios non disponible');
        return { contacts: [], hasAppUsers: false };
      }
      
      try {
        const response = await instance.post('/api/users/check-contacts', {
          phoneNumbers: phoneNumbers.map(p => p.phoneNumber)
        });
        
        console.log(`[AuthProvider] Réponse API: ${response.data.usersPhoneNumbers?.length || 0} numéros correspondants`);
        
        // Associer le statut d'utilisation de l'app à chaque contact
        const contactsWithStatus = phoneNumbers.map(contact => ({
          ...contact,
          hasApp: response.data.usersPhoneNumbers?.includes(contact.phoneNumber) || false
        }));
        
        // Vérifier si au moins un contact utilise l'application
        const hasAppUsers = contactsWithStatus.some(contact => contact.hasApp);
        console.log(`[AuthProvider] ${hasAppUsers ? 'Des' : 'Aucun'} contact(s) utilise(nt) l'application`);
        
        return {
          contacts: contactsWithStatus,
          hasAppUsers
        };
      } catch (apiError) {
        console.error('[AuthProvider] Erreur API check-contacts:', apiError);
        return { 
          contacts: phoneNumbers.map(contact => ({...contact, hasApp: false})),
          hasAppUsers: false 
        };
      }
    } catch (error) {
      console.error('[AuthProvider] Erreur dans getContactsWithAppStatus:', error);
      return { contacts: [], hasAppUsers: false };
    }
  };

  // Dans AuthContext.js, modifiez la fonction login:
  const login = async (accessToken, refreshToken) => {
    try {
      console.log('[AuthProvider] Début de la connexion');
      
      // Étape 1: Stockez les tokens
      await AsyncStorage.multiSet([
        ['accessToken', accessToken],
        ['refreshToken', refreshToken]
      ]);
      
      // Étape 2: Mettez à jour l'instance Axios avec le nouveau token
      const instance = getAxiosInstance();
      if (instance) {
        instance.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
      }
      
      // Étape 3: Mettez à jour l'état local
      setUserToken(accessToken);
      
      // Étape 4: Récupérez les données utilisateur
      try {
        await fetchUserData();
      } catch (error) {
        console.error('[AuthProvider] Erreur fetchUserData, 2e tentative:', error);
        
        // Réessayez après un court délai (le serveur peut avoir besoin d'un moment pour valider le token)
        setTimeout(async () => {
          try {
            await fetchUserData();
          } catch (secondError) {
            console.error('[AuthProvider] Échec de la 2e tentative:', secondError);
          }
        }, 500);
      }
      
      // Étape 5: Terminez la connexion
      setIsLoggedIn(true);
      
      console.log('[AuthProvider] Connexion réussie');
    } catch (error) {
      console.error('[AuthProvider] Erreur lors de la connexion:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      console.log('[AuthProvider] Début de la déconnexion');
      const instance = getAxiosInstance();
      if (instance) {
        delete instance.defaults.headers.common['Authorization'];
      }

      // D'abord, on supprime les données
      await AsyncStorage.multiRemove(['accessToken', 'refreshToken', 'userData']);

      // Ensuite, on met à jour les états dans un ordre spécifique
      setUserData(null);
      setIsLoadingUserData(false);
      setUserToken(null);
      // On met setIsLoggedIn en dernier car c'est lui qui déclenche la navigation
      setIsLoggedIn(false);

      if (typeof onLogout === 'function') {
        onLogout();
      }

      console.log('[AuthProvider] Déconnexion réussie');
      return true;
    } catch (error) {
      console.error('[AuthProvider] Erreur lors de la déconnexion:', error);
      setIsLoadingUserData(false);
      throw error;
    }
  };

  const persistUserData = useCallback(async (data) => {
    try {
      await AsyncStorage.setItem('userData', JSON.stringify(data));
    } catch (error) {
      console.error(i18n.t('auth.errors.persistingUserData'), error);
    }
  }, []);

  // Load persisted user data on app startup
  const loadPersistedUserData = useCallback(async () => {
    try {
      const storedUserData = await AsyncStorage.getItem('userData');
      if (storedUserData) {
        const parsedUserData = JSON.parse(storedUserData);
        setUserData(parsedUserData);
        setIsLoggedIn(true);
      }
    } catch (error) {
      console.error(i18n.t('auth.errors.loadingPersistedData'), error);
    }
  }, []);

  useEffect(() => {
    loadPersistedUserData();
  }, [loadPersistedUserData]);

  const downloadUserData = async () => {
    const instance = getAxiosInstance();
    if (!instance) {
      throw new Error(i18n.t('auth.errors.axiosNotInitialized'));
    }
    try {
      const response = await instance.get('/api/users/download');
      return response.data;
    } catch (error) {
      console.error(i18n.t('auth.errors.downloadingData'), error);
      throw error;
    }
  };

  const clearUserData = async () => {
    const instance = getAxiosInstance();
    if (!instance) {
      throw new Error(i18n.t('auth.errors.axiosNotInitialized'));
    }
    try {
      await instance.delete('/api/users/clear');

      const clearedUserData = {
        ...userData,
        profilePicture: null,
      };

      setUserData(clearedUserData);
      await AsyncStorage.setItem('userData', JSON.stringify(clearedUserData));

      return { success: true, message: i18n.t('auth.success.dataCleared') };
    } catch (error) {
      console.error(i18n.t('auth.errors.clearingData'), error);
      throw error;
    }
  };

  const deleteUserAccount = async () => {
    const instance = getAxiosInstance();
    if (!instance) {
      throw new Error(i18n.t('auth.errors.axiosNotInitialized'));
    }
    try {
      await instance.delete('/api/users/delete');
      await logout();
      return { success: true, message: i18n.t('auth.success.accountDeleted') };
    } catch (error) {
      console.error(i18n.t('auth.errors.deletingAccount'), error);
      throw error;
    }
  };

  const fetchUserDataById = async (userId) => {
    const instance = getAxiosInstance();
    if (!instance) {
      throw new Error(i18n.t('auth.errors.axiosNotInitialized'));
    }
    try {
      const response = await instance.get(`/api/users/${userId}`);
      return cleanUserData(response.data);
    } catch (error) {
      console.error(i18n.t('auth.errors.fetchingUserData'), error);
      throw error;
    }
  };

  const checkAndRequestContactsPermission = async () => {
    console.log('[AuthProvider] Vérification et demande de permission contacts');
    
    try {
      let permissionStatus;
      
      if (Platform.OS === 'ios') {
        permissionStatus = await Contacts.checkPermission();
        console.log(`[AuthProvider] iOS permission status: ${permissionStatus}`);
        
        switch (permissionStatus) {
          case 'authorized':
            return { granted: true, needsSettings: false };
          
          case 'denied':
            return new Promise((resolve) => {
              Alert.alert(
                "Accès aux contacts bloqué",
                "Vous avez précédemment refusé l'accès aux contacts. Voulez-vous ouvrir les paramètres ?",
                [
                  { 
                    text: "Annuler", 
                    style: "cancel",
                    onPress: () => resolve({ granted: false, needsSettings: false })
                  },
                  { 
                    text: "Paramètres", 
                    onPress: () => {
                      Linking.openSettings();
                      resolve({ granted: false, needsSettings: true });
                    }
                  }
                ]
              );
            });
          
          case 'undetermined':
            return new Promise((resolve) => {
              setContactPermissionResolve(() => resolve);
              setContactsPermissionModalVisible(true);
            });
        }
      } else {
        // Pour Android
        permissionStatus = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.READ_CONTACTS
        );
        
        if (permissionStatus === PermissionsAndroid.RESULTS.GRANTED) {
          return { granted: true, needsSettings: false };
        }
        
        // Si la permission n'est pas accordée, demander à l'utilisateur
        return new Promise((resolve) => {
          setContactPermissionResolve(() => resolve);
          setContactsPermissionModalVisible(true);
        });
      }
    } catch (error) {
      console.error('[AuthProvider] Erreur lors de la vérification/demande de permission:', error);
      return { granted: false, needsSettings: false, error };
    }
  };

  const handlePermissionModalClose = () => {
    setContactsPermissionModalVisible(false);
    if (contactPermissionResolve) {
      contactPermissionResolve({ granted: false, needsSettings: false });
      setContactPermissionResolve(null);
    }
  };

  const handleRequestPermission = async () => {
    try {
      let permission;
      
      if (Platform.OS === 'ios') {
        permission = await Contacts.requestPermission();
      } else {
        permission = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.READ_CONTACTS,
          {
            title: "Permission de lecture des contacts",
            message: "Cette application nécessite l'accès à vos contacts.",
            buttonPositive: "Autoriser"
          }
        );
      }
      
      const isGranted = 
        permission === 'authorized' || 
        permission === PermissionsAndroid.RESULTS.GRANTED;
      
      setContactsPermissionModalVisible(false);
      
      if (contactPermissionResolve) {
        contactPermissionResolve({ 
          granted: isGranted, 
          needsSettings: !isGranted 
        });
        setContactPermissionResolve(null);
      }
    } catch (error) {
      console.error('Erreur lors de la demande de permission:', error);
      
      setContactsPermissionModalVisible(false);
      
      if (contactPermissionResolve) {
        contactPermissionResolve({ 
          granted: false, 
          needsSettings: false 
        });
        setContactPermissionResolve(null);
      }
    }
  };

  const handleOpenSettings = () => {
    setContactsPermissionModalVisible(false);
    
    if (contactPermissionResolve) {
      contactPermissionResolve({ 
        granted: false, 
        needsSettings: true 
      });
      setContactPermissionResolve(null);
    }
    
    Linking.openSettings();
  };


// Dans AuthContext.js
const getContacts = async () => {
  try {
    // Vérifier d'abord les permissions
    const permissionStatus = await Contacts.checkPermission();
    
    // Si la permission n'est pas déjà accordée
    if (permissionStatus !== 'authorized') {
      // Au lieu de demander directement la permission (qui afficherait la boîte de dialogue système),
      // utiliser notre fonction centralisée pour gérer la demande de manière élégante
      const permissionResult = await checkAndRequestContactsPermission();
      
      // Si la permission n'a pas été accordée après notre flux personnalisé
      if (!permissionResult.granted) {
        // Retourner un tableau vide au lieu d'essayer d'accéder aux contacts
        return [];
      }
    }

    // Ce code ne s'exécute que si la permission est déjà accordée ou vient d'être accordée
    const contacts = await Contacts.getAll();
    console.log('Contacts:', contacts);
    return contacts;
  } catch (error) {
    console.error(i18n.t('auth.errors.retrievingContacts'), error);
    return [];
  }
};

  // Fonction pour récupérer un contact par son ID
  const getContactById = async (contactId) => {
    try {
      const contact = await Contacts.getContactById(contactId);
      return contact;
    } catch (error) {
      console.error(i18n.t('auth.errors.retrievingContact'), error);
      return null;
    }
  };


// Fonction pour vérifier l'état actuel de la permission
const checkLocationPermission = async () => {
  try {
    const { status } = await Location.getForegroundPermissionsAsync();
    setLocationPermission(status);
    return status;
  } catch (error) {
    console.error(t('location.errors.permissionCheckError'), error);
    return 'error';
  }
};

// Fonction pour demander la permission de géolocalisation
const requestLocationPermission = async () => {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    setLocationPermission(status);
    
    if (status === 'granted') {
      // Mettre à jour la préférence utilisateur en DB
      await updateUserData({
        location: true
      });
      setLocationEnabled(true);
      return { granted: true };
    } else {
      return { granted: false };
    }
  } catch (error) {
    console.error(t('location.errors.permissionError'), error);
    return { granted: false, error: error.message };
  }
};

// Fonction pour mettre à jour l'accès à la localisation
const updateLocationAccess = async (enabled) => {
  try {
    console.log("[AuthProvider] updateLocationAccess - État actuel:", { 
      locationEnabled, 
      enabled,
      locationPermission
    });
    
    if (enabled) {
      // Si on active, vérifier d'abord la permission
      const status = await checkLocationPermission();
      console.log("[AuthProvider] updateLocationAccess - Statut de permission:", status);
      
      if (status !== 'granted') {
        const permissionResult = await requestLocationPermission();
        console.log("[AuthProvider] updateLocationAccess - Résultat de la demande:", permissionResult);
        if (!permissionResult.granted) return false;
      }
      
      // Si la permission est accordée, récupérer et afficher la position actuelle
      try {
        const currentPosition = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced
        });
        
        console.log("[AuthProvider] Position actuelle:", {
          latitude: currentPosition.coords.latitude,
          longitude: currentPosition.coords.longitude,
          altitude: currentPosition.coords.altitude,
          accuracy: currentPosition.coords.accuracy,
          timestamp: new Date(currentPosition.timestamp).toLocaleString()
        });
        
        // Optionnel: Récupérer l'adresse (géocodage inverse)
        try {
          const reverseGeocode = await Location.reverseGeocodeAsync({
            latitude: currentPosition.coords.latitude,
            longitude: currentPosition.coords.longitude
          });
          
          if (reverseGeocode && reverseGeocode.length > 0) {
            console.log("[AuthProvider] Adresse:", {
              street: reverseGeocode[0].street,
              city: reverseGeocode[0].city,
              region: reverseGeocode[0].region,
              country: reverseGeocode[0].country,
              postalCode: reverseGeocode[0].postalCode
            });
          }
        } catch (geocodeError) {
          console.error("[AuthProvider] Erreur de géocodage inverse:", geocodeError);
        }
      } catch (positionError) {
        console.error("[AuthProvider] Erreur lors de la récupération de la position:", positionError);
      }
    }
    
    // Mettre à jour en DB
    const updateResult = await updateUserData({
      location: enabled
    });
    console.log("[AuthProvider] updateLocationAccess - Résultat de la mise à jour:", updateResult);
    
    setLocationEnabled(enabled);
    console.log("[AuthProvider] updateLocationAccess - Nouvel état:", enabled);
    return true;
  } catch (error) {
    console.error(t('location.errors.accessUpdateError'), error);
    return false;
  }
};

  


  return (
    <AuthContext.Provider
      value={{
        isLoggedIn,
        userToken,
        userData,
        isLoadingUserData,
        fetchUserData,
        fetchUserDataById,
        login,
        logout,
        updateUserData,
        handleProfileImageUpdate,
        downloadUserData,
        clearUserData,
        deleteUserAccount,
        getContacts,
        getContactById,
        checkAndRequestContactsPermission,
        contactsAccessEnabled,
        updateContactsAccess,
        getContactsWithAppStatus,
        requestLocationPermission,
        checkLocationPermission,
        updateLocationAccess,
        locationEnabled
      }}
    >
      {children}
      <ContactsPermissionModal
        visible={contactsPermissionModalVisible}
        onClose={handlePermissionModalClose}
        onOpenSettings={handleOpenSettings}
        onRequestPermission={handleRequestPermission}
      />
    </AuthContext.Provider>
  );
};

export default AuthProvider;