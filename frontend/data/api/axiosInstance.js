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

             // Response interceptor with queue management
             instance.interceptors.response.use(
                (response) => response,
                async (error) => {
                    const originalRequest = error.config;

                    // If error is not 401 or request has already been retried
                    if (error.response?.status !== 401 || originalRequest._retry) {
                        return Promise.reject(error);
                    }

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
                            throw new Error('No refresh token available');
                        }

                        const response = await axios.post(`${baseURL}/api/users/refresh-token`, {
                            refreshToken
                        });

                        const { accessToken } = response.data;

                        await AsyncStorage.setItem('accessToken', accessToken);
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
        }
        return instance;
    } catch (error) {
        console.error('Erreur lors de la création de l\'instance Axios :', error);
        throw error;
    }
};

const getAxiosInstance = () => instance;

export { createAxiosInstance, getAxiosInstance };