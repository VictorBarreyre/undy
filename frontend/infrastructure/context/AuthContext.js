import React, { createContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { DATABASE_URL } from '@env';
import { correctProfilePictureUrl } from './utils'; // Importez la fonction utilitaire
import { useNavigation } from '@react-navigation/native';


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

        console.log(userData)

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

    const fetchUserDataById = async (userId, token) => {
        setIsLoadingUserData(true);
        try {
            const response = await axios.get(`${DATABASE_URL}/api/users/${userId}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const correctedData = {
                ...response.data,
                profilePicture: correctProfilePictureUrl(response.data.profilePicture),
            };
            setUserData(correctedData);
            return correctedData;
        } catch (error) {
            console.error('Error fetching user data:', error.response?.data || error.message);
            throw error;
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

    const handleProfileImageUpdate = async (imageFile) => {
        try {
            const formData = new FormData();
            
            // Créer un objet blob à partir du fichier
            const fileResponse = await fetch(imageFile.uri);
            const blob = await fileResponse.blob();
            
            // Ajouter le fichier au FormData avec le bon type MIME
            formData.append('profilePicture', {
                uri: imageFile.uri,
                type: imageFile.type || 'image/jpeg',
                name: imageFile.fileName || 'profile.jpg',
            });
    
            const config = {
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'multipart/form-data',
                    'Authorization': `Bearer ${userToken}`,
                },
                transformRequest: (data) => data,
            };
    
            const uploadResponse = await axios.put(
                `${DATABASE_URL}/api/users/profile-picture`,
                formData,
                config
            );
    
            return response.data;
        } catch (error) {
            console.error('Upload error:', error);
            if (error.response) {
                console.error('Server response:', error.response.data);
            }
            throw new Error('Impossible de changer la photo de profil');
        }
    };
    
    const login = async (token) => {
        setUserToken(token);
        setIsLoggedIn(true);
        await AsyncStorage.setItem('token', token);
        fetchUserData(token); // Charge les données utilisateur après la connexion
    };


    const logout = async () => {
        try {
            // D'abord mettre à jour les états
            setUserToken(null);
            setIsLoggedIn(false);
            setUserData(null);
            
            // Ensuite nettoyer le stockage
            await AsyncStorage.removeItem('token');
            await AsyncStorage.removeItem('userData');
            
            return true; // Retourner une valeur au lieu d'une fonction
        } catch (error) {
            console.error('Erreur lors de la déconnexion:', error);
            return false;
        }
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
                fetchUserDataById,
                login,
                logout,
                updateUserData,
                handleProfileImageUpdate,
                downloadUserData,
                clearUserData,
                deleteUserAccount // Fournit une fonction pour mettre à jour le profil
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};