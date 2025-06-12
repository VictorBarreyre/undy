// src/services/ModerationService.js - SERVICE DE MODÉRATION COMPLET AVEC SIGHTENGINE

import AsyncStorage from '@react-native-async-storage/async-storage';
import { getAxiosInstance } from '../data/api/axiosInstance';

// Configuration du cache
const CACHE_EXPIRY = 60 * 60 * 1000; // 1 heure en millisecondes
const CACHE_PREFIX = 'moderation_';

// Liste de mots à filtrer localement
const OFFENSIVE_WORDS = [
  // Insultes et mots vulgaires en français
  "putain", "merde", "connard", "salope", "enculé", "pédé",
  // Termes haineux ou discriminatoires
  "nègre", "youpin", "bougnoule", "pute", "tapette",
  // Insultes en anglais
  "fuck", "shit", "asshole", "bitch", "cunt", "faggot", "nigger",
];

// Configuration de modération - TOUT EST ACTIF
const MODERATION_CONFIG = {
  useLocalFilter: true,       // Filtrage local des mots offensants
  useCache: true,             // Cache pour éviter les appels répétés
  logViolations: true,        // Journalisation des violations
  threshold: 0.7,             // Seuil par défaut
  // MODÉRATION MÉDIA ACTIVÉE
  enableImageModeration: true,
  enableVideoModeration: true,
  enableAudioModeration: false, // Pas de modération audio pour l'instant
  enableMediaModeration: true,
};

/**
 * Vérifier localement si le contenu contient des mots offensants
 * @param {string} content - Texte à vérifier
 * @returns {Object} Résultat de la vérification
 */
export const checkContentLocally = (content) => {
  if (!content || typeof content !== 'string' || !MODERATION_CONFIG.useLocalFilter) {
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
      console.log('Violation de modération détectée localement:', result);
    }
    
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
  let hash = 0;
  const contentStr = type === 'text' ? content : `${type}_${content}`;
  
  for (let i = 0; i < contentStr.length; i++) {
    const char = contentStr.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
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
  if (!MODERATION_CONFIG.useCache) return null;
  
  try {
    const cacheKey = getCacheKey(content, type);
    const cachedData = await AsyncStorage.getItem(cacheKey);
    
    if (cachedData) {
      const cached = JSON.parse(cachedData);
      
      if (cached.timestamp && Date.now() - cached.timestamp < CACHE_EXPIRY) {
        if (MODERATION_CONFIG.logViolations && cached.result.isFlagged) {
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
  if (!MODERATION_CONFIG.useCache) return;
  
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
export const checkContentViaAPI = async (content) => {
  if (!content || typeof content !== 'string') {
    return { isFlagged: false, reason: null };
  }

  try {
    // Vérifier le cache d'abord
    const cachedResult = await checkCache(content, 'text');
    if (cachedResult) {
      return cachedResult;
    }
    
    // Appel à l'API de modération
    const instance = getAxiosInstance();
    if (!instance) {
      throw new Error('Erreur: instance axios non disponible');
    }
    
    const response = await instance.post('/api/moderation', { content });
    
    if (!response.data) {
      throw new Error('Réponse de modération invalide');
    }
    
    const moderationResult = response.data;
    
    // Stocker en cache
    await storeInCache(content, moderationResult, 'text');
    
    if (MODERATION_CONFIG.logViolations && moderationResult.isFlagged) {
      console.log('API: Violation de modération détectée:', moderationResult);
    }
    
    return moderationResult;
  } catch (error) {
    console.error('Erreur lors de la vérification via API:', error);
    // Fallback sur la vérification locale
    return checkContentLocally(content);
  }
};

/**
 * Modération d'image via Sightengine (backend)
 * @param {string} imageUri - URI de l'image à modérer
 * @returns {Promise<Object>} - Résultat de modération
 */
export const moderateImage = async (imageUri) => {
  if (!MODERATION_CONFIG.enableImageModeration) {
    console.log('🖼️ Modération d\'image désactivée par configuration');
    return { isFlagged: false, reason: null, disabled: true };
  }

  console.log('🖼️ Modération d\'image en cours...');
  
  try {
    // Vérifier le cache d'abord
    const cachedResult = await checkCache(imageUri, 'image');
    if (cachedResult) {
      return cachedResult;
    }
    
    const instance = getAxiosInstance();
    if (!instance) {
      throw new Error('Instance Axios non disponible');
    }
    
    // Appel à l'API de modération d'image
    const response = await instance.post('/api/moderation/image-url', { url: imageUri });
    
    if (!response.data) {
      throw new Error('Réponse de modération invalide');
    }
    
    const result = response.data;
    
    // Stocker en cache si l'image est validée
    if (!result.isFlagged) {
      await storeInCache(imageUri, result, 'image');
    }
    
    if (MODERATION_CONFIG.logViolations && result.isFlagged) {
      console.log('❌ Image signalée comme inappropriée:', result);
    }
    
    return result;
  } catch (error) {
    console.error('Erreur lors de la modération de l\'image:', error);
    // En cas d'erreur, permettre l'image par défaut (fail open)
    return { isFlagged: false, reason: null, error: error.message };
  }
};

/**
 * Soumettre une vidéo pour modération via Sightengine (backend)
 * @param {string} videoUri - URI de la vidéo à modérer
 * @returns {Promise<Object>} - Résultat de soumission
 */
export const submitVideoForModeration = async (videoUri) => {
  if (!MODERATION_CONFIG.enableVideoModeration) {
    console.log('🎥 Modération de vidéo désactivée par configuration');
    return { isFlagged: false, reason: null, status: 'disabled', disabled: true };
  }

  console.log('🎥 Soumission de vidéo pour modération...');
  
  try {
    const instance = getAxiosInstance();
    if (!instance) {
      throw new Error('Instance Axios non disponible');
    }
    
    // Soumettre la vidéo pour modération
    const response = await instance.post('/api/moderation/video', { url: videoUri });
    
    if (!response.data) {
      throw new Error('Réponse de soumission invalide');
    }
    
    console.log('✅ Vidéo soumise avec succès:', response.data);
    
    return {
      success: true,
      workflowId: response.data.workflowId,
      status: response.data.status || 'pending'
    };
  } catch (error) {
    console.error('Erreur lors de la soumission de la vidéo:', error);
    return { 
      success: false, 
      error: error.message,
      status: 'error'
    };
  }
};

/**
 * Vérifier le statut de modération d'une vidéo
 * @param {string} videoUri - URI de la vidéo (pour le cache)
 * @param {string} workflowId - ID du workflow Sightengine
 * @returns {Promise<Object>} - Résultat de modération
 */
export const checkVideoModerationStatus = async (videoUri, workflowId) => {
  if (!MODERATION_CONFIG.enableVideoModeration) {
    console.log('🎥 Vérification de statut vidéo désactivée par configuration');
    return { isFlagged: false, reason: null, status: 'disabled', disabled: true };
  }

  if (!workflowId) {
    console.error('Workflow ID requis pour vérifier le statut');
    return { isFlagged: false, reason: null, status: 'error' };
  }

  console.log('🎥 Vérification du statut de modération vidéo...');
  
  try {
    const instance = getAxiosInstance();
    if (!instance) {
      throw new Error('Instance Axios non disponible');
    }
    
    const response = await instance.get(`/api/moderation/video-status/${workflowId}`);
    
    if (!response.data) {
      throw new Error('Réponse de statut invalide');
    }
    
    const result = response.data;
    
    // Si la modération est terminée et approuvée, stocker en cache
    if (result.status === 'completed' && !result.isFlagged) {
      await storeInCache(videoUri, result, 'video');
    }
    
    if (MODERATION_CONFIG.logViolations && result.isFlagged) {
      console.log('❌ Vidéo signalée comme inappropriée:', result);
    }
    
    return result;
  } catch (error) {
    console.error('Erreur lors de la vérification du statut:', error);
    return { 
      isFlagged: false, 
      reason: null, 
      status: 'error',
      error: error.message 
    };
  }
};

/**
 * Point d'entrée principal pour la modération de contenu texte
 * @param {string} content - Contenu texte à modérer
 * @returns {Promise<Object>} - Résultat de modération
 */
export const moderateContent = async (content) => {
  // Vérification locale d'abord
  if (MODERATION_CONFIG.useLocalFilter) {
    const localResult = checkContentLocally(content);
    if (localResult.isFlagged) {
      return localResult;
    }
  }
  
  // Puis API si disponible
  return await checkContentViaAPI(content);
};

/**
 * Modérer un message complet (texte + médias)
 * @param {Object} message - Message à modérer
 * @returns {Promise<Object>} - Résultat global de modération
 */
export const moderateMessage = async (message) => {
  try {
    const results = {
      isFlagged: false,
      reason: null,
      details: {},
      status: 'completed'
    };
    
    // 1. Vérifier le texte
    if (message.content) {
      const textResult = await moderateContent(message.content);
      if (textResult.isFlagged) {
        return {
          ...textResult,
          contentType: 'text'
        };
      }
      results.details.text = textResult;
    }
    
    // 2. Vérifier l'image si présente
    if (message.image && MODERATION_CONFIG.enableImageModeration) {
      console.log('🖼️ Vérification de l\'image du message...');
      const imageResult = await moderateImage(message.image);
      if (imageResult.isFlagged) {
        return {
          ...imageResult,
          contentType: 'image'
        };
      }
      results.details.image = imageResult;
    }
    
    // 3. Soumettre la vidéo si présente
    if (message.video && MODERATION_CONFIG.enableVideoModeration) {
      console.log('🎥 Soumission de la vidéo du message...');
      const videoSubmission = await submitVideoForModeration(message.video);
      
      // Pour les vidéos, on retourne un statut "pending"
      if (videoSubmission.success) {
        results.status = 'pending_video';
        results.workflowId = videoSubmission.workflowId;
        results.details.video = videoSubmission;
      }
    }
    
    return results;
  } catch (error) {
    console.error('Erreur lors de la modération du message:', error);
    return { isFlagged: false, reason: null, status: 'error' };
  }
};

/**
 * Nettoyer le cache de modération
 */
export const clearModerationCache = async () => {
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

/**
 * Convertir un code de raison en message utilisateur
 * @param {string} reason - Code de raison de modération
 * @returns {string} - Message utilisateur
 */
export const getViolationMessage = (reason) => {
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
    'inappropriate_content': "Ce contenu est inapproprié.",
    'default': "Ce message a été bloqué car il enfreint nos directives communautaires."
  };
  
  return messages[reason] || messages.default;
};

/**
 * Obtenir la configuration de modération actuelle
 * @returns {Object} - Configuration actuelle
 */
export const getModerationConfig = () => {
  return { ...MODERATION_CONFIG };
};