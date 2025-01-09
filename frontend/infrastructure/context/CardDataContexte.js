import React, { createContext, useState, useContext, useEffect } from 'react';
import { DATABASE_URL } from '@env'
import axios from 'axios';


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


  const handlePostSecret = async ({  selectedLabel, secretText, price, authToken }) => {
    try {
      const response = await axios.post(
        `${DATABASE_URL}/api/secrets/createsecrets`,
        {
          label: selectedLabel,
          content: secretText,
          price: parseFloat(price),
        },
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      );
      console.log('Secret envoyé avec succès :', response.data);
      return response.data; // Retournez la réponse du backend
    } catch (error) {
      console.error('Erreur lors de l\'envoi du secret :', error.message);
      throw error; // Laissez le composant gérer l'erreur
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
    console.log(data)
  }, []);
  

  const fetchSecretsCountByUser = async (authToken) => {
    try {
        const response = await axios.get(`${DATABASE_URL}/api/secrets/count`, {
            headers: { Authorization: `Bearer ${authToken}` },
        });

        console.log('Réponse API :', response.data); // Debugging
        return response.data.count;
    } catch (error) {
        console.error('Erreur lors de la récupération du nombre de secrets :', error.response?.data || error.message);
        return 0;
    }
};

const fetchUserSecrets = async (authToken) => {
  try {
    // Endpoint pour récupérer les secrets de l'utilisateur connecté
    const response = await axios.get(`${DATABASE_URL}/api/secrets/user-secrets`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });

    console.log('Secrets de l\'utilisateur récupérés avec succès :', response.data.secrets); // Debugging
    return response.data.secrets; // Retourne les secrets récupérés
  } catch (error) {
    console.error('Erreur lors de la récupération des secrets de l\'utilisateur :', error.response?.data || error.message);
    return []; // Retourne un tableau vide en cas d'erreur
  }
};



  return (
    <CardDataContext.Provider value={{ data, setData, handlePostSecret, fetchAllSecrets,fetchUserSecrets, fetchSecretsCountByUser, isLoadingData }}>
      {children}
    </CardDataContext.Provider>
  );
};