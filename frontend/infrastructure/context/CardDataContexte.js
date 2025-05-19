import React, { createContext, useState, useContext, useEffect } from 'react';
import { createAxiosInstance, getAxiosInstance } from '../../data/api/axiosInstance';
import { AuthContext } from './AuthContext';
import { Platform, Share, View, Dimensions } from 'react-native';
import i18n from 'i18next'; // Import direct de i18n
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage'; // Ajoutez cette ligne
import ConfettiCannon from 'react-native-confetti-cannon';
import mixpanel from "../../services/mixpanel"
import { moderateContent } from "../../services/ModerationService"

const SCREEN_WIDTH = Dimensions.get('window').width;
const SCREEN_HEIGHT = Dimensions.get('window').height;

// Définition des couleurs pour les confettis
const CONFETTI_COLORS = [
  '#50C8FF', // Bleu cyan électrique
  '#A78BFF', // Violet électrique
  '#FF7AC7', // Rose bonbon éclatant
  '#FF5F5F', // Rouge corail vif
  '#FFFFFF', // Blanc
];


const CardDataContext = createContext();

export const useCardData = () => {
  return useContext(CardDataContext);
};



export const calculatePrices = (originalPrice) => {
  // Le vendeur reçoit 75% (100% - 25% de frais de plateforme)
  const sellerEarnings = originalPrice * 0.75;
  const platformFee = originalPrice * 0.25;

  return {
    originalPrice,
    sellerEarnings,
    platformFee
  };
};

export const CardDataProvider = ({ children }) => {
  const [data, setData] = useState([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const { isLoggedIn } = useContext(AuthContext);
  const [lastFetchTime, setLastFetchTime] = useState(null);
  const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  const [unreadCountsMap, setUnreadCountsMap] = useState({});
  const [totalUnreadCount, setTotalUnreadCount] = useState(0);
  const { userData } = useContext(AuthContext);
  const [markedAsReadConversations, setMarkedAsReadConversations] = useState({});
  const [lastUpdateTime, setLastUpdateTime] = useState(null);
  const [userCurrency, setUserCurrency] = useState('€');
  const [showConfetti, setShowConfetti] = useState(false);
  const [confettiConfig, setConfettiConfig] = useState({
    count: 200,
    origin: { x: SCREEN_WIDTH / 2, y: 0 },
    explosionSpeed: 350,
    fallSpeed: 3000,
    gravity: 0.5,
    velocity: 25,
    angleRange: [0, 180],
    colors: CONFETTI_COLORS,
  });

  const [moderationStats, setModerationStats] = useState({
    totalChecked: 0,
    totalFlagged: 0,
    lastFlagged: null
  });


  const triggerConfetti = (customConfig = {}) => {
    setConfettiConfig({ ...confettiConfig, ...customConfig });
    setShowConfetti(true);

    // Arrêter les confettis après un délai
    setTimeout(() => {
      setShowConfetti(false);
    }, 5000); // 5 secondes
  };

  const detectUserCurrency = (country, language) => {
    // Priorité à la localisation si disponible
    if (country) {
      // Pays utilisant le dollar américain
      const usdCountries = ['UNITED STATES', 'USA', 'US', 'CANADA', 'AUSTRALIA', 'NEW ZEALAND', 'SINGAPORE'];

      // Pays utilisant la livre sterling
      const gbpCountries = ['UNITED KINGDOM', 'UK', 'ENGLAND', 'GREAT BRITAIN'];

      // Pays utilisant le yen japonais
      const jpyCountries = ['JAPAN'];

      // Pays utilisant l'euro
      const euroCountries = [
        'FRANCE', 'GERMANY', 'ITALY', 'SPAIN', 'PORTUGAL', 'NETHERLANDS',
        'BELGIUM', 'IRELAND', 'GREECE', 'AUSTRIA', 'FINLAND', 'LUXEMBOURG',
        'SLOVAKIA', 'SLOVENIA', 'ESTONIA', 'LATVIA', 'LITHUANIA', 'CYPRUS', 'MALTA'
      ];

      const upperCountry = country.toUpperCase();

      if (usdCountries.includes(upperCountry)) return '$';
      if (gbpCountries.includes(upperCountry)) return '£';
      if (jpyCountries.includes(upperCountry)) return '¥';
      if (euroCountries.includes(upperCountry)) return '€';
    }

    // Fallback sur la langue si pays non reconnu
    if (language) {
      switch (language.substring(0, 2).toLowerCase()) {
        case 'en':
          // Pour l'anglais, on essaie de différencier US/UK
          // On pourrait utiliser navigator.language qui inclut la région
          if (language.includes('GB') || language.includes('UK')) {
            return '£';
          }
          return '$'; // Par défaut US
        case 'fr':
        case 'de':
        case 'es':
        case 'it':
        case 'pt':
        case 'nl':
        case 'el':
        case 'fi':
          return '€';
        case 'ja':
          return '¥';
        default:
          return '€'; // Euro par défaut
      }
    }

    return '€'; // Devise par défaut
  };

  useEffect(() => {
    const initCurrency = async () => {
      try {
        // Vérifier si une devise est déjà sauvegardée
        const savedCurrency = await AsyncStorage.getItem('userCurrency');
        if (savedCurrency) {
          setUserCurrency(savedCurrency);
          return;
        }

        // Sinon, détecter la devise basée sur la localisation
        const { status } = await Location.getForegroundPermissionsAsync();
        let detectedCurrency = '€'; // Par défaut

        if (status === 'granted') {
          try {
            const position = await Location.getCurrentPositionAsync({
              accuracy: Location.Accuracy.Low // Précision faible suffisante pour le pays
            });

            if (position) {
              const geoData = await Location.reverseGeocodeAsync({
                latitude: position.coords.latitude,
                longitude: position.coords.longitude
              });

              if (geoData && geoData.length > 0) {
                const { country } = geoData[0];
                const currentLanguage = i18n.language || navigator.language;
                detectedCurrency = detectUserCurrency(country, currentLanguage);
              }
            }
          } catch (locError) {
            console.log('Erreur de géolocalisation, utilisation de la langue:', locError);
            // Fallback sur la langue uniquement
            const currentLanguage = i18n.language || navigator.language;
            detectedCurrency = detectUserCurrency(null, currentLanguage);
          }
        } else {
          // Pas de permission, utilisation de la langue uniquement
          const currentLanguage = i18n.language || navigator.language;
          detectedCurrency = detectUserCurrency(null, currentLanguage);
        }

        // Sauvegarder et définir la devise détectée
        await AsyncStorage.setItem('userCurrency', detectedCurrency);
        setUserCurrency(detectedCurrency);
      } catch (error) {
        console.error('Erreur lors de la détection de la devise:', error);
        setUserCurrency('€'); // Fallback à l'euro
      }
    };

    initCurrency();
  }, []);

  const setUserPreferredCurrency = async (currency) => {
    try {
      await AsyncStorage.setItem('userCurrency', currency);
      setUserCurrency(currency);
      return true;
    } catch (error) {
      console.error('Erreur lors de la sauvegarde de la devise:', error);
      return false;
    }
  };


  useEffect(() => {
    const initAxios = async () => {
      try {
        await createAxiosInstance();
        if (isLoggedIn) {
          await fetchUnpurchasedSecrets(true);
        } else {
          setIsLoadingData(false);
          setData([]);
        }
      } catch (error) {
        console.error(i18n.t('cardData.errors.axiosInitError'), error);
        setIsLoadingData(false);
      }
    };
    initAxios();
  }, [isLoggedIn]);

  const getCurrentLocation = async () => {
    try {
      // Demander la permission
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== 'granted') {
        console.log(i18n.t('location.logs.permissionDenied'));
        return null;
      }

      // Obtenir la position
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced
      });

      return {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude
      };
    } catch (error) {
      console.error(i18n.t('location.errors.gettingPosition'), error);
      return null;
    }
  };

  const checkAndNotifyNearbySecrets = async (distance = 5) => {
    if (!userData || !userData._id) return false;

    try {
      // Vérifier si on peut envoyer une notification (pas plus d'une par jour)
      const lastNotifTime = await AsyncStorage.getItem('lastNearbyNotificationTime');
      if (lastNotifTime && (Date.now() - parseInt(lastNotifTime) < 24 * 60 * 60 * 1000)) {
        return false; // Notification déjà envoyée dans les dernières 24h
      }

      // Récupérer les secrets à proximité
      const nearbySecrets = await fetchSecretsByLocation(distance);

      if (nearbySecrets && nearbySecrets.length > 0) {
        const instance = getAxiosInstance();
        if (!instance) return false;

        // Envoyer la notification via le backend
        await instance.post('/api/notifications/nearby', {
          userId: userData._id,
          count: nearbySecrets.length,
          distance
        });

        // Enregistrer le timestamp
        await AsyncStorage.setItem('lastNearbyNotificationTime', Date.now().toString());
        return true;
      }

      return false;
    } catch (error) {
      console.error('Erreur lors de la vérification des secrets à proximité:', error);
      return false;
    }
  };

  const checkAndSendStripeReminder = async () => {
    if (!userData || !userData._id) return false;

    try {
      // Vérifier le statut Stripe
      const stripeStatus = await handleStripeOnboardingRefresh();

      // Si le statut est "pending", c'est un bon candidat pour un rappel
      if (stripeStatus.stripeStatus === 'pending') {
        // Vérifier si on a déjà envoyé un rappel récemment
        const lastReminderTime = await AsyncStorage.getItem('lastStripeReminderTime');
        if (lastReminderTime && (Date.now() - parseInt(lastReminderTime) < 3 * 24 * 60 * 60 * 1000)) {
          return false; // Rappel déjà envoyé dans les 3 derniers jours
        }

        const instance = getAxiosInstance();
        if (!instance) return false;

        // Envoyer la notification via le backend
        await instance.post('/api/notifications/stripe-reminder', {
          userId: userData._id
        });

        // Enregistrer le timestamp
        await AsyncStorage.setItem('lastStripeReminderTime', Date.now().toString());
        return true;
      }

      return false;
    } catch (error) {
      console.error('Erreur lors de la vérification du statut Stripe:', error);
      return false;
    }
  };

  const handlePostSecret = async (secretData) => {
    const instance = getAxiosInstance();
    if (!instance) {
      throw new Error(i18n.t('cardData.errors.axiosNotInitialized'));
    }
    try {
      // Validation des données d'entrée
      if (!secretData.selectedLabel || !secretData.secretText) {
        throw new Error(i18n.t('cardData.errors.missingRequiredFields'));
      }

      // Convertir explicitement price en nombre
      const numericPrice = parseFloat(secretData.price);

      // Validation du prix
      if (isNaN(numericPrice) || numericPrice < 3) {
        throw new Error(i18n.t('cardData.errors.invalidPrice'));
      }

      // MODÉRATION: Vérifier le contenu du secret avant de le poster
      const secretContent = `${secretData.selectedLabel} ${secretData.secretText}`;
      const moderationResult = await moderateMessageBeforeSend(secretContent);

      if (moderationResult.isFlagged) {
        throw new Error(i18n.t('cardData.errors.secretContentFlagged', {
          reason: moderationResult.reason
        }));
      }

      // Préparer les données de base de la requête
      const payload = {
        label: secretData.selectedLabel,
        content: secretData.secretText,
        price: numericPrice,
        currency: secretData.currency || '€', // Utiliser la devise fournie ou euro par défaut
        expiresIn: secretData.expiresIn || 7,
        language: secretData.language || i18n.language || navigator.language.split('-')[0] // Utiliser la langue de l'app/navigateur
      };

      // Validation et transfert de la location
      if (secretData.location) {
        // Validation stricte de l'objet location
        if (
          secretData.location.type === 'Point' &&
          Array.isArray(secretData.location.coordinates) &&
          secretData.location.coordinates.length === 2 &&
          secretData.location.coordinates.every(coord =>
            typeof coord === 'number' &&
            !isNaN(coord)
          )
        ) {
          payload.location = secretData.location;
          console.log('Sending location object:', payload.location);
        } else {
          console.warn('Invalid location object:', secretData.location);
        }
      }
      // Pour compatibilité avec le backend qui attend aussi latitude/longitude
      else if (secretData.latitude && secretData.longitude) {
        const lat = parseFloat(secretData.latitude);
        const lng = parseFloat(secretData.longitude);

        // Validation géographique
        if (
          !isNaN(lat) && !isNaN(lng) &&
          lat >= -90 && lat <= 90 &&
          lng >= -180 && lng <= 180
        ) {
          payload.latitude = lng;    // Attention à l'ordre longitude, latitude
          payload.longitude = lat;
        } else {
          console.warn('Invalid coordinates:', { lat, lng });
        }
      }

      // Log des données avant envoi avec plus de détails
      console.log('Données envoyées à l\'API:', JSON.stringify(payload, null, 2));

      const response = await instance.post('/api/secrets/createsecrets', payload);

      console.log(i18n.t('cardData.logs.secretCreationResponse'), response.data);

      // Structuration de la réponse
      const result = {
        success: true,
        requiresStripeSetup: !!response.data.stripeOnboardingUrl,
        secret: response.data.secret,
        message: response.data.message
      };

      // Ajouter conditionnellement les informations Stripe si nécessaire
      if (response.data.stripeOnboardingUrl) {
        result.stripeOnboardingUrl = response.data.stripeOnboardingUrl;
        result.stripeStatus = response.data.stripeStatus;
      }

      return result;

    } catch (error) {
      // Logging détaillé de l'erreur
      console.error(
        i18n.t('cardData.errors.secretCreation'),
        error?.response?.data || error.message,
        error.stack
      );

      // Génération d'un message d'erreur plus informatif
      const errorMessage =
        error?.response?.data?.message ||
        error.message ||
        i18n.t('cardData.errors.secretCreationGeneric');

      throw new Error(errorMessage);
    }
  };

  const getModerationStats = () => {
    return {
      ...moderationStats,
      flagRate: moderationStats.totalChecked > 0
        ? ((moderationStats.totalFlagged / moderationStats.totalChecked) * 100).toFixed(2)
        : 0
    };
  };


  const handleStripeOnboardingRefresh = async () => {
    const instance = getAxiosInstance();
    if (!instance) {
      throw new Error(i18n.t('cardData.errors.axiosNotInitialized'));
    }
    try {
      const response = await instance.post('/api/secrets/stripe/refresh-onboarding');

      console.log(i18n.t('cardData.logs.stripeRefreshResponse'), response.data);

      // Nouvelle logique basée sur le statut
      switch (response.data.status) {
        case 'active':
          return {
            success: true,
            verified: true,
            stripeStatus: 'active',
            message: i18n.t('cardData.stripe.configComplete')
          };

        case 'pending':
          return {
            success: true,
            verified: false,
            stripeOnboardingUrl: response.data.url,
            stripeStatus: 'pending',
            message: i18n.t('cardData.stripe.configInProgress')
          };

        case 'no_account':
          return {
            success: false,
            verified: false,
            needsRegistration: true,
            message: i18n.t('cardData.stripe.noAccount')
          };

        default:
          return {
            success: false,
            message: i18n.t('cardData.stripe.unknownStatus')
          };
      }
    } catch (error) {
      console.error(i18n.t('cardData.errors.stripeRefresh'), error?.response?.data || error.message);
      throw new Error(error?.response?.data?.message || i18n.t('cardData.errors.stripeRefreshGeneric'));
    }
  };

  const updateStripeBankAccount = async (stripeAccountId) => {
    const instance = getAxiosInstance();

    if (!instance) {
      throw new Error(i18n.t('errors.axiosNotInitialized'));
    }

    try {
      // Pas besoin de passer les URLs de retour et de rafraîchissement
      // Laissez votre backend les gérer comme il le fait déjà
      const response = await instance.post('/api/secrets/stripe/update-bank-account', {
        stripeAccountId,
        // Vous pouvez éventuellement ajouter un paramètre pour indiquer qu'il s'agit d'une modification bancaire
        action: 'update_bank_account'
      });

      console.log('Réponse de la requête de modification du compte bancaire:', response.data);

      if (response.data && response.data.url) {
        return {
          success: true,
          redirectUrl: response.data.url,
          message: i18n.t('stripe.redirectToBankForm')
        };
      } else if (response.data && response.data.error) {
        return {
          success: false,
          message: response.data.error
        };
      } else {
        return {
          success: false,
          message: i18n.t('stripe.unexpectedResponse')
        };
      }
    } catch (error) {
      console.error('Erreur lors de la requête de modification du compte bancaire:', error);

      const errorMessage = error?.response?.data?.message ||
        error?.message ||
        i18n.t('stripe.genericError');

      return {
        success: false,
        message: errorMessage
      };
    }
  };

  const handleStripeReturn = async (url) => {
    try {
      // Extraire les paramètres de l'URL
      const parsedUrl = new URL(url);
      const action = parsedUrl.searchParams.get('action');
      const secretPending = parsedUrl.searchParams.get('secretPending') === 'true';

      console.log("Traitement du retour Stripe", { action, secretPending });

      // Vérifier le statut du compte Stripe
      const stripeStatus = await handleStripeOnboardingRefresh();

      // Vérifier si le compte est actif
      const isStripeActive = stripeStatus.status === 'active' || stripeStatus.stripeStatus === 'active';

      // Si on a un compte actif et des données en attente, essayer de poster automatiquement
      if (isStripeActive && secretPending) {
        try {
          // Récupérer les données en attente
          let pendingSecretData = null;

          // Chercher d'abord dans la clé spécifique à l'utilisateur
          if (userData?._id) {
            const userSpecificKey = `pendingSecretData_${userData._id}`;
            const data = await AsyncStorage.getItem(userSpecificKey);
            if (data) {
              pendingSecretData = JSON.parse(data);
              await AsyncStorage.removeItem(userSpecificKey);
            }
          }

          // Chercher ensuite dans la clé générique
          if (!pendingSecretData) {
            const data = await AsyncStorage.getItem('pendingSecretData');
            if (data) {
              pendingSecretData = JSON.parse(data);
              await AsyncStorage.removeItem('pendingSecretData');
            }
          }

          if (pendingSecretData) {
            console.log("Données de secret en attente trouvées, tentative de publication");
            // Maintenant poster le secret
            return {
              success: true,
              message: 'Configuration Stripe réussie',
              pendingSecretData,
              stripeStatus,
              isStripeActive
            };
          }
        } catch (error) {
          console.error("Erreur lors du traitement des données en attente:", error);
        }
      }

      return {
        success: isStripeActive,
        message: isStripeActive
          ? 'Compte Stripe configuré avec succès'
          : 'Configuration Stripe en cours',
        stripeStatus,
        isStripeActive
      };
    } catch (error) {
      console.error('Erreur lors du traitement du retour Stripe:', error);
      return {
        success: false,
        message: error.message
      };
    }
  };

  const resetStripeAccount = async () => {
    const instance = getAxiosInstance();
    if (!instance) {
      throw new Error(i18n.t('cardData.errors.axiosNotInitialized'));
    }

    try {
      const response = await instance.post('/api/secrets/stripe/reset-stripe-status');

      if (response.data.success) {
        return {
          success: true,
          message: i18n.t('cardData.stripe.resetSuccess'),
          status: response.data.status,
          url: response.data.stripeOnboardingUrl
        };
      } else {
        return {
          success: false,
          message: response.data.message || i18n.t('cardData.errors.stripeResetGeneric')
        };
      }
    } catch (error) {
      console.error(i18n.t('cardData.errors.stripeReset'), error);
      return {
        success: false,
        message: error.response?.data?.message || i18n.t('cardData.errors.stripeResetGeneric')
      };
    }
  };

  const deleteStripeAccount = async () => {
    const instance = getAxiosInstance();
    if (!instance) {
      throw new Error(i18n.t('cardData.errors.axiosNotInitialized'));
    }

    try {
      const response = await instance.delete('/api/secrets/stripe/delete-account');

      return {
        success: true,
        message: i18n.t('cardData.stripe.deleteSuccess'),
        status: response.data.status
      };
    } catch (error) {
      console.error(i18n.t('cardData.errors.stripeDelete'), error);

      // Gérer spécifiquement l'erreur de solde non nul
      if (error.response?.data?.availableBalance || error.response?.data?.pendingBalance) {
        return {
          success: false,
          message: i18n.t('cardData.errors.stripeDeleteFundsAvailable'),
          availableBalance: error.response.data.availableBalance,
          pendingBalance: error.response.data.pendingBalance
        };
      }

      return {
        success: false,
        message: error.response?.data?.message || i18n.t('cardData.errors.stripeDeleteGeneric'),
        error: error.response?.data || error.message
      };
    }
  };

  const fetchUnpurchasedSecrets = async (forceFetch = false, languages = null) => {
    if (!forceFetch && lastFetchTime && (Date.now() - lastFetchTime < CACHE_DURATION)) {
      return data;
    }

    const instance = getAxiosInstance();
    if (!instance) {
      throw new Error(i18n.t('cardData.errors.axiosNotInitialized'));
    }

    // Construire les paramètres de la requête
    const params = {};

    // Traitement des langues
    if (languages) {
      if (Array.isArray(languages)) {
        // Si un tableau de langues est fourni, le convertir en chaîne séparée par des virgules
        params.languages = languages.join(',');
      } else if (typeof languages === 'string') {
        // Si une seule langue est fournie comme chaîne
        params.language = languages;
      }
    } else {
      // Par défaut, utiliser la langue actuelle de l'application
      params.language = i18n.language || navigator.language.split('-')[0];
    }

    setIsLoadingData(true);
    try {
      const response = await instance.get('/api/secrets/unpurchased', { params });

      if (response.data && response.data.secrets) {
        setData(response.data.secrets);
        setLastFetchTime(Date.now());
      } else {
        console.error(i18n.t('cardData.errors.invalidDataFromApi'));
        setData([]);
      }
    } catch (error) {
      console.error(i18n.t('cardData.errors.fetchingSecrets'), error);
      setData([]);
    } finally {
      setIsLoadingData(false);
    }
  };

  const fetchAllSecrets = async () => {
    const instance = getAxiosInstance();
    if (!instance) {
      throw new Error(i18n.t('cardData.errors.axiosNotInitialized'));
    }
    setIsLoadingData(true);
    try {
      const response = await instance.get('/api/secrets');
      if (response.data && Array.isArray(response.data)) {
        setData(response.data);
      } else {
        console.error(i18n.t('cardData.errors.invalidDataFromApi'));
        setData([]);
      }
    } catch (error) {
      console.error(i18n.t('cardData.errors.fetchingSecrets'), error);
      setData([]);
    } finally {
      setIsLoadingData(false);
    }
  };

  const fetchUserSecretsWithCount = async () => {
    const instance = getAxiosInstance();
    if (!instance) {
      throw new Error(i18n.t('cardData.errors.axiosNotInitialized'));
    }
    try {
      const { data } = await instance.get('/api/secrets/user-secrets-with-count');

      // Ajouter les calculs de prix pour chaque secret
      const secretsWithPrices = data.secrets.map(secret => ({
        ...secret,
        priceDetails: calculatePrices(secret.price)
      }));

      return {
        secrets: Array.isArray(secretsWithPrices) ? secretsWithPrices : [],
        count: typeof data.count === 'number' ? data.count : 0
      };
    } catch (error) {
      console.error(i18n.t('cardData.errors.fetchingUserSecrets'), error.message);
      return { secrets: [], count: 0 };
    }
  };

  const purchaseAndAccessConversation = async (secretId, price, paymentId) => {
    console.log("DÉBUT: purchaseAndAccessConversation", { secretId, price, paymentId });

    const instance = getAxiosInstance();
    if (!instance) {
      console.error("ERREUR: Axios non initialisé");
      throw new Error(i18n.t('cardData.errors.axiosNotInitialized'));
    }
    if (!secretId || !paymentId) {
      console.error("ERREUR: Paramètres manquants", { secretId, paymentId });
      throw new Error(i18n.t('cardData.errors.missingSecretOrPaymentId'));
    }

    try {
      // Tentative d'achat
      console.log("INFO: Tentative d'achat initiée", { secretId, paymentId });

      // Tracking de la tentative
      try {
        console.log("MIXPANEL: Tracking Purchase Attempt");
        mixpanel.track("Purchase Attempt", {
          product_id: secretId,
          price,
          currency: "EUR",
          quantity: 1,
          user_id: userData?._id,
          payment_id: paymentId
        });
        console.log("MIXPANEL: Tracking Purchase Attempt - Terminé");
      } catch (mpError) {
        console.error("MIXPANEL ERREUR (non bloquante):", mpError);
      }

      // Appel API pour l'achat
      console.log("API: Envoi de la requête d'achat");
      const purchaseResponse = await instance.post(
        `/api/secrets/${secretId}/purchase`,
        { paymentIntentId: paymentId }
      );
      console.log("API: Réponse d'achat reçue", purchaseResponse.data);

      // Vérification de l'ID de conversation
      if (!purchaseResponse.data.conversationId) {
        console.error("ERREUR: Pas d'ID de conversation reçu");
        try {
          mixpanel.track("Purchase Error", {
            product_id: secretId,
            error_type: "missing_conversation_id",
            payment_id: paymentId,
            user_id: userData?._id
          });
        } catch (mpError) {
          console.error("MIXPANEL ERREUR (non bloquante):", mpError);
        }
        throw new Error(i18n.t('cardData.errors.noConversationIdReceived'));
      }

      // Mise à jour des données locales
      console.log("STATE: Mise à jour des données locales");
      setData(currentData => {
        const newData = currentData.filter(secret => secret._id !== secretId);
        console.log("STATE: Données filtrées", {
          avantLength: currentData.length,
          aprèsLength: newData.length
        });
        return newData;
      });
      setLastFetchTime(null);
      console.log("STATE: Mise à jour terminée");

      // Récupération des données de conversation
      console.log("API: Récupération des données de conversation");
      const conversationResponse = await instance.get(
        `/api/secrets/conversations/secret/${secretId}`
      );
      console.log("API: Réponse de conversation reçue", {
        status: conversationResponse.status,
        dataSize: JSON.stringify(conversationResponse.data).length
      });

      // Envoi d'une notification au vendeur (via le backend)
      try {
        console.log("NOTIFICATION: Envoi de la notification d'achat au vendeur");
        await instance.post('/api/notifications/purchase', {
          secretId,
          buyerId: userData?._id,
          buyerName: userData?.name || 'Un utilisateur',
          price,
          currency: userCurrency || '€'
        });
        console.log("NOTIFICATION: Demande envoyée avec succès");
      } catch (notifError) {
        console.error("NOTIFICATION ERREUR (non bloquante):", notifError);
        // Ne pas bloquer la transaction en cas d'échec de notification
      }

      // Tracking de l'achat réussi
      try {
        console.log("MIXPANEL: Tracking Purchase Succès");
        mixpanel.track("Purchase", {
          product_id: secretId,
          price,
          currency: "EUR",
          quantity: 1,
          user_id: userData?._id,
          payment_id: paymentId,
          conversation_id: purchaseResponse.data.conversationId
        });
        console.log("MIXPANEL: Tracking Purchase Succès - Terminé");
      } catch (mpError) {
        console.error("MIXPANEL ERREUR (non bloquante):", mpError);
      }

      // Préparation du résultat
      const result = {
        conversationId: purchaseResponse.data.conversationId,
        conversation: conversationResponse.data
      };

      console.log("RETOUR: Préparation des données de retour", {
        conversationId: result.conversationId,
        hasConversation: !!result.conversation,
        conversationLength: result.conversation ? Object.keys(result.conversation).length : 0
      });

      // Retour des données pour la redirection
      console.log("FIN: purchaseAndAccessConversation - Succès");
      return result;

    } catch (error) {
      // Gestion des erreurs
      console.error("ERREUR PRINCIPALE:", {
        message: error.message,
        stack: error.stack,
        response: error.response?.data
      });

      // Tracking de l'erreur
      try {
        console.log("MIXPANEL: Tracking Purchase Failed");
        mixpanel.track("Purchase Failed", {
          product_id: secretId,
          price,
          currency: "EUR",
          error_message: error.message,
          error_type: error.response?.data?.error || 'unknown',
          user_id: userData?._id
        });
        console.log("MIXPANEL: Tracking Purchase Failed - Terminé");
      } catch (mpError) {
        console.error("MIXPANEL ERREUR (non bloquante):", mpError);
      }

      console.error("FIN: purchaseAndAccessConversation - Échec");
      throw error;
    }
  };


  const fetchPurchasedSecrets = async () => {
    const instance = getAxiosInstance();
    if (!instance) {
      throw new Error(i18n.t('cardData.errors.axiosNotInitialized'));
    }
    try {
      const response = await instance.get('/api/secrets/purchased');

      // Ajouter les calculs de prix pour chaque secret acheté
      const purchasedWithPrices = response.data.map(secret => ({
        ...secret,
        priceDetails: calculatePrices(secret.price)
      }));

      return purchasedWithPrices;
    } catch (error) {
      console.error(i18n.t('cardData.errors.fetchingPurchasedSecrets'), error);
      return [];
    }
  };


  const moderateMessageBeforeSend = async (content) => {
    try {
      // Incrémenter le compteur de vérifications
      setModerationStats(prev => ({
        ...prev,
        totalChecked: prev.totalChecked + 1
      }));

      // Vérifier le contenu avec notre service de modération
      const result = await moderateContent(content);

      // Si le contenu est signalé comme inapproprié
      if (result.isFlagged) {
        // Mettre à jour les statistiques de modération
        setModerationStats(prev => ({
          ...prev,
          totalFlagged: prev.totalFlagged + 1,
          lastFlagged: {
            content: content.substring(0, 50) + (content.length > 50 ? '...' : ''),
            reason: result.reason,
            timestamp: new Date()
          }
        }));

        // Enregistrer la tentative dans Mixpanel si disponible
        try {
          mixpanel.track("Content Moderation Flagged", {
            reason: result.reason,
            content_type: "message",
            user_id: userData?._id
          });
        } catch (mpError) {
          console.error("Erreur lors du tracking Mixpanel:", mpError);
        }

        return result;
      }

      return { isFlagged: false };
    } catch (error) {
      console.error("Erreur lors de la modération du contenu:", error);
      return { isFlagged: false }; // En cas d'erreur, permettre l'envoi (failsafe)
    }
  };


  const handleAddMessage = async (conversationId, content) => {
    const instance = getAxiosInstance();
    if (!instance) {
      throw new Error(i18n.t('cardData.errors.axiosNotInitialized'));
    }
  
    // Log des données d'entrée
    console.log("handleAddMessage - DONNÉES D'ENTRÉE:", {
      conversationId,
      contentType: typeof content,
      contentPreview: typeof content === 'string' 
        ? content.substring(0, 30) 
        : JSON.stringify(content).substring(0, 30)
    });
  
    // Gérer les différents types de contenu
    const messageData = typeof content === 'string'
      ? { content, messageType: 'text' }
      : content;
  
    // Si c'est un message audio, assurez-vous que les données nécessaires sont incluses
    if (messageData.messageType === 'audio' && !messageData.audio) {
      throw new Error(i18n.t('cardData.errors.missingAudioData'));
    }
  
    // MODÉRATION: Vérifier le contenu textuel des messages
    if ((messageData.messageType === 'text' || messageData.messageType === 'mixed') && messageData.content) {
      const moderationResult = await moderateMessageBeforeSend(messageData.content);
  
      if (moderationResult.isFlagged) {
        throw new Error(i18n.t('cardData.errors.contentFlagged', {
          reason: moderationResult.reason
        }));
      }
    }
  
    try {
      console.log("Envoi du message à l'API:", {
        url: `/api/secrets/conversations/${conversationId}/messages`,
        messageType: messageData.messageType,
        hasContent: !!messageData.content,
        hasImage: !!messageData.image,
        hasAudio: !!messageData.audio
      });
  
      const response = await instance.post(
        `/api/secrets/conversations/${conversationId}/messages`,
        messageData
      );
  
      console.log("Réponse complète de l'API:", JSON.stringify(response.data));
  
      // La réponse contient soit directement le message, soit un objet contenant une propriété message
      // Adaptons notre code pour gérer les deux cas
      const messageObject = response.data.message || response.data;
      const messageId = messageObject._id;
  
      console.log("Message ID extrait:", messageId);
      console.log("Contenu du message extrait:", messageObject.content);
      console.log("Type de message extrait:", messageObject.messageType);
  
      if (messageId) {
        // Envoyer la notification aux autres participants
        try {
          console.log("NOTIFICATION: Préparation de la notification");
          
          // Déterminer l'aperçu du message selon le type
          let messagePreview = "";
          if (typeof content === 'string') {
            messagePreview = content.substring(0, 100) + (content.length > 100 ? '...' : '');
          } else if (content.content) {
            messagePreview = content.content.substring(0, 100) + (content.content.length > 100 ? '...' : '');
          } else {
            // Aperçu selon le type
            switch (messageData.messageType) {
              case 'audio':
                messagePreview = "🎵 Message audio";
                break;
              case 'image':
                messagePreview = "📷 Image";
                break;
              case 'mixed':
                messagePreview = content.content 
                  ? content.content.substring(0, 100) 
                  : "🖼️ Image avec message";
                break;
              default:
                messagePreview = "Nouveau message";
            }
          }
          
          const notificationData = {
            conversationId,
            messageId,
            senderId: userData?._id,
            senderName: userData?.name || 'Utilisateur',
            messagePreview
          };
          
          console.log("NOTIFICATION DATA:", JSON.stringify(notificationData));
          
          console.log("NOTIFICATION: Envoi de la notification");
          
          try {
            const notifResponse = await instance.post('/api/notifications/message', notificationData);
            console.log("NOTIFICATION: Réponse reçue", {
              status: notifResponse.status,
              success: notifResponse.data?.success,
              message: notifResponse.data?.message
            });
          } catch (apiError) {
            console.error("NOTIFICATION API ERROR:", apiError.message);
            console.error("STATUS:", apiError.response?.status);
            console.error("RESPONSE DATA:", apiError.response?.data);
            
            // Si l'API renvoie une erreur 404, la route n'est peut-être pas correcte
            if (apiError.response?.status === 404) {
              console.error("ROUTE NOT FOUND: Vérifiez que la route '/api/notifications/message' existe sur votre API");
            }
            
            // Si l'API renvoie une erreur 401, il y a peut-être un problème d'authentification
            if (apiError.response?.status === 401) {
              console.error("AUTHENTICATION ERROR: Le token d'authentification est peut-être invalide ou expiré");
            }
          }
        } catch (notifError) {
          console.error("NOTIFICATION ERREUR GÉNÉRALE:", notifError.message);
          console.error("STACK:", notifError.stack);
        }
      } else {
        console.warn("Aucun ID de message trouvé dans la réponse:", response.data);
      }
  
      // Envoyer la notification aux autres participants (alternative)
      // Cette partie est un doublon mais pourrait être utile si le code ci-dessus ne fonctionne pas
      console.log("NOTIFICATION ALTERNATIVE: Tentative d'envoi");
      try {
        // Même si nous n'avons pas d'ID de message, tentons d'envoyer une notification
        const messagePreview = typeof content === 'string'
          ? content.substring(0, 100) + (content.length > 100 ? '...' : '')
          : (content.content 
              ? content.content.substring(0, 100) + (content.content.length > 100 ? '...' : '')
              : "Nouveau message");
              
        const fallbackNotifData = {
          conversationId,
          messageId: messageId || 'temp-' + Date.now(),  // Utiliser un ID temporaire si nécessaire
          senderId: userData?._id,
          senderName: userData?.name || 'Utilisateur',
          messagePreview
        };
        
        console.log("NOTIFICATION ALTERNATIVE DATA:", JSON.stringify(fallbackNotifData));
        
        const fallbackNotifResponse = await instance.post('/api/notifications/message', fallbackNotifData);
        console.log("NOTIFICATION ALTERNATIVE: Réponse reçue", {
          status: fallbackNotifResponse.status,
          success: fallbackNotifResponse.data?.success,
          message: fallbackNotifResponse.data?.message
        });
      } catch (fallbackError) {
        console.error("NOTIFICATION ALTERNATIVE ERREUR:", fallbackError.message);
        if (fallbackError.response) {
          console.error("ALTERNATIVE STATUS:", fallbackError.response.status);
          console.error("ALTERNATIVE DATA:", fallbackError.response.data);
        }
      }
  
      return response.data;
    } catch (error) {
      console.error(i18n.t('cardData.errors.sendingMessage'), error.response?.data || error.message);
      if (error.response) {
        console.error("ERREUR API CODE:", error.response.status);
        console.error("ERREUR API DATA:", error.response.data);
      }
      throw error;
    }
  };

  const getConversationMessages = async (conversationId) => {
    const instance = getAxiosInstance();
    if (!instance) {
      throw new Error(i18n.t('cardData.errors.axiosNotInitialized'));
    }
    try {
      const response = await instance.get(
        `/api/secrets/conversations/${conversationId}/messages`
      );

      console.log(i18n.t('cardData.logs.messagesReceived'), JSON.stringify(response.data, null, 2));

      const messages = response.data.messages.map(msg => ({
        ...msg,
        sender: msg.sender ? {
          _id: msg.sender._id,
          name: msg.sender.name
        } : null
      }));

      return {
        messages,
        conversationId: response.data.conversationId
      };
    } catch (error) {
      console.error(i18n.t('cardData.errors.fetchingMessages'), error);
      throw error;
    }
  };

  const getUserConversations = async () => {
    const instance = getAxiosInstance();
    if (!instance) {
      throw new Error(i18n.t('cardData.errors.axiosNotInitialized'));
    }
    try {
      const response = await instance.get('/api/secrets/conversations');

      if (!userData) {
        console.log(i18n.t('cardData.logs.userDataNull'));
        return [];
      }

      // Normaliser la structure des unreadCount
      const normalizedConversations = (response.data || []).map(conv => {
        // Création d'un objet conversation normalisé
        const normalizedConv = { ...conv };

        // Obtenir l'ID utilisateur correctement
        const userIdStr = userData?._id?.toString() || '';

        // Déterminer unreadCount selon le format retourné par l'API
        if (typeof conv.unreadCount === 'number') {
          normalizedConv.unreadCount = conv.unreadCount;
        } else if (conv.unreadCount instanceof Map || typeof conv.unreadCount === 'object') {
          normalizedConv.unreadCount = (conv.unreadCount instanceof Map)
            ? (conv.unreadCount.get(userIdStr) || 0)
            : (conv.unreadCount?.[userIdStr] || 0);
        } else {
          normalizedConv.unreadCount = 0;
        }

        return normalizedConv;
      });

      return normalizedConversations;
    } catch (error) {
      console.error(i18n.t('cardData.errors.fetchingConversations'), error);
      return [];
    }
  };

  const handleShareSecret = async (secret) => {
    try {
      if (secret?.shareLink) {
        const shareMessage = Platform.select({
          ios: i18n.t('cardData.share.messageIOS', { link: secret.shareLink }),
          android: i18n.t('cardData.share.messageAndroid', { link: secret.shareLink })
        });

        const shareOptions = {
          message: shareMessage,
          url: secret.shareLink,
          title: i18n.t('cardData.share.title'),
          subject: i18n.t('cardData.share.subject'),
          activityItemSources: [
            {
              placeholderItem: { type: 'text/plain', content: shareMessage },
              item: {
                default: { type: 'text/plain', content: shareMessage }
              },
              subject: {
                default: i18n.t('cardData.share.subject')
              },
              linkMetadata: {
                originalUrl: secret.shareLink,
                url: secret.shareLink,
                title: i18n.t('cardData.share.confidentialSecret')
              }
            }
          ]
        };

        const shareResult = await Share.share(shareOptions, {
          dialogTitle: i18n.t('cardData.share.dialogTitle'),
          excludedActivityTypes: [
            'com.apple.UIKit.activity.Print',
            'com.apple.UIKit.activity.AssignToContact'
          ]
        });

        return shareResult;
      } else {
        throw new Error(i18n.t('cardData.errors.shareLinkUnavailable'));
      }
    } catch (error) {
      console.error(i18n.t('cardData.errors.sharing'), error);
      throw error;
    }
  };

  const getSharedSecret = async (secretId) => {
    const instance = getAxiosInstance();
    if (!instance) {
      throw new Error(i18n.t('cardData.errors.axiosNotInitialized'));
    }
    try {
      console.log(i18n.t('cardData.logs.searchingSecret'), secretId);
      const response = await instance.get(`/api/secrets/shared/${secretId}`);
      console.log(i18n.t('cardData.logs.responseReceived'), response.data);
      return response.data;
    } catch (error) {
      console.log(i18n.t('cardData.logs.soughtSecret'), secretId);
      console.log(i18n.t('cardData.errors.fullError'), error.response?.data);
      throw error;
    }
  };

  const uploadImage = async (imageData) => {
    const instance = getAxiosInstance();
    if (!instance) {
      throw new Error(i18n.t('cardData.errors.axiosNotInitialized'));
    }

    try {
      const response = await instance.post('/api/upload/image', { image: imageData });
      return response.data;
    } catch (error) {
      console.error(i18n.t('cardData.errors.imageUpload'), error);
      throw error;
    }
  };

  const refreshUnreadCounts = async () => {
    if (!userData) {
      console.log(i18n.t('cardData.logs.userDataNullSkippingUpdate'));
      setUnreadCountsMap({});
      setTotalUnreadCount(0);
      return { countsMap: {}, total: 0 };
    }

    try {
      const conversations = await getUserConversations();

      // Créer une map des compteurs non lus
      const countsMap = {};
      let total = 0;

      conversations.forEach(conv => {
        // Si la conversation a été marquée comme lue localement, forcer à 0
        if (markedAsReadConversations[conv._id]) {
          countsMap[conv._id] = 0;
          return;
        }

        // Sinon, utiliser la valeur de l'API
        let count = 0;
        if (typeof conv.unreadCount === 'number') {
          count = conv.unreadCount;
        } else if (conv.unreadCount instanceof Map || typeof conv.unreadCount === 'object') {
          const userIdStr = userData?._id?.toString() || '';
          count = (conv.unreadCount instanceof Map)
            ? (conv.unreadCount.get(userIdStr) || 0)
            : (conv.unreadCount?.[userIdStr] || 0);
        }

        countsMap[conv._id] = count;
        total += count;
      });


      setUnreadCountsMap(countsMap);
      setTotalUnreadCount(total);

      return { countsMap, total };
    } catch (error) {
      console.error(i18n.t('cardData.errors.refreshingUnreadCounts'), error);
      return { countsMap: {}, total: 0 };
    }
  };

  const markConversationAsRead = async (conversationId, userToken) => {
    const instance = getAxiosInstance();

    if (!conversationId) return;

    try {
      // Marquer localement immédiatement
      setMarkedAsReadConversations(prev => ({
        ...prev,
        [conversationId]: true
      }));

      // Mettre à jour les compteurs locaux immédiatement
      setUnreadCountsMap(prev => ({
        ...prev,
        [conversationId]: 0
      }));

      // Recalculer le total immédiatement
      setTotalUnreadCount(prev => prev - (unreadCountsMap[conversationId] || 0));

      // Appel API en arrière-plan
      if (userToken) {
        await instance.patch(
          `/api/secrets/conversations/${conversationId}/read`,
          {},
          { headers: { Authorization: `Bearer ${userToken}` } }
        );
      }

      return true;
    } catch (error) {
      console.error(i18n.t('cardData.errors.markingAsRead'), error);
      throw error;
    }
  };

  const resetReadStatus = () => {
    setMarkedAsReadConversations({});
  };

  useEffect(() => {
    if (isLoggedIn && userData) {
      const updateCounts = async () => {
        try {
          if (lastUpdateTime === null || Date.now() - lastUpdateTime > 30000) {
            await refreshUnreadCounts();
            setLastUpdateTime(Date.now());
          }
        } catch (error) {
          console.error(i18n.t('cardData.errors.refreshingCounters'), error);
        }
      };

      updateCounts();
    }
  }, [isLoggedIn, userData, lastUpdateTime]);

  const fetchSecretsByLocation = async (radiusInKm = 5) => {
    const instance = getAxiosInstance();
    if (!instance) {
      throw new Error(i18n.t('cardData.errors.axiosNotInitialized'));
    }

    try {
      setIsLoadingData(true);

      // Utiliser la position actuelle pour récupérer les secrets à proximité
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced
      });

      const { latitude, longitude } = position.coords;

      // Appel à l'API avec les coordonnées
      const response = await instance.get('/api/secrets/nearby', {
        params: {
          latitude,
          longitude,
          radius: radiusInKm
        }
      });

      if (response.data && response.data.secrets) {
        setData(response.data.secrets);
        setLastFetchTime(Date.now());
        return response.data.secrets;
      } else {
        console.error(i18n.t('cardData.errors.invalidDataFromApi'));
        setData([]);
        return [];
      }
    } catch (error) {
      console.error(i18n.t('location.errors.fetchingNearbySecrets'), error);
      setData([]);
      return [];
    } finally {
      setIsLoadingData(false);
    }
  };

  const deleteSecret = async (secretId) => {
    const instance = getAxiosInstance();
    if (!instance) {
      throw new Error(i18n.t('cardData.errors.axiosNotInitialized'));
    }

    try {
      // Appel à l'API pour supprimer le secret
      const response = await instance.delete(`/api/secrets/${secretId}`);

      console.log(i18n.t('cardData.logs.secretDeleted'), secretId);

      // Mettre à jour le cache local si nécessaire
      setData(currentData => currentData.filter(secret => secret._id !== secretId));
      setLastFetchTime(null); // Forcer un rafraîchissement lors de la prochaine requête

      return response.data;
    } catch (error) {
      console.error(i18n.t('cardData.errors.deletingSecret'), error);
      throw new Error(error?.response?.data?.message || i18n.t('cardData.errors.deletingSecretGeneric'));
    }
  };

  const handleIdentityVerification = async (userData, options = {}) => {
    const instance = getAxiosInstance();
    if (!instance) {
      throw new Error(i18n.t('cardData.errors.axiosNotInitialized'));
    }

    try {
      const payload = {
        stripeAccountId: userData.stripeAccountId,
        documentType: options.documentType || 'identity_document',
        documentSide: options.documentSide || 'front',
        skipImageUpload: options.skipImageUpload || false
      };

      console.log("Payload envoyé à l'API:", JSON.stringify(payload, null, 2));

      // Ajouter les images seulement si on ne skip pas l'upload
      if (!options.skipImageUpload) {
        if (options.documentImage) {
          payload.documentImage = options.documentImage;
        }
        if (options.selfieImage) {
          payload.selfieImage = options.selfieImage;
        }
      }

      // Appeler l'API de vérification d'identité
      const response = await instance.post('/api/secrets/verify-identity', payload);

      return {
        success: true,
        sessionId: response.data.sessionId,
        clientSecret: response.data.clientSecret,
        verificationUrl: response.data.verificationUrl, // Utilisez l'URL fournie par le backend
        message: response.data.message
      };
    } catch (error) {
      console.error('Erreur de vérification d\'identité:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Échec de la vérification d\'identité'
      };
    }
  };




  return (
    <>
      <CardDataContext.Provider value={{
        data,
        setData,
        handlePostSecret,
        handleStripeOnboardingRefresh,
        fetchAllSecrets,
        fetchUnpurchasedSecrets,
        fetchUserSecretsWithCount,
        purchaseAndAccessConversation,
        fetchPurchasedSecrets,
        handleAddMessage,
        getConversationMessages,
        isLoadingData,
        handleStripeReturn,
        deleteStripeAccount,
        resetStripeAccount,
        handleShareSecret,
        getSharedSecret,
        markConversationAsRead,
        uploadImage,
        getUserConversations,
        refreshUnreadCounts,
        unreadCountsMap,
        totalUnreadCount,
        resetReadStatus,
        setUnreadCountsMap,
        setTotalUnreadCount,
        fetchSecretsByLocation,
        getCurrentLocation,
        userCurrency,
        setUserPreferredCurrency,
        detectUserCurrency,
        deleteSecret,
        handleIdentityVerification,
        triggerConfetti,
        updateStripeBankAccount,
        moderateMessageBeforeSend,
        getModerationStats,
        checkAndNotifyNearbySecrets, // Nouvelle fonction
        checkAndSendStripeReminder,
      }}>
        {children}
      </CardDataContext.Provider>
      {showConfetti && (
        <ConfettiCannon
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 9999,
            elevation: 10, // Important pour Android
          }}
          count={confettiConfig.count}
          origin={confettiConfig.origin}
          explosionSpeed={confettiConfig.explosionSpeed}
          fallSpeed={confettiConfig.fallSpeed}
          fadeOut={true}
          colors={confettiConfig.colors}
          gravity={confettiConfig.gravity}
          velocity={confettiConfig.velocity}
          angleRange={confettiConfig.angleRange}
          particleSize={8}
        />
      )}
    </>
  );
};

export const ConfettiPresets = {
  fromBottom: {
    origin: { x: SCREEN_WIDTH / 2, y: 0 },
    gravity: 0.5,
    velocity: 25,
    angleRange: [0, 180],
  },
  lowHeight: {
    origin: { x: SCREEN_WIDTH / 2, y: 0 },
    gravity: 0.7,
    velocity: 15,
    angleRange: [0, 180],
  },
  mediumHeight: {
    origin: { x: SCREEN_WIDTH / 2, y: 0 },
    gravity: 0.5,
    velocity: 20,
    angleRange: [0, 180],
  },
  amazing: {
    colors: CONFETTI_COLORS,
    count: 250,
    explosionSpeed: 300,
  }
};

export default CardDataProvider;