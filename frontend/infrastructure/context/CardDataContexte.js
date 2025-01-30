import React, { createContext, useState, useContext, useEffect } from 'react';
import { DATABASE_URL } from '@env'
import axios from 'axios';
import { AuthContext } from './AuthContext';


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


  const handlePostSecret = async ({ selectedLabel, secretText, price, expiresIn = 7 }) => {
    try {
      return await axios.post(
        `${DATABASE_URL}/api/secrets/createsecrets`,
        {
          label: selectedLabel,
          content: secretText,
          price: parseFloat(price),
          expiresIn
        },
        {
          headers: { Authorization: `Bearer ${userToken}` }
        }
      );
    } catch (error) {
      throw error;
    }
  };


  const fetchAllSecrets = async () => {
    setIsLoadingData(true); // Début du chargement
    try {
      const response = await axios.get(`${DATABASE_URL}/api/secrets`);
      if (response.data && Array.isArray(response.data)) {
        setData(response.data); // Met à jour l'état `data` avec les données récupérées
      } else {
        console.error('Données invalides reçues depuis l\'API');
        setData([]); // Définit un tableau vide si les données sont invalides
      }
    } catch (error) {
      console.error('Erreur lors de la récupération des secrets :', error.response?.data || error.message);
      setData([]); // Définit un tableau vide en cas d'erreur
    } finally {
      setIsLoadingData(false); // Fin du chargement
    }
  };

  useEffect(() => {
    fetchAllSecrets();
  }, []);


  const fetchUserSecretsWithCount = async (authToken) => {
    try {
      const { data } = await axios.get(`${DATABASE_URL}/api/secrets/user-secrets-with-count`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });


      return {
        secrets: Array.isArray(data.secrets) ? data.secrets : [],
        count: typeof data.count === 'number' ? data.count : 0
      };
    } catch (error) {
      console.error('Erreur récupération secrets et comptage:', error.message);
      return { secrets: [], count: 0 };
    }
  };


  const purchaseAndAccessConversation = async (secretId, price) => {
    // Vérification des paramètres
    if (!secretId) {
      throw new Error('Secret ID is required');
    }

    try {
      console.log('Attempting to purchase secret:', { secretId, price }); // Debug log

      // 1. Effectuer l'achat du secret
      const purchaseResponse = await axios.post(
        `${DATABASE_URL}/api/secrets/${secretId}/purchase`,
        { price },
        { headers: { Authorization: `Bearer ${userToken}` } }
      );

      console.log('Purchase response:', purchaseResponse.data); // Debug log

      // Vérifier si nous avons bien un conversationId
      if (!purchaseResponse.data.conversationId) {
        throw new Error('No conversation ID received from purchase');
      }

      // 2. Récupérer les détails de la conversation
      const conversationResponse = await axios.get(
        `${DATABASE_URL}/api/secrets/conversations/secret/${secretId}`,
        { headers: { Authorization: `Bearer ${userToken}` } }
      );

      return {
        conversationId: purchaseResponse.data.conversationId,
        conversation: conversationResponse.data
      };
    } catch (error) {
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        secretId,
        price
      });
      throw error;
    }
  };



  const handleAddMessage = async (conversationId, content) => {
    if (!conversationId || !content.trim()) {
      throw new Error('ConversationId et contenu sont requis');
    }

    try {
      const response = await axios.post(
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
      const response = await axios.get(
        `${DATABASE_URL}/api/secrets/conversations/${conversationId}`, // Route correcte
        {
          headers: { Authorization: `Bearer ${userToken}` }
        }
      );
      return response.data;
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
      handleAddMessage,
      getConversationMessages,
      isLoadingData
    }}>
      {children}
    </CardDataContext.Provider>
  );
};