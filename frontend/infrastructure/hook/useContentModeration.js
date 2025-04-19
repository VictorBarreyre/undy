import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { moderateContent, getViolationMessage } from '../../services/ModerationService';
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
     * Vérifier un message complet (texte et pièces jointes)
     * @param {Object} message - Message à vérifier
     * @returns {Promise<boolean>} - True si le message est approprié
     */
    const checkMessage = useCallback(async (message) => {
      // Si l'utilisateur est restreint, bloquer tout contenu
      if (isUserRestricted) {
        return false;
      }
      
      setIsChecking(true);
      
      try {
        // Vérifier le texte du message
        if (message.text) {
          const textResult = await checkText(message.text);
          if (!textResult) {
            setIsChecking(false);
            return false;
          }
        }
        
        // Ici, on pourrait ajouter une vérification pour les images
        // si vous avez une API de modération d'images
        
        setIsChecking(false);
        return true;
      } catch (error) {
        console.error('Erreur lors de la vérification du message:', error);
        setIsChecking(false);
        return true; // En cas d'erreur, permettre l'envoi par défaut
      }
    }, [checkText, isUserRestricted]);
    
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
      checkMessage,
      isChecking,
      lastResult,
      violationsCount,
      isUserRestricted,
      resetViolationsCount,
      removeUserRestriction,
    };
  };
  
  export default useContentModeration;