import React, { createContext, useState, useContext, useEffect } from 'react';
import { createAxiosInstance, getAxiosInstance } from '../../data/api/axiosInstance';
import { AuthContext } from './AuthContext';

const CardDataContext = createContext();

export const useCardData = () => {
  return useContext(CardDataContext);
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
          await fetchUnpurchasedSecrets();
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
      return await instance.post('/api/secrets/createsecrets', {
        label: selectedLabel,
        content: secretText,
        price: parseFloat(price),
        expiresIn
      });
    } catch (error) {
      throw error;
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
      return {
        secrets: Array.isArray(data.secrets) ? data.secrets : [],
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
      return response.data;
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

  return (
    <CardDataContext.Provider value={{
      data,
      setData,
      handlePostSecret,
      fetchAllSecrets,
      fetchUnpurchasedSecrets, // Ajouter la nouvelle fonction au contexte
      fetchUserSecretsWithCount,
      purchaseAndAccessConversation,
      fetchPurchasedSecrets,
      handleAddMessage,
      getConversationMessages,
      isLoadingData
    }}>
      {children}
    </CardDataContext.Provider>
  );
};

export default CardDataProvider;