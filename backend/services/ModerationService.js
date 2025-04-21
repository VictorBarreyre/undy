// services/ModerationService.js
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const AsyncStorage = require('@react-native-async-storage/async-storage').default;

// Configuration du service Sightengine
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
    text_profanity: 0.7,      // Grossièretés dans le texte
    scam: 0.6,                // Arnaque
    face_minor: 0.7,          // Potentiel mineur
  }
};

// Configuration du cache
const CACHE_EXPIRY = 60 * 60 * 1000; // 1 heure en millisecondes
const CACHE_PREFIX = 'moderation_';

// Liste de mots à filtrer localement
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
    
    console.log('Violation de modération détectée localement:', result);
    return result;
  }

  return { isFlagged: false, reason: null };
};

/**
 * Générer une clé de cache pour un contenu
 * @param {string} content - Contenu à identifier
 * @param {string} type - Type de contenu ('text', 'image', 'video')
 * @returns {string} - Clé de cache
 */
const getCacheKey = (content, type = 'text') => {
  // Hashage simple pour la clé de cache
  let hash = 0;
  const contentStr = type === 'text' ? content : `${type}_${content}`;
  
  for (let i = 0; i < contentStr.length; i++) {
    const char = contentStr.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Conversion en entier 32 bits
  }
  return `${CACHE_PREFIX}${type}_${hash}`;
};

/**
 * Vérifier si un résultat existe en cache et est valide
 * @param {string} content - Contenu à vérifier
 * @param {string} type - Type de contenu ('text', 'image', 'video')
 * @returns {Promise<Object|null>} - Résultat de modération en cache ou null
 */
const checkCache = async (content, type = 'text') => {
  try {
    const cacheKey = getCacheKey(content, type);
    const cachedData = await AsyncStorage.getItem(cacheKey);
    
    if (cachedData) {
      const cached = JSON.parse(cachedData);
      
      // Vérifier si le cache est encore valide
      if (cached.timestamp && Date.now() - cached.timestamp < CACHE_EXPIRY) {
        if (cached.result.isFlagged) {
          console.log('Violation trouvée en cache:', cached.result);
        }
        return cached.result;
      }
    }
  } catch (error) {
    console.error('Erreur lors de la vérification du cache de modération:', error);
  }
  
  return null;
};

/**
 * Stocker un résultat de modération dans le cache
 * @param {string} content - Contenu vérifié
 * @param {Object} result - Résultat de la modération
 * @param {string} type - Type de contenu ('text', 'image', 'video')
 */
const storeInCache = async (content, result, type = 'text') => {
  try {
    const cacheKey = getCacheKey(content, type);
    const cacheData = {
      result,
      timestamp: Date.now()
    };
    
    await AsyncStorage.setItem(cacheKey, JSON.stringify(cacheData));
  } catch (error) {
    console.error('Erreur lors du stockage du résultat de modération dans le cache:', error);
  }
};

/**
 * Vérifier le contenu texte avec l'API
 * @param {string} content - Contenu à vérifier
 * @returns {Promise<Object>} - Résultat de modération
 */
const checkContentViaAPI = async (content) => {
  if (!content || typeof content !== 'string') {
    return { isFlagged: false, reason: null };
  }

  try {
    // Vérifier le cache d'abord pour éviter des appels API inutiles
    const cachedResult = await checkCache(content, 'text');
    if (cachedResult) {
      return cachedResult;
    }
    
    // Construction du corps de la requête pour l'API Perspective
    const requestBody = {
      comment: { text: content },
      languages: ['fr', 'en'],
      requestedAttributes: {
        TOXICITY: {},
        SEVERE_TOXICITY: {},
        IDENTITY_ATTACK: {},
        INSULT: {},
        PROFANITY: {},
        THREAT: {},
        SEXUALLY_EXPLICIT: {}
      }
    };
    
    // Appel à l'API de modération
    const response = await axios.post(
      `https://commentanalyzer.googleapis.com/v1alpha1/comments:analyze?key=${process.env.PERSPECTIVE_API_KEY}`,
      requestBody
    );
    
    if (!response.data || !response.data.attributeScores) {
      throw new Error('Réponse de modération invalide');
    }
    
    // Analyser les résultats
    const attributeScores = response.data.attributeScores;
    let isFlagged = false;
    let highestCategory = null;
    let highestScore = 0;
    
    // Vérifier chaque attribut
    for (const category in attributeScores) {
      const score = attributeScores[category].summaryScore.value;
      const threshold = category === 'SEVERE_TOXICITY' ? 0.5 : 0.7;
      
      if (score > threshold && score > highestScore) {
        isFlagged = true;
        highestCategory = category;
        highestScore = score;
      }
    }
    
    const result = {
      isFlagged,
      reason: isFlagged ? mapPerspectiveCategory(highestCategory) : null,
      originalCategory: highestCategory,
      details: { allScores: attributeScores }
    };
    
    // Stocker dans le cache
    await storeInCache(content, result, 'text');
    
    if (result.isFlagged) {
      console.log('API: Violation de modération détectée:', result);
    }
    
    return result;
  } catch (error) {
    console.error('Erreur lors de la vérification via API:', error);
    // En cas d'erreur d'API, on revient à la vérification locale
    return checkContentLocally(content);
  }
};

/**
 * Mapper les catégories Perspective API vers des raisons plus lisibles
 * @param {string} category - Catégorie de l'API
 * @returns {string} - Raison lisible
 */
const mapPerspectiveCategory = (category) => {
  const mapping = {
    'TOXICITY': 'harassment',
    'SEVERE_TOXICITY': 'harassment',
    'IDENTITY_ATTACK': 'hate',
    'INSULT': 'harassment',
    'PROFANITY': 'offensive_language',
    'THREAT': 'violence',
    'SEXUALLY_EXPLICIT': 'sexual'
  };
  
  return mapping[category] || 'inappropriate_content';
};

/**
 * Vérifier une image avec Sightengine
 * @param {string} imageData - URL ou base64 de l'image
 * @returns {Promise<Object>} - Résultat de modération
 */
const moderateImage = async (imageData) => {
  if (!imageData) {
    return { isFlagged: false, reason: null };
  }

  try {
    // Vérifier le cache d'abord
    const cachedResult = await checkCache(imageData, 'image');
    if (cachedResult) {
      return cachedResult;
    }
    
    const formData = new FormData();
    formData.append('api_user', SIGHTENGINE_CONFIG.apiUser);
    formData.append('api_secret', SIGHTENGINE_CONFIG.apiSecret);
    formData.append('models', SIGHTENGINE_CONFIG.models.image);
    
    // Ajouter l'image selon son format
    if (typeof imageData === 'string') {
      if (imageData.startsWith('data:image/')) {
        // Base64
        const base64Data = imageData.split(',')[1];
        formData.append('media_base64', base64Data);
      } else if (imageData.startsWith('http')) {
        // URL
        formData.append('url', imageData);
      } else {
        throw new Error('Format d\'image non supporté');
      }
    } else if (imageData.path) {
      // Fichier local
      formData.append('media', fs.createReadStream(imageData.path));
    } else {
      throw new Error('Type d\'image non supporté');
    }
    
    // Appel à l'API Sightengine
    const response = await axios.post(
      `${SIGHTENGINE_CONFIG.endpoint}/check.json`,
      formData,
      { headers: formData.getHeaders ? formData.getHeaders() : { 'Content-Type': 'multipart/form-data' } }
    );
    
    if (!response.data || response.data.status !== 'success') {
      throw new Error('Réponse de modération d\'image invalide');
    }
    
    // Analyser le résultat
    const result = analyzeImageResult(response.data);
    
    // Stocker dans le cache
    await storeInCache(imageData, result, 'image');
    
    if (result.isFlagged) {
      console.log('Sightengine: Violation dans l\'image détectée:', result);
    }
    
    return result;
  } catch (error) {
    console.error('Erreur lors de la modération de l\'image:', error);
    return { isFlagged: false, reason: null };
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
    (data.nudity.partial > SIGHTENGINE_CONFIG.thresholds.nudity)
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
 * Soumettre une vidéo pour analyse
 * @param {string} videoData - URL ou fichier de la vidéo
 * @param {string} messageId - ID du message pour le suivi
 * @returns {Promise<Object>} - Résultat de soumission
 */
const submitVideoForModeration = async (videoData, messageId) => {
  if (!videoData) {
    return { isFlagged: false, reason: null, status: 'skipped' };
  }

  try {
    const formData = new FormData();
    formData.append('api_user', SIGHTENGINE_CONFIG.apiUser);
    formData.append('api_secret', SIGHTENGINE_CONFIG.apiSecret);
    formData.append('models', SIGHTENGINE_CONFIG.models.video);
    formData.append('mode', 'standard');
    
    // URL de callback pour notification quand l'analyse est terminée
    formData.append('callback_url', process.env.SIGHTENGINE_CALLBACK_URL || 'https://votre-api.com/webhook/sightengine');
    
    // Ajouter les métadonnées pour le suivi
    if (messageId) {
      formData.append('custom_id', messageId);
    }
    
    // Ajouter la vidéo selon son format
    if (typeof videoData === 'string') {
      if (videoData.startsWith('data:video/')) {
        // Base64 - pas idéal pour les vidéos, mais gérons-le quand même
        throw new Error('Base64 n\'est pas supporté pour les vidéos, trop volumineux');
      } else if (videoData.startsWith('http')) {
        // URL
        formData.append('url', videoData);
      } else {
        throw new Error('Format vidéo non supporté');
      }
    } else if (videoData.path) {
      // Fichier local
      formData.append('media', fs.createReadStream(videoData.path));
    } else {
      throw new Error('Type de vidéo non supporté');
    }
    
    // Appel à l'API Sightengine
    const response = await axios.post(
      `${SIGHTENGINE_CONFIG.endpoint}/video/check.json`,
      formData,
      { headers: formData.getHeaders ? formData.getHeaders() : { 'Content-Type': 'multipart/form-data' } }
    );
    
    if (!response.data || !response.data.id) {
      throw new Error('Réponse de modération vidéo invalide');
    }
    
    // Stocker un résultat préliminaire en cache
    const preliminaryResult = {
      isFlagged: false, // Par défaut, on autorise jusqu'à la fin de l'analyse
      reason: null,
      status: 'pending',
      workflowId: response.data.id
    };
    
    // Si le messageId est fourni, stockez-le aussi dans le résultat
    if (messageId) {
      preliminaryResult.messageId = messageId;
    }
    
    return preliminaryResult;
  } catch (error) {
    console.error('Erreur lors de la soumission de la vidéo pour modération:', error);
    return { isFlagged: false, reason: null, status: 'error' };
  }
};

/**
 * Vérifier le statut d'une modération vidéo
 * @param {string} workflowId - ID du workflow
 * @returns {Promise<Object>} - Résultat actuel de la modération
 */
const checkVideoModerationStatus = async (workflowId) => {
  try {
    // Construire les paramètres de requête
    const params = new URLSearchParams();
    params.append('api_user', SIGHTENGINE_CONFIG.apiUser);
    params.append('api_secret', SIGHTENGINE_CONFIG.apiSecret);
    params.append('id', workflowId);
    
    // Appel à l'API pour vérifier le statut
    const response = await axios.get(
      `${SIGHTENGINE_CONFIG.endpoint}/video/check-status.json?${params.toString()}`
    );
    
    // Si la modération est terminée, analyser les résultats
    if (response.data.status === 'completed') {
      const result = analyzeVideoResult(response.data);
      return {
        ...result,
        status: 'completed'
      };
    }
    
    // Sinon, retourner le statut actuel
    return {
      isFlagged: false,
      status: response.data.status,
      progress: response.data.progress || 0,
      workflowId
    };
  } catch (error) {
    console.error('Erreur lors de la vérification du statut de modération vidéo:', error);
    return { isFlagged: false, reason: null, status: 'error' };
  }
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
 * Point d'entrée principal pour la modération de contenu texte
 * @param {string} content - Contenu texte à modérer
 * @returns {Promise<Object>} - Résultat de modération
 */
const moderateContent = async (content) => {
  // D'abord, vérifie localement (rapide)
  const localResult = checkContentLocally(content);
  if (localResult.isFlagged) {
    return localResult;
  }
  
  // Si la vérification locale passe, utilise l'API
  return await checkContentViaAPI(content);
};

/**
 * Modérer un message complet avec texte, images et vidéos
 * @param {Object} message - Message à modérer
 * @returns {Promise<Object>} - Résultat global de modération
 */
const moderateMessage = async (message) => {
  try {
    const results = {
      isFlagged: false,
      reason: null,
      details: {},
      status: 'completed'
    };
    
    // 1. Vérifier d'abord le texte (plus rapide)
    if (message.content) {
      const textResult = await moderateContent(message.content);
      results.details.text = textResult;
      
      // Si le texte est flaggé, on retourne immédiatement
      if (textResult.isFlagged) {
        return {
          ...textResult,
          contentType: 'text'
        };
      }
    }
    
    // 2. Vérifier l'image si présente
    if (message.image) {
      const imageResult = await moderateImage(message.image);
      results.details.image = imageResult;
      
      // Si l'image est flaggée
      if (imageResult.isFlagged) {
        return {
          ...imageResult,
          contentType: 'image'
        };
      }
    }
    
    // 3. Pour les vidéos, soumettre pour analyse mais permettre l'envoi
    if (message.video) {
      try {
        // Soumettre la vidéo pour analyse
        const videoResult = await submitVideoForModeration(message.video, message.id);
        
        // Si l'API retourne un ID de workflow, le stocker pour suivi
        if (videoResult.workflowId) {
          return {
            isFlagged: false,
            status: 'pending',
            workflowId: videoResult.workflowId,
            details: { video: 'pending_moderation' }
          };
        }
      } catch (videoError) {
        console.error("Erreur lors de la soumission de vidéo pour modération:", videoError);
        // En cas d'erreur, on continue (on ne bloque pas le message)
      }
    }
    
    // Si tout est passé, le contenu est approprié
    return results;
    
  } catch (error) {
    console.error("Erreur lors de la modération du contenu:", error);
    // En cas d'erreur, permettre l'envoi par défaut
    return { isFlagged: false };
  }
};

/**
 * Convertir un code de raison en message utilisateur
 * @param {string} reason - Code de raison de modération
 * @returns {string} - Message utilisateur
 */
const getViolationMessage = (reason) => {
  const messages = {
    'sexual': "Ce message contient du contenu à caractère sexuel inapproprié.",
    'sexual/minors': "Ce message contient du contenu inapproprié concernant des mineurs.",
    'hate': "Ce message contient un discours haineux.",
    'harassment': "Ce message contient du contenu considéré comme du harcèlement.",
    'self-harm': "Ce message contient des références à l'automutilation.",
    'violence': "Ce message contient des références violentes inappropriées.",
    'offensive_language': "Ce message contient un langage offensant.",
    'drugs': "Ce message contient des références à des substances interdites.",
    'alcohol': "Ce message contient des références inappropriées à l'alcool.",
    'gambling': "Ce message contient des références inappropriées aux jeux d'argent.",
    'minor_protection': "Ce message contient du contenu pouvant mettre en danger des mineurs.",
    'default': "Ce message a été bloqué car il enfreint nos directives communautaires."
  };
  
  return messages[reason] || messages.default;
};

/**
 * Nettoyer le cache de modération
 */
const clearModerationCache = async () => {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const moderationKeys = keys.filter(key => key.startsWith(CACHE_PREFIX));
    
    if (moderationKeys.length > 0) {
      await AsyncStorage.multiRemove(moderationKeys);
      console.log(`Cache de modération nettoyé: ${moderationKeys.length} entrées supprimées`);
    }
  } catch (error) {
    console.error('Erreur lors du nettoyage du cache de modération:', error);
  }
};

module.exports = {
  moderateContent,
  moderateImage,
  submitVideoForModeration,
  checkVideoModerationStatus,
  moderateMessage,
  getViolationMessage,
  clearModerationCache
};