import AsyncStorage from '@react-native-async-storage/async-storage';
import { getAxiosInstance } from '../data/api/axiosInstance';

// Cache en mémoire
const metadataCache = {};

// Durée d'expiration du cache (7 jours)
const CACHE_EXPIRY = 7 * 24 * 60 * 60 * 1000;

/**
 * Récupère les métadonnées d'un lien en appelant l'API backend
 * @param {string} url - URL à analyser
 * @returns {Promise<Object>} - Métadonnées de l'URL
 */
export const getLinkMetadata = async (url) => {
  if (!url) {
    console.log('URL manquante');
    return createFallbackMetadata('https://example.com');
  }

  try {
    // Normaliser l'URL pour le cache
    const cacheKey = normalizeCacheKey(url);

    // 1. Vérifier d'abord le cache en mémoire (le plus rapide)
    if (metadataCache[cacheKey]) {
      console.log('Utilisation du cache en mémoire pour:', url);
      return metadataCache[cacheKey];
    }

    // 2. Vérifier ensuite le cache persistant
    try {
      const cachedData = await AsyncStorage.getItem(`metadata_${cacheKey}`);

      if (cachedData) {
        const { data, timestamp } = JSON.parse(cachedData);

        // Vérifier si le cache n'est pas expiré
        if (Date.now() - timestamp < CACHE_EXPIRY) {
          // Mettre à jour le cache en mémoire
          metadataCache[cacheKey] = data;
          console.log('Utilisation du cache persistant pour:', url);
          return data;
        }
      }
    } catch (cacheError) {
      console.log('Erreur de lecture du cache:', cacheError.message);
    }

    // 3. Appeler l'API backend pour extraire les métadonnées
    console.log('Appel de l\'API backend pour:', url);
    const axiosInstance = getAxiosInstance();
    const response = await axiosInstance.get('/api/link-preview/getDataLink', {
      params: { url }
    });

    const metadata = response.data.data;

    // 4. Mettre en cache pour les prochaines utilisations
    if (metadata) {
      metadataCache[cacheKey] = metadata;

      try {
        await AsyncStorage.setItem(`metadata_${cacheKey}`, JSON.stringify({
          data: metadata,
          timestamp: Date.now()
        }));
        console.log('Métadonnées mises en cache pour:', url);
      } catch (storageError) {
        console.log('Erreur de mise en cache:', storageError.message);
      }
    }

    return metadata;
  } catch (error) {
    console.error('Erreur lors de la récupération des métadonnées:', error);
    return createFallbackMetadata(url);
  }
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
      (hash, char) => ((hash << 5) - hash) + char.charCodeAt(0), 0
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
      text: ''
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
      text: ''
    };
  }
};


export const clearLinkPreviewCache = async (url) => {
  try {
    if (url) {
      // Normaliser l'URL pour correspondre à la clé de cache
      const cacheKey = normalizeCacheKey(url);

      // Supprimer du cache mémoire
      delete metadataCache[cacheKey];

      // Supprimer du cache persistant
      await AsyncStorage.removeItem(`metadata_${cacheKey}`);
      console.log(`Cache vidé pour: ${url}`);
    } else {
      // Vider le cache mémoire
      Object.keys(metadataCache).forEach(key => {
        delete metadataCache[key];
      });

      // Trouver et supprimer toutes les clés de cache de prévisualisation
      const allKeys = await AsyncStorage.getAllKeys();
      const previewKeys = allKeys.filter(key => key.startsWith('metadata_'));

      if (previewKeys.length > 0) {
        await AsyncStorage.multiRemove(previewKeys);
      }

      console.log(`Cache de prévisualisation entièrement vidé (${previewKeys.length} entrées)`);
    }
    return true;
  } catch (error) {
    console.error('Erreur lors du vidage du cache:', error);
    return false;
  }
};

export default {
  getLinkMetadata,
  clearLinkPreviewCache,
};
