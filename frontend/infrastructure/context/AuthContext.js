import React, { createContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAxiosInstance, getAxiosInstance } from '../../data/api/axiosInstance';
import { DeviceEventEmitter, Alert } from 'react-native';



export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [userToken, setUserToken] = useState(null);
    const [userData, setUserData] = useState(null);
    const [isLoadingUserData, setIsLoadingUserData] = useState(true);


    useEffect(() => {
        const initAxios = async () => {
            console.log('[AuthProvider] Initialisation...');
            try {
                console.log('[AuthProvider] Création de l\'instance Axios');
                await createAxiosInstance();
                console.log('[AuthProvider] Chargement des données stockées');
                await loadStoredData();
            } catch (error) {
                console.error('[AuthProvider] Erreur d\'initialisation:', error);
                setIsLoadingUserData(false);
            }
        };
    
        const handleAuthError = async (event) => {
            console.log('[AuthProvider] Erreur d\'authentification détectée:', event);
            try {
                console.log('[AuthProvider] Tentative de déconnexion...');
                await logout();
                console.log('[AuthProvider] Déconnexion réussie');
                
                Alert.alert(
                    "Session expirée",
                    event.message,
                    [{ 
                        text: "OK",
                        onPress: () => console.log('[AuthProvider] Alerte acquittée par l\'utilisateur')
                    }]
                );
            } catch (error) {
                console.error('[AuthProvider] Erreur lors du traitement de l\'erreur d\'auth:', error);
            }
        };
    
        console.log('[AuthProvider] Mise en place des event listeners');
        // Utiliser DeviceEventEmitter au lieu de window.addEventListener
        const subscription = DeviceEventEmitter.addListener('authError', handleAuthError);
    
        initAxios();
    
        return () => {
            console.log('[AuthProvider] Nettoyage des event listeners');
            subscription.remove(); // Nettoyer l'écouteur d'événements
        };
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
        console.log('[AuthProvider] Début du chargement des données stockées');
        try {
            const [accessToken, refreshToken, storedUserData] = await Promise.all([
                AsyncStorage.getItem('accessToken'),
                AsyncStorage.getItem('refreshToken'),
                AsyncStorage.getItem('userData')
            ]);
    
            console.log('[AuthProvider] Tokens récupérés:', {
                hasAccessToken: !!accessToken,
                hasRefreshToken: !!refreshToken,
                hasStoredData: !!storedUserData
            });
    
            if (accessToken) {
                const instance = getAxiosInstance();
                if (instance) {
                    console.log('[AuthProvider] Mise à jour du header Authorization');
                    instance.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
                }
    
                setUserToken(accessToken);
                setIsLoggedIn(true);
    
                if (storedUserData) {
                    console.log('[AuthProvider] Chargement des données utilisateur stockées');
                    const parsedData = JSON.parse(storedUserData);
                    setUserData(cleanUserData(parsedData));
                }
    
                if (refreshToken) {
                    console.log('[AuthProvider] Tentative de récupération des données fraîches');
                    try {
                        await fetchUserData();
                        console.log('[AuthProvider] Données utilisateur mises à jour avec succès');
                    } catch (error) {
                        console.error('[AuthProvider] Erreur fetchUserData:', error);
                    }
                }
            } else {
                console.log('[AuthProvider] Aucun token trouvé');
            }
        } catch (error) {
            console.error('[AuthProvider] Erreur loadStoredData:', error);
        } finally {
            console.log('[AuthProvider] Fin du chargement des données');
            setIsLoadingUserData(false);
        }
    };

    const fetchUserData = async () => {
        console.log('[AuthProvider] Début fetchUserData');
        const instance = getAxiosInstance();
        if (!instance) {
            throw new Error('Axios instance not initialized');
        }
        
        try {
            const response = await instance.get('/api/users/profile');
            const cleanedData = cleanUserData(response.data);
            setUserData(cleanedData);
            await AsyncStorage.setItem('userData', JSON.stringify(cleanedData));
            
            setUserData({
                ...cleanedData,
                totalEarnings: response.data.totalEarnings
            });
            
            console.log('[AuthProvider] Données utilisateur mises à jour avec succès');
        } catch (error) {
            console.error('[AuthProvider] Erreur fetchUserData:', error);
            // Si l'erreur n'est pas liée à l'authentification, on la propage
            if (!error.response?.data?.shouldRefresh) {
                throw error;
            }
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
            // Ne prendre que les champs qui ont changé
            const changedFields = {};
            Object.keys(updatedData).forEach(key => {
                if (userData[key] !== updatedData[key]) {
                    changedFields[key] = updatedData[key];
                }
            });
    
            if (Object.keys(changedFields).length === 0) {
                return { success: true, message: 'Aucune modification nécessaire.' };
            }
    
            // Ajouter l'ID pour l'identification
            changedFields._id = userData._id;
    
            const response = await instance.put('/api/users/profile', changedFields);
            
            // Mettre à jour le state local avec toutes les données
            setUserData({ ...userData, ...response.data });
            await AsyncStorage.setItem('userData', JSON.stringify({ ...userData, ...response.data }));
            
            return { success: true, message: 'Profil mis à jour avec succès.' };
        } catch (error) {
            console.error('Error updating user data:', error);
            return { success: false, message: 'Erreur lors de la mise à jour du profil.' };
        }
    };

    const login = async (accessToken, refreshToken) => {
        try {
            console.log('[AuthProvider] Début de la connexion');
            await AsyncStorage.multiSet([
                ['accessToken', accessToken],
                ['refreshToken', refreshToken]
            ]);
            
            const instance = getAxiosInstance();
            if (instance) {
                instance.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
            }
            
            setUserToken(accessToken);
            setIsLoggedIn(true);
            
            await fetchUserData();
            console.log('[AuthProvider] Connexion réussie');
        } catch (error) {
            console.error('[AuthProvider] Erreur lors de la connexion:', error);
            throw error;
        }
    };
    

    const logout = async () => {
        try {
            console.log('[AuthProvider] Début de la déconnexion');
            const instance = getAxiosInstance();
            if (instance) {
                delete instance.defaults.headers.common['Authorization'];
            }
            
            await AsyncStorage.multiRemove(['accessToken', 'refreshToken', 'userData']);
            
            setUserToken(null);
            setIsLoggedIn(false);
            setUserData(null);
            setIsLoadingUserData(false);
            
            console.log('[AuthProvider] Déconnexion réussie');
            return true;
        } catch (error) {
            console.error('[AuthProvider] Erreur lors de la déconnexion:', error);
            setIsLoadingUserData(false);
            throw error;
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