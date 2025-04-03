// services/linkPreviewService.js
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAxiosInstance, getAxiosInstance } from '../data/api/axiosInstance';

// Cache en mémoire
const metadataCache = {};

// Durée d'expiration du cache (7 jours)
const CACHE_EXPIRY = 7 * 24 * 60 * 60 * 1000;

/**
 * Récupère les métadonnées d'une URL depuis l'API backend
 * @param {string} url - URL à analyser
 * @returns {Promise<Object>} - Métadonnées de l'URL
 */
export const fetchLinkMetadata = async (url) => {
  try {
    const instance = getAxiosInstance();
    
    // Configurer l'instance pour gérer les redirections
    const configuredInstance = axios.create({
      baseURL: instance.defaults.baseURL,
      timeout: 15000,
      maxRedirects: 10,
      withCredentials: instance.defaults.withCredentials,
      headers: {
        ...instance.defaults.headers,
        'Content-Type': 'application/json'
      }
    });
    
    // Log pour le débogage
    console.log(`Tentative de récupération des métadonnées pour: ${url}`);
    
    // Utiliser des paramètres de requête au lieu d'encoder dans l'URL
    const response = await configuredInstance.get('/api/link-preview/getDataLink', {
      params: { url }
    });
    
    if (response.data && response.data.success) {
      return response.data.data;
    } else {
      console.log('Réponse API sans succès:', response.data);
      throw new Error(response.data?.error || 'Impossible de récupérer les métadonnées');
    }
  } catch (error) {
    console.error('Erreur lors de la récupération des métadonnées:', error);
    
    // Informations détaillées sur l'erreur pour le débogage
    if (error.response) {
      console.log('Statut HTTP:', error.response.status);
      console.log('Headers de réponse:', JSON.stringify(error.response.headers));
      console.log('Données de réponse:', error.response.data);
    } else if (error.request) {
      console.log('Requête sans réponse:', error.request);
    } else {
      console.log('Erreur de configuration:', error.message);
    }
    
    // Créer des métadonnées de secours basées sur l'URL
    return createFallbackMetadata(url);
  }
};

/**
 * Récupère les métadonnées avec mise en cache
 * @param {string} url - URL à analyser
 * @returns {Promise<Object>} - Métadonnées de l'URL
 */
export const getLinkMetadata = async (url) => {
  if (!url) {
    console.log('URL manquante');
    return createFallbackMetadata('https://example.com');
  }
  
  try {
    // Normaliser l'URL pour le cache (retirer les paramètres de tracking, etc.)
    const cacheKey = normalizeCacheKey(url);
    
    // 1. Vérifier d'abord le cache en mémoire (le plus rapide)
    if (metadataCache[cacheKey]) {
      console.log('Cache mémoire utilisé pour:', url);
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
          console.log('Cache AsyncStorage utilisé pour:', url);
          return data;
        } else {
          console.log('Cache expiré pour:', url);
        }
      }
    } catch (cacheError) {
      console.log('Erreur lors de la lecture du cache:', cacheError.message);
      // Continuer en cas d'erreur de cache
    }
    
    // 3. Si pas en cache ou expiré, récupérer les nouvelles données
    console.log('Récupération des métadonnées pour:', url);
    const metadata = await fetchLinkMetadata(url);
    
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
        console.log('Erreur lors de la mise en cache:', storageError.message);
        // Continuer même si la mise en cache échoue
      }
    }
    
    return metadata;
  } catch (error) {
    console.error('Erreur de cache ou de récupération:', error.message);
    
    // 5. En dernier recours, essayer de créer des métadonnées minimales
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
    // En cas d'erreur, hacher l'URL
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
    
    // Déterminer la plateforme
    let platform = 'website';
    let siteName = domain;
    let title = domain;
    let image = null;
    
    if (url.match(/twitter\.com|x\.com/i)) {
      platform = 'twitter';
      siteName = 'X';
      title = 'Tweet';
    } else if (url.match(/youtube\.com|youtu\.be/i)) {
      platform = 'youtube';
      siteName = 'YouTube';
      title = 'Vidéo YouTube';
      
      // Essayer d'extraire l'ID vidéo pour l'image de prévisualisation
      const videoIdMatch = url.match(/[?&]v=([^&]+)/i) || url.match(/youtu\.be\/([^?&]+)/i);
      if (videoIdMatch && videoIdMatch[1]) {
        image = `https://img.youtube.com/vi/${videoIdMatch[1]}/hqdefault.jpg`;
      }
    } else if (url.match(/instagram\.com/i)) {
      platform = 'instagram';
      siteName = 'Instagram';
      title = 'Post Instagram';
    } else if (url.match(/facebook\.com|fb\.com/i)) {
      platform = 'facebook';
      siteName = 'Facebook';
      title = 'Publication Facebook';
    } else if (url.match(/tiktok\.com/i)) {
      platform = 'tiktok';
      siteName = 'TikTok';
      title = 'Vidéo TikTok';
    }
    
    return {
      url,
      platform,
      title,
      description: '',
      image,
      siteName,
      author: null,
      text: ''
    };
  } catch (e) {
    console.error('Erreur lors de la création des métadonnées de secours:', e);
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

/**
 * Vide le cache pour une URL ou tout le cache
 * @param {string} [url] - URL à supprimer (si non fournie, vide tout le cache)
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
  fetchLinkMetadata,
  clearLinkPreviewCache
};