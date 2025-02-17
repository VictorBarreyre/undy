import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DeviceEventEmitter } from 'react-native';
import getAPIURL from '../../infrastructure/config/config';

let instance = null;
let isRefreshing = false;
let failedQueue = [];
let currentAccessToken = null; // Garder une référence du token actuel

const processQueue = (error, token = null) => {
    console.log(`[Queue] Traitement de la file d'attente - ${failedQueue.length} requêtes en attente`);
    failedQueue.forEach(prom => {
        if (error) {
            console.log('[Queue] Rejet des requêtes en attente:', error.message);
            prom.reject(error);
        } else {
            console.log('[Queue] Résolution des requêtes en attente avec nouveau token');
            prom.resolve(token);
        }
    });
    failedQueue = [];
};

const handleTokenRefresh = async () => {
    try {
        const refreshToken = await AsyncStorage.getItem('refreshToken');
        if (!refreshToken) {
            throw new Error('No refresh token available');
        }

        const baseURL = await getAPIURL();
        const response = await axios.post(
            `${baseURL}/api/users/refresh-token`,
            { refreshToken },
            { headers: { 'Content-Type': 'application/json' } }
        );

        const { accessToken, newRefreshToken } = response.data;

        await AsyncStorage.multiSet([
            ['accessToken', accessToken],
            ['refreshToken', newRefreshToken || refreshToken]
        ]);

        currentAccessToken = accessToken;
        return accessToken;
    } catch (error) {
        throw error;
    }
};

const createAxiosInstance = async () => {
    try {
        console.log('[Axios] Création d\'une nouvelle instance');
        const baseURL = await getAPIURL();
        console.log('[Axios] URL de base:', baseURL);
        
        instance = axios.create({
            baseURL,
            timeout: 15000,
            headers: {
                'Content-Type': 'application/json',
            },
        });

        // Récupérer le token initial
        currentAccessToken = await AsyncStorage.getItem('accessToken');

        instance.interceptors.request.use(
            async (config) => {
                // Toujours utiliser le token le plus récent
                if (currentAccessToken) {
                    config.headers.Authorization = `Bearer ${currentAccessToken}`;
                }
                console.log('[Request] URL:', config.url);
                return config;
            },
            (error) => {
                console.error('[Request Error]', error);
                return Promise.reject(error);
            }
        );

        instance.interceptors.response.use(
            (response) => {
                console.log('[Response] Succès:', response.config.url);
                return response;
            },
            async (error) => {
                const originalRequest = error.config;
                console.log('[Response Error] Status:', error.response?.status);
                console.log('[Response Error] Data:', error.response?.data);

                if (error.response?.status === 401 && 
                    error.response?.data?.shouldRefresh && 
                    !originalRequest._retry) {

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
                        const token = await handleTokenRefresh();
                        
                        instance.defaults.headers.common['Authorization'] = `Bearer ${token}`;
                        originalRequest.headers.Authorization = `Bearer ${token}`;
                        
                        processQueue(null, token);
                        return instance(originalRequest);
                    } catch (refreshError) {
                        processQueue(refreshError, null);
                        await AsyncStorage.multiRemove(['accessToken', 'refreshToken', 'userData']);
                        DeviceEventEmitter.emit('authError', {
                            message: 'Session expirée. Veuillez vous reconnecter.',
                            error: refreshError.message
                        });
                        throw refreshError;
                    } finally {
                        isRefreshing = false;
                    }
                }

                return Promise.reject(error);
            }
        );

        return instance;
    } catch (error) {
        console.error('[Axios] Erreur lors de la création de l\'instance:', error);
        throw error;
    }
};

const getAxiosInstance = () => {
    if (!instance) {
        console.warn('[Axios] Tentative d\'accès à l\'instance avant son initialisation');
    }
    return instance;
};

export { createAxiosInstance, getAxiosInstance };