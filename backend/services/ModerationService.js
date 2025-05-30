// services/ModerationService.js (Backend) - TOUTE MODÉRATION MÉDIA DÉSACTIVÉE

const axios = require('axios');

console.log('🚫 Backend ModerationService: TOUTE MODÉRATION MÉDIA DÉSACTIVÉE');

// Configuration - SEULE LA MODÉRATION TEXTE EST CONSERVÉE
const MODERATION_CONFIG = {
  // TOUTE MODÉRATION MÉDIA DÉSACTIVÉE
  enableImageModeration: false,
  enableVideoModeration: false,
  enableAudioModeration: false,
  enableMediaModeration: false,
  
  // SEULE LA MODÉRATION TEXTE EST ACTIVE
  enableTextModeration: true,
  
  // Message de statut
  message: 'Toute modération média désactivée - seul le texte est vérifié localement'
};

// Liste de mots à filtrer localement (SEULE MODÉRATION ACTIVE)
const OFFENSIVE_WORDS = [
  // Insultes et mots vulgaires en français
  "putain", "merde", "connard", "salope", "enculé", "pédé",
  // Termes haineux ou discriminatoires
  "nègre", "youpin", "bougnoule", "pute", "tapette",
  // Insultes en anglais
  "fuck", "shit", "asshole", "bitch", "cunt", "faggot", "nigger",
];

/**
 * Vérifier localement si le contenu contient des mots offensants (SEULE MODÉRATION ACTIVE)
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
 * MODÉRATION D'IMAGE COMPLÈTEMENT DÉSACTIVÉE
 * @param {string|Object} imageData - Données de l'image (ignoré)
 * @returns {Promise<Object>} - Toujours autorisé
 */
const moderateImage = async (imageData) => {
  console.log('🖼️ Backend: Modération d\'image COMPLÈTEMENT DÉSACTIVÉE - autorisation automatique');
  
  return {
    isFlagged: false,
    reason: null,
    disabled: true,
    service: 'backend-moderation',
    message: 'Modération d\'image complètement désactivée côté serveur'
  };
};

/**
 * SOUMISSION DE VIDÉO COMPLÈTEMENT DÉSACTIVÉE
 * @param {string} videoData - URL ou fichier de la vidéo (ignoré)
 * @param {string} messageId - ID du message (ignoré)
 * @returns {Promise<Object>} - Toujours autorisé
 */
const submitVideoForModeration = async (videoData, messageId) => {
  console.log('🎥 Backend: Soumission de vidéo COMPLÈTEMENT DÉSACTIVÉE - autorisation automatique');
  
  return {
    isFlagged: false,
    reason: null,
    status: 'disabled',
    disabled: true,
    service: 'backend-moderation',
    message: 'Modération de vidéo complètement désactivée côté serveur'
  };
};

/**
 * VÉRIFICATION DE STATUT VIDÉO COMPLÈTEMENT DÉSACTIVÉE
 * @param {string} workflowId - ID du workflow (ignoré)
 * @returns {Promise<Object>} - Toujours autorisé
 */
const checkVideoModerationStatus = async (workflowId) => {
  console.log('🎥 Backend: Vérification de statut vidéo COMPLÈTEMENT DÉSACTIVÉE - autorisation automatique');
  
  return {
    isFlagged: false,
    reason: null,
    status: 'disabled',
    disabled: true,
    service: 'backend-moderation',
    message: 'Vérification de statut vidéo complètement désactivée côté serveur'
  };
};

/**
 * MODÉRATION D'AUDIO COMPLÈTEMENT DÉSACTIVÉE
 * @param {string} audioData - Données audio (ignoré)
 * @returns {Promise<Object>} - Toujours autorisé
 */
const moderateAudio = async (audioData) => {
  console.log('🎵 Backend: Modération d\'audio COMPLÈTEMENT DÉSACTIVÉE - autorisation automatique');
  
  return {
    isFlagged: false,
    reason: null,
    disabled: true,
    service: 'backend-moderation',
    message: 'Modération d\'audio complètement désactivée côté serveur'
  };
};

/**
 * Point d'entrée principal pour la modération de contenu texte (SEULE ACTIVE)
 * @param {string} content - Contenu texte à modérer
 * @returns {Promise<Object>} - Résultat de modération
 */
const moderateContent = async (content) => {
  if (!MODERATION_CONFIG.enableTextModeration) {
    return { isFlagged: false, reason: null, disabled: true };
  }
  
  // Seule la vérification locale est active
  return checkContentLocally(content);
};

/**
 * Modérer un message complet - SEUL LE TEXTE EST VÉRIFIÉ
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
    
    // 1. SEULE VÉRIFICATION ACTIVE : LE TEXTE
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
    
    // 2. TOUTES LES AUTRES VÉRIFICATIONS COMPLÈTEMENT IGNORÉES
    if (message.image) {
      console.log('🖼️ Backend: Image dans le message - COMPLÈTEMENT IGNORÉE');
      results.details.image = {
        isFlagged: false,
        reason: null,
        disabled: true,
        message: 'Modération d\'image complètement désactivée'
      };
    }
    
    if (message.video) {
      console.log('🎥 Backend: Vidéo dans le message - COMPLÈTEMENT IGNORÉE');
      results.details.video = {
        isFlagged: false,
        reason: null,
        status: 'disabled',
        disabled: true,
        message: 'Modération de vidéo complètement désactivée'
      };
    }
    
    if (message.audio) {
      console.log('🎵 Backend: Audio dans le message - COMPLÈTEMENT IGNORÉ');
      results.details.audio = {
        isFlagged: false,
        reason: null,
        disabled: true,
        message: 'Modération d\'audio complètement désactivée'
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
 * Convertir un code de raison en message utilisateur (SEUL LE TEXTE)
 * @param {string} reason - Code de raison de modération
 * @returns {string} - Message utilisateur
 */
const getViolationMessage = (reason) => {
  const messages = {
    'offensive_language': "Ce message contient un langage offensant.",
    'hate': "Ce message contient un discours haineux.",
    'harassment': "Ce message contient du contenu considéré comme du harcèlement.",
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
    activeModerations: ['text'],
    disabledModerations: ['image', 'video', 'audio'],
    message: 'Seule la modération de texte local est active'
  };
};

module.exports = {
  moderateContent,        // SEULE FONCTION ACTIVE
  moderateImage,          // DÉSACTIVÉE - retourne toujours autorisé
  submitVideoForModeration, // DÉSACTIVÉE - retourne toujours autorisé
  checkVideoModerationStatus, // DÉSACTIVÉE - retourne toujours autorisé
  moderateAudio,          // DÉSACTIVÉE - retourne toujours autorisé
  moderateMessage,        // ACTIVE mais ignore tout sauf le texte
  getViolationMessage,    // ACTIVE pour le texte uniquement
  getModerationStatus,    // Informations sur l'état du service
  
  // Métadonnées du service
  serviceConfig: MODERATION_CONFIG
};

/* 
===================================================================
TOUT LE CODE SIGHTENGINE ET MODÉRATION MÉDIA A ÉTÉ SUPPRIMÉ
===================================================================

Ce service backend ne fait plus AUCUN appel à :
- Sightengine API
- Modération d'images
- Modération de vidéos  
- Modération d'audio
- APIs externes de modération média

SEULE la modération de texte locale (mots offensants) est conservée.

===================================================================
*/