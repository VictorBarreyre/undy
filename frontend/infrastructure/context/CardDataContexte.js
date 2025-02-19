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
      switch(response.data.status) {
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
    if (!conversationId || !content.trim()) {
      throw new Error('ConversationId et contenu sont requis');
    }

    try {
      const response = await instance.post(
        `/api/secrets/conversations/${conversationId}/messages`,
        { content }
      );

      if (response.data) {
        return response.data;
      }
    } catch (error) {
      console.error('Erreur lors de l\'envoi du message:', error.response?.data || error.message);
      throw error;
    }
  };

  const getConversationMessages = async (conversationId) => {
    const instance = getAxiosInstance();
    if (!instance) {
      throw new Error('Axios instance not initialized');
    }
    try {
      const response = await instance.get(
        `/api/secrets/conversations/${conversationId}`
      );

      console.log("Conversation messages response:", response.data);

      return {
        messages: response.data.messages || [],
        conversationId: response.data.conversationId
      };
    } catch (error) {
      console.error('Erreur lors de la récupération des messages:', error);
      throw error;
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
      const response = await instance.get(`/api/secrets/shared/${secretId}`);
      return response.data;
  } catch (error) {
      console.error('Erreur lors de la récupération du secret:', error);
      throw error;
  }
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
      getSharedSecret
    }}>
      {children}
    </CardDataContext.Provider>
  );
};

export default CardDataProvider;