// src/services/ModerationService.js

import AsyncStorage from '@react-native-async-storage/async-storage';
import { getAxiosInstance } from '../data/api/axiosInstance';

// Configuration du cache
const CACHE_EXPIRY = 60 * 60 * 1000; // 1 heure en millisecondes
const CACHE_PREFIX = 'moderation_';

// Liste de mots à filtrer localement (premier niveau de filtrage rapide)
// Cette liste peut être étendue selon vos besoins
const OFFENSIVE_WORDS = [
  // Insultes et mots vulgaires en français
  "putain", "merde", "connard", "salope", "enculé", "pédé",
  // Termes haineux ou discriminatoires
  "nègre", "youpin", "bougnoule", "pute", "tapette",
  // Insultes en anglais (pour les utilisateurs internationaux)
  "fuck", "shit", "asshole", "bitch", "cunt", "faggot", "nigger",
];

// Configuration de modération
const MODERATION_CONFIG = {
  useLocalFilter: true,       // Filtrage local des mots offensants (rapide)
  useCache: true,             // Mise en cache des résultats pour réduire les appels API
  logViolations: true,        // Journalisation des violations
  threshold: 0.7,             // Seuil par défaut
  // Seuils spécifiques par catégorie (plus strict pour certaines catégories)
  categoryThresholds: {
    'sexual/minors': 0.5,     // Très strict pour ce type de contenu
    'self-harm': 0.6,         // Strict pour automutilation
    'hate': 0.7,              // Standard pour discours haineux
    'harassment': 0.7,        // Standard pour harcèlement
    'sexual': 0.8,            // Moins strict pour contenu adulte général
    'violence': 0.8,          // Moins strict pour la violence
  },
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
 * @returns {string} - Clé de cache
 */
const getCacheKey = (content) => {
  // Hashage simple pour la clé de cache
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Conversion en entier 32 bits
  }
  return `${CACHE_PREFIX}${hash}`;
};

/**
 * Vérifier si un résultat existe en cache et est valide
 * @param {string} content - Contenu à vérifier
 * @returns {Promise<Object|null>} - Résultat de modération en cache ou null
 */
const checkCache = async (content) => {
  if (!MODERATION_CONFIG.useCache) return null;
  
  try {
    const cacheKey = getCacheKey(content);
    const cachedData = await AsyncStorage.getItem(cacheKey);
    
    if (cachedData) {
      const cached = JSON.parse(cachedData);
      
      // Vérifier si le cache est encore valide
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
 */
const storeInCache = async (content, result) => {
  if (!MODERATION_CONFIG.useCache) return;
  
  try {
    const cacheKey = getCacheKey(content);
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
 * Vérifier si un score dépasse le seuil pour une catégorie
 * @param {string} category - Catégorie à vérifier
 * @param {number} score - Score de modération
 * @returns {boolean} - True si le score dépasse le seuil
 */
const isAboveThreshold = (category, score) => {
  const threshold = MODERATION_CONFIG.categoryThresholds[category] || MODERATION_CONFIG.threshold;
  return score > threshold;
};

/**
 * Vérifier le contenu avec l'API OpenAI
 * @param {string} content - Contenu à vérifier
 * @returns {Promise<Object>} - Résultat de modération
 */
export const checkContentViaAPI = async (content) => {
  if (!content || typeof content !== 'string') {
    return { isFlagged: false, reason: null };
  }

  try {
    // Vérifier le cache d'abord pour éviter des appels API inutiles
    const cachedResult = await checkCache(content);
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
    
    // Stocker dans le cache pour les futures vérifications
    await storeInCache(content, moderationResult);
    
    if (MODERATION_CONFIG.logViolations && moderationResult.isFlagged) {
      console.log('API: Violation de modération détectée:', moderationResult);
    }
    
    return moderationResult;
  } catch (error) {
    console.error('Erreur lors de la vérification via API:', error);
    // En cas d'erreur d'API, on revient à la vérification locale
    return checkContentLocally(content);
  }
};

/**
 * Point d'entrée principal pour la modération de contenu
 * @param {string} content - Contenu à modérer
 * @returns {Promise<Object>} - Résultat de modération
 */
export const moderateContent = async (content) => {
  // D'abord, vérifie localement (rapide)
  if (MODERATION_CONFIG.useLocalFilter) {
    const localResult = checkContentLocally(content);
    if (localResult.isFlagged) {
      return localResult;
    }
  }
  
  // Si la vérification locale passe, utilise l'API
  return await checkContentViaAPI(content);
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
    'sexual': "Ce message contient du contenu à caractère sexuel inapproprié.",
    'sexual/minors': "Ce message contient du contenu inapproprié concernant des mineurs.",
    'hate': "Ce message contient un discours haineux.",
    'harassment': "Ce message contient du contenu considéré comme du harcèlement.",
    'self-harm': "Ce message contient des références à l'automutilation.",
    'violence': "Ce message contient des références violentes inappropriées.",
    'offensive_language': "Ce message contient un langage offensant.",
    'default': "Ce message a été bloqué car il enfreint nos directives communautaires."
  };
  
  return messages[reason] || messages.default;
};