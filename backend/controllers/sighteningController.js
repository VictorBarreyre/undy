// controllers/sightengineController.js

const fetch = require('node-fetch');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

// Configuration de l'API Sightengine
const SIGHTENGINE_CONFIG = {
  apiUser: process.env.SIGHTENGINE_API_USER || 'votre-api-user',
  apiSecret: process.env.SIGHTENGINE_API_SECRET || 'votre-api-secret',
  endpoint: 'https://api.sightengine.com/1.0',
  models: {
    image: 'nudity-2.0,wad,offensive,faces,scam,text-content,face-attributes,gore',
    video: 'nudity-2.0,wad,offensive,gore'
  },
  // Seuils de modération
  thresholds: {
    nudity: 0.6,              // Nudité
    offensive: 0.7,           // Contenu offensant
    gore: 0.5,                // Contenu violent/sanglant
    drugsParaph: 0.6,         // Drogues/paraphernalia
    alcohol: 0.8,             // Alcool (moins strict)
    gambling: 0.7,            // Jeux d'argent
    weapons: 0.6,             // Armes
    text_advertisement: 0.8,  // Publicité dans le texte
    text_profanity: 0.7,      // Grossièretés dans le texte
    scam: 0.6,                // Arnaque
    qrcode: 1.0,              // QR codes
    face_minor: 0.7,          // Potentiel mineur
  }
};

/**
 * Analyser une image avec Sightengine
 * @param {string} imageUrl - URL de l'image à analyser
 * @returns {Promise<Object>} - Résultat de l'analyse
 */
const analyzeImage = async (imageUrl) => {
  try {
    const params = new URLSearchParams();
    params.append('api_user', SIGHTENGINE_CONFIG.apiUser);
    params.append('api_secret', SIGHTENGINE_CONFIG.apiSecret);
    params.append('url', imageUrl);
    params.append('models', SIGHTENGINE_CONFIG.models.image);

    const response = await fetch(`${SIGHTENGINE_CONFIG.endpoint}/check.json?${params.toString()}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Sightengine API request failed: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Erreur lors de l\'analyse de l\'image:', error);
    throw error;
  }
};

/**
 * Analyser une image à partir d'un fichier local
 * @param {Object} file - Fichier uploadé
 * @returns {Promise<Object>} - Résultat de l'analyse
 */
const analyzeImageFromFile = async (file) => {
  try {
    const formData = new FormData();
    formData.append('api_user', SIGHTENGINE_CONFIG.apiUser);
    formData.append('api_secret', SIGHTENGINE_CONFIG.apiSecret);
    formData.append('models', SIGHTENGINE_CONFIG.models.image);
    
    // Ajouter le fichier
    formData.append('media', fs.createReadStream(file.path));
    
    const response = await fetch(`${SIGHTENGINE_CONFIG.endpoint}/check.json`, {
      method: 'POST',
      body: formData
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Sightengine API request failed: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Erreur lors de l\'analyse de l\'image depuis un fichier:', error);
    throw error;
  }
};

/**
 * Analyser une image à partir de données base64
 * @param {string} base64Image - Image en base64
 * @returns {Promise<Object>} - Résultat de l'analyse
 */
const analyzeImageFromBase64 = async (base64Image) => {
  try {
    // Extraire uniquement les données base64 (sans le préfixe data:image/...)
    const base64Data = base64Image.includes('base64,') 
      ? base64Image.split('base64,')[1] 
      : base64Image;
    
    const formData = new FormData();
    formData.append('api_user', SIGHTENGINE_CONFIG.apiUser);
    formData.append('api_secret', SIGHTENGINE_CONFIG.apiSecret);
    formData.append('models', SIGHTENGINE_CONFIG.models.image);
    formData.append('media_base64', base64Data);
    
    const response = await fetch(`${SIGHTENGINE_CONFIG.endpoint}/check.json`, {
      method: 'POST',
      body: formData
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Sightengine API request failed: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Erreur lors de l\'analyse de l\'image depuis base64:', error);
    throw error;
  }
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
    
    const response = await fetch(`${SIGHTENGINE_CONFIG.endpoint}/video/check.json?${params.toString()}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Sightengine video API request failed: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Erreur lors de la soumission de la vidéo:', error);
    throw error;
  }
};

/**
 * Soumettre une vidéo à partir d'un fichier local
 * @param {Object} file - Fichier vidéo uploadé
 * @returns {Promise<Object>} - Résultat de la soumission
 */
const submitVideoFromFile = async (file) => {
  try {
    const formData = new FormData();
    formData.append('api_user', SIGHTENGINE_CONFIG.apiUser);
    formData.append('api_secret', SIGHTENGINE_CONFIG.apiSecret);
    formData.append('models', SIGHTENGINE_CONFIG.models.video);
    formData.append('mode', 'standard');
    
    // URL de callback pour notification quand l'analyse est terminée
    formData.append('callback_url', process.env.SIGHTENGINE_CALLBACK_URL || 'https://votre-api.com/webhook/sightengine');
    
    // Ajouter le fichier
    formData.append('media', fs.createReadStream(file.path));
    
    const response = await fetch(`${SIGHTENGINE_CONFIG.endpoint}/video/check.json`, {
      method: 'POST',
      body: formData
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Sightengine video API request failed: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Erreur lors de la soumission de la vidéo depuis un fichier:', error);
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
    
    const response = await fetch(`${SIGHTENGINE_CONFIG.endpoint}/video/check-status.json?${params.toString()}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Sightengine video status API request failed: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Erreur lors de la vérification du statut de l\'analyse vidéo:', error);
    throw error;
  }
};

/**
 * Analyser le résultat de modération d'image
 * @param {Object} data - Données de réponse de l'API
 * @returns {Object} - Résultat formaté
 */
const analyzeImageResult = (data) => {
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
    (data.nudity.raw > SIGHTENGINE_CONFIG.thresholds.nudity) ||
    (data.nudity.partial > SIGHTENGINE_CONFIG.thresholds.nudity) ||
    (data.nudity.safe < (1 - SIGHTENGINE_CONFIG.thresholds.nudity))
  )) {
    flaggedCategories.push({
      name: 'nudity',
      score: Math.max(data.nudity.raw, data.nudity.partial)
    });
  }
  
  // Vérifier le contenu offensant
  if (data.offensive && data.offensive.prob > SIGHTENGINE_CONFIG.thresholds.offensive) {
    flaggedCategories.push({
      name: 'offensive',
      score: data.offensive.prob
    });
  }
  
  // Vérifier le contenu gore/violent
  if (data.gore && data.gore.prob > SIGHTENGINE_CONFIG.thresholds.gore) {
    flaggedCategories.push({
      name: 'gore',
      score: data.gore.prob
    });
  }
  
  // Vérifier les armes, drogues, alcool, jeux d'argent
  if (data.weapon && data.weapon.prob > SIGHTENGINE_CONFIG.thresholds.weapons) {
    flaggedCategories.push({
      name: 'weapon',
      score: data.weapon.prob
    });
  }
  
  if (data.drugs && data.drugs.prob > SIGHTENGINE_CONFIG.thresholds.drugsParaph) {
    flaggedCategories.push({
      name: 'drugs',
      score: data.drugs.prob
    });
  }
  
  if (data.alcohol && data.alcohol.prob > SIGHTENGINE_CONFIG.thresholds.alcohol) {
    flaggedCategories.push({
      name: 'alcohol',
      score: data.alcohol.prob
    });
  }
  
  if (data.gambling && data.gambling.prob > SIGHTENGINE_CONFIG.thresholds.gambling) {
    flaggedCategories.push({
      name: 'gambling',
      score: data.gambling.prob
    });
  }
  
  // Vérifier si des mineurs sont potentiellement présents dans l'image
  if (data.faces && data.faces.length > 0) {
    const potentialMinors = data.faces.filter(face => 
      face.attributes && face.attributes.minor && face.attributes.minor.prob > SIGHTENGINE_CONFIG.thresholds.face_minor
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
 * Analyser le résultat de modération vidéo
 * @param {Object} data - Données de réponse de l'API
 * @returns {Object} - Résultat formaté
 */
const analyzeVideoResult = (data) => {
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
    (summary.nudity.raw > SIGHTENGINE_CONFIG.thresholds.nudity) ||
    (summary.nudity.partial > SIGHTENGINE_CONFIG.thresholds.nudity)
  )) {
    flaggedCategories.push({
      name: 'nudity',
      score: Math.max(summary.nudity.raw, summary.nudity.partial)
    });
  }
  
  // Vérifier le contenu offensant
  if (summary.offensive && summary.offensive.prob > SIGHTENGINE_CONFIG.thresholds.offensive) {
    flaggedCategories.push({
      name: 'offensive',
      score: summary.offensive.prob
    });
  }
  
  // Vérifier le contenu gore/violent
  if (summary.gore && summary.gore.prob > SIGHTENGINE_CONFIG.thresholds.gore) {
    flaggedCategories.push({
      name: 'gore',
      score: summary.gore.prob
    });
  }
  
  // Vérifier les armes, drogues, alcool
  if (summary.weapon && summary.weapon.prob > SIGHTENGINE_CONFIG.thresholds.weapons) {
    flaggedCategories.push({
      name: 'weapon',
      score: summary.weapon.prob
    });
  }
  
  if (summary.drugs && summary.drugs.prob > SIGHTENGINE_CONFIG.thresholds.drugsParaph) {
    flaggedCategories.push({
      name: 'drugs',
      score: summary.drugs.prob
    });
  }
  
  if (summary.alcohol && summary.alcohol.prob > SIGHTENGINE_CONFIG.thresholds.alcohol) {
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
 * Route de webhook pour recevoir les notifications de modération vidéo terminée
 * @param {Object} req - Requête Express
 * @param {Object} res - Réponse Express
 */
exports.sightengineWebhook = async (req, res) => {
  try {
    const { id, status } = req.body;
    
    if (!id || status !== 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Données webhook incomplètes ou statut non terminé'
      });
    }
    
    // Récupérer les détails complets de l'analyse
    const videoAnalysis = await checkVideoAnalysisStatus(id);
    
    // Analyser le résultat
    const result = analyzeVideoResult(videoAnalysis);
    
    // Si le contenu est inapproprié, notifier ou prendre des mesures
    if (result.isFlagged) {
      console.log(`[MODERATION] Vidéo avec workflow ID ${id} signalée comme inappropriée:`, result);
      
      // Ici, vous pourriez implémenter une logique pour:
      // 1. Supprimer automatiquement le message contenant cette vidéo
      // 2. Notifier l'utilisateur
      // 3. Notifier les administrateurs
      // 4. Enregistrer l'incident dans une base de données
      
      // Exemple: Supprimer le message (vous devez adapter ceci à votre modèle de données)
      // await Message.findOneAndUpdate({ 'sightengineWorkflowId': id }, { isHidden: true, moderationReason: result.reason });
    }
    
    res.status(200).json({
      success: true,
      message: 'Notification Sightengine traitée avec succès',
      isFlagged: result.isFlagged,
      reason: result.reason
    });
  } catch (error) {
    console.error('[SIGHTENGINE WEBHOOK] Erreur:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors du traitement de la notification Sightengine',
      error: error.message
    });
  }
};

/**
 * Contrôleur pour modérer une image
 * @param {Object} req - Requête Express
 * @param {Object} res - Réponse Express
 */
exports.moderateImage = async (req, res) => {
  try {
    const { imageUrl, imageBase64 } = req.body;
    
    if (!imageUrl && !imageBase64 && !req.file) {
      return res.status(400).json({
        success: false,
        message: 'URL d\'image, données base64 ou fichier requis'
      });
    }
    
    let result;
    
    // Traitement selon le type d'entrée
    if (imageUrl) {
      const data = await analyzeImage(imageUrl);
      result = analyzeImageResult(data);
    } else if (imageBase64) {
      const data = await analyzeImageFromBase64(imageBase64);
      result = analyzeImageResult(data);
    } else if (req.file) {
      const data = await analyzeImageFromFile(req.file);
      result = analyzeImageResult(data);
    }
    
    res.status(200).json(result);
  } catch (error) {
    console.error('[MODERATION] Erreur lors de la modération de l\'image:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la modération de l\'image',
      error: error.message
    });
  }
};

/**
 * Contrôleur pour soumettre une vidéo à la modération
 * @param {Object} req - Requête Express
 * @param {Object} res - Réponse Express
 */
exports.submitVideoModeration = async (req, res) => {
  try {
    const { videoUrl } = req.body;
    
    if (!videoUrl && !req.file) {
      return res.status(400).json({
        success: false,
        message: 'URL de vidéo ou fichier requis'
      });
    }
    
    let result;
    
    // Traitement selon le type d'entrée
    if (videoUrl) {
      result = await submitVideoForAnalysis(videoUrl);
    } else if (req.file) {
      result = await submitVideoFromFile(req.file);
    }
    
    res.status(200).json({
      success: true,
      workflowId: result.id,
      status: 'pending',
      message: 'Vidéo soumise pour modération'
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
exports.checkVideoModerationStatus = async (req, res) => {
  try {
    const { workflowId } = req.params;
    
    if (!workflowId) {
      return res.status(400).json({
        success: false,
        message: 'ID de workflow requis'
      });
    }
    
    const statusData = await checkVideoAnalysisStatus(workflowId);
    
    // Si l'analyse est terminée, fournir les résultats détaillés
    if (statusData.status === 'completed') {
      const result = analyzeVideoResult(statusData);
      return res.status(200).json({
        success: true,
        status: 'completed',
        ...result
      });
    }
    
    // Sinon, retourner les informations de progression
    res.status(200).json({
      success: true,
      status: statusData.status,
      progress: statusData.progress || 0,
      message: 'Modération vidéo en cours'
    });
  } catch (error) {
    console.error('[MODERATION] Erreur lors de la vérification du statut de modération vidéo:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la vérification du statut',
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
exports.moderationMiddleware = async (req, res, next) => {
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
    
    // Vérification du texte par l'API de modération de texte existante
    // (Nous considérons ici que moderationController est déjà importé)
    if (content) {
      try {
        const textResult = await require('./sighteningController').checkContentWithPerspective(content);
        
        if (textResult.isFlagged) {
          return res.status(403).json({
            success: false,
            message: 'Contenu texte inapproprié détecté',
            details: textResult
          });
        }
      } catch (error) {
        console.error('[MODERATION] Erreur lors de la vérification du texte:', error);
        // Continuer même en cas d'erreur de modération texte pour vérifier les médias
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
    // puisque c'est asynchrone - noter l'ID du workflow pour suivi ultérieur
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
    
    // En cas d'erreur dans le middleware, on peut soit bloquer, soit laisser passer
    // Ici on laisse passer pour éviter de bloquer les communications en cas de problème technique
    next();
  }
};

module.exports = {
  analyzeImage,
  analyzeImageFromBase64,
  analyzeImageFromFile,
  submitVideoForAnalysis,
  submitVideoFromFile,
  checkVideoAnalysisStatus,
  analyzeImageResult,
  analyzeVideoResult,
  sightengineWebhook,
  moderateImage,
  submitVideoModeration,
  checkVideoModerationStatus,
  moderationMiddleware
};