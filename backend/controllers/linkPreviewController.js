// controllers/linkPreviewController.js
const axios = require('axios');
const cheerio = require('cheerio');
const https = require('https');
const { scrapeUrl } = require('./platformScraper');

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
    
    // Première tentative: Utiliser le scraping avancé avec Puppeteer
    try {
      const scrapedData = await scrapeUrl(url);
      
      if (scrapedData) {
        console.log(`[LinkPreview] Données extraites avec succès via Puppeteer pour: ${url}`);
        return res.status(200).json({
          success: true,
          data: scrapedData
        });
      }
    } catch (puppeteerError) {
      console.warn(`[LinkPreview] Échec du scraping avec Puppeteer: ${puppeteerError.message}`);
      // Continuer avec les autres méthodes en cas d'échec
    }
    
    // Deuxième tentative: Utiliser l'extraction simple avec Cheerio
    console.log(`[LinkPreview] Tentative d'extraction simple pour: ${url}`);
    const metadata = await extractMetadata(url);
    
    return res.status(200).json({
      success: true,
      data: metadata
    });
  } catch (error) {
    console.error('[LinkPreview] Erreur lors de l\'extraction des métadonnées:', error.message);
    
    // Fallback: utiliser des métadonnées minimales basées sur l'URL
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
 * Extrait les métadonnées d'une URL en utilisant Cheerio
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

    console.log(`[LinkPreview] Tentative d'extraction HTML pour: ${url}`);
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
        case 'tiktok':
          metadata = extractTiktokMetadata($, metadata);
          break;
        case 'apple_maps':
          metadata = extractAppleMapsMetadata($, metadata, url);
          break;
        // Pas de case default, les métadonnées de base sont déjà définies
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
    
    // Essayer d'extraire l'identifiant du tweet de l'URL
    const tweetIdMatch = metadata.url.match(/(?:twitter|x)\.com\/[^\/]+\/status\/(\d+)/i);
    const tweetId = tweetIdMatch ? tweetIdMatch[1] : null;
    
    // Essayer d'extraire l'identifiant de l'utilisateur
    const userMatch = metadata.url.match(/(?:twitter|x)\.com\/([^\/]+)/i);
    const username = userMatch ? userMatch[1] : null;
    
    // Mettre à jour les métadonnées avec les informations spécifiques à Twitter
    return {
      ...metadata,
      text: tweetText || metadata.description,
      siteName: 'X',
      authorHandle: username,
      tweetId,
      // Utiliser un service d'avatar par défaut pour compléter les informations
      authorImage: username ? `https://unavatar.io/twitter/${username}` : null
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
    let videoId = null;
    const videoIdMatch = url.match(/[?&]v=([^&]+)/i) || url.match(/youtu\.be\/([^?&]+)/i);
    if (videoIdMatch && videoIdMatch[1]) {
      videoId = videoIdMatch[1];
    }
    
    let image = metadata.image;
    if (!image && videoId) {
      image = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
    }
    
    // Mettre à jour les métadonnées avec les informations spécifiques à YouTube
    return {
      ...metadata,
      siteName: 'YouTube',
      author: channelName || metadata.author,
      duration,
      image,
      videoId,
      embedUrl: videoId ? `https://www.youtube.com/embed/${videoId}` : null
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
    // Déterminer le type de contenu Instagram
    const url = metadata.url;
    const isReel = url.includes('/reel/');
    const isPost = url.includes('/p/');
    const isProfile = !isReel && !isPost;
    
    // Essayer d'extraire l'identifiant du post
    let postId = null;
    if (isPost) {
      const postMatch = url.match(/instagram\.com\/p\/([^\/\?]+)/i);
      postId = postMatch ? postMatch[1] : null;
    } else if (isReel) {
      const reelMatch = url.match(/instagram\.com\/reel\/([^\/\?]+)/i);
      postId = reelMatch ? reelMatch[1] : null;
    }
    
    // Essayer d'extraire l'identifiant de l'utilisateur
    const userMatch = url.match(/instagram\.com\/([^\/\?]+)/i);
    const username = userMatch && !userMatch[1].startsWith('p/') && !userMatch[1].startsWith('reel/') 
      ? userMatch[1] 
      : metadata.author;
    
    return {
      ...metadata,
      siteName: 'Instagram',
      username,
      postId,
      contentType: isReel ? 'reel' : isPost ? 'post' : 'profile',
      // Utiliser un service d'avatar par défaut
      authorImage: username ? `https://unavatar.io/instagram/${username}` : null
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
    // Déterminer le type de contenu Facebook
    const url = metadata.url;
    const isPost = url.includes('/posts/') || url.includes('story_fbid=');
    const isProfile = url.includes('profile.php');
    const isPage = !isPost && !isProfile;
    
    // Essayer d'extraire l'identifiant du post
    let postId = null;
    if (isPost) {
      const postMatch = url.match(/\/posts\/(\d+)/i) || url.match(/story_fbid=(\d+)/i);
      postId = postMatch ? postMatch[1] : null;
    }
    
    // Essayer d'extraire l'identifiant ou le nom de l'utilisateur/page
    const userMatch = url.match(/facebook\.com\/([^\/\?]+)/i) || url.match(/fb\.com\/([^\/\?]+)/i);
    const username = userMatch && userMatch[1] !== 'profile.php' ? userMatch[1] : null;
    
    return {
      ...metadata,
      siteName: 'Facebook',
      username,
      postId,
      contentType: isPost ? 'post' : isPage ? 'page' : 'profile',
      // Utiliser un service d'avatar par défaut
      authorImage: username ? `https://unavatar.io/facebook/${username}` : null
    };
  } catch (error) {
    console.log('[LinkPreview] Erreur Facebook:', error.message);
    return metadata;
  }
};

/**
 * Extrait les métadonnées spécifiques à TikTok
 */
const extractTiktokMetadata = ($, metadata) => {
  try {
    // Déterminer le type de contenu TikTok
    const url = metadata.url;
    const isVideo = url.includes('/video/') || url.includes('/t/');
    const isProfile = !isVideo && url.includes('@');
    
    // Essayer d'extraire l'identifiant de la vidéo
    let videoId = null;
    if (isVideo) {
      const videoMatch = url.match(/tiktok\.com\/@[^\/]+\/video\/(\d+)/i) || 
                        url.match(/tiktok\.com\/t\/([^\/\?]+)/i);
      videoId = videoMatch ? videoMatch[1] : null;
    }
    
    // Essayer d'extraire l'identifiant de l'utilisateur
    const userMatch = url.match(/tiktok\.com\/@([^\/\?]+)/i);
    const username = userMatch ? userMatch[1] : null;
    
    return {
      ...metadata,
      siteName: 'TikTok',
      username,
      videoId,
      contentType: isVideo ? 'video' : 'profile',
      // Utiliser un service d'avatar par défaut
      authorImage: username ? `https://unavatar.io/tiktok/${username}` : null
    };
  } catch (error) {
    console.log('[LinkPreview] Erreur TikTok:', error.message);
    return metadata;
  }
};

/**
 * Extrait les métadonnées spécifiques à Apple Maps
 */
const extractAppleMapsMetadata = ($, metadata, url) => {
  try {
    // Extraction directe depuis l'URL car Apple Maps utilise beaucoup les paramètres d'URL
    const latMatch = url.match(/[?&]ll=([^,&]+)/i);
    const lngMatch = url.match(/[?&]ll=[^,&]+,([^&]+)/i);
    const addressMatch = url.match(/[?&]q=([^&]+)/i) || url.match(/[?&]address=([^&]+)/i);
    const nameMatch = url.match(/[?&]t=([^&]+)/i);
    
    let lat = null, lng = null, address = null, locationName = null;
    
    if (latMatch && latMatch[1]) lat = parseFloat(latMatch[1]);
    if (lngMatch && lngMatch[1]) lng = parseFloat(lngMatch[1]);
    
    if (addressMatch && addressMatch[1]) {
      try {
        address = decodeURIComponent(addressMatch[1]).replace(/\+/g, ' ');
      } catch (e) {
        address = addressMatch[1].replace(/\+/g, ' ');
      }
    }
    
    if (nameMatch && nameMatch[1]) {
      try {
        locationName = decodeURIComponent(nameMatch[1]).replace(/\+/g, ' ');
      } catch (e) {
        locationName = nameMatch[1].replace(/\+/g, ' ');
      }
    }
    
    // Si on a des coordonnées, essayons de récupérer une image statique
    let image = metadata.image;
    if (!image && lat !== null && lng !== null) {
      // Utiliser l'API OpenStreetMap pour générer une image statique
      image = `https://staticmap.openstreetmap.de/staticmap.php?center=${lat},${lng}&zoom=15&size=600x400&maptype=mapnik&markers=${lat},${lng},lightblue1`;
    }
    
    return {
      ...metadata,
      siteName: 'Apple Plans',
      address,
      coordinates: (lat !== null && lng !== null) ? { lat, lng } : null,
      locationName,
      image
    };
  } catch (error) {
    console.log('[LinkPreview] Erreur Apple Maps:', error.message);
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
          fallbackData.authorHandle = twitterMatch[1];
          fallbackData.authorImage = `https://unavatar.io/twitter/${twitterMatch[1]}`;
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
          fallbackData.videoId = videoId;
        }
        break;
        
      case 'instagram':
        fallbackData.siteName = 'Instagram';
        
        // Déterminer le type de contenu Instagram
        const isReel = url.includes('/reel/');
        const isPost = url.includes('/p/');
        const isProfile = !isReel && !isPost;
        
        fallbackData.title = isReel ? 'Reels Instagram' : isPost ? 'Post Instagram' : 'Profil Instagram';
        fallbackData.contentType = isReel ? 'reel' : isPost ? 'post' : 'profile';
        
        // Essayer d'extraire l'identifiant de l'utilisateur
        const instaUserMatch = url.match(/instagram\.com\/([^\/\?]+)/i);
        if (instaUserMatch && !instaUserMatch[1].startsWith('p/') && !instaUserMatch[1].startsWith('reel/')) {
          fallbackData.author = instaUserMatch[1];
          fallbackData.username = instaUserMatch[1];
          fallbackData.authorImage = `https://unavatar.io/instagram/${instaUserMatch[1]}`;
        }
        break;
        
      case 'facebook':
        fallbackData.siteName = 'Facebook';
        
        // Déterminer le type de contenu Facebook
        const isFbPost = url.includes('/posts/') || url.includes('story_fbid=');
        const isFbProfile = url.includes('profile.php');
        const isFbPage = !isFbPost && !isFbProfile;
        
        fallbackData.title = isFbPost ? 'Publication Facebook' : isFbPage ? 'Page Facebook' : 'Profil Facebook';
        fallbackData.contentType = isFbPost ? 'post' : isFbPage ? 'page' : 'profile';
        
        // Essayer d'extraire l'identifiant de l'utilisateur/page
        const fbUserMatch = url.match(/facebook\.com\/([^\/\?]+)/i) || url.match(/fb\.com\/([^\/\?]+)/i);
        if (fbUserMatch && fbUserMatch[1] !== 'profile.php') {
          fallbackData.author = fbUserMatch[1];
          fallbackData.username = fbUserMatch[1];
          fallbackData.authorImage = `https://unavatar.io/facebook/${fbUserMatch[1]}`;
        }
        break;
        
      case 'tiktok':
        fallbackData.siteName = 'TikTok';
        
        // Déterminer le type de contenu TikTok
        const isTikTokVideo = url.includes('/video/') || url.includes('/t/');
        
        fallbackData.title = isTikTokVideo ? 'Vidéo TikTok' : 'Profil TikTok';
        fallbackData.contentType = isTikTokVideo ? 'video' : 'profile';
        
        // Essayer d'extraire l'identifiant de l'utilisateur
        const tiktokUserMatch = url.match(/tiktok\.com\/@([^\/\?]+)/i);
        if (tiktokUserMatch) {
          fallbackData.author = tiktokUserMatch[1];
          fallbackData.username = tiktokUserMatch[1];
          fallbackData.authorImage = `https://unavatar.io/tiktok/${tiktokUserMatch[1]}`;
        }
        break;
        
      case 'apple_maps':
        fallbackData.siteName = 'Apple Plans';
        fallbackData.title = 'Localisation';
        
        // Essayer d'extraire les coordonnées et l'adresse
        const latMatch = url.match(/[?&]ll=([^,&]+)/i);
        const lngMatch = url.match(/[?&]ll=[^,&]+,([^&]+)/i);
        const addressMatch = url.match(/[?&]q=([^&]+)/i) || url.match(/[?&]address=([^&]+)/i);
        
        if (latMatch && latMatch[1] && lngMatch && lngMatch[1]) {
          const lat = parseFloat(latMatch[1]);
          const lng = parseFloat(lngMatch[1]);
          
          fallbackData.coordinates = { lat, lng };
          fallbackData.image = `https://staticmap.openstreetmap.de/staticmap.php?center=${lat},${lng}&zoom=15&size=600x400&maptype=mapnik&markers=${lat},${lng},lightblue1`;
        }
        
        if (addressMatch && addressMatch[1]) {
          try {
            fallbackData.address = decodeURIComponent(addressMatch[1]).replace(/\+/g, ' ');
          } catch (e) {
            fallbackData.address = addressMatch[1].replace(/\+/g, ' ');
          }
        }
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
    const cleanedMetadata = {
      url: metadata.url || '',
      platform: metadata.platform || 'website',
      title: metadata.title || domain,
      description: metadata.description || '',
      image: metadata.image || null,
      siteName: metadata.siteName || domain,
      author: metadata.author || null,
      text: metadata.text || metadata.description || '',
    };
    
    // Ajouter les champs spécifiques aux plateformes s'ils existent
    if (metadata.authorHandle) cleanedMetadata.authorHandle = metadata.authorHandle;
    if (metadata.authorImage) cleanedMetadata.authorImage = metadata.authorImage;
    if (metadata.username) cleanedMetadata.username = metadata.username;
    if (metadata.tweetId) cleanedMetadata.tweetId = metadata.tweetId;
    if (metadata.videoId) cleanedMetadata.videoId = metadata.videoId;
    if (metadata.postId) cleanedMetadata.postId = metadata.postId;
    if (metadata.contentType) cleanedMetadata.contentType = metadata.contentType;
    if (metadata.duration) cleanedMetadata.duration = metadata.duration;
    if (metadata.likeCount) cleanedMetadata.likeCount = metadata.likeCount;
    if (metadata.retweetCount) cleanedMetadata.retweetCount = metadata.retweetCount;
    if (metadata.replyCount) cleanedMetadata.replyCount = metadata.replyCount;
    if (metadata.address) cleanedMetadata.address = metadata.address;
    if (metadata.coordinates) cleanedMetadata.coordinates = metadata.coordinates;
    if (metadata.locationName) cleanedMetadata.locationName = metadata.locationName;
    if (metadata.embedUrl) cleanedMetadata.embedUrl = metadata.embedUrl;
    
    return cleanedMetadata;
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