import React, { createContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { DATABASE_URL } from '@env';
import { correctProfilePictureUrl } from './utils'; // Importez la fonction utilitaire


// Crée un contexte pour l'authentification
export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [userToken, setUserToken] = useState(null);
    const [userData, setUserData] = useState(null); // Stocke les données utilisateur
    const [isLoadingUserData, setIsLoadingUserData] = useState(false);

    useEffect(() => {
        const checkUserToken = async () => {
            try {
                const token = await AsyncStorage.getItem('token');
                if (token) {
                    setUserToken(token);
                    setIsLoggedIn(true);
                    await fetchUserData(token); // Assurez-vous que cette promesse se résout correctement
                } else {
                    setIsLoggedIn(false);
                }
            } catch (error) {
                console.error('Error fetching token from AsyncStorage:', error);
                setIsLoggedIn(false);
            } finally {
                setIsLoadingUserData(false); // Assurez-vous que cet état est bien mis à jour
            }
        };

        checkUserToken();
    }, []);



     // Fonction pour récupérer les données utilisateur depuis l'API
    const fetchUserData = async (token) => {
        setIsLoadingUserData(true);
        try {
            const response = await axios.get(`${DATABASE_URL}/api/users/profile`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const correctedData = {
                ...response.data,
                profilePicture: correctProfilePictureUrl(response.data.profilePicture),
            };
            setUserData(correctedData); // Met à jour le state local avec les données de l'utilisateur
        } catch (error) {
            console.error('Error fetching user data:', error.response?.data || error.message);
        } finally {
            setIsLoadingUserData(false);
        }
    };


    // Fonction pour mettre à jour les données utilisateur
    const updateUserData = async (updatedData) => {
        try {
            const response = await axios.put(
                `${DATABASE_URL}/api/users/profile`,
                updatedData,
                { headers: { Authorization: `Bearer ${userToken}` } }
            );
            setUserData(response.data); // Met à jour le state local avec les nouvelles données
            return { success: true, message: 'Profil mis à jour avec succès.' };
        } catch (error) {
            console.error('Error updating user data:', error.response?.data || error.message);
            return { success: false, message: 'Erreur lors de la mise à jour du profil.' };
        }
    };

    const login = async (token) => {
        setUserToken(token);
        setIsLoggedIn(true);
        await AsyncStorage.setItem('token', token);
        fetchUserData(token); // Charge les données utilisateur après la connexion
    };

    const logout = async () => {
        setUserToken(null);
        setIsLoggedIn(false);
        setUserData(null); // Réinitialise les données utilisateur
        await AsyncStorage.removeItem('token');
    };

    // Nouvelle fonction pour télécharger les données de l'utilisateur
    const downloadUserData = async () => {
        try {
            const response = await axios.get(`${DATABASE_URL}/api/users/download`, {
                headers: { Authorization: `Bearer ${userToken}` },
            });
            // Traitez les données téléchargées ici
            console.log('Données téléchargées:', response.data);
            return response.data;
        } catch (error) {
            console.error('Erreur lors du téléchargement des données de l\'utilisateur :', error);
            throw error;
        }
    };


        // Nouvelle fonction pour effacer les données de l'utilisateur
        const clearUserData = async () => {
            try {
                const response = await axios.delete(`${DATABASE_URL}/api/users/clear`, {
                    headers: { Authorization: `Bearer ${userToken}` },
                });
                // Traitez la réponse ici
                console.log('Données effacées:', response.data);
                return response.data;
            } catch (error) {
                console.error('Erreur lors de l\'effacement des données de l\'utilisateur :', error);
                throw error;
            }
        };
    
            // Nouvelle fonction pour supprimer le compte de l'utilisateur
    const deleteUserAccount = async () => {
        try {
            const response = await axios.delete(`${DATABASE_URL}/api/users/delete`, {
                headers: { Authorization: `Bearer ${userToken}` },
            });
            // Traitez la réponse ici
            console.log('Compte supprimé:', response.data);
            logout(); // Déconnectez l'utilisateur après la suppression du compte
            return response.data;
        } catch (error) {
            console.error('Erreur lors de la suppression du compte de l\'utilisateur :', error);
            throw error;
        }
    };

    return (
        <AuthContext.Provider
            value={{
                isLoggedIn,
                userToken,
                userData,
                isLoadingUserData,
                setIsLoadingUserData,
                login,
                logout,
                updateUserData,
                downloadUserData,
                clearUserData,
                deleteUserAccount // Fournit une fonction pour mettre à jour le profil
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};
