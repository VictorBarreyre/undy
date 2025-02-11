import React, { createContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAxiosInstance, getAxiosInstance } from '../../data/api/axiosInstance';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [userToken, setUserToken] = useState(null);
    const [userData, setUserData] = useState(null);
    const [isLoadingUserData, setIsLoadingUserData] = useState(true);

    useEffect(() => {
        const initAxios = async () => {
            try {
                await createAxiosInstance();
                await loadStoredData();
            } catch (error) {
                console.error('Erreur d\'initialisation axios:', error);
            }
        };
        initAxios();
    }, []);

    const cleanProfilePicture = (profilePicture) => {
        if (!profilePicture) return null;
        if (profilePicture.includes('herokuapp.com') && profilePicture.includes('data:image')) {
            return profilePicture.split('herokuapp.com').pop();
        }
        if (profilePicture.startsWith('data:image')) {
            return profilePicture;
        }
        return null;
    };

    const cleanUserData = (data) => {
        if (!data) return null;
        return {
            ...data,
            profilePicture: cleanProfilePicture(data.profilePicture)
        };
    };

    const loadStoredData = async () => {
        try {
            const [accessToken, refreshToken, storedUserData] = await Promise.all([
                AsyncStorage.getItem('accessToken'),
                AsyncStorage.getItem('refreshToken'),
                AsyncStorage.getItem('userData')
            ]);

            if (accessToken && refreshToken) {
                setUserToken(accessToken);
                setIsLoggedIn(true);

                if (storedUserData) {
                    const parsedData = JSON.parse(storedUserData);
                    setUserData(cleanUserData(parsedData));
                }

                await fetchUserData();
            }
        } catch (error) {
            console.error('Erreur loadStoredData:', error);
        } finally {
            setIsLoadingUserData(false);
        }
    };

    const fetchUserData = async () => {
        const instance = getAxiosInstance();
        if (!instance) {
            throw new Error('Axios instance not initialized');
        }
        try {
            const response = await instance.get('/api/users/profile');
            const cleanedData = cleanUserData(response.data);
            setUserData(cleanedData);
            await AsyncStorage.setItem('userData', JSON.stringify(cleanedData));
            return cleanedData;
        } catch (error) {
            console.error('Erreur fetchUserData:', error);
            throw error;
        }
    };

    const handleProfileImageUpdate = async (imageFile) => {
        const instance = getAxiosInstance();
        if (!instance) {
            throw new Error('Axios instance not initialized');
        }
        try {
            const formData = new FormData();
            const fileToUpload = {
                uri: imageFile.uri,
                type: imageFile.type || 'image/jpeg',
                name: imageFile.fileName || 'profile.jpg',
            };
            formData.append('profilePicture', fileToUpload);

            const response = await instance.put('/api/users/profile-picture', formData, {
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'multipart/form-data',
                }
            });

            if (response?.data?.profilePicture) {
                const updatedUserData = cleanUserData({
                    ...userData,
                    profilePicture: response.data.profilePicture
                });
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
        const instance = getAxiosInstance();
        if (!instance) {
            throw new Error('Axios instance not initialized');
        }
        try {
            const response = await instance.put('/api/users/profile', updatedData);
            setUserData(response.data);
            await AsyncStorage.setItem('userData', JSON.stringify(response.data));
            return { success: true, message: 'Profil mis à jour avec succès.' };
        } catch (error) {
            console.error('Error updating user data:', error);
            return { success: false, message: 'Erreur lors de la mise à jour du profil.' };
        }
    };

    const login = async (accessToken, refreshToken) => {
        try {
            await AsyncStorage.multiSet([
                ['accessToken', accessToken],
                ['refreshToken', refreshToken]
            ]);
            setUserToken(accessToken);
            setIsLoggedIn(true);
            await fetchUserData();
        } catch (error) {
            console.error('Erreur lors de la connexion:', error);
            throw error;
        }
    };

    const logout = async () => {
        try {
            const instance = getAxiosInstance();
            if (instance) {
                // Réinitialiser l'instance Axios
                instance.defaults.headers.common['Authorization'] = '';
            }
            
            // Nettoyer AsyncStorage
            await AsyncStorage.multiRemove(['accessToken', 'refreshToken', 'userData']);
            
            // Réinitialiser l'état
            setUserToken(null);
            setIsLoggedIn(false);
            setUserData(null);
            
            return true;
        } catch (error) {
            console.error('Erreur lors de la déconnexion:', error);
            throw error; // Propager l'erreur pour la gérer dans le composant
        }
    };

    const downloadUserData = async () => {
        const instance = getAxiosInstance();
        if (!instance) {
            throw new Error('Axios instance not initialized');
        }
        try {
            const response = await instance.get('/api/users/download');
            return response.data;
        } catch (error) {
            console.error('Erreur téléchargement données:', error);
            throw error;
        }
    };

    const clearUserData = async () => {
        const instance = getAxiosInstance();
        if (!instance) {
            throw new Error('Axios instance not initialized');
        }
        try {
            await instance.delete('/api/users/clear');
            
            const clearedUserData = {
                ...userData,
                profilePicture: null,
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
        const instance = getAxiosInstance();
        if (!instance) {
            throw new Error('Axios instance not initialized');
        }
        try {
            await instance.delete('/api/users/delete');
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