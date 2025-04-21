// services/SightengineService.js

import { Platform } from 'react-native';
import FormData from 'form-data';
import { getAxiosInstance } from '../data/api/axiosInstance';
import * as FileSystem from 'expo-file-system';

// Configuration de Sightengine
const SIGHTENGINE_CONFIG = {
  apiUser: process.env.SIGHTENGINE_API_USER || 'votre-api-user',
  apiSecret: process.env.SIGHTENGINE_API_SECRET || 'votre-api-secret',
  endpoint: 'https://api.sightengine.com/1.0',
  models: {
    image: 'nudity-2.0,wad,offensive,faces,scam,text-content,face-attributes,gore',
    video: 'nudity-2.0,wad,offensive,gore'
  },
  // Seuils de modération personnalisables
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
 * Prépare une image pour l'envoi à Sightengine
 * @param {string} imageUri - URI de l'image
 * @returns {Promise<Object>} - Objet contenant le base64 ou l'uri
 */
const prepareImageForUpload = async (imageUri) => {
  // Si l'URI commence par 'data:', c'est déjà en base64
  if (imageUri.startsWith('data:')) {
    return { base64: imageUri.split(',')[1] };
  }

  try {
    // Pour les fichiers locaux, on essaie de les convertir en base64
    const normalizedUri = Platform.OS === 'ios' 
      ? imageUri.replace('file://', '') 
      : imageUri;
    
    const base64 = await FileSystem.readAsStringAsync(normalizedUri, {
      encoding: FileSystem.EncodingType.Base64
    });
    
    return { base64 };
  } catch (error) {
    console.error('Erreur lors de la préparation de l\'image:', error);
    // Si la conversion échoue, on utilise l'URI directement
    return { uri: imageUri };
  }
};

/**
 * Vérifie une image avec l'API Sightengine
 * @param {string} imageUri - URI de l'image à vérifier
 * @returns {Promise<Object>} - Résultat de modération
 */
export const moderateImage = async (imageUri) => {
  try {
    const instance = getAxiosInstance();
    if (!instance) {
      throw new Error('Instance axios non disponible');
    }

    // Préparer l'image
    const imageData = await prepareImageForUpload(imageUri);
    const formData = new FormData();
    
    // Ajouter les paramètres d'authentification
    formData.append('api_user', SIGHTENGINE_CONFIG.apiUser);
    formData.append('api_secret', SIGHTENGINE_CONFIG.apiSecret);
    
    // Ajouter les modèles à vérifier
    formData.append('models', SIGHTENGINE_CONFIG.models.image);
    
    // Ajouter l'image
    if (imageData.base64) {
      formData.append('media', { 
        base64: imageData.base64,
        type: 'image/jpeg'
      });
    } else if (imageData.uri) {
      formData.append('media', {
        uri: imageData.uri,
        type: 'image/jpeg',
        name: 'upload.jpg'
      });
    }
    
    // Appel à l'API Sightengine
    const response = await instance.post(
      'https://api.sightengine.com/1.0/check.json',
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
    
    // Analyser la réponse
    const result = analyzeImageResult(response.data);
    return result;
    
  } catch (error) {
    console.error('Erreur lors de la modération de l\'image:', error);
    throw error;
  }
};

/**
 * Soumet une vidéo à l'API Sightengine pour analyse asynchrone
 * @param {string} videoUri - URI de la vidéo à vérifier
 * @returns {Promise<Object>} - Résultat de soumission avec workflowID
 */
export const submitVideoForModeration = async (videoUri) => {
  try {
    const instance = getAxiosInstance();
    if (!instance) {
      throw new Error('Instance axios non disponible');
    }
    
    // Préparer la vidéo (uniquement l'URI car les vidéos sont trop volumineuses pour le base64)
    const formData = new FormData();
    
    // Ajouter les paramètres d'authentification
    formData.append('api_user', SIGHTENGINE_CONFIG.apiUser);
    formData.append('api_secret', SIGHTENGINE_CONFIG.apiSecret);
    
    // Ajouter les modèles à vérifier
    formData.append('models', SIGHTENGINE_CONFIG.models.video);
    
    // Ajouter la vidéo
    formData.append('media', {
      uri: videoUri,
      type: 'video/mp4',
      name: 'upload.mp4'
    });
    
    // Options de modération vidéo
    formData.append('mode', 'standard'); // standard ou fast
    formData.append('callback_url', 'https://votre-api.com/webhook/sightengine');
    
    // Appel à l'API Sightengine pour soumettre la vidéo
    const response = await instance.post(
      'https://api.sightengine.com/1.0/video/check.json',
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
    
    // Le résultat contient un ID de workflow pour suivre le statut
    return {
      success: true,
      workflowId: response.data.id,
      status: 'pending'
    };
    
  } catch (error) {
    console.error('Erreur lors de la soumission de la vidéo pour modération:', error);
    throw error;
  }
};

/**
 * Vérifier le statut d'une modération vidéo
 * @param {string} workflowId - ID du workflow de modération vidéo
 * @returns {Promise<Object>} - Statut actuel de la modération
 */
export const checkVideoModerationStatus = async (workflowId) => {
  try {
    const instance = getAxiosInstance();
    if (!instance) {
      throw new Error('Instance axios non disponible');
    }
    
    // Construire les paramètres de requête
    const params = new URLSearchParams();
    params.append('api_user', SIGHTENGINE_CONFIG.apiUser);
    params.append('api_secret', SIGHTENGINE_CONFIG.apiSecret);
    params.append('id', workflowId);
    
    // Appel à l'API pour vérifier le statut
    const response = await instance.get(
      `https://api.sightengine.com/1.0/video/check-status.json?${params.toString()}`
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
      success: true,
      status: response.data.status,
      progress: response.data.progress,
      workflowId
    };
    
  } catch (error) {
    console.error('Erreur lors de la vérification du statut de modération vidéo:', error);
    throw error;
  }
};

/**
 * Analysez les résultats de modération d'image de Sightengine
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
  
  // Vérifier les QR codes (potentiellement dangereux)
  if (data.qrcode && data.qrcode.prob > SIGHTENGINE_CONFIG.thresholds.qrcode) {
    flaggedCategories.push({
      name: 'qrcode',
      score: data.qrcode.prob
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
  
  // Trouver la catégorie avec le score le plus élevé relativement à son seuil
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
 * Analysez les résultats de modération vidéo de Sightengine
 * @param {Object} data - Données de réponse de l'API
 * @returns {Object} - Résultat formaté
 */
const analyzeVideoResult = (data) => {
  // Vérifier si la réponse est valide
  if (!data || data.status !== 'completed' || !data.summary) {
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
      timestamp: data.timestamp,
      media: {
        id: data.media.id,
        url: data.media.url
      },
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
    'qrcode': 'suspicious_link',
    'minor_face': 'minor_protection'
  };
  
  return mapping[category] || 'inappropriate_content';
};

export default {
  moderateImage,
  submitVideoForModeration,
  checkVideoModerationStatus
};