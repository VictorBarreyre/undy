import React, { createContext, useState, useEffect,useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { DATABASE_URL } from '@env';

// Crée un contexte pour l'authentification
export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [userToken, setUserToken] = useState(null);
    const [userData, setUserData] = useState(null); // Stocke les données utilisateur
    const [isLoadingUserData, setIsLoadingUserData] = useState(false);

    // Vérifie si l'utilisateur est déjà connecté (token dans AsyncStorage)
    useEffect(() => {
        const checkUserToken = async () => {
            try {
                const token = await AsyncStorage.getItem('token');
                if (token) {
                    setUserToken(token);
                    setIsLoggedIn(true);
                    fetchUserData(token); // Charge les données utilisateur dès que le token est présent
                } else {
                    setIsLoggedIn(false);
                }
            } catch (error) {
                console.error('Error fetching token from AsyncStorage:', error);
                setIsLoggedIn(false);
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
            setUserData({ ...response.data, token }); // Ajoutez le token à userData
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

    return (
        <AuthContext.Provider
            value={{
                isLoggedIn,
                userToken,
                userData,
                isLoadingUserData,
                login,
                logout,
                updateUserData, // Fournit une fonction pour mettre à jour le profil
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};
