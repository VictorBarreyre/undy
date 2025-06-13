import React, { createContext, useState, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAxiosInstance, getAxiosInstance } from '../../data/api/axiosInstance';
import { DeviceEventEmitter, Alert, PermissionsAndroid, Platform, Linking } from 'react-native';
import * as ExpoContacts from 'expo-contacts'; // Remplacé par expo-contacts
import { useCardData } from './CardDataContexte';
import i18n from 'i18next'; // Importation directe de i18n
import ContactsPermissionModal from '../../presentation/components/ContactsPermissionsModal';
import { useTranslation } from 'react-i18next';
import * as Location from 'expo-location'; // Ajoutez cette ligne
import mixpanel from "../../services/mixpanel"


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
  const { t } = useTranslation();
  const notificationTestComplete = useRef(false);

  const [notificationsInitialized, setNotificationsInitialized] = useState(false);

  const initializeNotifications = async (user) => {
    console.warn("[AUTH] Initialisation des notifications pour l'utilisateur");
    try {
      // Vérifications préliminaires
      if (!user || !user._id) {
        console.warn("[AUTH] Pas d'utilisateur valide pour initialiser les notifications");
        return false;
      }

      // Importation dynamique pour éviter les dépendances circulaires
      const NotificationManager = require('../../presentation/notifications/NotificationManager').default;

      if (!NotificationManager) {
        console.warn("[AUTH] NotificationManager non disponible");
        return false;
      }

      // Vérifier si le service est déjà initialisé
      if (NotificationManager.initialized) {
        console.warn("[AUTH] NotificationManager déjà initialisé");
        // Mise à jour du token si nécessaire
        const token = await NotificationManager.notificationService.getToken();
        console.warn("[AUTH] Token actuel:", token);
        if (token) {
          await NotificationManager.registerTokenWithServer(user._id, token);
        }
        setNotificationsInitialized(true);
        return true;
      }

      // Initialisation complète
      console.warn("[AUTH] Lancement de l'initialisation complète");
      const success = await NotificationManager.initialize(user);
      console.warn("[AUTH] Résultat de l'initialisation:", success);

      // Stockage du résultat
      await AsyncStorage.setItem('notificationsInitialized', success ? 'true' : 'false');
      setNotificationsInitialized(success);

      return success;
    } catch (error) {
      console.warn("[AUTH] Erreur d'initialisation des notifications:", error);
      return false;
    }
  };

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

  useEffect(() => {
    if (userData) {

      const dailyActivUsersProps = {
        user_id: userData._id,
        timestamp: Date.now(),
        session_id: 'SESSION_ID', // Remplacez par une méthode pour générer un ID de session
        platform: Platform.OS,
        app_version: '1.0', // Remplacez par la version actuelle de votre application
      };

      mixpanel.track("Daily activ users", dailyActivUsersProps); // Utilisez l'instance importée
    }
  }, [userData]);

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

  useEffect(() => {
    if (!isLoggedIn || !userToken) return;

    // Vérifier le token toutes les 30 minutes
    const checkTokenValidity = async () => {
        try {
            const token = await AsyncStorage.getItem('accessToken');
            if (!token) return;

            // Décoder le token pour vérifier l'expiration
            const payload = JSON.parse(atob(token.split('.')[1]));
            const expiresAt = payload.exp * 1000; // Convertir en millisecondes
            const now = Date.now();
            const timeUntilExpiry = expiresAt - now;

            // Si le token expire dans moins de 5 minutes, le rafraîchir
            if (timeUntilExpiry < 5 * 60 * 1000) {
                console.log('[AuthContext] Token proche de l\'expiration, rafraîchissement...');
                const instance = getAxiosInstance();
                if (instance) {
                    // Forcer un appel API pour déclencher le refresh
                    await instance.get('/api/users/profile');
                }
            }
        } catch (error) {
            console.error('[AuthContext] Erreur lors de la vérification du token:', error);
        }
    };

    // Vérifier immédiatement
    checkTokenValidity();

    // Puis toutes les 30 minutes
    const interval = setInterval(checkTokenValidity, 30 * 60 * 1000);

    return () => clearInterval(interval);
}, [isLoggedIn, userToken]);

  const fetchUserData = async () => {
    console.log('[AuthProvider] Début fetchUserData');
    const instance = getAxiosInstance();
    if (!instance) {
      throw new Error(i18n.t('auth.errors.axiosNotInitialized'));
    }

    try {
      const response = await instance.get('/api/users/profile?forceSync=true&includePhoneNumber=true');

      const cleanedData = cleanUserData(response.data);

      // Mise à jour des données
      setUserData(cleanedData);
      setContactsAccessEnabled(cleanedData.contacts || false);
      await AsyncStorage.setItem('userData', JSON.stringify(cleanedData));

      // Si les données ont changé et que l'utilisateur est connecté, mettre à jour le token de notification
      if (isLoggedIn && cleanedData._id) {
        try {
          const NotificationManager = require('../../presentation/notifications/NotificationManager').default;
          if (NotificationManager) {
            // Mettre à jour le token seulement, sans réinitialiser complètement
            const token = await NotificationManager.notificationService.getToken();
            if (token) {
              await NotificationManager.registerTokenWithServer(cleanedData._id, token);
            }
          }
        } catch (notifError) {
          console.error('[AuthProvider] Erreur de mise à jour du token de notification:', notifError);
        }
      }

      console.log('[AuthProvider] Données utilisateur mises à jour avec succès');
      return cleanedData;
    } catch (error) {
      console.error('[AuthProvider] Erreur fetchUserData:', error);
      if (!error.response?.data?.shouldRefresh) {
        throw error;
      }
      return null;
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
    console.log('[Location] Données de mise à jour:', updatedData);

    const instance = getAxiosInstance();
    if (!instance) {
      throw new Error(i18n.t('auth.errors.axiosNotInitialized'));
    }

    try {
      const changedFields = {};
      Object.keys(updatedData).forEach(key => {
        // Ajouter une condition spécifique pour contacts et location
        if (key === 'contacts' || key === 'location') {
          changedFields[key] = updatedData[key];
        } else if (userData[key] !== updatedData[key]) {
          changedFields[key] = updatedData[key];
        }
      });

      console.log('[Location] Champs modifiés:', changedFields);

      if (Object.keys(changedFields).length === 0) {
        return { success: true, message: i18n.t('auth.success.noChangeNeeded') };
      }

      changedFields._id = userData._id;

      const response = await instance.put('/api/users/profile', changedFields);

      console.log('[Location] Réponse du serveur:', response.data);

      // Mettre à jour le state local avec toutes les données
      setUserData({ ...userData, ...response.data });
      await AsyncStorage.setItem('userData', JSON.stringify({ ...userData, ...response.data }));

      // Mise à jour spécifique pour contacts et location
      if (updatedData.contacts !== undefined) {
        setContactsAccessEnabled(updatedData.contacts);
      }
      if (updatedData.location !== undefined) {
        setLocationEnabled(updatedData.location);
      }

      return { success: true, message: i18n.t('auth.success.profileUpdated') };
    } catch (error) {
      console.error('[Location] Erreur de mise à jour:', error);
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
          const { data } = await ExpoContacts.getContactsAsync();
          console.log(`[AuthProvider] ${data.length} contacts récupérés`);

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
      const { status } = await ExpoContacts.getPermissionsAsync();

      console.log(`[AuthProvider] Permission check: ${status}`);

      const isGranted = status === 'granted';

      if (!isGranted) {
        console.log('[AuthProvider] Permission non accordée, retour sans contacts');
        return { contacts: [], hasAppUsers: false };
      }

      // Récupérer les contacts du téléphone
      const { data: phoneContacts } = await ExpoContacts.getContactsAsync({
        fields: [
          ExpoContacts.Fields.ID,
          ExpoContacts.Fields.Name,
          ExpoContacts.Fields.FirstName,
          ExpoContacts.Fields.LastName,
          ExpoContacts.Fields.PhoneNumbers
        ]
      });
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
          contactId: contact.id, // Modifié: ExpoContacts utilise id au lieu de recordID
          contactName: contact.name || `${contact.firstName || ''} ${contact.lastName || ''}`.trim() || 'Sans nom',
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
          contacts: phoneNumbers.map(contact => ({ ...contact, hasApp: false })),
          hasAppUsers: false
        };
      }
    } catch (error) {
      console.error('[AuthProvider] Erreur dans getContactsWithAppStatus:', error);
      return { contacts: [], hasAppUsers: false };
    }
  };

const login = async (accessToken, refreshToken) => {
  try {
    console.log('[AuthProvider] 🚀 Début de la connexion');
    
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
    let user = null;
    try {
      user = await fetchUserData();
      console.log('[AuthProvider] ✅ Données utilisateur récupérées');
      
      // Étape 5: Réinitialiser les notifications pour le nouvel utilisateur
      if (user && user._id) {
        try {
          const NotificationManager = require('../../presentation/notifications/NotificationManager').default;
          const NotificationService = require('../../presentation/notifications/NotificationService').default;
          
          if (NotificationManager && NotificationService) {
            console.log('[AuthProvider] 🔔 Réinitialisation des notifications pour le nouvel utilisateur');
            
            // Utiliser reinitializeForUser pour garantir un token correct
            const result = await NotificationManager.reinitializeForUser(user);
            
            console.log('[AuthProvider] 🔔 Résultat de la réinitialisation:', result);
            
            // Stocker l'état
            await AsyncStorage.setItem('notificationsInitialized', result.success ? 'true' : 'false');
            setNotificationsInitialized(result.success);
          }
        } catch (notifError) {
          console.error('[AuthProvider] ⚠️ Erreur d\'initialisation des notifications:', notifError);
          // Ne pas bloquer la connexion si les notifications échouent
        }
      }
    } catch (error) {
      console.error('[AuthProvider] ⚠️ Erreur fetchUserData:', error);
      
      // Réessayer après un court délai
      setTimeout(async () => {
        try {
          const secondUser = await fetchUserData();
          
          if (secondUser && secondUser._id) {
            try {
              const NotificationManager = require('../../presentation/notifications/NotificationManager').default;
              
              if (NotificationManager && !notificationsInitialized) {
                await NotificationManager.reinitializeForUser(secondUser);
                setNotificationsInitialized(true);
              }
            } catch (notifError) {
              console.error('[AuthProvider] ⚠️ Erreur lors de la seconde tentative:', notifError);
            }
          }
        } catch (secondError) {
          console.error('[AuthProvider] ⚠️ Échec de la 2e tentative:', secondError);
        }
      }, 1000);
    }
    
    // Étape 6: Terminez la connexion
    setIsLoggedIn(true);
    
    console.log('[AuthProvider] ✅ Connexion réussie');
  } catch (error) {
    console.error('[AuthProvider] ❌ Erreur lors de la connexion:', error);
    throw error;
  }
};
const logout = async () => {
  try {
    console.log('[AuthProvider] 🚪 Début de la déconnexion');
    
    // Nettoyer l'instance Axios
    const instance = getAxiosInstance();
    if (instance) {
      delete instance.defaults.headers.common['Authorization'];
    }

    // Nettoyer les notifications
    try {
      console.log('[AuthProvider] 🔔 Nettoyage des notifications');
      const NotificationManager = require('../../presentation/notifications/NotificationManager').default;
      
      if (NotificationManager) {
        // Nettoyer complètement le manager
        await NotificationManager.cleanup();
        
        // Annuler toutes les notifications
        if (NotificationManager.notificationService) {
          await NotificationManager.notificationService.cancelAllNotifications();
        }
        
        console.log('[AuthProvider] ✅ Notifications nettoyées');
      }
      
      // Supprimer l'indicateur d'initialisation
      await AsyncStorage.removeItem('notificationsInitialized');
      setNotificationsInitialized(false);
    } catch (notifError) {
      console.error('[AuthProvider] ⚠️ Erreur lors du nettoyage des notifications:', notifError);
    }

    // Suppression des données
    await AsyncStorage.multiRemove(['accessToken', 'refreshToken', 'userData', 'apnsToken']);
    
    if (userData?._id) {
      await AsyncStorage.removeItem(`pendingSecretData_${userData._id}`);
    }

    // Mise à jour des états
    setUserData(null);
    setIsLoadingUserData(false);
    setUserToken(null);
    setIsLoggedIn(false);

    console.log('[AuthProvider] ✅ Déconnexion réussie');
    return true;
  } catch (error) {
    console.error('[AuthProvider] ❌ Erreur lors de la déconnexion:', error);
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
  if (userData && isLoggedIn && !notificationTestComplete.current) {
    const testNotificationSetup = async () => {
      console.warn("[AUTH_TEST] Vérification du système de notifications (exécution unique)");
      
      try {
        console.warn("[AUTH_TEST] Utilisateur connecté, test des notifications");
        
        // Importation dynamique
        const NotificationService = require('../../presentation/notifications/NotificationService').default;
        
        if (NotificationService) {
          // Initialiser d'abord le service
          await NotificationService.initialize();
          
          // CORRECTION: checkPermissions retourne directement un booléen, pas un objet
          const hasPermission = await NotificationService.checkPermissions();
          console.warn("[AUTH_TEST] Statut des permissions:", hasPermission);
          
          if (!hasPermission) {
            // Demander les permissions si nécessaire
            const { granted } = await NotificationService.requestPermissions();
            console.warn("[AUTH_TEST] Permissions accordées:", granted);
          }
          
          // Ne pas envoyer de notification de test automatiquement
          // Cela évite de spammer l'utilisateur à chaque connexion
          console.warn("[AUTH_TEST] Système de notifications prêt");
        }
      } catch (error) {
        console.warn("[AUTH_TEST] Erreur lors du test:", error);
      } finally {
        // Toujours marquer comme terminé
        notificationTestComplete.current = true;
      }
    };
    
    // Délai pour s'assurer que tout est bien initialisé
    setTimeout(testNotificationSetup, 2000);
  }
}, [userData, isLoggedIn]);

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
      // Vérifier la permission avec expo-contacts
      const { status: permissionStatus } = await ExpoContacts.getPermissionsAsync();
      console.log(`[AuthProvider] Permission status: ${permissionStatus}`);

      if (permissionStatus === 'granted') {
        return { granted: true, needsSettings: false };
      }

      // Si la permission n'est pas accordée, demander via expo-contacts
      const { status: requestStatus } = await ExpoContacts.requestPermissionsAsync();
      console.log(`[AuthProvider] Request status: ${requestStatus}`);

      if (requestStatus === 'granted') {
        return { granted: true, needsSettings: false };
      }

      // Si l'utilisateur a refusé, proposer d'aller dans les paramètres
      return new Promise((resolve) => {
        Alert.alert(
          t('permissions.contactsNeededTitle'),
          t('permissions.contactsNeededMessage'),
          [
            {
              text: t('permissions.cancel'),
              style: "cancel",
              onPress: () => resolve({ granted: false, needsSettings: false })
            },
            {
              text: t('permissions.openSettings'),
              onPress: () => {
                Linking.openSettings();
                resolve({ granted: false, needsSettings: true });
              }
            }
          ]
        );
      });
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
      // Utiliser expo-contacts pour demander la permission
      const { status } = await ExpoContacts.requestPermissionsAsync();
      const isGranted = status === 'granted';

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
      // Vérifier d'abord les permissions avec expo-contacts
      const { status } = await ExpoContacts.getPermissionsAsync();

      // Si la permission n'est pas déjà accordée
      if (status !== 'granted') {
        // Utiliser notre fonction centralisée pour gérer la demande
        const permissionResult = await checkAndRequestContactsPermission();

        // Si la permission n'a pas été accordée
        if (!permissionResult.granted) {
          return [];
        }
      }

      // Ce code ne s'exécute que si la permission est déjà accordée ou vient d'être accordée
      const { data } = await ExpoContacts.getContactsAsync({
        fields: [
          ExpoContacts.Fields.ID,
          ExpoContacts.Fields.Name,
          ExpoContacts.Fields.FirstName,
          ExpoContacts.Fields.LastName,
          ExpoContacts.Fields.PhoneNumbers,
          ExpoContacts.Fields.Emails,
          ExpoContacts.Fields.Image
        ]
      });
      console.log('Contacts:', data);
      return data;
    } catch (error) {
      console.error(i18n.t('auth.errors.retrievingContacts'), error);
      return [];
    }
  };

  // Fonction pour récupérer un contact par son ID
  const getContactById = async (contactId) => {
    try {
      const { data } = await ExpoContacts.getContactsAsync({
        id: contactId,
        fields: [
          ExpoContacts.Fields.ID,
          ExpoContacts.Fields.Name,
          ExpoContacts.Fields.FirstName,
          ExpoContacts.Fields.LastName,
          ExpoContacts.Fields.PhoneNumbers,
          ExpoContacts.Fields.Emails,
          ExpoContacts.Fields.Image
        ]
      });

      return data[0] || null; // Retourner le premier contact s'il existe
    } catch (error) {
      console.error(i18n.t('auth.errors.retrievingContact'), error);
      return null;
    }
  };

  // Fonction pour vérifier l'état actuel de la permission
  const checkLocationPermission = async () => {
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      console.error(t('location.errors.permissionCheckError'), error);
      return false;
    }
  };

  const requestLocationPermission = async () => {
    console.log('[Location] Début de demande de permission');
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      console.log(`[Location] Statut de permission: ${status}`);

      if (status === 'granted') {
        return { granted: true };
      } else {
        // Si l'utilisateur refuse, proposer les paramètres système
        return new Promise((resolve) => {
          Alert.alert(
            t('permissions.locationNeededTitle'),
            t('permissions.locationNeededMessage'),
            [
              {
                text: t('permissions.cancel'),
                style: "cancel",
                onPress: () => resolve({ granted: false, needsSettings: false })
              },
              {
                text: t('permissions.openSettings'),
                onPress: () => {
                  Linking.openSettings();
                  resolve({ granted: false, needsSettings: true });
                }
              }
            ]
          );
        });
      }
    } catch (error) {
      console.error('[Location] Erreur de permission:', error);
      return {
        granted: false,
        error: error.message
      };
    }
  };



  useEffect(() => {
    if (userData) {
      // Synchroniser locationEnabled avec la valeur de userData
      const newLocationEnabled = userData.location || false;
      setLocationEnabled(newLocationEnabled);
    }
  }, [userData]);


  const getCurrentLocation = async () => {
    try {
      // Vérifier si la permission est déjà accordée
      const hasPermission = await checkLocationPermission();

      if (!hasPermission) {
        // Demander la permission
        const result = await requestLocationPermission();
        if (!result.granted) {
          return null;
        }
      }

      // Obtenir la position
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      return {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude
      };
    } catch (error) {
      console.error('Erreur lors de l\'obtention de la position:', error);
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
        checkAndRequestContactsPermission,
        contactsAccessEnabled,
        updateContactsAccess,
        getContactsWithAppStatus,
        requestLocationPermission,
        checkLocationPermission,
        locationEnabled,
        getCurrentLocation
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