import { useState, useCallback, useRef, useEffect } from 'react';
import { Alert } from 'react-native';
import { 
  moderateContent, 
  moderateImage, 
  submitVideoForModeration,
  checkVideoModerationStatus,
  moderateMessage,
  getViolationMessage 
} from '../../services/ModerationService';

/**
 * Hook pour faciliter l'utilisation de la modération dans les composants
 * @param {Object} options - Options de configuration
 * @returns {Object} - Fonctions et états pour la modération
 */
const useContentModeration = (options = {}) => {
  const [isChecking, setIsChecking] = useState(false);
  const [lastResult, setLastResult] = useState(null);
  const [violationsCount, setViolationsCount] = useState(0);
  const [isUserRestricted, setIsUserRestricted] = useState(false);
  const [pendingModeration, setPendingModeration] = useState({});
  
  // Référence pour éviter les problèmes avec les fermetures (closures)
  const violationsCountRef = useRef(0);
  
  // Options par défaut
  const defaultOptions = {
    showAlerts: true,          // Afficher des alertes pour les violations
    blockContent: true,        // Bloquer le contenu inapproprié
    trackViolations: true,     // Suivre le nombre de violations
    autoRestrict: true,        // Restreindre automatiquement l'utilisateur après plusieurs violations
    restrictThreshold: 3,      // Nombre de violations avant restriction
    restrictDuration: 30000,   // Durée de restriction en ms (30 secondes par défaut)
    onViolation: null,         // Callback pour une violation détectée
    onContentCleared: null,    // Callback quand un contenu est autorisé
    onUserRestricted: null,    // Callback quand l'utilisateur est restreint
    onUserUnrestricted: null,  // Callback quand la restriction est levée
    checkPendingInterval: 10000, // Intervalle pour vérifier les modérations en attente (vidéos)
  };
  
  // Fusionner les options fournies avec les options par défaut
  const settings = { ...defaultOptions, ...options };
  
  // Vérifier périodiquement les modérations en attente (vidéos)
  useEffect(() => {
    const checkPendingModerations = async () => {
      const pendingIds = Object.keys(pendingModeration);
      if (pendingIds.length === 0) return;
      
      for (const messageId of pendingIds) {
        const pendingData = pendingModeration[messageId];
        
        try {
          // Vérifier le statut actuel
          const statusResult = await checkVideoModerationStatus(
            pendingData.videoUri,
            pendingData.workflowId
          );
          
          // Si terminé, mettre à jour et traiter le résultat
          if (statusResult.status === 'completed') {
            const updatedPending = { ...pendingModeration };
            delete updatedPending[messageId];
            setPendingModeration(updatedPending);
            
            // Si flaggé, traiter comme une violation
            if (statusResult.isFlagged) {
              handleViolation(statusResult);
              
              // Appeler le callback personnalisé si fourni avec l'ID du message
              if (pendingData.onComplete && typeof pendingData.onComplete === 'function') {
                pendingData.onComplete({
                  messageId,
                  result: statusResult,
                  status: 'flagged'
                });
              }
            } else {
              // Sinon, notifier que le contenu est OK
              if (pendingData.onComplete && typeof pendingData.onComplete === 'function') {
                pendingData.onComplete({
                  messageId,
                  result: statusResult,
                  status: 'cleared'
                });
              }
            }
          } 
          // Si toujours en cours, mettre à jour le statut
          else if (statusResult.status === 'pending' || statusResult.status === 'processing') {
            setPendingModeration(prev => ({
              ...prev,
              [messageId]: {
                ...prev[messageId],
                progress: statusResult.progress || prev[messageId].progress,
                lastChecked: Date.now()
              }
            }));
          }
        } catch (error) {
          console.error('Erreur lors de la vérification des modérations en attente:', error);
        }
      }
    };
    
    // Mettre en place l'intervalle de vérification
    const intervalId = setInterval(checkPendingModerations, settings.checkPendingInterval);
    
    // Nettoyage à la destruction du composant
    return () => clearInterval(intervalId);
  }, [pendingModeration, settings.checkPendingInterval]);
  
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
   * Vérifier si un texte est conforme aux règles de modération
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
   * Vérifier une image avec l'API Sightengine
   * @param {string} imageUri - URI de l'image
   * @returns {Promise<boolean>} - True si l'image est appropriée
   */
  const checkImage = useCallback(async (imageUri) => {
    // Si l'utilisateur est restreint, bloquer tout contenu
    if (isUserRestricted) {
      return false;
    }
    
    // Si pas d'URI, valide par défaut
    if (!imageUri) {
      return true;
    }
    
    setIsChecking(true);
    
    try {
      const result = await moderateImage(imageUri);
      
      if (result.isFlagged) {
        handleViolation(result);
        setIsChecking(false);
        return !settings.blockContent;
      }
      
      // L'image est appropriée
      setIsChecking(false);
      return true;
    } catch (error) {
      console.error('Erreur lors de la vérification de l\'image:', error);
      setIsChecking(false);
      return true; // En cas d'erreur, permettre par défaut
    }
  }, [settings, handleViolation, isUserRestricted]);
  
  /**
   * Soumettre une vidéo pour modération
   * @param {string} videoUri - URI de la vidéo
   * @param {string} messageId - ID du message contenant la vidéo
   * @param {Function} onComplete - Callback quand la modération est terminée
   */
  const submitVideo = useCallback(async (videoUri, messageId, onComplete) => {
    if (!videoUri || !messageId) return true;
    
    try {
      // Soumettre la vidéo
      const result = await submitVideoForModeration(videoUri);
      
      // Si déjà flaggé (rare mais possible), gérer immédiatement
      if (result.isFlagged) {
        handleViolation(result);
        if (onComplete) onComplete({ messageId, result, status: 'flagged' });
        return !settings.blockContent;
      }
      
      // Si en attente, enregistrer pour suivi
      if (result.status === 'pending' && result.workflowId) {
        setPendingModeration(prev => ({
          ...prev,
          [messageId]: {
            videoUri,
            workflowId: result.workflowId,
            submittedAt: Date.now(),
            lastChecked: Date.now(),
            progress: 0,
            onComplete
          }
        }));
        
        // Permettre l'envoi (la modération se fait en arrière-plan)
        return true;
      }
      
      // En cas d'erreur ou autre statut, permettre par défaut
      return true;
    } catch (error) {
      console.error('Erreur lors de la soumission de la vidéo:', error);
      return true; // En cas d'erreur, permettre par défaut
    }
  }, [settings, handleViolation]);
  
  /**
   * Vérifier un message complet (texte, images, vidéos)
   * @param {Object} message - Message à vérifier
   * @returns {Promise<Object>} - Résultat avec status et éventuellement workflowId
   */
  const checkMessage = useCallback(async (message) => {
    // Si l'utilisateur est restreint, bloquer tout contenu
    if (isUserRestricted) {
      return { isValid: false };
    }
    
    setIsChecking(true);
    
    try {
      const result = await moderateMessage(message);
      
      // Si flaggé, bloquer immédiatement
      if (result.isFlagged) {
        handleViolation(result);
        setIsChecking(false);
        return { 
          isValid: !settings.blockContent,
          reason: result.reason
        };
      }
      
      // Si en attente (vidéo en cours de modération)
      if (result.status === 'pending' && result.workflowId && message.id) {
        setPendingModeration(prev => ({
          ...prev,
          [message.id]: {
            videoUri: message.video,
            workflowId: result.workflowId,
            submittedAt: Date.now(),
            lastChecked: Date.now(),
            progress: 0,
            onComplete: message.onModerationComplete
          }
        }));
        
        setIsChecking(false);
        return { 
          isValid: true, 
          status: 'pending',
          workflowId: result.workflowId
        };
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
   * Récupérer l'état actuel des modérations en attente
   * @returns {Object} - État des modérations en attente
   */
  const getPendingModerations = useCallback(() => {
    return pendingModeration;
  }, [pendingModeration]);
  
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
    checkText,
    checkImage,
    submitVideo,
    checkMessage,
    isChecking,
    lastResult,
    violationsCount,
    isUserRestricted,
    resetViolationsCount,
    removeUserRestriction,
    pendingModeration,
    getPendingModerations
  };
};

export default useContentModeration;