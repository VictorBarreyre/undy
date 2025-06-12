// controllers/moderationController.js
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

// Configuration de l'API Sightengine depuis les variables d'environnement
const SIGHTENGINE_CONFIG = {
  apiUser: process.env.SIGHTENGINE_API_USER,
  apiSecret: process.env.SIGHTENGINE_API_SECRET,
  endpoint: 'https://api.sightengine.com/1.0',
  models: {
    image: 'nudity-2.0,wad,offensive,faces,scam,text-content,face-attributes,gore',
    video: 'nudity-2.0,wad,offensive,gore'
  }
};


// Configuration des seuils de modération depuis les variables d'environnement
const MODERATION_CONFIG = {
  // Configuration générale
  failOpen: process.env.MODERATION_FAIL_OPEN === 'true' || false,
  logViolations: process.env.MODERATION_LOG_VIOLATIONS !== 'false', // true par défaut
  
  // Seuils de modération (avec valeurs par défaut si non définies)
  thresholds: {
    nudity: parseFloat(process.env.MODERATION_THRESHOLD_NUDITY) || 0.6,
    offensive: parseFloat(process.env.MODERATION_THRESHOLD_OFFENSIVE) || 0.7,
    gore: parseFloat(process.env.MODERATION_THRESHOLD_GORE) || 0.5,
    violence: parseFloat(process.env.MODERATION_THRESHOLD_VIOLENCE) || 0.5,
    weapon: parseFloat(process.env.MODERATION_THRESHOLD_WEAPON) || 0.6,
    drugs: parseFloat(process.env.MODERATION_THRESHOLD_DRUGS) || 0.6,
    alcohol: parseFloat(process.env.MODERATION_THRESHOLD_ALCOHOL) || 0.8,
    gambling: parseFloat(process.env.MODERATION_THRESHOLD_GAMBLING) || 0.7,
    face_minor: parseFloat(process.env.MODERATION_THRESHOLD_MINOR) || 0.7,
  }
};

// Vérifier que les clés API sont configurées
if (!SIGHTENGINE_CONFIG.apiUser || !SIGHTENGINE_CONFIG.apiSecret) {
  console.error('❌ ERREUR: Les clés API Sightengine ne sont pas configurées!');
  console.error('Veuillez définir SIGHTENGINE_API_USER et SIGHTENGINE_API_SECRET dans votre fichier .env');
}

// Logger la configuration au démarrage
console.log('🔧 Configuration de modération:', {
  failOpen: MODERATION_CONFIG.failOpen,
  logViolations: MODERATION_CONFIG.logViolations,
  thresholds: MODERATION_CONFIG.thresholds,
  sightengineConfigured: !!(SIGHTENGINE_CONFIG.apiUser && SIGHTENGINE_CONFIG.apiSecret)
});

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
    if (!SIGHTENGINE_CONFIG.apiUser || !SIGHTENGINE_CONFIG.apiSecret) {
      throw new Error('Clés API Sightengine non configurées');
    }

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
    if (!SIGHTENGINE_CONFIG.apiUser || !SIGHTENGINE_CONFIG.apiSecret) {
      throw new Error('Clés API Sightengine non configurées');
    }

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
    if (!SIGHTENGINE_CONFIG.apiUser || !SIGHTENGINE_CONFIG.apiSecret) {
      throw new Error('Clés API Sightengine non configurées');
    }

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
  // Utiliser les seuils configurés
  const thresholds = MODERATION_CONFIG.thresholds;
  
  // Vérifier si la réponse est valide
  if (!data || data.status !== 'success') {
    return {
      isFlagged: false,
      reason: 'error',
      details: { error: 'Réponse API invalide' }
    };
  }
  
  // Log des scores si activé
  if (MODERATION_CONFIG.logViolations) {
    console.log('[SIGHTENGINE] Scores détaillés:', {
      nudity: data.nudity,
      offensive: data.offensive?.prob,
      gore: data.gore?.prob,
      weapon: data.weapon?.prob,
      drugs: data.drugs?.prob,
      alcohol: data.alcohol?.prob,
      gambling: data.gambling?.prob
    });
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
      score: Math.max(data.nudity.raw || 0, data.nudity.partial || 0),
      threshold: thresholds.nudity
    });
  }
  
  // Vérifier le contenu offensant
  if (data.offensive && data.offensive.prob > thresholds.offensive) {
    flaggedCategories.push({
      name: 'offensive',
      score: data.offensive.prob,
      threshold: thresholds.offensive
    });
  }
  
  // Vérifier le contenu gore/violent
  if (data.gore && data.gore.prob > thresholds.gore) {
    flaggedCategories.push({
      name: 'gore',
      score: data.gore.prob,
      threshold: thresholds.gore
    });
  }
  
  // Vérifier les armes
  if (data.weapon && data.weapon.prob > thresholds.weapon) {
    flaggedCategories.push({
      name: 'weapon',
      score: data.weapon.prob,
      threshold: thresholds.weapon
    });
  }
  
  // Vérifier les drogues
  if (data.drugs && data.drugs.prob > thresholds.drugs) {
    flaggedCategories.push({
      name: 'drugs',
      score: data.drugs.prob,
      threshold: thresholds.drugs
    });
  }
  
  // Vérifier l'alcool
  if (data.alcohol && data.alcohol.prob > thresholds.alcohol) {
    flaggedCategories.push({
      name: 'alcohol',
      score: data.alcohol.prob,
      threshold: thresholds.alcohol
    });
  }
  
  // Vérifier les jeux d'argent
  if (data.gambling && data.gambling.prob > thresholds.gambling) {
    flaggedCategories.push({
      name: 'gambling',
      score: data.gambling.prob,
      threshold: thresholds.gambling
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
        score: Math.max(...potentialMinors.map(face => face.attributes.minor.prob)),
        threshold: thresholds.face_minor
      });
    }
  }
  
  // Si aucune catégorie n'est signalée, le contenu est approprié
  if (flaggedCategories.length === 0) {
    return {
      isFlagged: false,
      reason: null,
      details: { 
        allScores: data,
        thresholdsUsed: thresholds
      }
    };
  }
  
  // Trouver la catégorie avec le score le plus élevé
  flaggedCategories.sort((a, b) => b.score - a.score);
  const highestCategory = flaggedCategories[0].name;
  
  // Mapper la catégorie Sightengine à un nom plus lisible
  const mappedReason = mapSightengineCategory(highestCategory);
  
  // Logger si activé
  if (MODERATION_CONFIG.logViolations) {
    console.log('[SIGHTENGINE] Contenu signalé:', {
      reason: mappedReason,
      flaggedCategories,
      thresholds
    });
  }
  
  return {
    isFlagged: true,
    reason: mappedReason,
    originalCategory: highestCategory,
    details: {
      flaggedCategories,
      allScores: data,
      thresholdsUsed: thresholds
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
    if (!SIGHTENGINE_CONFIG.apiUser || !SIGHTENGINE_CONFIG.apiSecret) {
      throw new Error('Clés API Sightengine non configurées');
    }

    const params = new URLSearchParams();
    params.append('api_user', SIGHTENGINE_CONFIG.apiUser);
    params.append('api_secret', SIGHTENGINE_CONFIG.apiSecret);
    params.append('url', videoUrl);
    params.append('models', SIGHTENGINE_CONFIG.models.video);
    params.append('mode', 'standard');
    
    // URL de callback pour notification quand l'analyse est terminée (si configurée)
    if (process.env.SIGHTENGINE_CALLBACK_URL) {
      params.append('callback_url', process.env.SIGHTENGINE_CALLBACK_URL);
    }
    
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
    if (!SIGHTENGINE_CONFIG.apiUser || !SIGHTENGINE_CONFIG.apiSecret) {
      throw new Error('Clés API Sightengine non configurées');
    }

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
  // Utiliser les seuils configurés
  const thresholds = MODERATION_CONFIG.thresholds;
  
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
      score: Math.max(summary.nudity.raw || 0, summary.nudity.partial || 0),
      threshold: thresholds.nudity
    });
  }
  
  // Vérifier le contenu offensant
  if (summary.offensive && summary.offensive.prob > thresholds.offensive) {
    flaggedCategories.push({
      name: 'offensive',
      score: summary.offensive.prob,
      threshold: thresholds.offensive
    });
  }
  
  // Vérifier le contenu gore/violent
  if (summary.gore && summary.gore.prob > thresholds.gore) {
    flaggedCategories.push({
      name: 'gore',
      score: summary.gore.prob,
      threshold: thresholds.gore
    });
  }
  
  // Vérifier les armes
  if (summary.weapon && summary.weapon.prob > thresholds.weapon) {
    flaggedCategories.push({
      name: 'weapon',
      score: summary.weapon.prob,
      threshold: thresholds.weapon
    });
  }
  
  // Vérifier les drogues
  if (summary.drugs && summary.drugs.prob > thresholds.drugs) {
    flaggedCategories.push({
      name: 'drugs',
      score: summary.drugs.prob,
      threshold: thresholds.drugs
    });
  }
  
  // Vérifier l'alcool
  if (summary.alcohol && summary.alcohol.prob > thresholds.alcohol) {
    flaggedCategories.push({
      name: 'alcohol',
      score: summary.alcohol.prob,
      threshold: thresholds.alcohol
    });
  }
  
  // Si aucune catégorie n'est signalée, le contenu est approprié
  if (flaggedCategories.length === 0) {
    return {
      isFlagged: false,
      reason: null,
      details: { 
        summary,
        thresholdsUsed: thresholds
      }
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
      frames: data.frames, // Contient les timestamps spécifiques des contenus flaggés
      thresholdsUsed: thresholds
    }
  };
};

/**
 * Contrôleur pour la modération de contenu texte
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
 * Contrôleur pour la modération d'images
 * @param {Object} req - Requête Express
 * @param {Object} res - Réponse Express
 */
const moderateImage = async (req, res) => {
  try {
    let imageData;
    
    // Déterminer la source de l'image
    if (req.file) {
      // Image téléchargée via multer
      imageData = await analyzeImageFromFile(req.file);
    } else if (req.body.url) {
      // URL d'image fournie
      imageData = await analyzeImage(req.body.url);
    } else if (req.body.image && typeof req.body.image === 'string' && req.body.image.startsWith('data:image/')) {
      // Image en base64
      imageData = await analyzeImageFromBase64(req.body.image);
    } else {
      return res.status(400).json({
        success: false,
        message: 'Aucune image valide fournie. Veuillez fournir un fichier, une URL ou une image en base64.'
      });
    }
    
    // Analyser le résultat
    const result = analyzeImageResult(imageData);
    
    // Journaliser si nécessaire
    if (MODERATION_CONFIG.logViolations && result.isFlagged) {
      console.log('[MODERATION] Image signalée:', result);
    }
    
    return res.status(200).json(result);
  } catch (error) {
    console.error('[MODERATION] Erreur lors de la modération de l\'image:', error);
    
    // Gestion d'erreur selon la configuration
    if (MODERATION_CONFIG.failOpen) {
      // Mode fail-open: permettre en cas d'erreur
      return res.status(200).json({
        isFlagged: false,
        reason: null,
        error: 'Modération échouée - contenu autorisé par défaut',
        failOpen: true
      });
    } else {
      // Mode fail-closed: bloquer en cas d'erreur
      return res.status(503).json({
        success: false,
        message: 'Service de modération temporairement indisponible',
        error: error.message
      });
    }
  }
};

/**
 * Contrôleur pour soumettre une vidéo à la modération
 * @param {Object} req - Requête Express
 * @param {Object} res - Réponse Express
 */
const submitVideoForModeration = async (req, res) => {
  try {
    let videoUrl;
    
    // Déterminer la source de la vidéo
    if (req.file) {
      // Vidéo téléchargée via multer
      // Ici, vous devriez probablement téléverser le fichier vers un service de stockage
      // et obtenir une URL accessible, car Sightengine nécessite une URL publique
      // Pour cet exemple, supposons que vous avez une fonction uploadToStorage
      // videoUrl = await uploadToStorage(req.file);
      
      // Pour cet exemple, nous allons simplement retourner une erreur
      return res.status(400).json({
        success: false,
        message: 'Le téléchargement direct de vidéos n\'est pas pris en charge. Veuillez fournir une URL vidéo.'
      });
    } else if (req.body.url) {
      // URL vidéo fournie
      videoUrl = req.body.url;
    } else {
      return res.status(400).json({
        success: false,
        message: 'Aucune vidéo valide fournie. Veuillez fournir une URL vidéo.'
      });
    }
    
    // Soumettre la vidéo pour analyse
    const submissionResult = await submitVideoForAnalysis(videoUrl);
    
    // Journaliser la soumission
    console.log(`[MODERATION] Vidéo soumise pour analyse: ${videoUrl} - Workflow ID: ${submissionResult.id}`);
    
    return res.status(200).json({
      success: true,
      message: 'Vidéo soumise pour analyse',
      workflowId: submissionResult.id,
      status: 'pending'
    });
  } catch (error) {
    console.error('[MODERATION] Erreur lors de la soumission de la vidéo:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la soumission de la vidéo',
      error: error.message
    });
  }
};

/**
 * Contrôleur pour vérifier le statut d'une modération vidéo
 * @param {Object} req - Requête Express
 * @param {Object} res - Réponse Express
 */
const checkVideoModerationStatus = async (req, res) => {
  try {
    const { workflowId } = req.params;
    
    if (!workflowId) {
      return res.status(400).json({
        success: false,
        message: 'ID de workflow requis'
      });
    }
    
    // Vérifier le statut
    const statusResult = await checkVideoAnalysisStatus(workflowId);
    
    // Si l'analyse est terminée, analyser les résultats
    if (statusResult.status === 'finished') {
      const analysisResult = analyzeVideoResult(statusResult);
      
      // Journaliser si nécessaire
      if (MODERATION_CONFIG.logViolations && analysisResult.isFlagged) {
        console.log('[MODERATION] Vidéo signalée:', analysisResult);
      }
      
      return res.status(200).json({
        ...analysisResult,
        workflowId,
        status: 'completed'
      });
    }
    
    // Sinon, retourner le statut actuel
    return res.status(200).json({
      success: true,
      workflowId,
      status: statusResult.status,
      progress: statusResult.progress || 0
    });
  } catch (error) {
    console.error('[MODERATION] Erreur lors de la vérification du statut de modération vidéo:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la vérification du statut de modération vidéo',
      error: error.message
    });
  }
};

/**
 * Obtenir la configuration actuelle de modération
 */
const getModerationConfig = (req, res) => {
  res.status(200).json({
    success: true,
    config: {
      failOpen: MODERATION_CONFIG.failOpen,
      logViolations: MODERATION_CONFIG.logViolations,
      thresholds: MODERATION_CONFIG.thresholds,
      sightengineConfigured: !!(SIGHTENGINE_CONFIG.apiUser && SIGHTENGINE_CONFIG.apiSecret)
    }
  });
};

// Exporter les fonctions utiles
module.exports = {
  moderateContent,
  moderateImage,
  submitVideoForModeration,
  checkVideoModerationStatus,
  getModerationConfig,
  checkContentLocally,
  analyzeImage,
  analyzeImageFromFile,
  analyzeImageFromBase64,
  analyzeImageResult,
  submitVideoForAnalysis,
  checkVideoAnalysisStatus,
  analyzeVideoResult,
  // Exporter aussi la configuration pour utilisation dans d'autres modules
  MODERATION_CONFIG
};