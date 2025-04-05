// controllers/linkPreviewController.js
const axios = require('axios');
const cheerio = require('cheerio');
const https = require('https');
const { scrapeUrl, detectPlatform } = require('./platformScraper');
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
    console.log(`[LinkPreview] Extraction des métadonnées pour: ${url}`);
    
    // Tenter d'extraire les données avec Puppeteer
    const scrapedData = await scrapeUrl(url);
    
    if (scrapedData) {
      return res.status(200).json({
        success: true,
        data: scrapedData
      });
    }
    
    // Si le scraping échoue, utiliser l'extraction simple
    console.log(`[LinkPreview] Scraping échoué, utilisation de l'extraction simple pour: ${url}`);
    const metadata = await extractMetadata(url);
    
    return res.status(200).json({
      success: true,
      data: metadata
    });
  } catch (error) {
    console.error('[LinkPreview] Erreur lors de l\'extraction des métadonnées:', error.message);
    
    // Essayer de retourner des données minimales basées sur l'URL
    try {
      console.log('[LinkPreview] Utilisation du fallback pour:', url);
      const fallbackData = getFallbackMetadata(url);
      
      return res.status(200).json({
        success: true,
        data: fallbackData,
        warning: 'Données limitées: impossible d\'extraire toutes les métadonnées'
      });
    } catch (fallbackError) {
      console.error('[LinkPreview] Même le fallback a échoué:', fallbackError.message);
      return res.status(200).json({
        success: true,
        data: {
          url,
          platform: 'website',
          title: url,
          description: '',
          image: null,
          siteName: 'Site web',
          author: null,
          text: ''
        },
        error: 'Impossible d\'extraire les métadonnées'
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
  if (!url) return 'website';
  
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
    // Configuration optimisée pour gérer les redirections et les problèmes SSL
    const axiosInstance = axios.create({
      timeout: 15000,  // Timeout augmenté à 15 secondes
      maxRedirects: 10, // Augmenté à 10 redirections max
      validateStatus: status => status >= 200 && status < 500, // Accepter plus de codes de statut
      // Agent HTTPS personnalisé pour ignorer les problèmes de certificat
      httpsAgent: new https.Agent({
        rejectUnauthorized: false // ATTENTION: Ceci désactive la vérification SSL
      }),
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'fr,fr-FR;q=0.8,en-US;q=0.5,en;q=0.3',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
      }
    });

    console.log(`[LinkPreview] Tentative d'extraction pour: ${url}`);
    const response = await axiosInstance.get(url);
    
    // Si le statut n'est pas 200, on utilise la solution de secours
    if (response.status !== 200) {
      console.log(`[LinkPreview] Statut HTTP non 200: ${response.status}`);
      return getFallbackMetadata(url);
    }
    
    const html = response.data;
    
    // Vérifier que le HTML est une chaîne valide
    if (typeof html !== 'string') {
      console.log('[LinkPreview] Réponse HTML non valide, utilisation du fallback');
      return getFallbackMetadata(url);
    }
    
    // Charger le HTML avec Cheerio
    const $ = cheerio.load(html);
    
    // Identifier la plateforme
    const platform = detectPlatform(url);
    console.log(`[LinkPreview] Plateforme détectée: ${platform}`);
    
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
      try {
        const baseUrl = new URL(url).origin;
        metadata.image = new URL(metadata.image, baseUrl).toString();
      } catch (error) {
        console.log('[LinkPreview] Erreur lors de la conversion d\'URL relative:', error.message);
        metadata.image = null;
      }
    }
    
    // Extraction spécifique selon la plateforme
    try {
      switch (platform) {
        case 'twitter':
          metadata = extractTwitterMetadata($, metadata);
          break;
        case 'youtube':
          metadata = extractYoutubeMetadata($, metadata, url);
          break;
        case 'instagram':
          metadata = extractInstagramMetadata($, metadata);
          break;
        case 'facebook':
          metadata = extractFacebookMetadata($, metadata);
          break;
        // Autres cas spécifiques
      }
    } catch (platformError) {
      console.error(`[LinkPreview] Erreur lors de l'extraction spécifique pour ${platform}:`, platformError.message);
      // Continuer avec les métadonnées de base déjà extraites
    }
    
    return cleanupMetadata(metadata);
  } catch (error) {
    console.error('[LinkPreview] Erreur critique lors de l\'extraction:', error.message);
    // En cas d'erreur, utiliser la solution de secours
    return getFallbackMetadata(url);
  }
};

/**
 * Extrait les métadonnées spécifiques à Twitter
 */
const extractTwitterMetadata = ($, metadata) => {
  try {
    // Essayer d'extraire le texte du tweet
    const tweetText = $('meta[property="og:description"]').attr('content') || 
                      $('div[data-testid="tweetText"]').text();
    
    // Mettre à jour les métadonnées avec les informations spécifiques à Twitter
    return {
      ...metadata,
      text: tweetText || metadata.description,
      siteName: 'X',
    };
  } catch (error) {
    console.log('[LinkPreview] Erreur Twitter:', error.message);
    return metadata;
  }
};

/**
 * Extrait les métadonnées spécifiques à YouTube
 */
const extractYoutubeMetadata = ($, metadata, url) => {
  try {
    // Essayer d'extraire des informations supplémentaires sur la vidéo
    const duration = $('meta[itemprop="duration"]').attr('content') || null;
    const channelName = $('meta[itemprop="channelName"]').attr('content') || 
                       $('link[itemprop="name"]').attr('content') || null;
    
    // Essayer d'extraire l'ID de la vidéo pour une image de qualité
    let image = metadata.image;
    if (!image) {
      const videoIdMatch = url.match(/[?&]v=([^&]+)/i) || url.match(/youtu\.be\/([^?&]+)/i);
      if (videoIdMatch && videoIdMatch[1]) {
        const videoId = videoIdMatch[1];
        image = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
      }
    }
    
    // Mettre à jour les métadonnées avec les informations spécifiques à YouTube
    return {
      ...metadata,
      siteName: 'YouTube',
      author: channelName || metadata.author,
      duration,
      image
    };
  } catch (error) {
    console.log('[LinkPreview] Erreur YouTube:', error.message);
    return metadata;
  }
};

/**
 * Extrait les métadonnées spécifiques à Instagram
 */
const extractInstagramMetadata = ($, metadata) => {
  try {
    return {
      ...metadata,
      siteName: 'Instagram',
    };
  } catch (error) {
    console.log('[LinkPreview] Erreur Instagram:', error.message);
    return metadata;
  }
};

/**
 * Extrait les métadonnées spécifiques à Facebook
 */
const extractFacebookMetadata = ($, metadata) => {
  try {
    return {
      ...metadata,
      siteName: 'Facebook',
    };
  } catch (error) {
    console.log('[LinkPreview] Erreur Facebook:', error.message);
    return metadata;
  }
};

/**
 * Créer des métadonnées de secours basées sur l'URL
 * Utilisé lorsque l'extraction complète échoue
 */
const getFallbackMetadata = (url) => {
  try {
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
          fallbackData.image = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
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
  } catch (error) {
    console.error('[LinkPreview] Erreur fallback:', error.message);
    // Métadonnées minimales en cas d'erreur critique
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
 * Nettoie et valide les métadonnées pour s'assurer qu'elles sont complètes et cohérentes
 */
const cleanupMetadata = (metadata) => {
  try {
    // Récupérer le domaine pour les valeurs par défaut
    let domain = '';
    try {
      domain = new URL(metadata.url).hostname.replace('www.', '');
    } catch (e) {
      domain = 'site web';
    }
    
    // S'assurer que tous les champs requis sont présents
    return {
      url: metadata.url || '',
      platform: metadata.platform || 'website',
      title: metadata.title || domain,
      description: metadata.description || '',
      image: metadata.image || null,
      siteName: metadata.siteName || domain,
      author: metadata.author || null,
      text: metadata.text || metadata.description || '',
      // Autres champs spécifiques à la plateforme
      duration: metadata.duration || null,
    };
  } catch (error) {
    console.error('[LinkPreview] Erreur lors du nettoyage des métadonnées:', error.message);
    // En cas d'erreur, renvoyer au moins les données de base
    return {
      url: metadata.url || '',
      platform: metadata.platform || 'website',
      title: metadata.title || 'Site web',
      description: metadata.description || '',
      image: metadata.image || null,
      siteName: metadata.siteName || 'Site web',
      author: null,
      text: ''
    };
  }
};  