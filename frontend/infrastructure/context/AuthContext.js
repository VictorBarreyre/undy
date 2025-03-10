import React, { createContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAxiosInstance, getAxiosInstance } from '../../data/api/axiosInstance';
import { DeviceEventEmitter, Alert, PermissionsAndroid, Platform } from 'react-native';
import Contacts from 'react-native-contacts';
import { useCardData } from './CardDataContexte';
import i18n from 'i18next'; // Importation directe de i18n

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userToken, setUserToken] = useState(null);
  const [userData, setUserData] = useState(null);
  const [isLoadingUserData, setIsLoadingUserData] = useState(true);
  const [contactsAccessEnabled, setContactsAccessEnabled] = useState(false);

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

  const updateUserData = async (updatedData) => {
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

      if (updatedData.contacts !== undefined) {
        setContactsAccessEnabled(updatedData.contacts);
      }

      return { success: true, message: i18n.t('auth.success.profileUpdated') };
    } catch (error) {
      console.error(i18n.t('auth.errors.updatingUserData'), error);
      return { success: false, message: i18n.t('auth.errors.profileUpdateFailed') };
    }
  };

  const updateContactsAccess = async (enabled) => {
    try {
      if (enabled) {
        // Si on active, demander l'accès aux contacts
        const contacts = await getContacts(); // Cette fonction appelle les permissions natives

        if (contacts && contacts.length > 0) {
          // Si l'accès est accordé, mettre à jour le backend via l'API
          const result = await updateUserData({ contacts: true });

          if (result.success) {
            setContactsAccessEnabled(true);
            return true;
          }
        }
        return false;
      } else {
        // Si on désactive, mettre à jour le backend via l'API
        const result = await updateUserData({ contacts: false });

        if (result.success) {
          setContactsAccessEnabled(false);
          return true;
        }
        return false;
      }
    } catch (error) {
      console.error(i18n.t('auth.errors.contactsAccess'), error);
      return false;
    }
  };

  useEffect(() => {
    if (userData) {
      setContactsAccessEnabled(userData.contacts || false);
    }
  }, [userData]);

  // Dans AuthContext.js
  const getContactsWithAppStatus = async () => {
    try {
      // Récupérer les contacts du téléphone
      const phoneContacts = await getContacts();

      if (!phoneContacts || phoneContacts.length === 0) {
        return { contacts: [], hasAppUsers: false };
      }

      // Récupérer les numéros de téléphone formatés
      const phoneNumbers = phoneContacts.flatMap(contact =>
        contact.phoneNumbers.map(phone => ({
          contactId: contact.recordID,
          contactName: `${contact.givenName} ${contact.familyName}`.trim(),
          phoneNumber: phone.number.replace(/\D/g, '')
        }))
      );

      // Appel à l'API pour vérifier quels numéros sont associés à des utilisateurs
      const instance = getAxiosInstance();
      const response = await instance.post('/api/users/check-contacts', {
        phoneNumbers: phoneNumbers.map(p => p.phoneNumber)
      });

      // Associer le statut d'utilisation de l'app à chaque contact
      const contactsWithStatus = phoneNumbers.map(contact => ({
        ...contact,
        hasApp: response.data.usersPhoneNumbers.includes(contact.phoneNumber)
      }));

      // Vérifier si au moins un contact utilise l'application
      const hasAppUsers = contactsWithStatus.some(contact => contact.hasApp);

      return {
        contacts: contactsWithStatus,
        hasAppUsers
      };
    } catch (error) {
      console.error(i18n.t('auth.errors.checkingContacts'), error);
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

  const getContacts = async () => {
    try {
      let permission;

      // Gérer les permissions selon la plateforme
      if (Platform.OS === 'ios') {
        permission = await Contacts.requestPermission();
      } else {
        permission = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.READ_CONTACTS,
          {
            title: i18n.t('auth.permissions.contactsAccess.title'),
            message: i18n.t('auth.permissions.contactsAccess.message'),
            buttonPositive: i18n.t('auth.permissions.contactsAccess.ok')
          }
        );
      }

      if (permission === 'authorized' || permission === PermissionsAndroid.RESULTS.GRANTED) {
        // Récupérer tous les contacts
        const contacts = await Contacts.getAll();
        console.log('Contacts:', contacts);
        return contacts;
      } else {
        Alert.alert(
          i18n.t('auth.alerts.permissionDenied.title'),
          i18n.t('auth.alerts.permissionDenied.message')
        );
        return [];
      }
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
        contactsAccessEnabled,
        updateContactsAccess,
        getContactsWithAppStatus
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export default AuthProvider;