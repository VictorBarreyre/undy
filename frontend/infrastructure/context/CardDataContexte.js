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
  try {
    // 1. Effectuer l'achat du secret, qui gère aussi la création/accès à la conversation
    const purchaseResponse = await axios.post(
      `${DATABASE_URL}/api/secrets/${secretId}/purchase`,
      { price },
      { headers: { Authorization: `Bearer ${userToken}` } }
    );

    // La réponse contient déjà l'ID de la conversation
    const { conversationId } = purchaseResponse.data;

    // 2. Vérifier/récupérer les détails de la conversation
    const conversationResponse = await axios.get(
      `${DATABASE_URL}/api/secrets/conversations/secret/${secretId}`,
      { headers: { Authorization: `Bearer ${userToken}` } }
    );

    return {
      conversationId,
      conversation: conversationResponse.data
    };
  } catch (error) {
    if (error.response?.status === 400 && error.response?.data?.message?.includes('déjà acheté')) {
      // Si le secret est déjà acheté, récupérer simplement la conversation
      const conversationResponse = await axios.get(
        `${DATABASE_URL}/api/secrets/conversations/secret/${secretId}`,
        { headers: { Authorization: `Bearer ${userToken}` } }
      );
      
      return {
        conversationId: conversationResponse.data._id,
        conversation: conversationResponse.data
      };
    }
    throw error;
  }
};


  return (
    <CardDataContext.Provider value={{ data, setData, handlePostSecret, fetchAllSecrets,fetchUserSecretsWithCount,purchaseAndAccessConversation, isLoadingData }}>
      {children}
    </CardDataContext.Provider>
  );
};