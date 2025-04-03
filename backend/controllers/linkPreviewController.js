// controllers/linkPreviewController.js
const axios = require('axios');
const cheerio = require('cheerio');

/**
 * Récupère les métadonnées d'une URL pour l'affichage des previews de liens
 * @param {Object} req - Requête Express
 * @param {Object} res - Réponse Express
 */
exports.getDataLink = async (req, res) => {
  const { url } = req.query;
  
  if (!url) {
    return res.status(400).json({ 
      success: false, 
      error: 'URL requise' 
    });
  }
  
  try {
    // Extraire les métadonnées
    const metadata = await extractMetadata(url);
    
    return res.status(200).json({
      success: true,
      data: metadata
    });
  } catch (error) {
    console.error('Erreur lors de l\'extraction des métadonnées:', error);
    
    // Essayer de retourner des données minimales basées sur l'URL
    try {
      const fallbackData = getFallbackMetadata(url);
      
      return res.status(200).json({
        success: true,
        data: fallbackData,
        warning: 'Données limitées: impossible d\'extraire toutes les métadonnées'
      });
    } catch (fallbackError) {
      return res.status(500).json({
        success: false,
        error: 'Impossible d\'extraire les métadonnées',
        details: error.message
      });
    }
  }
};

/**
 * Détecte la plateforme d'une URL
 * @param {string} url - URL à analyser
 * @returns {string} - Type de plateforme
 */
const detectPlatform = (url) => {
  if (!url) return 'unknown';
  
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
};

/**
 * Extrait les métadonnées d'une URL
 * @param {string} url - URL à analyser
 * @returns {Object} - Métadonnées extraites
 */
const extractMetadata = async (url) => {
  try {
    // Configuration des en-têtes pour simuler un navigateur
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'fr,fr-FR;q=0.8,en-US;q=0.5,en;q=0.3',
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache',
    };

    // Récupérer le contenu HTML de la page
    const response = await axios.get(url, { 
      headers, 
      timeout: 10000,
      maxRedirects: 5
    });
    
    const html = response.data;
    const $ = cheerio.load(html);
    
    // Identifier la plateforme
    const platform = detectPlatform(url);
    
    // Extraire les métadonnées de base (valables pour toutes les plateformes)
    let metadata = {
      url,
      platform,
      title: $('title').text().trim() || '',
      description: $('meta[name="description"]').attr('content') || 
                 $('meta[property="og:description"]').attr('content') || '',
      image: $('meta[property="og:image"]').attr('content') || 
             $('meta[name="twitter:image"]').attr('content') || null,
      siteName: $('meta[property="og:site_name"]').attr('content') || 
               new URL(url).hostname.replace('www.', '')
    };
    
    // Essayer d'extraire l'auteur/le créateur
    metadata.author = $('meta[name="author"]').attr('content') || 
                      $('meta[property="article:author"]').attr('content') || 
                      $('meta[name="twitter:creator"]').attr('content') || null;
    
    // Nettoyer les URL d'images relatives
    if (metadata.image && !metadata.image.startsWith('http')) {
      const baseUrl = new URL(url).origin;
      metadata.image = new URL(metadata.image, baseUrl).toString();
    }
    
    // Extraction spécifique selon la plateforme
    switch (platform) {
      case 'twitter':
        metadata = extractTwitterMetadata($, metadata);
        break;
      case 'youtube':
        metadata = extractYoutubeMetadata($, metadata);
        break;
      case 'instagram':
        metadata = extractInstagramMetadata($, metadata);
        break;
      case 'facebook':
        metadata = extractFacebookMetadata($, metadata);
        break;
      // Ajoutez d'autres cas spécifiques si nécessaire
    }
    
    return cleanupMetadata(metadata);
  } catch (error) {
    console.error('Erreur lors de l\'extraction des métadonnées:', error);
    throw error;
  }
};

/**
 * Extrait les métadonnées spécifiques à Twitter
 */
const extractTwitterMetadata = ($, metadata) => {
  // Essayer d'extraire le texte du tweet
  const tweetText = $('meta[property="og:description"]').attr('content') || 
                    $('div[data-testid="tweetText"]').text();
  
  // Mettre à jour les métadonnées avec les informations spécifiques à Twitter
  return {
    ...metadata,
    text: tweetText || metadata.description,
    siteName: 'X',
    // Autres informations spécifiques si nécessaire
  };
};

/**
 * Extrait les métadonnées spécifiques à YouTube
 */
const extractYoutubeMetadata = ($, metadata) => {
  // Essayer d'extraire des informations supplémentaires sur la vidéo
  const duration = $('meta[itemprop="duration"]').attr('content') || null;
  const channelName = $('meta[itemprop="channelName"]').attr('content') || 
                     $('link[itemprop="name"]').attr('content') || null;
  
  // Mettre à jour les métadonnées avec les informations spécifiques à YouTube
  return {
    ...metadata,
    siteName: 'YouTube',
    author: channelName || metadata.author,
    duration,
    // Autres informations spécifiques si nécessaire
  };
};

/**
 * Extrait les métadonnées spécifiques à Instagram
 */
const extractInstagramMetadata = ($, metadata) => {
  return {
    ...metadata,
    siteName: 'Instagram',
    // Autres informations spécifiques si nécessaire
  };
};

/**
 * Extrait les métadonnées spécifiques à Facebook
 */
const extractFacebookMetadata = ($, metadata) => {
  return {
    ...metadata,
    siteName: 'Facebook',
    // Autres informations spécifiques si nécessaire
  };
};

/**
 * Créer des métadonnées de secours basées sur l'URL
 * Utilisé lorsque l'extraction complète échoue
 */
const getFallbackMetadata = (url) => {
  const platform = detectPlatform(url);
  const parsedUrl = new URL(url);
  const domain = parsedUrl.hostname.replace('www.', '');
  
  // Métadonnées de base
  const fallbackData = {
    url,
    platform,
    title: domain,
    description: '',
    image: null,
    siteName: domain
  };
  
  // Personnalisation selon la plateforme
  switch (platform) {
    case 'twitter':
      fallbackData.siteName = 'X';
      fallbackData.title = 'Tweet';
      
      // Essayer d'extraire le nom d'utilisateur de l'URL
      const twitterMatch = url.match(/twitter\.com\/([^\/]+)/i) || url.match(/x\.com\/([^\/]+)/i);
      if (twitterMatch && twitterMatch[1]) {
        fallbackData.author = twitterMatch[1];
      }
      break;
      
    case 'youtube':
      fallbackData.siteName = 'YouTube';
      fallbackData.title = 'Vidéo YouTube';
      
      // Essayer d'extraire l'ID de la vidéo de l'URL
      const youtubeMatch = url.match(/[?&]v=([^&]+)/i) || url.match(/youtu\.be\/([^?&]+)/i);
      if (youtubeMatch && youtubeMatch[1]) {
        const videoId = youtubeMatch[1];
        fallbackData.image = `https://img.youtube.com/vi/${videoId}/0.jpg`;
      }
      break;
      
    case 'instagram':
      fallbackData.siteName = 'Instagram';
      fallbackData.title = 'Post Instagram';
      break;
      
    case 'facebook':
      fallbackData.siteName = 'Facebook';
      fallbackData.title = 'Publication Facebook';
      break;
      
    case 'tiktok':
      fallbackData.siteName = 'TikTok';
      fallbackData.title = 'Vidéo TikTok';
      break;
      
    case 'apple_maps':
      fallbackData.siteName = 'Apple Plans';
      fallbackData.title = 'Localisation';
      break;
  }
  
  return fallbackData;
};

/**
 * Nettoie et valide les métadonnées pour s'assurer qu'elles sont complètes et cohérentes
 */
const cleanupMetadata = (metadata) => {
  // S'assurer que tous les champs requis sont présents
  return {
    url: metadata.url || '',
    platform: metadata.platform || 'website',
    title: metadata.title || new URL(metadata.url).hostname,
    description: metadata.description || '',
    image: metadata.image || null,
    siteName: metadata.siteName || new URL(metadata.url).hostname.replace('www.', ''),
    author: metadata.author || null,
    text: metadata.text || metadata.description || '',
    // Autres champs spécifiques à la plateforme
    duration: metadata.duration || null,
  };
};