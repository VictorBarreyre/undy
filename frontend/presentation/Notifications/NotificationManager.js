import * as Notifications from 'expo-notifications';
import NotificationService from './NotificationService'; // Votre service existant
import { getAxiosInstance } from '../../data/api/axiosInstance';
import i18n from 'i18next';
import mixpanel from "../../services/mixpanel";
import AsyncStorage from '@react-native-async-storage/async-storage';

const MANAGER_INITIALIZED_KEY = 'notification_manager_initialized';
const TOKEN_REGISTRATION_TIME_KEY = 'token_registration_time';

class NotificationManager {
  constructor() {
    this.notificationService = NotificationService;
    this.initialized = false;
    this.initializationInProgress = false;
  }

  async initialize(userData) {
    // Si déjà en cours d'initialisation, ne pas recommencer
    if (this.initializationInProgress) {
      console.log("[NOTIF_MANAGER] Initialisation déjà en cours, sortie");
      return this.initialized;
    }

    this.initializationInProgress = true;
    console.log("[NOTIF_MANAGER] Initialisation du gestionnaire de notifications");
    console.log("[NOTIF_MANAGER] Utilisateur connecté:", !!userData?._id);
    
    try {
      // Vérifier si déjà initialisé récemment pour cet utilisateur
      if (userData?._id) {
        const lastInitData = await AsyncStorage.getItem(MANAGER_INITIALIZED_KEY);
        if (lastInitData) {
          try {
            const { userId, timestamp } = JSON.parse(lastInitData);
            const now = Date.now();
            const timeSinceLastInit = now - timestamp;
            
            // Si initialisé pour cet utilisateur dans les 10 dernières minutes
            if (userId === userData._id && timeSinceLastInit < 10 * 60 * 1000) {
              console.log("[NOTIF_MANAGER] Initialisé récemment pour cet utilisateur, utilisation du statut existant");
              this.initialized = true;
              this.initializationInProgress = false;
              return true;
            }
          } catch (e) {
            console.error("[NOTIF_MANAGER] Erreur lors de la lecture des données d'initialisation:", e);
          }
        }
      }
      
      if (this.initialized) {
          console.log("[NOTIF_MANAGER] Déjà initialisé, sortie");
          this.initializationInProgress = false;
          return true;
      }
      
      // S'assurer que le service de notification est initialisé
      console.log("[NOTIF_MANAGER] Initialisation du service de notifications");
      await this.notificationService.initialize();
      
      // Vérifier les permissions sans forcer l'alerte
      console.log("[NOTIF_MANAGER] Vérification des permissions");
      const hasPermission = await this.notificationService.checkPermissions(false);
      console.log("[NOTIF_MANAGER] Résultat de la vérification des permissions:", hasPermission);
      
      // Obtenir le token et l'envoyer au serveur si on a un utilisateur connecté
      if (userData && userData._id) {
          console.log("[NOTIF_MANAGER] Récupération et enregistrement du token");
          const token = await this.notificationService.getToken();
          if (token) {
              console.log("[NOTIF_MANAGER] Token obtenu, enregistrement avec le serveur");
              await this.registerTokenWithServer(userData._id, token);
          } else {
              console.log("[NOTIF_MANAGER] Aucun token obtenu");
          }
      } else {
          console.log("[NOTIF_MANAGER] Aucun utilisateur connecté, token non enregistré");
      }
      
      // Marquer comme initialisé et sauvegarder l'état
      this.initialized = true;
      if (userData?._id) {
        await AsyncStorage.setItem(MANAGER_INITIALIZED_KEY, JSON.stringify({
          userId: userData._id,
          timestamp: Date.now()
        }));
      }
      
      console.log("[NOTIF_MANAGER] Initialisation terminée avec succès");
      this.initializationInProgress = false;
      return true;
    } catch (error) {
      console.error("[NOTIF_MANAGER] Erreur pendant l'initialisation:", error);
      this.initializationInProgress = false;
      return false;
    }
  }

  async registerTokenWithServer(userId, token) {
    // Ne pas envoyer de token simulé au serveur
    if (token === "SIMULATOR_MOCK_TOKEN" || !token) {
        console.log("[NOTIF_MANAGER] Token simulé ou invalide, pas d'envoi au serveur");
        return true; // Simuler un succès en développement
    }
    
    // Vérifier si l'enregistrement a déjà été fait récemment
    const lastRegistration = await AsyncStorage.getItem(TOKEN_REGISTRATION_TIME_KEY);
    const now = Date.now();
    
    if (lastRegistration) {
      const timeSinceLastRegistration = now - parseInt(lastRegistration);
      
      // Si moins de 1 heure, ne pas réenregistrer le même token
      if (timeSinceLastRegistration < 60 * 60 * 1000) {
        console.log("[NOTIF_MANAGER] Token enregistré récemment, pas de réenregistrement");
        return true;
      }
    }
    
    const instance = getAxiosInstance();
    if (!instance) {
        throw new Error(i18n.t('notifications.errors.axiosNotInitialized'));
    }
    
    try {
        // Le token a été obtenu, tentative d'enregistrement sur le serveur
        // CORRECTION: Utiliser "/api/notifications/register" au lieu de "/api/notifications/token"
        console.log("[NOTIF_MANAGER] Envoi du token au serveur:", token);
        const response = await instance.post('/api/notifications/register', {
          apnsToken: token
        });
        
        // Si l'enregistrement réussit, sauvegarder le timestamp
        if (response.data && response.data.success) {
          await AsyncStorage.setItem(TOKEN_REGISTRATION_TIME_KEY, now.toString());
          console.log("[NOTIF_MANAGER] Token enregistré avec succès sur le serveur");
        }
        
        console.log(i18n.t('notifications.logs.tokenRegistered'), response.data);
        return true;
    } catch (error) {
        console.error("[NOTIF_MANAGER] Erreur lors de l'enregistrement du token:", error);
        
        // Essayer une deuxième fois avec l'ancienne route si la première a échoué
        try {
            console.log("[NOTIF_MANAGER] Tentative avec la route alternative...");
            const altResponse = await instance.post('/api/notifications/token', {
              apnsToken: token
            });
            
            if (altResponse.data && altResponse.data.success) {
                await AsyncStorage.setItem(TOKEN_REGISTRATION_TIME_KEY, now.toString());
                console.log("[NOTIF_MANAGER] Token enregistré avec succès via la route alternative");
                return true;
            }
        } catch (altError) {
            console.error("[NOTIF_MANAGER] Échec également avec la route alternative:", altError);
        }
        
        // Ignorer l'erreur en développement pour ne pas bloquer le flux
        if (__DEV__) {
            console.log("[NOTIF_MANAGER] Erreur ignorée en développement");
            return true;
        }
        
        return false;
    }
  }

  async testRemoteNotification() {
    console.log("[NOTIF_MANAGER] Test de notification distante");
    
    try {
        // Récupérer le token
        const token = await this.notificationService.getToken();
        if (!token) {
            console.error("[NOTIF_MANAGER] Impossible d'obtenir un token pour le test");
            return {
                success: false,
                message: "Aucun token disponible"
            };
        }
        
        const instance = getAxiosInstance();
        if (!instance) {
            throw new Error(i18n.t('notifications.errors.axiosNotInitialized'));
        }
        
        // Étape 1: Enregistrer d'abord le token
        await this.registerTokenWithServer(null, token);
        
        // Étape 2: Envoyer une notification de test avec le token
        console.log("[NOTIF_MANAGER] Envoi de la requête de test avec token:", token);
        const response = await instance.post('/api/notifications/test', {
            token: token
        });
        
        console.log("[NOTIF_MANAGER] Réponse du serveur:", response.data);
        return response.data;
        
    } catch (error) {
        console.error("[NOTIF_MANAGER] Erreur lors du test de notification:", error);
        return {
            success: false,
            error: error.message
        };
    }
  }

  async updateUserLanguage(userId, language) {
    if (!language || !userId) {
      console.log("[NOTIF_MANAGER] Langue ou ID utilisateur manquant, pas de mise à jour");
      return false;
    }
    
    // Vérifier si la langue est valide (fr ou en)
    if (!['fr', 'en'].includes(language)) {
      console.log(`[NOTIF_MANAGER] Langue '${language}' non supportée, pas de mise à jour`);
      return false;
    }
    
    const instance = getAxiosInstance();
    if (!instance) {
      console.error("[NOTIF_MANAGER] Client HTTP non initialisé");
      return false;
    }
    
    try {
      const response = await instance.post('/api/users/update-language', {
        language
      });
      
      console.log(`[NOTIF_MANAGER] Langue mise à jour avec succès: ${language}`);
      return response.data.success;
    } catch (error) {
      console.error("[NOTIF_MANAGER] Erreur lors de la mise à jour de la langue:", error);
      return false;
    }
  }
  
  
  async scheduleMessageNotification(messageSender, conversationId, messagePreview, messageType = 'text', senderId = null) {
    console.log("[NOTIF_MANAGER] Préparation d'une notification de message:", { 
      sender: messageSender, 
      conversationId,
      senderId,
      preview: messagePreview.substring(0, 50) + (messagePreview.length > 50 ? '...' : '')
    });
    
    try {
      const instance = getAxiosInstance();
      if (!instance) {
        console.error("[NOTIF_MANAGER] Client HTTP non initialisé");
        return false;
      }
  
      // Si aucun senderId n'est fourni, tenter de l'obtenir depuis AsyncStorage
      if (!senderId) {
        try {
          // Récupération des données utilisateur depuis AsyncStorage
          const userDataStr = await AsyncStorage.getItem('userData');
          if (userDataStr) {
            const userData = JSON.parse(userDataStr);
            if (userData && userData._id) {
              senderId = typeof userData._id === 'string' 
                ? userData._id 
                : userData._id.toString();
              console.log("[NOTIF_MANAGER] ID expéditeur récupéré d'AsyncStorage:", senderId);
            }
          }
        } catch (userDataError) {
          console.error("[NOTIF_MANAGER] Erreur lors de la récupération des données utilisateur:", userDataError);
        }
      }
  
      // Si toujours pas d'ID expéditeur, alerter mais continuer
      if (!senderId) {
        console.warn("[NOTIF_MANAGER] ATTENTION: Aucun ID d'expéditeur disponible pour la notification");
      }
  
      // Appel à l'API backend pour envoyer la notification push
      const response = await instance.post('/api/notifications/message', {
        conversationId,
        senderId: senderId, // Utiliser l'ID récupéré ou transmis
        senderName: messageSender,
        messagePreview,
        messageType
      });
  
      console.log("[NOTIF_MANAGER] Résultat de l'envoi de notification de message:", response.data);
      
      // Récupération de l'ID utilisateur courant pour vérifier s'il est l'expéditeur
      let currentUserId = null;
      try {
        const userDataStr = await AsyncStorage.getItem('userData');
        if (userDataStr) {
          const userData = JSON.parse(userDataStr);
          if (userData && userData._id) {
            currentUserId = typeof userData._id === 'string' 
              ? userData._id 
              : userData._id.toString();
          }
        }
      } catch (error) {
        console.error("[NOTIF_MANAGER] Erreur lors de la récupération de l'ID utilisateur courant:", error);
      }
      
      // Seulement envoyer une notification locale si l'utilisateur n'est PAS l'expéditeur
      if (currentUserId && senderId && currentUserId !== senderId) {
        console.log("[NOTIF_MANAGER] Envoi de notification locale car utilisateur différent de l'expéditeur");
        
        // Données enrichies pour la notification, incluant tout ce nécessaire pour la navigation
        const notificationData = {
          type: 'new_message',
          conversationId,
          senderId,
          senderName: messageSender,
          messageType,
          timestamp: new Date().toISOString(),
          // Ajout de données spécifiques à la navigation
          navigationTarget: 'Chat',
          navigationScreen: 'ChatTab',
          navigationParams: { conversationId }
        };
        
        await this.notificationService.sendLocalNotification(
          i18n.t('notifications.message.title', { sender: messageSender }),
          messagePreview.substring(0, 100) + (messagePreview.length > 100 ? '...' : ''),
          notificationData
        );
      } else {
        console.log("[NOTIF_MANAGER] Pas de notification locale car l'utilisateur est l'expéditeur");
      }
      
      // Tracking Mixpanel
      try {
        mixpanel.track("Notification Sent", {
          notification_type: "new_message",
          conversation_id: conversationId,
          sender_id: senderId
        });
      } catch (mpError) {
        console.error("[NOTIF_MANAGER] Erreur Mixpanel:", mpError);
      }
      
      return response.data.success;
    } catch (error) {
      console.error("[NOTIF_MANAGER] ERREUR lors de l'envoi de la notification:", error);
      return false;
    }
  }

  // 2. Notification lorsqu'un secret est acheté
  async schedulePurchaseNotification(secretId, buyerName, price, currency) {
    try {
      const formattedPrice = `${price} ${currency}`;
      
      await this.notificationService.sendLocalNotification(
        i18n.t('notifications.purchase.title'),
        i18n.t('notifications.purchase.body', { 
          buyer: buyerName, 
          price: formattedPrice 
        }),
        {
          type: 'purchase',
          secretId,
          price,
          timestamp: new Date().toISOString()
        }
      );
      
      try {
        mixpanel.track("Notification Sent", {
          notification_type: "purchase",
          secret_id: secretId,
          price: price
        });
      } catch (mpError) {
        console.error("Erreur Mixpanel:", mpError);
      }
      
      return true;
    } catch (error) {
      console.error(i18n.t('notifications.errors.purchaseNotification'), error);
      return false;
    }
  }

  // 3. Notification de rappel pour finaliser la configuration Stripe
  async scheduleStripeSetupReminderNotification() {
    try {
      await this.notificationService.sendLocalNotification(
        i18n.t('notifications.stripeSetup.title'),
        i18n.t('notifications.stripeSetup.body'),
        {
          type: 'stripe_setup_reminder',
          timestamp: new Date().toISOString()
        }
      );
      
      try {
        mixpanel.track("Notification Sent", {
          notification_type: "stripe_setup_reminder"
        });
      } catch (mpError) {
        console.error("Erreur Mixpanel:", mpError);
      }
      
      return true;
    } catch (error) {
      console.error(i18n.t('notifications.errors.stripeReminderNotification'), error);
      return false;
    }
  }


}

export default new NotificationManager();