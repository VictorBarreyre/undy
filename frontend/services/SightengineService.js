// services/SightengineService.js - SERVICE COMPLÈTEMENT DÉSACTIVÉ

/**
 * SIGHTENGINE SERVICE COMPLÈTEMENT DÉSACTIVÉ
 * 
 * Ce service est entièrement désactivé pour éliminer toute modération
 * d'images, vidéos et audio via Sightengine.
 * 
 * Toutes les fonctions retournent immédiatement un résultat autorisé
 * sans faire aucun appel API.
 */

console.log('🚫 SightengineService: SERVICE COMPLÈTEMENT DÉSACTIVÉ');

/**
 * Modération d'image DÉSACTIVÉE
 * @param {string} imageUri - URI de l'image (ignoré)
 * @returns {Promise<Object>} - Toujours autorisé
 */
export const moderateImage = async (imageUri) => {
  console.log('🖼️ SightengineService: Modération d\'image DÉSACTIVÉE - autorisation automatique');
  
  return {
    isFlagged: false,
    reason: null,
    disabled: true,
    service: 'sightengine',
    message: 'Service SightengineService complètement désactivé'
  };
};

/**
 * Soumission de vidéo DÉSACTIVÉE
 * @param {string} videoUri - URI de la vidéo (ignoré)
 * @returns {Promise<Object>} - Toujours autorisé
 */
export const submitVideoForModeration = async (videoUri) => {
  console.log('🎥 SightengineService: Soumission de vidéo DÉSACTIVÉE - autorisation automatique');
  
  return {
    success: true,
    workflowId: null,
    status: 'disabled',
    disabled: true,
    service: 'sightengine',
    message: 'Service SightengineService complètement désactivé'
  };
};

/**
 * Vérification de statut vidéo DÉSACTIVÉE
 * @param {string} workflowId - ID du workflow (ignoré)
 * @returns {Promise<Object>} - Toujours autorisé
 */
export const checkVideoModerationStatus = async (workflowId) => {
  console.log('🎥 SightengineService: Vérification de statut DÉSACTIVÉE - autorisation automatique');
  
  return {
    success: true,
    status: 'disabled',
    progress: 100,
    workflowId: null,
    disabled: true,
    isFlagged: false,
    service: 'sightengine',
    message: 'Service SightengineService complètement désactivé'
  };
};

/**
 * Modération d'audio DÉSACTIVÉE (ajout pour compatibilité)
 * @param {string} audioUri - URI de l'audio (ignoré)
 * @returns {Promise<Object>} - Toujours autorisé
 */
export const moderateAudio = async (audioUri) => {
  console.log('🎵 SightengineService: Modération d\'audio DÉSACTIVÉE - autorisation automatique');
  
  return {
    isFlagged: false,
    reason: null,
    disabled: true,
    service: 'sightengine',
    message: 'Service SightengineService complètement désactivé'
  };
};

/**
 * État du service de modération
 * @returns {Object} - État du service (complètement désactivé)
 */
export const getModerationStatus = () => {
  return {
    serviceEnabled: false,
    imageModeration: false,
    videoModeration: false,
    audioModeration: false,
    message: 'Service SightengineService complètement désactivé - AUCUNE modération active'
  };
};

/**
 * Test de connexion DÉSACTIVÉ
 * @returns {Promise<boolean>} - Toujours false (service désactivé)
 */
export const testConnection = async () => {
  console.log('🚫 SightengineService: Test de connexion DÉSACTIVÉ');
  return false;
};

// Export par défaut avec toutes les fonctions désactivées
export default {
  moderateImage,
  submitVideoForModeration,
  checkVideoModerationStatus,
  moderateAudio,
  getModerationStatus,
  testConnection,
  
  // Métadonnées du service
  serviceStatus: {
    enabled: false,
    name: 'SightengineService',
    version: 'disabled',
    message: 'Service complètement désactivé'
  }
};

/* 
===================================================================
TOUT LE CODE ORIGINAL SIGHTENGINE A ÉTÉ SUPPRIMÉ
===================================================================

Ce service ne fait plus AUCUN appel à Sightengine.
Toutes les images, vidéos et audio sont automatiquement autorisées.

Pour réactiver Sightengine, il faudrait :
1. Restaurer le code original
2. Reconfigurer les clés API
3. Réactiver les appels dans les autres services

===================================================================
*/