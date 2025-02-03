import React, { createContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { DATABASE_URL } from '@env';
import { correctProfilePictureUrl } from './utils';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [userToken, setUserToken] = useState(null);
    const [userData, setUserData] = useState(null);
    const [isLoadingUserData, setIsLoadingUserData] = useState(true);

    useEffect(() => {
        loadStoredData();
    }, []);

    const loadStoredData = async () => {
        try {
            const [token, storedUserData] = await Promise.all([
                AsyncStorage.getItem('token'),
                AsyncStorage.getItem('userData')
            ]);

            if (token) {
                setUserToken(token);
                setIsLoggedIn(true);
                
                if (storedUserData) {
                    setUserData(JSON.parse(storedUserData));
                }
                
                // Rafraîchir les données depuis le serveur
                await fetchUserData(token);
            }
        } catch (error) {
            console.error('Erreur chargement données:', error);
        } finally {
            setIsLoadingUserData(false);
        }
    };

    const fetchUserData = async (token) => {
        try {
            const response = await axios.get(`${DATABASE_URL}/api/users/profile`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            
            const correctedData = {
                ...response.data,
                profilePicture: correctProfilePictureUrl(response.data.profilePicture),
            };
            
            setUserData(correctedData);
            await AsyncStorage.setItem('userData', JSON.stringify(correctedData));
            
            return correctedData;
        } catch (error) {
            console.error('Error fetching user data:', error.response?.data || error.message);
            throw error;
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
            
            return correctedData;
        } catch (error) {
            console.error('Error fetching user data:', error);
            throw error;
        } finally {
            setIsLoadingUserData(false);
        }
    };

    const handleProfileImageUpdate = async (imageFile) => {
        try {
            const formData = new FormData();
            
            const fileToUpload = {
                uri: imageFile.uri,
                type: imageFile.type || 'image/jpeg',
                name: imageFile.fileName || 'profile.jpg',
            };
            
            formData.append('profilePicture', fileToUpload);
    
            const response = await axios.put(
                `${DATABASE_URL}/api/users/profile-picture`,
                formData,
                {
                    headers: {
                        'Accept': 'application/json',
                        'Content-Type': 'multipart/form-data',
                        'Authorization': `Bearer ${userToken}`,
                    }
                }
            );
    
            console.log('Réponse du serveur:', response.data);
    
            if (response?.data?.profilePicture) {
                // Mise à jour du contexte
                const updatedUserData = {
                    ...userData,
                    profilePicture: response.data.profilePicture
                };
                
                // Mise à jour de l'état et du stockage
                setUserData(updatedUserData);
                await AsyncStorage.setItem('userData', JSON.stringify(updatedUserData));
                
                return response.data;
            }
            
            throw new Error('Réponse invalide du serveur');
        } catch (error) {
            console.error('Erreur Upload:', error);
            throw error;
        }
    };

    const updateUserData = async (updatedData) => {
        try {
            const response = await axios.put(
                `${DATABASE_URL}/api/users/profile`,
                updatedData,
                { headers: { Authorization: `Bearer ${userToken}` } }
            );
            
            const updatedUserData = {
                ...response.data,
                profilePicture: correctProfilePictureUrl(response.data.profilePicture)
            };
            
            setUserData(updatedUserData);
            await AsyncStorage.setItem('userData', JSON.stringify(updatedUserData));
            
            return { success: true, message: 'Profil mis à jour avec succès.' };
        } catch (error) {
            console.error('Error updating user data:', error);
            return { success: false, message: 'Erreur lors de la mise à jour du profil.' };
        }
    };

    const login = async (token) => {
        try {
            await AsyncStorage.setItem('token', token);
            setUserToken(token);
            setIsLoggedIn(true);
            await fetchUserData(token);
        } catch (error) {
            console.error('Erreur lors de la connexion:', error);
            throw error;
        }
    };

    const logout = async () => {
        try {
            await AsyncStorage.multiRemove(['token', 'userData']);
            setUserToken(null);
            setIsLoggedIn(false);
            setUserData(null);
            return true;
        } catch (error) {
            console.error('Erreur lors de la déconnexion:', error);
            return false;
        }
    };

    const downloadUserData = async () => {
        try {
            const response = await axios.get(
                `${DATABASE_URL}/api/users/download`,
                { headers: { Authorization: `Bearer ${userToken}` } }
            );
            return response.data;
        } catch (error) {
            console.error('Erreur téléchargement données:', error);
            throw error;
        }
    };

    const clearUserData = async () => {
        try {
            await axios.delete(
                `${DATABASE_URL}/api/users/clear`,
                { headers: { Authorization: `Bearer ${userToken}` } }
            );
            
            const clearedUserData = {
                ...userData,
                // Réinitialiser les champs nécessaires tout en gardant les infos essentielles
                profilePicture: null,
                // autres champs à réinitialiser...
            };
            
            setUserData(clearedUserData);
            await AsyncStorage.setItem('userData', JSON.stringify(clearedUserData));
            
            return { success: true, message: 'Données effacées avec succès.' };
        } catch (error) {
            console.error('Erreur effacement données:', error);
            throw error;
        }
    };

    const deleteUserAccount = async () => {
        try {
            await axios.delete(
                `${DATABASE_URL}/api/users/delete`,
                { headers: { Authorization: `Bearer ${userToken}` } }
            );
            await logout();
            return { success: true, message: 'Compte supprimé avec succès.' };
        } catch (error) {
            console.error('Erreur suppression compte:', error);
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
                fetchUserData,
                fetchUserDataById,
                login,
                logout,
                updateUserData,
                handleProfileImageUpdate,
                downloadUserData,
                clearUserData,
                deleteUserAccount
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};

export default AuthProvider;