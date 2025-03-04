import React, { createContext, useState, useContext, useEffect } from 'react';
import { createAxiosInstance, getAxiosInstance } from '../../data/api/axiosInstance';
import { AuthContext } from './AuthContext';
import { Platform, Share } from 'react-native';




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
        console.error('Erreur d\'initialisation axios:', error);
        setIsLoadingData(false);
      }
    };
    initAxios();
  }, [isLoggedIn]);


  const handlePostSecret = async ({ selectedLabel, secretText, price, expiresIn = 7 }) => {
    const instance = getAxiosInstance();
    if (!instance) {
      throw new Error('Axios instance not initialized');
    }
    try {
      const response = await instance.post('/api/secrets/createsecrets', {
        label: selectedLabel,
        content: secretText,
        price: parseFloat(price),
        expiresIn
      });

      console.log('Réponse création secret:', response.data);

      // Le reste de votre code reste identique
      if (response.data.stripeOnboardingUrl) {
        return {
          success: true,
          requiresStripeSetup: true,
          secret: response.data.secret,
          stripeOnboardingUrl: response.data.stripeOnboardingUrl,
          stripeStatus: response.data.stripeStatus,
          message: response.data.message
        };
      }

      return {
        success: true,
        requiresStripeSetup: false,
        secret: response.data.secret,
        message: response.data.message
      };
    } catch (error) {
      console.error('Erreur création secret:', error?.response?.data || error.message);
      throw new Error(error?.response?.data?.message || 'Erreur lors de la création du secret');
    }
  };


  const handleStripeOnboardingRefresh = async () => {
    const instance = getAxiosInstance();
    if (!instance) {
      throw new Error('Axios instance not initialized');
    }
    try {
      const response = await instance.post('/api/secrets/stripe/refresh-onboarding');

      console.log('Réponse rafraîchissement Stripe:', response.data);

      // Nouvelle logique basée sur le statut
      switch (response.data.status) {
        case 'active':
          return {
            success: true,
            verified: true,
            stripeStatus: 'active',
            message: 'Compte Stripe complètement configuré'
          };

        case 'pending':
          return {
            success: true,
            verified: false,
            stripeOnboardingUrl: response.data.url,
            stripeStatus: 'pending',
            message: 'Configuration du compte Stripe en cours'
          };

        case 'no_account':
          return {
            success: false,
            verified: false,
            needsRegistration: true,
            message: 'Aucun compte Stripe associé'
          };

        default:
          return {
            success: false,
            message: 'Statut inconnu'
          };
      }
    } catch (error) {
      console.error('Erreur rafraîchissement Stripe:', error?.response?.data || error.message);
      throw new Error(error?.response?.data?.message || 'Erreur lors du rafraîchissement de la configuration Stripe');
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
          message: 'Compte Stripe configuré avec succès',
          stripeStatus
        };
      } else {
        return {
          success: false,
          message: 'Configuration Stripe en cours'
        };
      }
    } catch (error) {
      console.error('Erreur de retour Stripe:', error);
      return {
        success: false,
        message: error.message
      };
    }
  };

  const resetStripeAccount = async () => {
    const instance = getAxiosInstance();
    if (!instance) {
      throw new Error('Axios instance not initialized');
    }

    try {
      const response = await instance.post('/api/secrets/stripe/reset-stripe-status');

      if (response.data.success) {
        return {
          success: true,
          message: 'Compte Stripe réinitialisé avec succès',
          status: response.data.status,
          url: response.data.stripeOnboardingUrl // Si vous avez besoin de rediriger vers l'onboarding
        };
      } else {
        return {
          success: false,
          message: response.data.message || 'Erreur lors de la réinitialisation du compte'
        };
      }
    } catch (error) {
      console.error('Erreur réinitialisation compte Stripe:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Erreur lors de la réinitialisation du compte Stripe'
      };
    }
  };


  const deleteStripeAccount = async () => {
    const instance = getAxiosInstance();
    if (!instance) {
      throw new Error('Axios instance not initialized');
    }

    try {

      const response = await instance.delete('/api/secrets/stripe/delete-account');

      return {
        success: true,
        message: 'Compte Stripe supprimé avec succès',
        status: response.data.status
      };
    } catch (error) {
      console.error('Erreur suppression compte Stripe:', error);

      // Gérer spécifiquement l'erreur de solde non nul
      if (error.response?.data?.availableBalance || error.response?.data?.pendingBalance) {
        return {
          success: false,
          message: 'Impossible de supprimer le compte. Des fonds sont encore disponibles.',
          availableBalance: error.response.data.availableBalance,
          pendingBalance: error.response.data.pendingBalance
        };
      }

      return {
        success: false,
        message: error.response?.data?.message || 'Erreur lors de la suppression du compte Stripe',
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
      throw new Error('Axios instance not initialized');
    }
    setIsLoadingData(true);
    try {
      const response = await instance.get('/api/secrets/unpurchased');
      if (response.data && response.data.secrets) {
        setData(response.data.secrets);
        setLastFetchTime(Date.now()); // Ajoutez cette ligne
      } else {
        console.error('Données invalides reçues depuis l\'API');
        setData([]);
      }
    } catch (error) {
      console.error('Erreur lors de la récupération des secrets :', error);
      setData([]);
    } finally {
      setIsLoadingData(false);
    }
  };


  const fetchAllSecrets = async () => {
    const instance = getAxiosInstance();
    if (!instance) {
      throw new Error('Axios instance not initialized');
    }
    setIsLoadingData(true);
    try {
      const response = await instance.get('/api/secrets');
      if (response.data && Array.isArray(response.data)) {
        setData(response.data);
      } else {
        console.error('Données invalides reçues depuis l\'API');
        setData([]);
      }
    } catch (error) {
      console.error('Erreur lors de la récupération des secrets :', error);
      setData([]);
    } finally {
      setIsLoadingData(false);
    }
  };

  const fetchUserSecretsWithCount = async () => {
    const instance = getAxiosInstance();
    if (!instance) {
      throw new Error('Axios instance not initialized');
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
      console.error('Erreur récupération secrets et comptage:', error.message);
      return { secrets: [], count: 0 };
    }
  };

  const purchaseAndAccessConversation = async (secretId, price, paymentId) => {
    const instance = getAxiosInstance();
    if (!instance) {
      throw new Error('Axios instance not initialized');
    }
    if (!secretId || !paymentId) {
      throw new Error('Secret ID et Payment ID sont requis');
    }

    try {
      console.log('Attempting to purchase secret:', { secretId, paymentId });

      const purchaseResponse = await instance.post(
        `/api/secrets/${secretId}/purchase`,
        { paymentIntentId: paymentId }
      );

      if (!purchaseResponse.data.conversationId) {
        throw new Error('Aucun ID de conversation reçu');
      }

      setData(currentData => currentData.filter(secret => secret._id !== secretId));
      setLastFetchTime(null); // Forcer un rafraîchissement au prochain focus

      const conversationResponse = await instance.get(
        `/api/secrets/conversations/secret/${secretId}`
      );

      return {
        conversationId: purchaseResponse.data.conversationId,
        conversation: conversationResponse.data
      };
    } catch (error) {
      console.error('Détails de l\'erreur:', {
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
      throw new Error('Axios instance not initialized');
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
      console.error('Erreur lors de la récupération des secrets achetés:', error);
      return [];
    }
  };

  const handleAddMessage = async (conversationId, content) => {
    const instance = getAxiosInstance();
    if (!instance) {
      throw new Error('Axios instance not initialized');
    }

    // Si content est un string, on l'envoie directement
    // Si c'est un objet (cas d'une image), on l'envoie tel quel
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
      console.error('Erreur lors de l\'envoi du message:', error.response?.data || error.message);
      throw error;
    }
  };

  // Fonction corrigée - À remplacer dans votre fichier CardDataContext.js

  const getConversationMessages = async (conversationId) => {
    const instance = getAxiosInstance();
    if (!instance) {
      throw new Error('Axios instance not initialized');
    }
    try {
      // URL CORRIGÉE: l'API attend /messages à la fin
      const response = await instance.get(
        `/api/secrets/conversations/${conversationId}/messages`
      );

      // Log pour débug
      console.log("Messages reçus:", JSON.stringify(response.data, null, 2));

      // S'assurer que chaque message a les informations du sender
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
      console.error('Erreur lors de la récupération des messages:', error);
      throw error;
    }
  };


  const getUserConversations = async () => {
    const instance = getAxiosInstance();
    if (!instance) {
      throw new Error('Axios instance not initialized');
    }
    try {
      const response = await instance.get('/api/secrets/conversations');

      if (!userData) {
        console.log('getUserConversations: userData is null, returning empty array');
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
      console.error('Erreur lors de la récupération des conversations:', error);
      return []; // Retourne un tableau vide en cas d'erreur
    }
  };

  const handleShareSecret = async (secret) => {
    try {
      if (secret?.shareLink) {
        const shareMessage = Platform.select({
          ios: `🔐 Découvre mon secret sur Hushy !\n\n${secret.shareLink}`,
          android: `🔐 Découvre mon secret sur Hushy !\n\n${secret.shareLink}\n\nTélécharge l'app: https://play.google.com/store/apps/details?id=com.hushy`
        });

        const shareOptions = {
          message: shareMessage,
          url: secret.shareLink,
          title: "Partager un secret",
          subject: "Un secret à partager sur Hushy",
          activityItemSources: [ // iOS uniquement
            {
              placeholderItem: { type: 'text/plain', content: shareMessage },
              item: {
                default: { type: 'text/plain', content: shareMessage }
              },
              subject: {
                default: "Un secret à partager sur Hushy"
              },
              linkMetadata: {
                originalUrl: secret.shareLink,
                url: secret.shareLink,
                title: "Secret confidentiel 🔐"
              }
            }
          ]
        };

        const shareResult = await Share.share(shareOptions, {
          dialogTitle: 'Partager ce secret confidentiel',
          excludedActivityTypes: [
            'com.apple.UIKit.activity.Print',
            'com.apple.UIKit.activity.AssignToContact'
          ]
        });

        return shareResult;
      } else {
        throw new Error('Lien de partage non disponible');
      }
    } catch (error) {
      console.error('Erreur lors du partage:', error);
      throw error;
    }
  };

  const getSharedSecret = async (secretId) => {
    const instance = getAxiosInstance();
    if (!instance) {
      throw new Error('Axios instance not initialized');
    }
    try {
      console.log("Recherche du secret avec ID:", secretId);
      const response = await instance.get(`/api/secrets/shared/${secretId}`);
      console.log("Réponse reçue:", response.data);
      return response.data;
    } catch (error) {
      console.log("Secret recherché:", secretId);
      console.log("Erreur complète:", error.response?.data);
      throw error;
    }
  };

  const uploadImage = async (imageData) => {
    const instance = getAxiosInstance();
    if (!instance) {
      throw new Error('Axios instance not initialized');
    }

    try {
      const response = await instance.post('/api/upload', { image: imageData });
      return response.data;
    } catch (error) {
      console.error('Erreur lors de l\'upload de l\'image:', error);
      throw error;
    }
  };

  const refreshUnreadCounts = async () => {

    if (!userData) {
      console.log('refreshUnreadCounts: userData is null, skipping update');
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
      
      console.log("Mise à jour des compteurs (avec cache local):", { 
        countsMap,
        total,
        markedAsRead: Object.keys(markedAsReadConversations)
      });
      
      setUnreadCountsMap(countsMap);
      setTotalUnreadCount(total);
      
      return { countsMap, total };
    } catch (error) {
      console.error('Erreur lors du rafraîchissement des compteurs non lus:', error);
      return { countsMap: {}, total: 0 };
    }
  };
  
  

  // Modifier la fonction markConversationAsRead
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
      console.error('Erreur lors du marquage comme lu', error);
      throw error;
    }
  };


  const resetReadStatus = () => {
    setMarkedAsReadConversations({});
  };
  
  


  return (
    <CardDataContext.Provider value={{
      data,
      setData,
      handlePostSecret,
      handleStripeOnboardingRefresh,
      fetchAllSecrets,
      fetchUnpurchasedSecrets, // Ajouter la nouvelle fonction au contexte
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
      setTotalUnreadCount
    }}>
      {children}
    </CardDataContext.Provider>
  );
};

export default CardDataProvider;