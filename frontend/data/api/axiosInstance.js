import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import getAPIURL from '../../infrastructure/config/config';

let instance = null;
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
    failedQueue.forEach(prom => {
        if (error) {
            prom.reject(error);
        } else {
            prom.resolve(token);
        }
    });
    failedQueue = [];
};

const createAxiosInstance = async () => {
    try {
        const baseURL = await getAPIURL();
        
        if (!instance) {
            instance = axios.create({
                baseURL,
                timeout: 10000,
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            // Intercepteur pour ajouter le token aux requêtes
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

            // Intercepteur de réponse avec gestion de queue
            instance.interceptors.response.use(
                (response) => response,
                async (error) => {
                    const originalRequest = error.config;

                    // Si ce n'est pas une erreur 401 ou si la requête a déjà été retentée
                    if (error.response?.status !== 401 || originalRequest._retry) {
                        return Promise.reject(error);
                    }

                    // Si un refresh est déjà en cours, mettre la requête en file d'attente
                    if (isRefreshing) {
                        try {
                            const token = await new Promise((resolve, reject) => {
                                failedQueue.push({ resolve, reject });
                            });
                            originalRequest.headers.Authorization = `Bearer ${token}`;
                            return instance(originalRequest);
                        } catch (err) {
                            return Promise.reject(err);
                        }
                    }

                    originalRequest._retry = true;
                    isRefreshing = true;

                    try {
                        const refreshToken = await AsyncStorage.getItem('refreshToken');
                        if (!refreshToken) {
                            // Nettoyage en cas d'absence de refresh token
                            await AsyncStorage.multiRemove(['accessToken', 'refreshToken', 'userData']);
                            throw new Error('No refresh token available');
                        }

                        // Tentative de rafraîchissement du token
                        const response = await axios.post(`${baseURL}/api/users/refresh-token`, {
                            refreshToken
                        });

                        const { accessToken, newRefreshToken } = response.data;

                        // Sauvegarde des nouveaux tokens
                        await AsyncStorage.multiSet([
                            ['accessToken', accessToken],
                            ['refreshToken', newRefreshToken || refreshToken]
                        ]);

                        // Mise à jour des headers
                        instance.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
                        originalRequest.headers.Authorization = `Bearer ${accessToken}`;

                        // Traitement de la file d'attente
                        processQueue(null, accessToken);
                        
                        return instance(originalRequest);
                    } catch (refreshError) {
                        // En cas d'échec du refresh, nettoyage complet
                        processQueue(refreshError, null);
                        await AsyncStorage.multiRemove(['accessToken', 'refreshToken', 'userData']);
                        
                        console.error('Erreur de rafraîchissement du token:', refreshError);
                        throw refreshError;
                    } finally {
                        isRefreshing = false;
                    }
                }
            );
        }

        // Initialisation des headers avec le token existant
        const existingToken = await AsyncStorage.getItem('accessToken');
        if (existingToken) {
            instance.defaults.headers.common['Authorization'] = `Bearer ${existingToken}`;
        }

        return instance;
    } catch (error) {
        console.error('Erreur lors de la création de l\'instance Axios:', error);
        throw error;
    }
};

const getAxiosInstance = () => instance;

export { createAxiosInstance, getAxiosInstance };