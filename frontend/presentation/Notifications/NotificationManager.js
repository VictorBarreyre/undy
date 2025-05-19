
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
        const response = await instance.post('/api/notifications/token', {
            expoPushToken: token
        });
        
        // Si l'enregistrement réussit, sauvegarder le timestamp
        if (response.data && response.data.success) {
          await AsyncStorage.setItem(TOKEN_REGISTRATION_TIME_KEY, now.toString());
        }
        
        console.log(i18n.t('notifications.logs.tokenRegistered'), response.data);
        return true;
    } catch (error) {
        console.error(i18n.t('notifications.errors.tokenRegistration'), error);
        
        // Ignorer l'erreur en développement pour ne pas bloquer le flux
        if (__DEV__) {
            console.log("[NOTIF_MANAGER] Erreur ignorée en développement");
            return true;
        }
        
        return false;
    }
  }
  
  async scheduleMessageNotification(messageSender, conversationId, messagePreview) {
    console.log("[NOTIF_MANAGER] Préparation d'une notification de message:", { 
        sender: messageSender, 
        conversationId,
        preview: messagePreview.substring(0, 50) + (messagePreview.length > 50 ? '...' : '')
    });
    
    try {
        const result = await this.notificationService.sendLocalNotification(
            i18n.t('notifications.message.title', { sender: messageSender }),
            messagePreview.substring(0, 100) + (messagePreview.length > 100 ? '...' : ''),
            {
                type: 'new_message',
                conversationId,
                timestamp: new Date().toISOString()
            }
        );
        
        console.log("[NOTIF_MANAGER] Résultat de l'envoi de notification:", result);
        
        try {
            mixpanel.track("Notification Sent", {
                notification_type: "new_message",
                conversation_id: conversationId
            });
        } catch (mpError) {
            console.error("[NOTIF_MANAGER] Erreur Mixpanel:", mpError);
        }
        
        return result;
    } catch (error) {
        console.error("[NOTIF_MANAGER] ERREUR lors de l'envoi de la notification:", error);
        console.error(i18n.t('notifications.errors.messageNotification'), error);
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


  // 3. Notification pour les secrets à proximité
  async scheduleNearbySecretsNotification(count, distance) {
    try {
      await this.notificationService.sendLocalNotification(
        i18n.t('notifications.nearby.title'),
        i18n.t('notifications.nearby.body', { count, distance }),
        {
          type: 'nearby_secrets',
          count,
          distance,
          timestamp: new Date().toISOString()
        }
      );
      
      try {
        mixpanel.track("Notification Sent", {
          notification_type: "nearby_secrets",
          count: count,
          distance: distance
        });
      } catch (mpError) {
        console.error("Erreur Mixpanel:", mpError);
      }
      
      return true;
    } catch (error) {
      console.error(i18n.t('notifications.errors.nearbyNotification'), error);
      return false;
    }
  }

  // 4. Notification de rappel pour finaliser la configuration Stripe
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

  // 5. Notification quand un utilisateur revient après une longue période
  async scheduleWelcomeBackNotification(daysAbsent) {
    try {
      await this.notificationService.sendLocalNotification(
        i18n.t('notifications.welcomeBack.title'),
        i18n.t('notifications.welcomeBack.body', { days: daysAbsent }),
        {
          type: 'welcome_back',
          daysAbsent,
          timestamp: new Date().toISOString()
        }
      );
      
      try {
        mixpanel.track("Notification Sent", {
          notification_type: "welcome_back",
          days_absent: daysAbsent
        });
      } catch (mpError) {
        console.error("Erreur Mixpanel:", mpError);
      }
      
      return true;
    } catch (error) {
      console.error(i18n.t('notifications.errors.welcomeBackNotification'), error);
      return false;
    }
  }

  // 6. Notification pour les tendances et statistiques
  async scheduleStatsNotification(secretsCount, purchasesCount) {
    try {
      await this.notificationService.sendLocalNotification(
        i18n.t('notifications.stats.title'),
        i18n.t('notifications.stats.body', { 
          secrets: secretsCount, 
          purchases: purchasesCount 
        }),
        {
          type: 'stats_update',
          secretsCount,
          purchasesCount,
          timestamp: new Date().toISOString()
        }
      );
      
      try {
        mixpanel.track("Notification Sent", {
          notification_type: "stats_update",
          secrets_count: secretsCount,
          purchases_count: purchasesCount
        });
      } catch (mpError) {
        console.error("Erreur Mixpanel:", mpError);
      }
      
      return true;
    } catch (error) {
      console.error(i18n.t('notifications.errors.statsNotification'), error);
      return false;
    }
  }

  // 7. Notification pour les événements limités dans le temps
  async scheduleTimeLimitedEventNotification(eventName, daysLeft) {
    try {
      await this.notificationService.sendLocalNotification(
        i18n.t('notifications.event.title'),
        i18n.t('notifications.event.body', { 
          event: eventName, 
          days: daysLeft 
        }),
        {
          type: 'time_limited_event',
          eventName,
          daysLeft,
          timestamp: new Date().toISOString()
        }
      );
      
      try {
        mixpanel.track("Notification Sent", {
          notification_type: "time_limited_event",
          event_name: eventName,
          days_left: daysLeft
        });
      } catch (mpError) {
        console.error("Erreur Mixpanel:", mpError);
      }
      
      return true;
    } catch (error) {
      console.error(i18n.t('notifications.errors.eventNotification'), error);
      return false;
    }
  }


}

export default new NotificationManager();