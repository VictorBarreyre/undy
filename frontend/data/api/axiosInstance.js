import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DeviceEventEmitter } from 'react-native';
import getAPIURL from '../../infrastructure/config/config';

let instance = null;
let isRefreshing = false;
let failedQueue = [];

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

        instance.interceptors.request.use(
            async (config) => {
                const token = await AsyncStorage.getItem('accessToken');
                console.log('[Request] Token présent:', !!token);
                if (token) {
                    config.headers.Authorization = `Bearer ${token}`;
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
                console.log('[Response Error] Status:', error.response?.status);
                console.log('[Response Error] Data:', error.response?.data);
                
                const originalRequest = error.config;

                if (error.response?.status === 401 && 
                    error.response?.data?.shouldRefresh && 
                    !originalRequest._retry) {

                    console.log('[Refresh] Token expiré détecté');

                    if (isRefreshing) {
                        console.log('[Refresh] Refresh en cours, mise en file d\'attente');
                        try {
                            const token = await new Promise((resolve, reject) => {
                                failedQueue.push({ resolve, reject });
                            });
                            console.log('[Refresh] Nouveau token reçu de la file d\'attente');
                            originalRequest.headers.Authorization = `Bearer ${token}`;
                            return instance(originalRequest);
                        } catch (err) {
                            console.error('[Refresh] Erreur lors de l\'attente:', err);
                            return Promise.reject(err);
                        }
                    }

                    originalRequest._retry = true;
                    isRefreshing = true;

                    try {
                        const refreshToken = await AsyncStorage.getItem('refreshToken');
                        console.log('[Refresh] RefreshToken présent:', !!refreshToken);
                        
                        if (!refreshToken) {
                            throw new Error('No refresh token available');
                        }

                        console.log('[Refresh] Appel du endpoint refresh-token');
                        const response = await axios.post(
                            `${instance.defaults.baseURL}/api/users/refresh-token`,
                            { refreshToken },
                            { headers: { 'Content-Type': 'application/json' } }
                        );

                        console.log('[Refresh] Réponse reçue:', !!response.data);
                        const { accessToken, newRefreshToken } = response.data;

                        await AsyncStorage.multiSet([
                            ['accessToken', accessToken],
                            ['refreshToken', newRefreshToken || refreshToken]
                        ]);

                        instance.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
                        originalRequest.headers.Authorization = `Bearer ${accessToken}`;

                        processQueue(null, accessToken);
                        return instance(originalRequest);
                    } catch (refreshError) {
                        console.error('[Refresh] Erreur lors du refresh:', refreshError);
                        console.log('[Refresh] Détails:', refreshError.response?.data);
                        
                        processQueue(refreshError, null);
                        
                        await AsyncStorage.multiRemove(['accessToken', 'refreshToken', 'userData']);
                        
                        // Utiliser DeviceEventEmitter au lieu de window.dispatchEvent
                        DeviceEventEmitter.emit('authError', {
                            message: 'Session expirée. Veuillez vous reconnecter.',
                            error: refreshError.message
                        });
                        
                        throw refreshError;
                    } finally {
                        console.log('[Refresh] Fin du processus de refresh');
                        isRefreshing = false;
                    }
                }

                return Promise.reject(error);
            }
        );

        console.log('[Axios] Instance créée avec succès');
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