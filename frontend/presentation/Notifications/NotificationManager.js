// NotificationManager.js
// Ce fichier gère toutes les notifications push de l'application

import * as Notifications from 'expo-notifications';
import NotificationService from './NotificationService'; // Votre service existant
import { getAxiosInstance } from '../../data/api/axiosInstance';
import i18n from 'i18next';
import mixpanel from "../../services/mixpanel";

class NotificationManager {
  constructor() {
    this.notificationService = NotificationService;
    this.initialized = false;
  }

  async initialize(userData) {
    if (this.initialized) return;
    
    // S'assurer que le service de notification est initialisé
    await this.notificationService.initialize();
    
    // Vérifier les permissions
    const hasPermission = await this.notificationService.checkPermissions();
    if (!hasPermission) {
      console.log(i18n.t('notifications.logs.permissionDenied'));
      return false;
    }
    
    // Obtenir le token et l'envoyer au serveur si on a un utilisateur connecté
    if (userData && userData._id) {
      const token = await this.notificationService.getToken();
      if (token) {
        await this.registerTokenWithServer(userData._id, token);
      }
    }
    
    this.initialized = true;
    return true;
  }

  async registerTokenWithServer(userId, token) {
    const instance = getAxiosInstance();
    if (!instance) {
      throw new Error(i18n.t('notifications.errors.axiosNotInitialized'));
    }
    
    try {
      // Envoyer le token au serveur
      const response = await instance.post('/api/users/push-token', {
        userId,
        expoPushToken: token
      });
      
      console.log(i18n.t('notifications.logs.tokenRegistered'), response.data);
      return true;
    } catch (error) {
      console.error(i18n.t('notifications.errors.tokenRegistration'), error);
      return false;
    }
  }

  // 1. Notification lorsqu'un message est reçu dans une conversation
  async scheduleMessageNotification(messageSender, conversationId, messagePreview) {
    // Ne pas envoyer de notification si l'utilisateur est déjà dans cette conversation
    // Cette logique devrait être gérée par le backend, mais on peut aussi la mettre ici
    
    try {
      await this.notificationService.sendLocalNotification(
        i18n.t('notifications.message.title', { sender: messageSender }),
        messagePreview.substring(0, 100) + (messagePreview.length > 100 ? '...' : ''),
        {
          type: 'new_message',
          conversationId,
          timestamp: new Date().toISOString()
        }
      );
      
      try {
        mixpanel.track("Notification Sent", {
          notification_type: "new_message",
          conversation_id: conversationId
        });
      } catch (mpError) {
        console.error("Erreur Mixpanel:", mpError);
      }
      
      return true;
    } catch (error) {
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

  // 3. Notification pour les versements Stripe
  async schedulePayoutNotification(amount, currency) {
    try {
      const formattedAmount = `${amount} ${currency}`;
      
      await this.notificationService.sendLocalNotification(
        i18n.t('notifications.payout.title'),
        i18n.t('notifications.payout.body', { amount: formattedAmount }),
        {
          type: 'payout',
          amount,
          timestamp: new Date().toISOString()
        }
      );
      
      try {
        mixpanel.track("Notification Sent", {
          notification_type: "payout",
          amount: amount
        });
      } catch (mpError) {
        console.error("Erreur Mixpanel:", mpError);
      }
      
      return true;
    } catch (error) {
      console.error(i18n.t('notifications.errors.payoutNotification'), error);
      return false;
    }
  }

  // 4. Notification pour les secrets à proximité
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

  // 5. Notification de rappel pour finaliser la configuration Stripe
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

  // 6. Notification quand un utilisateur revient après une longue période
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

  // 7. Notification pour les tendances et statistiques
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

  // 8. Notification pour les événements limités dans le temps
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

  // 9. Notification pour les variations de prix importantes
  async schedulePriceAlertNotification(secretTitle, oldPrice, newPrice, currency) {
    try {
      const priceDiff = ((newPrice - oldPrice) / oldPrice) * 100;
      const formattedDiff = priceDiff.toFixed(1);
      const direction = priceDiff > 0 ? 'up' : 'down';
      
      await this.notificationService.sendLocalNotification(
        i18n.t('notifications.priceAlert.title'),
        i18n.t(`notifications.priceAlert.body.${direction}`, { 
          title: secretTitle,
          diff: Math.abs(formattedDiff),
          newPrice: `${newPrice} ${currency}`
        }),
        {
          type: 'price_alert',
          secretTitle,
          oldPrice,
          newPrice,
          priceDiff,
          timestamp: new Date().toISOString()
        }
      );
      
      try {
        mixpanel.track("Notification Sent", {
          notification_type: "price_alert",
          price_diff_percent: priceDiff
        });
      } catch (mpError) {
        console.error("Erreur Mixpanel:", mpError);
      }
      
      return true;
    } catch (error) {
      console.error(i18n.t('notifications.errors.priceAlertNotification'), error);
      return false;
    }
  }
}

export default new NotificationManager();