import React, { createContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Crée un contexte pour l'authentification
export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [userToken, setUserToken] = useState(null);

    // Vérifie si l'utilisateur est déjà connecté (token dans AsyncStorage)
    useEffect(() => {
        const checkUserToken = async () => {
            const token = await AsyncStorage.getItem('token');
            if (token) {
                setUserToken(token);
                setIsLoggedIn(true);
            } else {
                setIsLoggedIn(false);
            }
        };

        checkUserToken();
    }, []);

    // Fonction pour se connecter (enregistre le token)
    const login = async (token) => {
        setUserToken(token);
        setIsLoggedIn(true);
        await AsyncStorage.setItem('token', token);
    };

    // Fonction pour se déconnecter (supprime le token)
    const logout = async () => {
        setUserToken(null);
        setIsLoggedIn(false);
        await AsyncStorage.removeItem('token');
    };

    return (
        <AuthContext.Provider value={{ isLoggedIn, userToken, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};
