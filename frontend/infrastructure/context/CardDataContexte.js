import React, { createContext, useState, useContext, useEffect } from 'react';
import { createAxiosInstance, getAxiosInstance } from '../../data/api/axiosInstance';
import { AuthContext } from './AuthContext';
import { Platform, Share } from 'react-native';
import i18n from 'i18next'; // Import direct de i18n
import * as Location from 'expo-location';


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
      
      // Préparer les données de base de la requête
      const payload = {
        label: secretData.selectedLabel,
        content: secretData.secretText,
        price: numericPrice,
        expiresIn: secretData.expiresIn || 7 // Valeur par défaut de 7 jours
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

  const handleStripeReturn = async (url) => {
    try {
      // Extraire les paramètres de l'URL
      const parsedUrl = new URL(url);
      const stripeAccountId = parsedUrl.searchParams.get('stripeAccountId');
      const status = parsedUrl.searchParams.get('status');

      if (status === 'success') {
        // Rafraîchir le statut Stripe
        const stripeStatus = await handleStripeOnboardingRefresh();

        return {
          success: true,
          message: i18n.t('cardData.stripe.configSuccessful'),
          stripeStatus
        };
      } else {
        return {
          success: false,
          message: i18n.t('cardData.stripe.configInProgress')
        };
      }
    } catch (error) {
      console.error(i18n.t('cardData.errors.stripeReturn'), error);
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

  const fetchUnpurchasedSecrets = async (forceFetch = false) => {
    if (!forceFetch && lastFetchTime && (Date.now() - lastFetchTime < CACHE_DURATION)) {
      return data;
    }
    const instance = getAxiosInstance();
    if (!instance) {
      throw new Error(i18n.t('cardData.errors.axiosNotInitialized'));
    }
    setIsLoadingData(true);
    try {
      const response = await instance.get('/api/secrets/unpurchased');
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
    const instance = getAxiosInstance();
    if (!instance) {
      throw new Error(i18n.t('cardData.errors.axiosNotInitialized'));
    }
    if (!secretId || !paymentId) {
      throw new Error(i18n.t('cardData.errors.missingSecretOrPaymentId'));
    }

    try {
      console.log(i18n.t('cardData.logs.attemptingPurchase'), { secretId, paymentId });

      const purchaseResponse = await instance.post(
        `/api/secrets/${secretId}/purchase`,
        { paymentIntentId: paymentId }
      );

      if (!purchaseResponse.data.conversationId) {
        throw new Error(i18n.t('cardData.errors.noConversationIdReceived'));
      }

      setData(currentData => currentData.filter(secret => secret._id !== secretId));
      setLastFetchTime(null);

      const conversationResponse = await instance.get(
        `/api/secrets/conversations/secret/${secretId}`
      );

      return {
        conversationId: purchaseResponse.data.conversationId,
        conversation: conversationResponse.data
      };
    } catch (error) {
      console.error(i18n.t('cardData.errors.purchaseErrorDetails'), {
        message: error.message,
        response: error.response?.data,
        secretId,
        paymentId
      });
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

  const handleAddMessage = async (conversationId, content) => {
    const instance = getAxiosInstance();
    if (!instance) {
      throw new Error(i18n.t('cardData.errors.axiosNotInitialized'));
    }

    const messageData = typeof content === 'string'
      ? { content }
      : content;

    try {
      const response = await instance.post(
        `/api/secrets/conversations/${conversationId}/messages`,
        messageData
      );

      if (response.data) {
        return response.data;
      }
    } catch (error) {
      console.error(i18n.t('cardData.errors.sendingMessage'), error.response?.data || error.message);
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
      const response = await instance.post('/api/upload', { image: imageData });
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

      console.log(i18n.t('cardData.logs.updatingCounters'), {
        countsMap,
        total,
        markedAsRead: Object.keys(markedAsReadConversations)
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

  return (
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
    }}>
      {children}
    </CardDataContext.Provider>
  );
};

export default CardDataProvider;