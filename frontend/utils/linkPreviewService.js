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
    const instance = getAxiosInstance();
  try {
    // Appel à notre API backend
    const response = await instance.get(`/api/link-preview/getDataLink?url=${encodeURIComponent(url)}`);
    
    if (response.data && response.data.success) {
      return response.data.data;
    } else {
      throw new Error(response.data?.error || 'Impossible de récupérer les métadonnées');
    }
  } catch (error) {
    console.error('Erreur lors de la récupération des métadonnées:', error);
    
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
  try {
    // 1. Vérifier d'abord le cache en mémoire (le plus rapide)
    if (metadataCache[url]) {
      return metadataCache[url];
    }
    
    // 2. Vérifier ensuite le cache persistant
    const cachedData = await AsyncStorage.getItem(`metadata_${url}`);
    
    if (cachedData) {
      const { data, timestamp } = JSON.parse(cachedData);
      
      // Vérifier si le cache n'est pas expiré
      if (Date.now() - timestamp < CACHE_EXPIRY) {
        // Mettre à jour le cache en mémoire
        metadataCache[url] = data;
        return data;
      }
    }
    
    // 3. Si pas en cache ou expiré, récupérer les nouvelles données
    const metadata = await fetchLinkMetadata(url);
    
    // 4. Mettre en cache pour les prochaines utilisations
    metadataCache[url] = metadata;
    
    await AsyncStorage.setItem(`metadata_${url}`, JSON.stringify({
      data: metadata,
      timestamp: Date.now()
    }));
    
    return metadata;
  } catch (error) {
    console.error('Erreur de cache ou de récupération:', error);
    
    // 5. En dernier recours, essayer de créer des métadonnées minimales
    return createFallbackMetadata(url);
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
        image = `https://img.youtube.com/vi/${videoIdMatch[1]}/0.jpg`;
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

export default {
  getLinkMetadata,
  fetchLinkMetadata
};