import React, { createContext, useState, useContext, useEffect } from 'react';
import { DATABASE_URL } from '@env'
import axios from 'axios';
import { AuthContext } from './AuthContext';
import createAxiosInstance from '../../data/api/axiosInstance';


// Créer le contexte pour les données des cartes
const CardDataContext = createContext();

// Hook personnalisé pour accéder aux données
export const useCardData = () => {
  return useContext(CardDataContext);
};

// Fournisseur du contexte
export const CardDataProvider = ({ children }) => {

  const [data, setData] = useState([]);
  const [isLoadingData, setIsLoadingData] = useState(true); // État de chargement
  const { userToken } = useContext(AuthContext);
  const [axiosInstance, setAxiosInstance] = useState(null);

  useEffect(() => {
    const initAxios = async () => {
      const instance = await createAxiosInstance();
      setAxiosInstance(instance);
    };
    initAxios();
  }, []);


  const handlePostSecret = async ({ selectedLabel, secretText, price, expiresIn = 7 }) => {
    try {
      return await axiosInstance.post('/api/secrets/createsecrets', {
        label: selectedLabel,
        content: secretText,
        price: parseFloat(price),
        expiresIn
      });
    } catch (error) {
      throw error;
    }
  };


 const fetchAllSecrets = async () => {
    setIsLoadingData(true);
    try {
      const response = await axiosInstance.get('/api/secrets');
      if (response.data && Array.isArray(response.data)) {
        setData(response.data);
      } else {
        console.error('Données invalides reçues depuis l\'API');
        setData([]);
      }
    } catch (error) {
      console.error('Erreur lors de la récupération des secrets :', error.response?.data || error.message);
      setData([]);
    } finally {
      setIsLoadingData(false);
    }
  };

  useEffect(() => {
    fetchAllSecrets();
  }, []);


 
  const fetchUserSecretsWithCount = async () => {
    try {
      const { data } = await axiosInstance.get('/api/secrets/user-secrets-with-count');
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
    if (!secretId || !paymentId) {
        throw new Error('Secret ID et Payment ID sont requis');
    }

    try {
        console.log('Attempting to purchase secret:', { secretId, paymentId });

        const purchaseResponse = await axiosInstance.post(
            `${DATABASE_URL}/api/secrets/${secretId}/purchase`,
            {
                paymentIntentId: paymentId
            },
            { headers: { Authorization: `Bearer ${userToken}` } }
        );

        if (!purchaseResponse.data.conversationId) {
            throw new Error('Aucun ID de conversation reçu');
        }

        const conversationResponse = await axiosInstance.get(
            `${DATABASE_URL}/api/secrets/conversations/secret/${secretId}`,
            { headers: { Authorization: `Bearer ${userToken}` } }
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
    try {
      const response = await axiosInstance.get(
        `${DATABASE_URL}/api/secrets/purchased`,
        {
          headers: { Authorization: `Bearer ${userToken}` }
        }
      );
      return response.data;
    } catch (error) {
      console.error('Erreur lors de la récupération des secrets achetés:', error);
      return [];
    }
  };


  const handleAddMessage = async (conversationId, content) => {
    if (!conversationId || !content.trim()) {
      throw new Error('ConversationId et contenu sont requis');
    }

    try {
      const response = await axiosInstance.post(
        `${DATABASE_URL}/api/secrets/conversations/${conversationId}/messages`,
        { content },
        {
          headers: { Authorization: `Bearer ${userToken}` }
        }
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
    try {
      const response = await axiosInstance.get(
        `${DATABASE_URL}/api/secrets/conversations/${conversationId}`,
        {
          headers: { Authorization: `Bearer ${userToken}` }
        }
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