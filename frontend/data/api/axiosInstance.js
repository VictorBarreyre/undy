import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import getAPIURL from '../../infrastructure/config/config';

const createAxiosInstance = async () => {
    try {
        const baseURL = await getAPIURL();
        const instance = axios.create({
            baseURL,
            timeout: 10000,
            headers: {
                'Content-Type': 'application/json',
            },
        });

        // Intercepteur pour ajouter automatiquement le token aux requêtes
        instance.interceptors.request.use(
            async (config) => {
                const token = await AsyncStorage.getItem('accessToken');
                if (token) {
                    config.headers.Authorization = `Bearer ${token}`;
                }
                return config;
            },
            (error) => {
                return Promise.reject(error);
            }
        );

        // Intercepteur pour gérer le refresh token
        instance.interceptors.response.use(
            (response) => response,
            async (error) => {
                const originalRequest = error.config;

                if (error.response?.status === 401 && !originalRequest._retry) {
                    originalRequest._retry = true;

                    try {
                        const refreshToken = await AsyncStorage.getItem('refreshToken');
                        if (!refreshToken) {
                            throw new Error('No refresh token available');
                        }

                        // Créer une nouvelle instance axios pour le refresh
                        // pour éviter une boucle avec les intercepteurs
                        const refreshInstance = axios.create({
                            baseURL: await getAPIURL()
                        });

                        const response = await refreshInstance.post('/api/refresh-token', {
                            refreshToken
                        });

                        const { accessToken } = response.data;

                        // Mettre à jour le token
                        await AsyncStorage.setItem('accessToken', accessToken);
                        instance.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;

                        // Réessayer la requête originale avec le nouveau token
                        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
                        return instance(originalRequest);
                    } catch (refreshError) {
                        // Nettoyer les tokens en cas d'échec
                        await AsyncStorage.multiRemove(['accessToken', 'refreshToken']);
                        
                        // Vous pouvez émettre un événement personnalisé pour gérer la déconnexion
                        const event = new Event('logout');
                        document.dispatchEvent(event);
                        
                        return Promise.reject(refreshError);
                    }
                }

                return Promise.reject(error);
            }
        );

        return instance;
    } catch (error) {
        console.error('Erreur lors de la création de l\'instance Axios :', error);
        throw error;
    }
};

// Fonction utilitaire pour obtenir une instance avec gestion des erreurs
export const getAxiosInstance = async () => {
    try {
        return await createAxiosInstance();
    } catch (error) {
        console.error('Erreur lors de l\'obtention de l\'instance Axios :', error);
        throw error;
    }
};

export default createAxiosInstance;
