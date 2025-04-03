// services/linkPreviewService.js
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getAxiosInstance } from '../data/api/axiosInstance';

// Cache en mémoire
const metadataCache = {};

// Durée d'expiration du cache (7 jours)
const CACHE_EXPIRY = 7 * 24 * 60 * 60 * 1000;

/**
 * Récupère les métadonnées d'un lien directement côté client
 * sans passer par l'API backend
 * @param {string} url - URL à analyser
 * @returns {Promise<Object>} - Métadonnées de l'URL
 */
export const extractMetadataClientSide = async (url) => {
    try {
      console.log("Extraction pour URL:", url);
      
      // Pour YouTube
      if (url.match(/youtube\.com|youtu\.be/i)) {
        const videoIdMatch = url.match(/[?&]v=([^&]+)/i) || url.match(/youtu\.be\/([^?&]+)/i);
        if (videoIdMatch && videoIdMatch[1]) {
          const videoId = videoIdMatch[1];
          
          // Extraire le titre et la chaîne si possible depuis l'URL
          let title = 'Vidéo YouTube';
          let channelName = null;
          
          // Essayer d'extraire le titre depuis les paramètres de l'URL
          const titleMatch = url.match(/[?&]title=([^&]+)/i);
          if (titleMatch && titleMatch[1]) {
            try {
              title = decodeURIComponent(titleMatch[1]).replace(/\+/g, ' ');
            } catch (e) {
              console.log("Erreur de décodage du titre:", e);
            }
          }
          
          // Formats d'image disponibles pour YouTube
          const imageFormats = [
            `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`, // HD
            `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,     // HQ
            `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,     // Medium
            `https://img.youtube.com/vi/${videoId}/default.jpg`        // Standard
          ];
          
          // Construire la durée si elle est disponible dans l'URL
          let duration = null;
          const durationMatch = url.match(/[?&]t=(\d+)/i);
          if (durationMatch && durationMatch[1]) {
            const seconds = parseInt(durationMatch[1]);
            const minutes = Math.floor(seconds / 60);
            const remainingSeconds = seconds % 60;
            duration = `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
          }
          
          const result = {
            url,
            platform: 'youtube',
            title,
            description: '',
            image: imageFormats[1], // Utiliser HQ par défaut
            imageFormats, // Inclure tous les formats disponibles
            siteName: 'YouTube',
            author: channelName,
            text: '',
            videoId,
            duration,
            embedUrl: `https://www.youtube.com/embed/${videoId}`
          };
          
          console.log("[METADATA YOUTUBE]", JSON.stringify(result, null, 2));
          return result;
        }
      }
      
      // Pour Twitter/X
      if (url.match(/twitter\.com|x\.com/i)) {
        // Extraire le nom d'utilisateur et l'ID du tweet
        const userMatch = url.match(/(?:twitter|x)\.com\/([^\/]+)/i);
        const tweetIdMatch = url.match(/(?:twitter|x)\.com\/[^\/]+\/status\/(\d+)/i);
        
        const username = userMatch ? userMatch[1] : null;
        const tweetId = tweetIdMatch ? tweetIdMatch[1] : null;
        
        // Extraire des hashtags potentiels
        const hashtagsMatch = url.match(/[?&]hashtag=([^&]+)/i);
        const hashtags = hashtagsMatch 
          ? decodeURIComponent(hashtagsMatch[1]).split(',') 
          : [];
        
        // Distinguer les profils des tweets individuels
        const isTweet = url.includes('/status/');
        
        const result = {
          url,
          platform: 'twitter',
          title: isTweet ? 'Tweet' : `Profil de ${username || 'utilisateur'}`,
          description: '',
          image: null,
          siteName: 'X',
          author: username,
          text: '',
          tweetId,
          hashtags,
          isProfile: !isTweet,
          embedUrl: tweetId ? `https://platform.twitter.com/embed/Tweet.html?id=${tweetId}` : null
        };
        
        console.log("[METADATA TWITTER]", JSON.stringify(result, null, 2));
        return result;
      }
      
      // Pour Instagram
      if (url.match(/instagram\.com/i)) {
        // Extraire le nom d'utilisateur et l'ID du post
        const userMatch = url.match(/instagram\.com\/([^\/\?]+)/i);
        const postIdMatch = url.match(/instagram\.com\/p\/([^\/\?]+)/i) || 
                            url.match(/instagram\.com\/reel\/([^\/\?]+)/i);
        
        const username = userMatch && !userMatch[1].startsWith('p/') && !userMatch[1].startsWith('reel/') 
          ? userMatch[1] 
          : null;
          
        const postId = postIdMatch ? postIdMatch[1] : null;
        
        // Distinguer les types de contenu
        const isReel = url.includes('/reel/');
        const isPost = url.includes('/p/');
        const isProfile = !isReel && !isPost;
        
        const result = {
          url,
          platform: 'instagram',
          title: isReel 
            ? 'Reels Instagram' 
            : isPost 
              ? 'Post Instagram' 
              : `Profil de ${username || 'utilisateur'}`,
          description: '',
          image: null,
          siteName: 'Instagram',
          author: username,
          text: '',
          postId,
          contentType: isReel ? 'reel' : isPost ? 'post' : 'profile',
          embedUrl: postId ? `https://www.instagram.com/${isReel ? 'reel' : 'p'}/${postId}/embed` : null
        };
        
        console.log("[METADATA INSTAGRAM]", JSON.stringify(result, null, 2));
        return result;
      }
      
      // Pour Facebook
      if (url.match(/facebook\.com|fb\.com/i)) {
        // Extraire l'ID de l'utilisateur ou de la page et l'ID du post
        const userMatch = url.match(/(?:facebook|fb)\.com\/([^\/\?]+)/i);
        const postIdMatch = url.match(/(?:facebook|fb)\.com\/[^\/]+\/posts\/(\d+)/i) ||
                            url.match(/(?:facebook|fb)\.com\/permalink\.php\?[^&]*story_fbid=(\d+)/i);
        
        const username = userMatch ? userMatch[1] : null;
        const postId = postIdMatch ? postIdMatch[1] : null;
        
        // Distinguer les types de contenu
        const isPost = url.includes('/posts/') || url.includes('story_fbid=');
        const isPage = !isPost && username && !username.match(/profile\.php/);
        const isProfile = !isPost && !isPage;
        
        const result = {
          url,
          platform: 'facebook',
          title: isPost 
            ? 'Publication Facebook' 
            : isPage 
              ? `Page ${username || 'Facebook'}` 
              : `Profil Facebook`,
          description: '',
          image: null,
          siteName: 'Facebook',
          author: username,
          text: '',
          postId,
          contentType: isPost ? 'post' : isPage ? 'page' : 'profile',
          embedUrl: postId && username ? `https://www.facebook.com/plugins/post.php?href=https://www.facebook.com/${username}/posts/${postId}` : null
        };
        
        console.log("[METADATA FACEBOOK]", JSON.stringify(result, null, 2));
        return result;
      }
      
      // Pour TikTok
      if (url.match(/tiktok\.com/i)) {
        // Extraire l'ID du video et le nom d'utilisateur
        const userMatch = url.match(/tiktok\.com\/@([^\/\?]+)/i);
        const videoIdMatch = url.match(/tiktok\.com\/@[^\/]+\/video\/(\d+)/i) || 
                             url.match(/tiktok\.com\/t\/([^\/\?]+)/i);
        
        const username = userMatch ? userMatch[1] : null;
        const videoId = videoIdMatch ? videoIdMatch[1] : null;
        
        // Distinguer les types de contenu
        const isVideo = url.includes('/video/') || url.includes('/t/');
        const isProfile = !isVideo && username;
        
        const result = {
          url,
          platform: 'tiktok',
          title: isVideo 
            ? 'Vidéo TikTok' 
            : `Profil de ${username || 'utilisateur'}`,
          description: '',
          image: null,
          siteName: 'TikTok',
          author: username,
          text: '',
          videoId,
          contentType: isVideo ? 'video' : 'profile',
          embedUrl: videoId ? `https://www.tiktok.com/embed/v2/${videoId}` : null
        };
        
        console.log("[METADATA TIKTOK]", JSON.stringify(result, null, 2));
        return result;
      }
      
      // Pour Apple Maps
      if (url.match(/maps\.apple\.com/i)) {
        // Extraire les coordonnées et l'adresse
        const latMatch = url.match(/[?&]ll=([^,&]+)/i);
        const lngMatch = url.match(/[?&]ll=[^,&]+,([^&]+)/i);
        const addressMatch = url.match(/[?&]q=([^&]+)/i) || url.match(/[?&]address=([^&]+)/i);
        
        let lat = null, lng = null, address = null;
        
        if (latMatch && latMatch[1]) lat = parseFloat(latMatch[1]);
        if (lngMatch && lngMatch[1]) lng = parseFloat(lngMatch[1]);
        
        if (addressMatch && addressMatch[1]) {
          try {
            address = decodeURIComponent(addressMatch[1]).replace(/\+/g, ' ');
          } catch (e) {
            console.log("Erreur de décodage de l'adresse:", e);
          }
        }
        
        const result = {
          url,
          platform: 'apple_maps',
          title: address ? `Lieu: ${address}` : 'Localisation',
          description: '',
          image: null,
          siteName: 'Apple Plans',
          author: null,
          text: address || '',
          coordinates: (lat !== null && lng !== null) ? { lat, lng } : null,
          address
        };
        
        console.log("[METADATA APPLE_MAPS]", JSON.stringify(result, null, 2));
        return result;
      }
      
      // Pour LinkedIn
      if (url.match(/linkedin\.com/i)) {
        // Extraire le nom d'utilisateur/entreprise et type de contenu
        const profileMatch = url.match(/linkedin\.com\/in\/([^\/\?]+)/i);
        const companyMatch = url.match(/linkedin\.com\/company\/([^\/\?]+)/i);
        const postMatch = url.match(/linkedin\.com\/feed\/update\/([^\/\?]+)/i);
        
        const profileId = profileMatch ? profileMatch[1] : null;
        const companyId = companyMatch ? companyMatch[1] : null;
        const postId = postMatch ? postMatch[1] : null;
        
        let contentType = 'page';
        if (profileId) contentType = 'profile';
        if (companyId) contentType = 'company';
        if (postId) contentType = 'post';
        
        const result = {
          url,
          platform: 'linkedin',
          title: contentType === 'profile' 
            ? `Profil LinkedIn` 
            : contentType === 'company' 
              ? `Page d'entreprise LinkedIn` 
              : contentType === 'post'
                ? 'Publication LinkedIn'
                : 'LinkedIn',
          description: '',
          image: null,
          siteName: 'LinkedIn',
          author: profileId || companyId || null,
          text: '',
          profileId,
          companyId,
          postId,
          contentType
        };
        
        console.log("[METADATA LINKEDIN]", JSON.stringify(result, null, 2));
        return result;
      }
      
      // Extraction générique basée sur le domaine pour les autres sites
      const parsedUrl = new URL(url);
      const domain = parsedUrl.hostname.replace('www.', '');
      
      // Distinguer certains domaines populaires
      let platform = 'website';
      let siteName = domain;
      
      // Sites populaires de médias / news
      if (domain.match(/nytimes\.com|lemonde\.fr|bbc\.(com|co\.uk)|cnn\.com|theguardian\.com/i)) {
        platform = 'news';
        
        // Extraire les segments du chemin qui pourraient indiquer la catégorie et le titre
        const pathSegments = parsedUrl.pathname.split('/').filter(Boolean);
        const category = pathSegments.length > 0 ? pathSegments[0] : null;
        const article = pathSegments.length > 1 ? pathSegments[pathSegments.length - 1] : null;
        
        // Remplacer les tirets par des espaces pour un titre plus lisible
        const title = article ? article.replace(/-/g, ' ').replace(/\.html$/, '') : domain;
        
        const result = {
          url,
          platform,
          title: toTitleCase(title),
          description: '',
          image: null,
          siteName: getSiteNameFromDomain(domain),
          author: null,
          text: '',
          category,
          contentType: 'article'
        };
        
        console.log("[METADATA NEWS]", JSON.stringify(result, null, 2));
        return result;
      }
      
      // Autres sites
      const result = {
        url,
        platform: 'website',
        title: domain,
        description: '',
        image: null,
        siteName: domain,
        author: null,
        text: '',
        favicon: `https://${domain}/favicon.ico` // Tentative de récupération de favicon
      };
      
      console.log("[METADATA WEBSITE]", JSON.stringify(result, null, 2));
      return result;
    } catch (error) {
      console.error('Erreur lors de l\'extraction des métadonnées:', error);
      
      // Renvoyer des métadonnées minimales en cas d'erreur
      try {
        const fallbackUrl = url || 'https://example.com';
        const domain = new URL(fallbackUrl).hostname.replace('www.', '');
        
        return {
          url: fallbackUrl,
          platform: 'website',
          title: domain,
          description: '',
          image: null,
          siteName: domain,
          author: null,
          text: '',
          error: error.message
        };
      } catch (fallbackError) {
        // En cas d'erreur fatale, renvoyer vraiment le minimum
        return {
          url: url || 'https://example.com',
          platform: 'website',
          title: 'Site web',
          description: '',
          image: null,
          siteName: 'Site web',
          author: null,
          text: ''
        };
      }
    }
  };
  
  /**
   * Convertit une chaîne en format titre (majuscule à chaque mot)
   */
  function toTitleCase(str) {
    return str.replace(/\w\S*/g, function(txt) {
      return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
    });
  }
  
  /**
   * Obtient un nom de site convivial à partir du domaine
   */
  function getSiteNameFromDomain(domain) {
    // Correspondances spécifiques pour les sites connus
    const siteNameMap = {
      'nytimes.com': 'The New York Times',
      'lemonde.fr': 'Le Monde',
      'bbc.com': 'BBC News',
      'bbc.co.uk': 'BBC News',
      'cnn.com': 'CNN',
      'theguardian.com': 'The Guardian',
      // Ajouter d'autres correspondances au besoin
    };
    
    // Vérifier si le domaine est dans notre mapping
    if (siteNameMap[domain]) {
      return siteNameMap[domain];
    }
    
    // Sinon, extraire et nettoyer le nom du domaine
    const mainDomain = domain.split('.')[0];
    return toTitleCase(mainDomain);
  }

/**
 * Fonction principale pour obtenir les métadonnées d'un lien
 * Contourne complètement l'API backend
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
    
    // 3. Extraire les métadonnées directement côté client
    console.log('Extraction directe des métadonnées pour:', url);
    const metadata = await extractMetadataClientSide(url);
    
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
  clearLinkPreviewCache,
  extractMetadataClientSide
};