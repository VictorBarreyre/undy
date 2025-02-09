import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import getAPIURL from '../../infrastructure/config/config';

let instance = null;

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

                            const response = await axios.post(`${baseURL}/api/refresh-token`, {
                                refreshToken
                            });

                            const { accessToken } = response.data;

                            await AsyncStorage.setItem('accessToken', accessToken);
                            instance.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;

                            originalRequest.headers.Authorization = `Bearer ${accessToken}`;
                            return instance(originalRequest);
                        } catch (refreshError) {
                            await AsyncStorage.multiRemove(['accessToken', 'refreshToken']);
                            throw refreshError;
                        }
                    }

                    return Promise.reject(error);
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