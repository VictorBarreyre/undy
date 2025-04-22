// controllers/sighteningController.js
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

// Configuration de l'API Sightengine
const SIGHTENGINE_CONFIG = {
  apiUser: process.env.SIGHTENGINE_API_USER || 'votre-api-user',
  apiSecret: process.env.SIGHTENGINE_API_SECRET || 'votre-api-secret',
  endpoint: 'https://api.sightengine.com/1.0',
  models: {
    image: 'nudity-2.0,wad,offensive,faces,scam,text-content,face-attributes,gore',
    video: 'nudity-2.0,wad,offensive,gore'
  }
};

// Configuration des seuils de modération
const MODERATION_CONFIG = {
  logViolations: true,           // Journaliser les violations
};

/**
 * Liste de mots à filtrer localement
 */
const OFFENSIVE_WORDS = [
  // Insultes et mots vulgaires en français
  "putain", "merde", "connard", "salope", "enculé", "pédé",
  // Termes haineux ou discriminatoires
  "nègre", "youpin", "bougnoule", "pute", "tapette",
  // Insultes en anglais (pour les utilisateurs internationaux)
  "fuck", "shit", "asshole", "bitch", "cunt", "faggot", "nigger",
];

/**
 * Vérifier localement si le contenu contient des mots offensants
 * @param {string} content - Texte à vérifier
 * @returns {Object} Résultat de la vérification
 */
const checkContentLocally = (content) => {
  if (!content || typeof content !== 'string') {
    return { isFlagged: false, reason: null };
  }

  const lowerContent = content.toLowerCase();
  
  // Recherche des mots offensants
  const foundWords = OFFENSIVE_WORDS.filter(word => 
    lowerContent.includes(word.toLowerCase())
  );

  if (foundWords.length > 0) {
    const result = {
      isFlagged: true,
      reason: 'offensive_language',
      details: {
        flaggedWords: foundWords,
      }
    };
    
    if (MODERATION_CONFIG.logViolations) {
      console.log('[MODERATION] Violation détectée localement:', result);
    }
    
    return result;
  }

  return { isFlagged: false, reason: null };
};

/**
 * Analyse d'une image avec Sightengine 
 * @param {string|Object} imageData - URL, base64 ou objet fichier
 * @returns {Promise<Object>} - Résultat brut de l'API
 */
const analyzeImage = async (imageUrl) => {
  try {
    const params = new URLSearchParams();
    params.append('api_user', SIGHTENGINE_CONFIG.apiUser);
    params.append('api_secret', SIGHTENGINE_CONFIG.apiSecret);
    params.append('url', imageUrl);
    params.append('models', SIGHTENGINE_CONFIG.models.image);

    const response = await axios.get(`${SIGHTENGINE_CONFIG.endpoint}/check.json?${params.toString()}`);
    
    if (!response.data || response.data.status !== 'success') {
      throw new Error('Invalid response from Sightengine API');
    }

    return response.data;
  } catch (error) {
    console.error('[SIGHTENGINE] Erreur lors de l\'analyse de l\'image:', error);
    throw error;
  }
};

/**
 * Analyse d'une image à partir d'un fichier local
 * @param {Object} file - Objet fichier avec chemin
 * @returns {Promise<Object>} - Résultat brut de l'API
 */
const analyzeImageFromFile = async (file) => {
  try {
    const formData = new FormData();
    formData.append('api_user', SIGHTENGINE_CONFIG.apiUser);
    formData.append('api_secret', SIGHTENGINE_CONFIG.apiSecret);
    formData.append('models', SIGHTENGINE_CONFIG.models.image);
    
    // Ajouter le fichier
    formData.append('media', fs.createReadStream(file.path));
    
    const response = await axios.post(
      `${SIGHTENGINE_CONFIG.endpoint}/check.json`, 
      formData, 
      { 
        headers: { 
          ...formData.getHeaders() 
        } 
      }
    );
    
    if (!response.data || response.data.status !== 'success') {
      throw new Error('Invalid response from Sightengine API');
    }

    return response.data;
  } catch (error) {
    console.error('[SIGHTENGINE] Erreur lors de l\'analyse de l\'image depuis un fichier:', error);
    throw error;
  }
};

/**
 * Analyse d'une image à partir de données base64
 * @param {string} base64Image - Image en base64
 * @returns {Promise<Object>} - Résultat brut de l'API
 */
const analyzeImageFromBase64 = async (base64Image) => {
  try {
    // Extraire les données base64 (sans le préfixe data:image/...)
    const base64Data = base64Image.includes('base64,') 
      ? base64Image.split('base64,')[1] 
      : base64Image;
    
    const formData = new FormData();
    formData.append('api_user', SIGHTENGINE_CONFIG.apiUser);
    formData.append('api_secret', SIGHTENGINE_CONFIG.apiSecret);
    formData.append('models', SIGHTENGINE_CONFIG.models.image);
    formData.append('media_base64', base64Data);
    
    const response = await axios.post(
      `${SIGHTENGINE_CONFIG.endpoint}/check.json`, 
      formData,
      {
        headers: {
          ...formData.getHeaders()
        }
      }
    );
    
    if (!response.data || response.data.status !== 'success') {
      throw new Error('Invalid response from Sightengine API');
    }

    return response.data;
  } catch (error) {
    console.error('[SIGHTENGINE] Erreur lors de l\'analyse de l\'image depuis base64:', error);
    throw error;
  }
};

/**
 * Analyser le résultat de modération d'image
 * @param {Object} data - Données de réponse de l'API
 * @returns {Object} - Résultat formaté
 */
const analyzeImageResult = (data) => {
  // Seuils de modération pour différentes catégories
  const thresholds = {
    nudity: 0.6,       // Nudité
    offensive: 0.7,    // Contenu offensant
    gore: 0.5,         // Violence
    weapon: 0.6,       // Armes
    drugs: 0.6,        // Drogues
    alcohol: 0.8,      // Alcool
    gambling: 0.7,     // Jeux d'argent
    face_minor: 0.7,   // Potentiel mineur
  };
  
  // Vérifier si la réponse est valide
  if (!data || data.status !== 'success') {
    return {
      isFlagged: false,
      reason: 'error',
      details: { error: 'Réponse API invalide' }
    };
  }
  
  // Vérifier chaque catégorie par rapport aux seuils configurés
  const flaggedCategories = [];
  
  // Vérifier la nudité
  if (data.nudity && (
    (data.nudity.raw > thresholds.nudity) ||
    (data.nudity.partial > thresholds.nudity) ||
    (data.nudity.safe < (1 - thresholds.nudity))
  )) {
    flaggedCategories.push({
      name: 'nudity',
      score: Math.max(data.nudity.raw, data.nudity.partial)
    });
  }
  
  // Vérifier le contenu offensant
  if (data.offensive && data.offensive.prob > thresholds.offensive) {
    flaggedCategories.push({
      name: 'offensive',
      score: data.offensive.prob
    });
  }
  
  // Vérifier le contenu gore/violent
  if (data.gore && data.gore.prob > thresholds.gore) {
    flaggedCategories.push({
      name: 'gore',
      score: data.gore.prob
    });
  }
  
  // Vérifier les armes, drogues, alcool, jeux d'argent
  if (data.weapon && data.weapon.prob > thresholds.weapon) {
    flaggedCategories.push({
      name: 'weapon',
      score: data.weapon.prob
    });
  }
  
  if (data.drugs && data.drugs.prob > thresholds.drugs) {
    flaggedCategories.push({
      name: 'drugs',
      score: data.drugs.prob
    });
  }
  
  if (data.alcohol && data.alcohol.prob > thresholds.alcohol) {
    flaggedCategories.push({
      name: 'alcohol',
      score: data.alcohol.prob
    });
  }
  
  if (data.gambling && data.gambling.prob > thresholds.gambling) {
    flaggedCategories.push({
      name: 'gambling',
      score: data.gambling.prob
    });
  }
  
  // Vérifier si des mineurs sont potentiellement présents dans l'image
  if (data.faces && data.faces.length > 0) {
    const potentialMinors = data.faces.filter(face => 
      face.attributes && face.attributes.minor && face.attributes.minor.prob > thresholds.face_minor
    );
    
    if (potentialMinors.length > 0) {
      flaggedCategories.push({
        name: 'minor_face',
        score: Math.max(...potentialMinors.map(face => face.attributes.minor.prob))
      });
    }
  }
  
  // Si aucune catégorie n'est signalée, le contenu est approprié
  if (flaggedCategories.length === 0) {
    return {
      isFlagged: false,
      reason: null,
      details: { allScores: data }
    };
  }
  
  // Trouver la catégorie avec le score le plus élevé
  flaggedCategories.sort((a, b) => b.score - a.score);
  const highestCategory = flaggedCategories[0].name;
  
  // Mapper la catégorie Sightengine à un nom plus lisible
  const mappedReason = mapSightengineCategory(highestCategory);
  
  return {
    isFlagged: true,
    reason: mappedReason,
    originalCategory: highestCategory,
    details: {
      flaggedCategories,
      allScores: data
    }
  };
};

/**
 * Mapper les catégories Sightengine vers des raisons plus lisibles
 * @param {string} category - Catégorie Sightengine
 * @returns {string} - Raison lisible
 */
const mapSightengineCategory = (category) => {
  const mapping = {
    'nudity': 'sexual',
    'offensive': 'offensive_content',
    'gore': 'violence',
    'weapon': 'violence',
    'drugs': 'drugs',
    'alcohol': 'alcohol',
    'gambling': 'gambling',
    'minor_face': 'minor_protection'
  };
  
  return mapping[category] || 'inappropriate_content';
};

/**
 * Soumettre une vidéo pour analyse
 * @param {string} videoUrl - URL de la vidéo à analyser
 * @returns {Promise<Object>} - Résultat de la soumission
 */
const submitVideoForAnalysis = async (videoUrl) => {
  try {
    const params = new URLSearchParams();
    params.append('api_user', SIGHTENGINE_CONFIG.apiUser);
    params.append('api_secret', SIGHTENGINE_CONFIG.apiSecret);
    params.append('url', videoUrl);
    params.append('models', SIGHTENGINE_CONFIG.models.video);
    params.append('mode', 'standard');
    
    // URL de callback pour notification quand l'analyse est terminée
    params.append('callback_url', process.env.SIGHTENGINE_CALLBACK_URL || 'https://votre-api.com/webhook/sightengine');
    
    const response = await axios.get(`${SIGHTENGINE_CONFIG.endpoint}/video/check.json?${params.toString()}`);
    
    if (!response.data || !response.data.id) {
      throw new Error('Invalid response from Sightengine video API');
    }

    return response.data;
  } catch (error) {
    console.error('[SIGHTENGINE] Erreur lors de la soumission de la vidéo:', error);
    throw error;
  }
};

/**
 * Vérifier le statut d'une analyse vidéo
 * @param {string} workflowId - ID du workflow d'analyse
 * @returns {Promise<Object>} - Statut actuel de l'analyse
 */
const checkVideoAnalysisStatus = async (workflowId) => {
  try {
    const params = new URLSearchParams();
    params.append('api_user', SIGHTENGINE_CONFIG.apiUser);
    params.append('api_secret', SIGHTENGINE_CONFIG.apiSecret);
    params.append('id', workflowId);
    
    const response = await axios.get(`${SIGHTENGINE_CONFIG.endpoint}/video/check-status.json?${params.toString()}`);
    
    if (!response.data) {
      throw new Error('Invalid response from Sightengine video status API');
    }

    return response.data;
  } catch (error) {
    console.error('[SIGHTENGINE] Erreur lors de la vérification du statut de l\'analyse vidéo:', error);
    throw error;
  }
};

/**
 * Analyser le résultat de modération vidéo
 * @param {Object} data - Données de réponse de l'API
 * @returns {Object} - Résultat formaté
 */
const analyzeVideoResult = (data) => {
  // Seuils de modération pour différentes catégories
  const thresholds = {
    nudity: 0.6,       // Nudité
    offensive: 0.7,    // Contenu offensant
    gore: 0.5,         // Violence
    weapon: 0.6,       // Armes
    drugs: 0.6,        // Drogues
    alcohol: 0.8,      // Alcool
  };
  
  // Vérifier si la réponse est valide
  if (!data || !data.summary) {
    return {
      isFlagged: false,
      reason: 'error',
      details: { error: 'Réponse API invalide' }
    };
  }
  
  const summary = data.summary;
  const flaggedCategories = [];
  
  // Vérifier la nudité
  if (summary.nudity && (
    (summary.nudity.raw > thresholds.nudity) ||
    (summary.nudity.partial > thresholds.nudity)
  )) {
    flaggedCategories.push({
      name: 'nudity',
      score: Math.max(summary.nudity.raw, summary.nudity.partial)
    });
  }
  
  // Vérifier le contenu offensant
  if (summary.offensive && summary.offensive.prob > thresholds.offensive) {
    flaggedCategories.push({
      name: 'offensive',
      score: summary.offensive.prob
    });
  }
  
  // Vérifier le contenu gore/violent
  if (summary.gore && summary.gore.prob > thresholds.gore) {
    flaggedCategories.push({
      name: 'gore',
      score: summary.gore.prob
    });
  }
  
  // Vérifier les armes, drogues, alcool
  if (summary.weapon && summary.weapon.prob > thresholds.weapon) {
    flaggedCategories.push({
      name: 'weapon',
      score: summary.weapon.prob
    });
  }
  
  if (summary.drugs && summary.drugs.prob > thresholds.drugs) {
    flaggedCategories.push({
      name: 'drugs',
      score: summary.drugs.prob
    });
  }
  
  if (summary.alcohol && summary.alcohol.prob > thresholds.alcohol) {
    flaggedCategories.push({
      name: 'alcohol',
      score: summary.alcohol.prob
    });
  }
  
  // Si aucune catégorie n'est signalée, le contenu est approprié
  if (flaggedCategories.length === 0) {
    return {
      isFlagged: false,
      reason: null,
      details: { summary }
    };
  }
  
  // Trouver la catégorie avec le score le plus élevé
  flaggedCategories.sort((a, b) => b.score - a.score);
  const highestCategory = flaggedCategories[0].name;
  
  // Mapper la catégorie Sightengine à un nom plus lisible
  const mappedReason = mapSightengineCategory(highestCategory);
  
  return {
    isFlagged: true,
    reason: mappedReason,
    originalCategory: highestCategory,
    details: {
      flaggedCategories,
      frames: data.frames // Contient les timestamps spécifiques des contenus flaggés
    }
  };
};

/**
 * Contrôleur pour la modération de contenu
 * @param {Object} req - Requête Express
 * @param {Object} res - Réponse Express
 */
const moderateContent = async (req, res) => {
  try {
    const { content } = req.body;
    
    if (!content) {
      return res.status(400).json({
        success: false,
        message: 'Le contenu à modérer est requis'
      });
    }
    
    // Vérification locale (c'est tout ce que nous utilisons pour le texte)
    const localResult = checkContentLocally(content);
    
    // Journaliser les statistiques de modération pour analyse
    if (MODERATION_CONFIG.logViolations) {
      console.log(`[MODERATION STATS] Content: "${content.substring(0, 50)}${content.length > 50 ? '...' : ''}" | Flagged: ${localResult.isFlagged} | Reason: ${localResult.reason || 'None'}`);
    }
    
    return res.status(200).json(localResult);
  } catch (error) {
    console.error('[MODERATION] Erreur de modération:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la modération du contenu',
      error: error.message
    });
  }
};

/**
 * Middleware de modération pour les messages avant leur stockage
 * @param {Object} req - Requête Express
 * @param {Object} res - Réponse Express
 * @param {Function} next - Fonction next d'Express
 */
const moderationMiddleware = async (req, res, next) => {
  try {
    // Extraire le contenu du message selon la route
    let content = '';
    let imageUrl = null;
    let videoUrl = null;
    
    // Vérifier le corps de la requête selon le type de route
    if (req.originalUrl.includes('/messages') && req.body) {
      // Pour les routes de messages
      content = req.body.content || req.body.text || '';
      imageUrl = req.body.image || null;
      videoUrl = req.body.video || null;
    } else if (req.body && req.body.label) {
      // Pour les routes de création de secret
      content = `${req.body.label} ${req.body.content}`;
    }
    
    // Si ni contenu texte ni média, passer au middleware suivant
    if (!content && !imageUrl && !videoUrl) {
      return next();
    }
    
    // Vérification du texte localement
    if (content) {
      try {
        const localResult = checkContentLocally(content);
        
        if (localResult.isFlagged) {
          return res.status(403).json({
            success: false,
            message: 'Contenu texte inapproprié détecté',
            details: localResult
          });
        }
      } catch (error) {
        console.error('[MODERATION] Erreur lors de la vérification du texte:', error);
        // Continuer même en cas d'erreur pour vérifier les médias
      }
    }
    
    // Vérification de l'image si présente
    if (imageUrl) {
      try {
        const imageData = await analyzeImage(imageUrl);
        const imageResult = analyzeImageResult(imageData);
        
        if (imageResult.isFlagged) {
          return res.status(403).json({
            success: false,
            message: 'Contenu image inapproprié détecté',
            details: imageResult
          });
        }
      } catch (error) {
        console.error('[MODERATION] Erreur lors de la vérification de l\'image:', error);
        // En cas d'erreur, on laisse passer (fail open)
      }
    }
    
    // Pour les vidéos, on commence l'analyse mais on ne bloque pas
    if (videoUrl) {
      try {
        const videoSubmission = await submitVideoForAnalysis(videoUrl);
        
        // Ajouter l'ID du workflow à la requête pour utilisation ultérieure
        req.sightengineWorkflowId = videoSubmission.id;
        
        // Journaliser la soumission
        console.log(`[MODERATION] Vidéo soumise pour analyse: ${videoUrl} - Workflow ID: ${videoSubmission.id}`);
      } catch (error) {
        console.error('[MODERATION] Erreur lors de la soumission de la vidéo:', error);
        // Ne pas bloquer en cas d'erreur
      }
    }
    
    // Si toutes les vérifications passent, continuer
    next();
  } catch (error) {
    console.error('[MODERATION MIDDLEWARE] Erreur générale:', error);
    
    // En cas d'erreur dans le middleware, on laisse passer pour éviter de bloquer
    next();
  }
};

// Exporter les fonctions utiles
module.exports = {
  moderateContent,
  moderationMiddleware,
  checkContentLocally,
  analyzeImage,
  analyzeImageFromFile,
  analyzeImageFromBase64,
  analyzeImageResult,
  submitVideoForAnalysis,
  checkVideoAnalysisStatus,
  analyzeVideoResult
};