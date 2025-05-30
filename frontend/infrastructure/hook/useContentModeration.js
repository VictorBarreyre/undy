// src/infrastructure/hook/useContentModeration.js - TOUTE MODÉRATION MÉDIA DÉSACTIVÉE

import { useState, useCallback, useRef, useEffect } from 'react';
import { Alert } from 'react-native';
import { 
  moderateContent, 
  getViolationMessage 
} from '../../services/ModerationService';

/**
 * Hook pour la modération - SEUL LE TEXTE EST VÉRIFIÉ
 * @param {Object} options - Options de configuration
 * @returns {Object} - Fonctions et états pour la modération
 */
const useContentModeration = (options = {}) => {
  const [isChecking, setIsChecking] = useState(false);
  const [lastResult, setLastResult] = useState(null);
  const [violationsCount, setViolationsCount] = useState(0);
  const [isUserRestricted, setIsUserRestricted] = useState(false);
  
  // Référence pour éviter les problèmes avec les fermetures (closures)
  const violationsCountRef = useRef(0);
  
  // Options par défaut - SEULE LA MODÉRATION TEXTE EST ACTIVE
  const defaultOptions = {
    showAlerts: true,          // Afficher des alertes pour les violations DE TEXTE
    blockContent: true,        // Bloquer le contenu inapproprié DE TEXTE
    trackViolations: true,     // Suivre le nombre de violations DE TEXTE
    autoRestrict: true,        // Restreindre automatiquement l'utilisateur après violations DE TEXTE
    restrictThreshold: 3,      // Nombre de violations avant restriction
    restrictDuration: 30000,   // Durée de restriction en ms (30 secondes par défaut)
    onViolation: null,         // Callback pour une violation détectée
    onContentCleared: null,    // Callback quand un contenu est autorisé
    onUserRestricted: null,    // Callback quand l'utilisateur est restreint
    onUserUnrestricted: null,  // Callback quand la restriction est levée
    // PLUS DE VÉRIFICATIONS MÉDIA
    enableImageModeration: false,
    enableVideoModeration: false,
    enableAudioModeration: false,
  };
  
  // Fusionner les options fournies avec les options par défaut
  const settings = { ...defaultOptions, ...options };
  
  /**
   * Afficher une alerte pour une violation de modération
   * @param {Object} result - Résultat de modération
   */
  const showViolationAlert = useCallback((result) => {
    if (!settings.showAlerts) return;
    
    const reason = result.reason || 'default';
    const message = getViolationMessage(reason);
    
    Alert.alert(
      "Message non envoyé",
      message,
      [{ text: "OK" }]
    );
  }, [settings.showAlerts]);
  
  /**
   * Gérer une violation de modération
   * @param {Object} result - Résultat de modération
   */
  const handleViolation = useCallback((result) => {
    // Mettre à jour l'état du résultat
    setLastResult(result);
    
    // Incrémenter le compteur de violations si nécessaire
    if (settings.trackViolations) {
      const newCount = violationsCountRef.current + 1;
      violationsCountRef.current = newCount;
      setViolationsCount(newCount);
      
      // Vérifier si l'utilisateur doit être restreint
      if (settings.autoRestrict && newCount >= settings.restrictThreshold) {
        setIsUserRestricted(true);
        
        // Appeler le callback de restriction
        if (settings.onUserRestricted && typeof settings.onUserRestricted === 'function') {
          settings.onUserRestricted(newCount);
        }
        
        // Définir un minuteur pour lever la restriction
        setTimeout(() => {
          setIsUserRestricted(false);
          
          // Appeler le callback de fin de restriction
          if (settings.onUserUnrestricted && typeof settings.onUserUnrestricted === 'function') {
            settings.onUserUnrestricted();
          }
        }, settings.restrictDuration);
      }
    }
    
    // Afficher une alerte si nécessaire
    if (settings.showAlerts) {
      showViolationAlert(result);
    }
    
    // Appeler le callback personnalisé
    if (settings.onViolation && typeof settings.onViolation === 'function') {
      settings.onViolation(result, violationsCountRef.current);
    }
  }, [settings, showViolationAlert]);
  
  /**
   * Vérifier si un texte est conforme aux règles de modération (SEULE VÉRIFICATION ACTIVE)
   * @param {string} text - Texte à vérifier
   * @returns {Promise<boolean>} - True si le contenu est approprié, false sinon
   */
  const checkText = useCallback(async (text) => {
    // Si l'utilisateur est restreint, bloquer tout contenu
    if (isUserRestricted) {
      return false;
    }
    
    // Si le texte est vide, il est valide par défaut
    if (!text || text.trim() === '') {
      return true;
    }
    
    setIsChecking(true);
    
    try {
      const result = await moderateContent(text);
      
      if (result.isFlagged) {
        handleViolation(result);
        setIsChecking(false);
        return !settings.blockContent; // Bloquer si blockContent est true
      }
      
      // Le contenu est approprié
      setLastResult(null);
      
      // Appeler le callback de contenu autorisé
      if (settings.onContentCleared && typeof settings.onContentCleared === 'function') {
        settings.onContentCleared(text);
      }
      
      setIsChecking(false);
      return true;
    } catch (error) {
      console.error('Erreur lors de la vérification du contenu:', error);
      setIsChecking(false);
      return true; // En cas d'erreur, permettre l'envoi par défaut
    }
  }, [settings, handleViolation, isUserRestricted]);
  
  /**
   * VÉRIFICATION D'IMAGE COMPLÈTEMENT DÉSACTIVÉE
   * @param {string} imageUri - URI de l'image
   * @returns {Promise<boolean>} - True (toujours autorisé)
   */
  const checkImage = useCallback(async (imageUri) => {
    console.log('🖼️ VÉRIFICATION D\'IMAGE COMPLÈTEMENT DÉSACTIVÉE - autorisation automatique');
    return true; // TOUJOURS AUTORISÉ
  }, []);

  /**
   * SOUMISSION DE VIDÉO COMPLÈTEMENT DÉSACTIVÉE
   * @param {string} videoUri - URI de la vidéo
   * @param {string} messageId - ID du message contenant la vidéo
   * @param {Function} onComplete - Callback quand la modération est terminée
   */
  const submitVideo = useCallback(async (videoUri, messageId, onComplete) => {
    console.log('🎥 SOUMISSION DE VIDÉO COMPLÈTEMENT DÉSACTIVÉE - autorisation automatique');
    
    // Appeler immédiatement le callback avec un statut autorisé
    if (onComplete && typeof onComplete === 'function') {
      setTimeout(() => {
        onComplete({
          messageId,
          result: { isFlagged: false, reason: null, disabled: true },
          status: 'disabled'
        });
      }, 100);
    }
    
    return true; // TOUJOURS AUTORISÉ
  }, []);

  /**
   * VÉRIFICATION D'AUDIO COMPLÈTEMENT DÉSACTIVÉE
   * @param {string} audioUri - URI de l'audio
   * @returns {Promise<boolean>} - True (toujours autorisé)
   */
  const checkAudio = useCallback(async (audioUri) => {
    console.log('🎵 VÉRIFICATION D\'AUDIO COMPLÈTEMENT DÉSACTIVÉE - autorisation automatique');
    return true; // TOUJOURS AUTORISÉ
  }, []);
  
  /**
   * Vérifier un message complet - SEUL LE TEXTE EST VÉRIFIÉ
   * @param {Object} message - Message à vérifier
   * @returns {Promise<Object>} - Résultat avec status
   */
  const checkMessage = useCallback(async (message) => {
    // Si l'utilisateur est restreint, bloquer tout contenu
    if (isUserRestricted) {
      return { isValid: false };
    }
    
    setIsChecking(true);
    
    try {
      // SEULE LA VÉRIFICATION DU TEXTE EST ACTIVE
      if (message.content) {
        const result = await moderateContent(message.content);
        
        // Si le texte est flaggé, bloquer immédiatement
        if (result.isFlagged) {
          handleViolation(result);
          setIsChecking(false);
          return { 
            isValid: !settings.blockContent,
            reason: result.reason
          };
        }
      }
      
      // TOUT LE RESTE EST IGNORÉ
      if (message.image) {
        console.log('🖼️ Image dans le message - IGNORÉE (modération désactivée)');
      }
      
      if (message.video) {
        console.log('🎥 Vidéo dans le message - IGNORÉE (modération désactivée)');
      }
      
      if (message.audio) {
        console.log('🎵 Audio dans le message - IGNORÉ (modération désactivée)');
      }
      
      // Message valide
      setIsChecking(false);
      return { isValid: true };
    } catch (error) {
      console.error('Erreur lors de la vérification du message:', error);
      setIsChecking(false);
      return { isValid: true }; // En cas d'erreur, permettre l'envoi
    }
  }, [settings, handleViolation, isUserRestricted]);
  
  /**
   * Réinitialiser le compteur de violations
   */
  const resetViolationsCount = useCallback(() => {
    violationsCountRef.current = 0;
    setViolationsCount(0);
  }, []);
  
  /**
   * Lever la restriction utilisateur manuellement
   */
  const removeUserRestriction = useCallback(() => {
    setIsUserRestricted(false);
    
    if (settings.onUserUnrestricted && typeof settings.onUserUnrestricted === 'function') {
      settings.onUserUnrestricted();
    }
  }, [settings]);
  
  return {
    // SEULES LES FONCTIONS DE TEXTE SONT ACTIVES
    checkText,
    checkMessage,
    isChecking,
    lastResult,
    violationsCount,
    isUserRestricted,
    resetViolationsCount,
    removeUserRestriction,
    
    // FONCTIONS MÉDIA DÉSACTIVÉES MAIS CONSERVÉES POUR COMPATIBILITÉ
    checkImage: checkImage,        // Retourne toujours true
    submitVideo: submitVideo,      // Retourne toujours true
    checkAudio: checkAudio,        // Retourne toujours true
    
    // Plus de pending moderation car tout est désactivé
    pendingModeration: {},
    getPendingModerations: () => ({})
  };
};

export default useContentModeration;