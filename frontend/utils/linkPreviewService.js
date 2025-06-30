import AsyncStorage from '@react-native-async-storage/async-storage';
import { getAxiosInstance } from '../data/api/axiosInstance';

// Cache en mémoire
const metadataCache = {};

// Durée d'expiration du cache (7 jours)
const CACHE_EXPIRY = 7 * 24 * 60 * 60 * 1000;
// Timeout pour les requêtes API (10 secondes)
const API_TIMEOUT = 10000;
// Délai minimum entre les requêtes successives
const REQUEST_THROTTLE = 1000;
// Nombre maximal de tentatives
const MAX_RETRIES = 2;

// Timestamp de la dernière requête
let lastRequestTime = 0;
// URLs en cours de chargement
const loadingUrls = new Set();

/**
 * Attend un délai minimum entre les requêtes
 */
const throttleRequests = async () => {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;

  if (timeSinceLastRequest < REQUEST_THROTTLE) {
    const waitTime = REQUEST_THROTTLE - timeSinceLastRequest;

    await new Promise((resolve) => setTimeout(resolve, waitTime));
  }

  lastRequestTime = Date.now();
};

/**
 * Crée une clé de cache normalisée pour l'URL
 * @param {string} url - URL à normaliser
 * @returns {string} - Clé de cache
 */
const normalizeCacheKey = (url) => {
  try {
    // Remplacer les caractères non alphanumériques par des underscores
    return url.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 100);
  } catch (e) {
    // En cas d'erreur, utiliser une méthode simple de hachage
    return String(url).split('').reduce(
      (hash, char) => (hash << 5) - hash + char.charCodeAt(0), 0
    ).toString(36);
  }
};

/**
 * Crée des métadonnées de secours basées sur l'URL
 * @param {string} url - URL à analyser
 * @returns {Object} - Métadonnées minimales
 */
const createFallbackMetadata = (url) => {
  try {
    const parsedUrl = new URL(url);
    const domain = parsedUrl.hostname.replace('www.', '');

    return {
      url,
      platform: 'website',
      title: domain,
      description: '',
      image: null,
      siteName: domain,
      author: null,
      text: '',
      status: 'fallback'
    };
  } catch (e) {
    // Si même le fallback échoue, retourner des valeurs très basiques
    return {
      url,
      platform: 'website',
      title: url,
      description: '',
      image: null,
      siteName: 'Site web',
      author: null,
      text: '',
      status: 'fallback'
    };
  }
};

/**
 * Crée des métadonnées temporaires pendant le chargement
 * @param {string} url - URL en cours de chargement
 * @returns {Object} - Métadonnées de chargement
 */
const createLoadingMetadata = (url) => {
  const platform = detectPlatform(url);

  return {
    url,
    platform,
    title: 'Chargement en cours...',
    description: 'Les informations sont en cours de chargement.',
    image: null,
    siteName: platform === 'website' ? new URL(url).hostname || 'Site web' : platform,
    author: null,
    text: '',
    status: 'loading'
  };
};

/**
 * Détecte la plateforme d'une URL (copie simplifiée de la version back-end)
 * @param {string} url - URL à analyser
 * @returns {string} - Type de plateforme
 */
const detectPlatform = (url) => {
  if (!url) return 'website';

  try {
    const lowerUrl = url.toLowerCase();

    if (lowerUrl.includes('twitter.com') || lowerUrl.includes('x.com')) {
      return 'twitter';
    } else if (lowerUrl.includes('youtube.com') || lowerUrl.includes('youtu.be')) {
      return 'youtube';
    } else if (lowerUrl.includes('instagram.com')) {
      return 'instagram';
    } else if (lowerUrl.includes('tiktok.com')) {
      return 'tiktok';
    } else if (lowerUrl.includes('facebook.com') || lowerUrl.includes('fb.com')) {
      return 'facebook';
    } else if (lowerUrl.includes('maps.apple.com')) {
      return 'apple_maps';
    } else {
      return 'website';
    }
  } catch (e) {
    return 'website';
  }
};

/**
 * Essaie de récupérer les métadonnées d'un lien avec des tentatives
 * @param {string} url - URL à analyser
 * @param {number} retryCount - Nombre de tentatives actuelles
 * @returns {Promise<Object>} - Métadonnées de l'URL
 */
const fetchMetadataWithRetry = async (url, retryCount = 0) => {
  try {
    await throttleRequests();

    const axiosInstance = getAxiosInstance();
    const controller = new AbortController();

    // Créer un timeout pour la requête
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

    try {
      const response = await axiosInstance.get('/api/link-preview/getDataLink', {
        params: { url },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      // Vérifier la structure de la réponse
      const metadata = response?.data?.data || response?.data;

      if (!metadata) {
        throw new Error('Format de réponse invalide');
      }

      return metadata;
    } finally {
      clearTimeout(timeoutId);
    }
  } catch (error) {
    console.error(`Erreur lors de la récupération des métadonnées (tentative ${retryCount + 1}/${MAX_RETRIES + 1}):`, error.message);

    // Vérifier si on peut réessayer
    if (retryCount < MAX_RETRIES && (
    error.code === 'ECONNABORTED' ||
    error.name === 'AbortError' ||
    error.message.includes('timeout') ||
    error.message.includes('503') ||
    error.response?.status === 503)) {

      // Attente exponentielle entre les tentatives
      const waitTime = 1000 * Math.pow(2, retryCount);

      await new Promise((resolve) => setTimeout(resolve, waitTime));

      // Réessayer
      return fetchMetadataWithRetry(url, retryCount + 1);
    }

    // Plus de tentatives possibles, renvoyer une erreur
    throw error;
  }
};

/**
 * Récupère les métadonnées d'un lien en appelant l'API backend
 * @param {string} url - URL à analyser
 * @param {Object} options - Options de récupération
 * @param {boolean} options.forceRefresh - Forcer le rafraîchissement depuis l'API
 * @param {boolean} options.returnLoadingState - Renvoyer immédiatement un état de chargement
 * @returns {Promise<Object>} - Métadonnées de l'URL
 */
export const getLinkMetadata = async (url, options = {}) => {
  const { forceRefresh = false, returnLoadingState = true } = options;

  if (!url) {

    return createFallbackMetadata('https://example.com');
  }

  try {
    // Normaliser l'URL pour le cache
    const cacheKey = normalizeCacheKey(url);

    // Vérifier si cette URL est déjà en cours de chargement
    if (loadingUrls.has(cacheKey)) {


      // Si on veut un état de chargement immédiat
      if (returnLoadingState) {
        return createLoadingMetadata(url);
      }

      // Sinon, vérifier le cache quand même
      if (!forceRefresh && metadataCache[cacheKey]) {
        return metadataCache[cacheKey];
      }

      // Ou renvoyer un fallback
      return createFallbackMetadata(url);
    }

    // 1. Vérifier d'abord le cache en mémoire si pas de rafraîchissement forcé
    if (!forceRefresh && metadataCache[cacheKey]) {

      return metadataCache[cacheKey];
    }

    // 2. Vérifier ensuite le cache persistant si pas de rafraîchissement forcé
    if (!forceRefresh) {
      try {
        const cachedData = await AsyncStorage.getItem(`metadata_${cacheKey}`);

        if (cachedData) {
          const { data, timestamp } = JSON.parse(cachedData);

          // Vérifier si le cache n'est pas expiré
          if (Date.now() - timestamp < CACHE_EXPIRY) {
            // Mettre à jour le cache en mémoire
            metadataCache[cacheKey] = data;

            return data;
          }
        }
      } catch (cacheError) {

      }
    }

    // Marquer cette URL comme étant en cours de chargement
    loadingUrls.add(cacheKey);

    // Si on veut un état de chargement immédiat, le renvoyer maintenant
    if (returnLoadingState) {
      // Démarrer le chargement en arrière-plan
      fetchMetadataWithRetry(url).
      then((metadata) => {
        // Mettre en cache les données récupérées
        if (metadata) {
          metadataCache[cacheKey] = metadata;
          AsyncStorage.setItem(`metadata_${cacheKey}`, JSON.stringify({
            data: metadata,
            timestamp: Date.now()
          })).catch((e) => {});
        }
      }).
      catch((error) => console.error('Erreur en arrière-plan:', error.message)).
      finally(() => {
        // Libérer l'URL du statut de chargement
        loadingUrls.delete(cacheKey);
      });

      return createLoadingMetadata(url);
    }

    try {
      // 3. Appeler l'API backend pour extraire les métadonnées

      const metadata = await fetchMetadataWithRetry(url);

      // 4. Mettre en cache pour les prochaines utilisations
      if (metadata) {
        metadataCache[cacheKey] = metadata;

        try {
          await AsyncStorage.setItem(`metadata_${cacheKey}`, JSON.stringify({
            data: metadata,
            timestamp: Date.now()
          }));

        } catch (storageError) {

        }
      }

      return metadata;
    } finally {
      // Libérer l'URL du statut de chargement
      loadingUrls.delete(cacheKey);
    }
  } catch (error) {
    console.error('Erreur lors de la récupération des métadonnées:', error.message);
    return createFallbackMetadata(url);
  }
};

/**
 * Vide le cache des métadonnées
 * @param {string} url - URL spécifique à vider (facultatif)
 * @returns {Promise<boolean>} - Succès de l'opération
 */
export const clearLinkPreviewCache = async (url) => {
  try {
    if (url) {
      // Normaliser l'URL pour correspondre à la clé de cache
      const cacheKey = normalizeCacheKey(url);

      // Supprimer du cache mémoire
      delete metadataCache[cacheKey];

      // Supprimer du cache persistant
      await AsyncStorage.removeItem(`metadata_${cacheKey}`);

    } else {
      // Vider le cache mémoire
      Object.keys(metadataCache).forEach((key) => {
        delete metadataCache[key];
      });

      // Trouver et supprimer toutes les clés de cache de prévisualisation
      const allKeys = await AsyncStorage.getAllKeys();
      const previewKeys = allKeys.filter((key) => key.startsWith('metadata_'));

      if (previewKeys.length > 0) {
        await AsyncStorage.multiRemove(previewKeys);
      }


    }
    return true;
  } catch (error) {
    console.error('Erreur lors du vidage du cache:', error);
    return false;
  }
};

/**
 * Rafraîchit les métadonnées d'un lien
 * @param {string} url - URL à rafraîchir
 * @returns {Promise<Object>} - Métadonnées mises à jour
 */
export const refreshLinkMetadata = async (url) => {
  if (!url) return null;

  // Forcer le rafraîchissement depuis l'API et attendre le résultat
  return getLinkMetadata(url, { forceRefresh: true, returnLoadingState: false });
};

export default {
  getLinkMetadata,
  refreshLinkMetadata,
  clearLinkPreviewCache
};