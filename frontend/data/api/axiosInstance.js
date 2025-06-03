import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DeviceEventEmitter } from 'react-native';
import getAPIURL from '../../infrastructure/config/config';

let instance = null;
let isRefreshing = false;
let failedQueue = [];
let currentAccessToken = null;

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
        console.log('[Token Refresh] Début du rafraîchissement du token');
        const refreshToken = await AsyncStorage.getItem('refreshToken');
        
        if (!refreshToken) {
            console.error('[Token Refresh] Aucun refresh token disponible');
            throw new Error('No refresh token available');
        }

        const baseURL = await getAPIURL();
        console.log('[Token Refresh] Appel API avec refresh token');
        
        const response = await axios.post(
            `${baseURL}/api/users/refresh-token`,
            { refreshToken },
            { 
                headers: { 'Content-Type': 'application/json' },
                timeout: 10000 // Timeout spécifique pour le refresh
            }
        );

        console.log('[Token Refresh] Réponse reçue:', response.status);

        // CORRECTION: Utiliser les bons noms de propriétés
        const { accessToken, refreshToken: newRefreshToken } = response.data;

        if (!accessToken) {
            throw new Error('No access token in refresh response');
        }

        // Sauvegarder les nouveaux tokens
        await AsyncStorage.multiSet([
            ['accessToken', accessToken],
            ['refreshToken', newRefreshToken || refreshToken] // Utiliser l'ancien si pas de nouveau
        ]);

        currentAccessToken = accessToken;
        console.log('[Token Refresh] Tokens mis à jour avec succès');
        
        return accessToken;
    } catch (error) {
        console.error('[Token Refresh] Erreur:', error.message);
        // Si c'est une erreur réseau, on pourrait vouloir réessayer
        if (error.code === 'ECONNABORTED' || error.message.includes('Network')) {
            console.log('[Token Refresh] Erreur réseau détectée');
        }
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
        
        if (currentAccessToken) {
            instance.defaults.headers.common['Authorization'] = `Bearer ${currentAccessToken}`;
            console.log('[Axios] Token initial configuré');
        }

        // Intercepteur de requête
        instance.interceptors.request.use(
            async (config) => {
                // Toujours utiliser le token le plus récent
                if (currentAccessToken) {
                    config.headers.Authorization = `Bearer ${currentAccessToken}`;
                }
                
                // Log uniquement en développement
                if (__DEV__) {
                    console.log('[Request]', config.method?.toUpperCase(), config.url);
                }
                
                return config;
            },
            (error) => {
                console.error('[Request Error]', error);
                return Promise.reject(error);
            }
        );

        // Intercepteur de réponse
        instance.interceptors.response.use(
            (response) => {
                return response;
            },
            async (error) => {
                const originalRequest = error.config;
                
                // Log détaillé de l'erreur
                if (error.response?.status === 401) {
                    console.log('[Response Error] 401 détecté:', {
                        url: originalRequest?.url,
                        shouldRefresh: error.response?.data?.shouldRefresh,
                        isRetry: originalRequest._retry
                    });
                }

                // Conditions pour tenter un refresh
                if (error.response?.status === 401 && 
                    !originalRequest._retry &&
                    // Ne pas essayer de refresh sur les endpoints d'auth
                    !originalRequest.url?.includes('/login') &&
                    !originalRequest.url?.includes('/refresh-token') &&
                    !originalRequest.url?.includes('/register')) {
                    
                    // Si un refresh est déjà en cours
                    if (isRefreshing) {
                        console.log('[Response Error] Refresh déjà en cours, mise en file d\'attente');
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
                        console.log('[Response Error] Tentative de refresh token');
                        const newToken = await handleTokenRefresh();
                        
                        // Mettre à jour le header par défaut
                        instance.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
                        
                        // Mettre à jour le header de la requête originale
                        originalRequest.headers.Authorization = `Bearer ${newToken}`;
                        
                        // Traiter la file d'attente
                        processQueue(null, newToken);
                        
                        // Réessayer la requête originale
                        console.log('[Response Error] Réessai de la requête originale');
                        return instance(originalRequest);
                        
                    } catch (refreshError) {
                        console.error('[Response Error] Échec du refresh:', refreshError.message);
                        processQueue(refreshError, null);
                        
                        // Nettoyer le stockage local
                        currentAccessToken = null;
                        await AsyncStorage.multiRemove(['accessToken', 'refreshToken', 'userData']);
                        
                        // Émettre l'événement de déconnexion
                        DeviceEventEmitter.emit('authError', {
                            message: 'Session expirée. Veuillez vous reconnecter.',
                            error: refreshError.message
                        });
                        
                        return Promise.reject(refreshError);
                    } finally {
                        isRefreshing = false;
                    }
                }

                // Pour toutes les autres erreurs
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

// Fonction utilitaire pour mettre à jour manuellement le token
const updateAuthToken = async (newToken) => {
    currentAccessToken = newToken;
    if (instance) {
        instance.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
    }
    await AsyncStorage.setItem('accessToken', newToken);
};

export { createAxiosInstance, getAxiosInstance, updateAuthToken };