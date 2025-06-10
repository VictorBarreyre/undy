// src/services/ModerationService.js - TOUTE MODÉRATION MÉDIA DÉSACTIVÉE

import AsyncStorage from '@react-native-async-storage/async-storage';
import { getAxiosInstance } from '../data/api/axiosInstance';

// Configuration du cache (gardé uniquement pour le texte)
const CACHE_EXPIRY = 60 * 60 * 1000; // 1 heure en millisecondes
const CACHE_PREFIX = 'moderation_';

// Liste de mots à filtrer localement (SEULE modération active)
const OFFENSIVE_WORDS = [
// Insultes et mots vulgaires en français
"putain", "merde", "connard", "salope", "enculé", "pédé",
// Termes haineux ou discriminatoires
"nègre", "youpin", "bougnoule", "pute", "tapette",
// Insultes en anglais
"fuck", "shit", "asshole", "bitch", "cunt", "faggot", "nigger"];


// Configuration de modération - SEUL LE TEXTE EST ACTIF
const MODERATION_CONFIG = {
  useLocalFilter: true, // Filtrage local des mots offensants SEUL ACTIF
  useCache: true, // Cache pour le texte uniquement
  logViolations: true, // Journalisation des violations de texte
  threshold: 0.7, // Seuil par défaut pour le texte
  // TOUT LE RESTE EST DÉSACTIVÉ
  enableImageModeration: false,
  enableVideoModeration: false,
  enableAudioModeration: false,
  enableMediaModeration: false
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
  const foundWords = OFFENSIVE_WORDS.filter((word) =>
  lowerContent.includes(word.toLowerCase())
  );

  if (foundWords.length > 0) {
    const result = {
      isFlagged: true,
      reason: 'offensive_language',
      details: {
        flaggedWords: foundWords
      }
    };

    if (MODERATION_CONFIG.logViolations) {

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
    hash = (hash << 5) - hash + char;
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
  if (!MODERATION_CONFIG.useCache || type !== 'text') return null;

  try {
    const cacheKey = getCacheKey(content, type);
    const cachedData = await AsyncStorage.getItem(cacheKey);

    if (cachedData) {
      const cached = JSON.parse(cachedData);

      if (cached.timestamp && Date.now() - cached.timestamp < CACHE_EXPIRY) {
        if (MODERATION_CONFIG.logViolations && cached.result.isFlagged) {

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
  if (!MODERATION_CONFIG.useCache || type !== 'text') return;

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
 * Vérifier le contenu texte avec l'API (SEULE MODÉRATION ACTIVE)
 * @param {string} content - Contenu à vérifier
 * @returns {Promise<Object>} - Résultat de modération
 */
export const checkContentViaAPI = async (content) => {
  if (!content || typeof content !== 'string') {
    return { isFlagged: false, reason: null };
  }

  try {
    const cachedResult = await checkCache(content, 'text');
    if (cachedResult) {
      return cachedResult;
    }

    // Appel à l'API de modération (si disponible)
    const instance = getAxiosInstance();
    if (!instance) {
      throw new Error('Erreur: instance axios non disponible');
    }

    const response = await instance.post('/api/moderation', { content });

    if (!response.data) {
      throw new Error('Réponse de modération invalide');
    }

    const moderationResult = response.data;

    await storeInCache(content, moderationResult, 'text');

    if (MODERATION_CONFIG.logViolations && moderationResult.isFlagged) {

    }

    return moderationResult;
  } catch (error) {
    console.error('Erreur lors de la vérification via API:', error);
    return checkContentLocally(content);
  }
};

/**
 * MODÉRATION D'IMAGE COMPLÈTEMENT DÉSACTIVÉE
 * @param {string} imageUri - URI de l'image à modérer
 * @returns {Promise<Object>} - Résultat toujours autorisé
 */
export const moderateImage = async (imageUri) => {


  return {
    isFlagged: false,
    reason: null,
    disabled: true,
    message: 'Modération d\'image complètement désactivée'
  };
};

/**
 * MODÉRATION DE VIDÉO COMPLÈTEMENT DÉSACTIVÉE
 * @param {string} videoUri - URI de la vidéo à modérer
 * @returns {Promise<Object>} - Résultat toujours autorisé
 */
export const submitVideoForModeration = async (videoUri) => {


  return {
    isFlagged: false,
    reason: null,
    status: 'disabled',
    disabled: true,
    message: 'Modération de vidéo complètement désactivée'
  };
};

/**
 * VÉRIFICATION DE STATUT VIDÉO COMPLÈTEMENT DÉSACTIVÉE
 * @param {string} videoUri - URI de la vidéo
 * @param {string} workflowId - ID du workflow
 * @returns {Promise<Object>} - Résultat toujours autorisé
 */
export const checkVideoModerationStatus = async (videoUri, workflowId = null) => {


  return {
    isFlagged: false,
    reason: null,
    status: 'disabled',
    disabled: true,
    message: 'Vérification de statut vidéo complètement désactivée'
  };
};

/**
 * Point d'entrée principal pour la modération de contenu texte (SEULE ACTIVE)
 * @param {string} content - Contenu texte à modérer
 * @returns {Promise<Object>} - Résultat de modération
 */
export const moderateContent = async (content) => {
  // Modération de texte uniquement
  if (MODERATION_CONFIG.useLocalFilter) {
    const localResult = checkContentLocally(content);
    if (localResult.isFlagged) {
      return localResult;
    }
  }

  // API si disponible, sinon local uniquement
  return await checkContentViaAPI(content);
};

/**
 * Modérer un message complet - SEUL LE TEXTE EST VÉRIFIÉ
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

    // 1. SEULE VÉRIFICATION ACTIVE : LE TEXTE
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

    // 2. TOUTES LES AUTRES VÉRIFICATIONS DÉSACTIVÉES
    if (message.image) {

      results.details.image = {
        isFlagged: false,
        reason: null,
        disabled: true,
        message: 'Modération d\'image désactivée'
      };
    }

    if (message.video) {

      results.details.video = {
        isFlagged: false,
        reason: null,
        status: 'disabled',
        disabled: true,
        message: 'Modération de vidéo désactivée'
      };
    }

    if (message.audio) {

      results.details.audio = {
        isFlagged: false,
        reason: null,
        disabled: true,
        message: 'Modération d\'audio désactivée'
      };
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
    const moderationKeys = keys.filter((key) => key.startsWith(CACHE_PREFIX));

    if (moderationKeys.length > 0) {
      await AsyncStorage.multiRemove(moderationKeys);

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
    'default': "Ce message a été bloqué car il enfreint nos directives communautaires."
  };

  return messages[reason] || messages.default;
};