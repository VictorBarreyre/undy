// services/ModerationService.js (Backend) - SERVICE DE MODÉRATION AVEC SIGHTENGINE

const axios = require('axios');

console.log('✅ Backend ModerationService: SERVICE DE MODÉRATION ACTIVÉ');

// Configuration - TOUTE LA MODÉRATION EST ACTIVE
const MODERATION_CONFIG = {
  // MODÉRATION MÉDIA ACTIVÉE
  enableImageModeration: true,
  enableVideoModeration: true,
  enableAudioModeration: false, // Pas de modération audio pour l'instant
  
  // MODÉRATION TEXTE ACTIVE
  enableTextModeration: true,
  
  // Message de statut
  message: 'Service de modération avec Sightengine complètement opérationnel'
};

// Liste de mots à filtrer localement
const OFFENSIVE_WORDS = [
  // Insultes et mots vulgaires en français
  "putain", "merde", "connard", "salope", "enculé", "pédé",
  // Termes haineux ou discriminatoires
  "nègre", "youpin", "bougnoule", "pute", "tapette",
  // Insultes en anglais
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
    
    console.log('[MODERATION] Violation détectée localement:', result);
    return result;
  }

  return { isFlagged: false, reason: null };
};

/**
 * Modération d'image - Note: l'implémentation réelle est dans moderationController.js
 * Cette fonction est un wrapper pour la cohérence de l'API
 * @param {string|Object} imageData - Données de l'image
 * @returns {Promise<Object>} - Résultat de modération
 */
const moderateImage = async (imageData) => {
  if (!MODERATION_CONFIG.enableImageModeration) {
    console.log('🖼️ Backend: Modération d\'image désactivée par configuration');
    return {
      isFlagged: false,
      reason: null,
      disabled: true
    };
  }

  console.log('🖼️ Backend: Modération d\'image activée');
  
  // Note: L'implémentation réelle avec Sightengine est dans moderationController.js
  // Cette fonction est appelée depuis les services internes, pas directement depuis les routes
  return {
    isFlagged: false,
    reason: null,
    service: 'backend-moderation',
    message: 'Utiliser moderationController pour l\'implémentation Sightengine'
  };
};

/**
 * Soumission de vidéo pour modération - Note: l'implémentation réelle est dans moderationController.js
 * @param {string} videoData - URL ou fichier de la vidéo
 * @param {string} messageId - ID du message
 * @returns {Promise<Object>} - Résultat de soumission
 */
const submitVideoForModeration = async (videoData, messageId) => {
  if (!MODERATION_CONFIG.enableVideoModeration) {
    console.log('🎥 Backend: Soumission de vidéo désactivée par configuration');
    return {
      isFlagged: false,
      reason: null,
      status: 'disabled',
      disabled: true
    };
  }

  console.log('🎥 Backend: Soumission de vidéo activée');
  
  // Note: L'implémentation réelle avec Sightengine est dans moderationController.js
  return {
    status: 'pending',
    service: 'backend-moderation',
    message: 'Utiliser moderationController pour l\'implémentation Sightengine'
  };
};

/**
 * Vérification de statut vidéo - Note: l'implémentation réelle est dans moderationController.js
 * @param {string} workflowId - ID du workflow
 * @returns {Promise<Object>} - Statut de modération
 */
const checkVideoModerationStatus = async (workflowId) => {
  if (!MODERATION_CONFIG.enableVideoModeration) {
    console.log('🎥 Backend: Vérification de statut vidéo désactivée par configuration');
    return {
      isFlagged: false,
      reason: null,
      status: 'disabled',
      disabled: true
    };
  }

  console.log('🎥 Backend: Vérification de statut vidéo activée');
  
  // Note: L'implémentation réelle avec Sightengine est dans moderationController.js
  return {
    status: 'pending',
    service: 'backend-moderation',
    message: 'Utiliser moderationController pour l\'implémentation Sightengine'
  };
};

/**
 * Point d'entrée principal pour la modération de contenu texte
 * @param {string} content - Contenu texte à modérer
 * @returns {Promise<Object>} - Résultat de modération
 */
const moderateContent = async (content) => {
  if (!MODERATION_CONFIG.enableTextModeration) {
    return { isFlagged: false, reason: null, disabled: true };
  }
  
  // Vérification locale des mots offensants
  return checkContentLocally(content);
};

/**
 * Modérer un message complet - utilisé par le middleware
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
    
    // 1. VÉRIFICATION DU TEXTE
    if (message.content && MODERATION_CONFIG.enableTextModeration) {
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
    
    // 2. Les vérifications d'image et vidéo sont gérées par moderationController.js
    // via les routes API dédiées, pas dans ce service
    
    if (message.image && MODERATION_CONFIG.enableImageModeration) {
      console.log('🖼️ Backend: Image détectée - modération requise via API');
      results.details.image = {
        status: 'requires_api_call',
        message: 'Utiliser /api/moderation/image pour vérifier'
      };
    }
    
    if (message.video && MODERATION_CONFIG.enableVideoModeration) {
      console.log('🎥 Backend: Vidéo détectée - modération requise via API');
      results.details.video = {
        status: 'requires_api_call',
        message: 'Utiliser /api/moderation/video pour soumettre'
      };
    }
    
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
    'offensive_language': "Ce message contient un langage offensant.",
    'hate': "Ce message contient un discours haineux.",
    'harassment': "Ce message contient du contenu considéré comme du harcèlement.",
    'sexual': "Ce message contient du contenu à caractère sexuel.",
    'violence': "Ce message contient du contenu violent.",
    'drugs': "Ce message contient des références aux drogues.",
    'alcohol': "Ce message contient du contenu lié à l'alcool.",
    'gambling': "Ce message contient du contenu lié aux jeux d'argent.",
    'minor_protection': "Ce contenu pourrait être inapproprié pour la protection des mineurs.",
    'offensive_content': "Ce contenu a été jugé offensant.",
    'gore': "Ce contenu contient des images violentes ou choquantes.",
    'weapon': "Ce contenu contient des armes.",
    'inappropriate_content': "Ce contenu est inapproprié.",
    'default': "Ce message a été bloqué car il enfreint nos directives communautaires."
  };
  
  return messages[reason] || messages.default;
};

/**
 * Obtenir le statut de la modération
 * @returns {Object} - Statut actuel de la modération
 */
const getModerationStatus = () => {
  return {
    ...MODERATION_CONFIG,
    activeModerations: MODERATION_CONFIG.enableTextModeration ? ['text'] : [],
    sightengineEnabled: MODERATION_CONFIG.enableImageModeration || MODERATION_CONFIG.enableVideoModeration,
    message: 'Service de modération avec Sightengine activé'
  };
};

module.exports = {
  moderateContent,        // ACTIVE - Modération de texte local
  moderateImage,          // WRAPPER - Implémentation dans moderationController
  submitVideoForModeration, // WRAPPER - Implémentation dans moderationController
  checkVideoModerationStatus, // WRAPPER - Implémentation dans moderationController
  moderateMessage,        // ACTIVE - Utilisé par le middleware
  getViolationMessage,    // ACTIVE - Messages d'erreur
  getModerationStatus,    // Informations sur l'état du service
  checkContentLocally,    // Export de la fonction locale
  
  // Métadonnées du service
  serviceConfig: MODERATION_CONFIG
};