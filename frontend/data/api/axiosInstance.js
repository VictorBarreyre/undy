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
        
        // Créer une nouvelle instance Axios
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
            (error) => Promise.reject(error)
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
                    return new Promise((resolve, reject) => {
                        failedQueue.push({ resolve, reject });
                    }).then(token => {
                        originalRequest.headers.Authorization = `Bearer ${token}`;
                        return instance(originalRequest);
                    }).catch(err => Promise.reject(err));
                }

                originalRequest._retry = true;
                isRefreshing = true;

                try {
                    const refreshToken = await AsyncStorage.getItem('refreshToken');
                    if (!refreshToken) {
                        throw new Error('No refresh token');
                    }

                    const response = await instance.post('/api/users/refresh-token', { refreshToken });
                    const { accessToken, refreshToken: newRefreshToken } = response.data;

                    await AsyncStorage.multiSet([
                        ['accessToken', accessToken],
                        ['refreshToken', newRefreshToken || refreshToken]
                    ]);

                    instance.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
                    originalRequest.headers.Authorization = `Bearer ${accessToken}`;

                    processQueue(null, accessToken);
                    
                    return instance(originalRequest);
                } catch (refreshError) {
                    processQueue(refreshError, null);
                    await AsyncStorage.multiRemove(['accessToken', 'refreshToken', 'userData']);
                    throw refreshError;
                } finally {
                    isRefreshing = false;
                }
            }
        );

        return instance;
    } catch (error) {
        console.error('Erreur lors de la création de l\'instance Axios:', error);
        throw error;
    }
};

const getAxiosInstance = () => instance;

export { createAxiosInstance, getAxiosInstance };