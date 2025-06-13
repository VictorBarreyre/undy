import NotificationService from './NotificationService';
import { getAxiosInstance } from '../../data/api/axiosInstance';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';



const isSimulator = () => {
  return !Constants.isDevice;
};


class NotificationManager {
  constructor() {
    this.notificationService = NotificationService;
    this.initialized = false;
  }

  // Initialiser le gestionnaire
  async initialize(userData) {
    if (this.initialized) return true;

    try {
      console.log('[NotificationManager] Initialisation...');
      
      // Nettoyer d'abord les tokens simulateur si on est sur un vrai device
      if (!isSimulator()) {
        await this.cleanupSimulatorToken();
      }
      
      // Initialiser le service
      await this.notificationService.initialize();
      
      // Demander les permissions et obtenir le token
      const { granted, token } = await this.notificationService.requestPermissions();
      
      if (granted && token && userData?._id) {
        // Enregistrer le token sur le serveur
        await this.registerTokenWithServer(userData._id, token);
      }
      
      this.initialized = true;
      console.log('[NotificationManager] Initialisation terminée');
      return true;
    } catch (error) {
      console.error('[NotificationManager] Erreur initialisation:', error);
      return false;
    }
  }

    async cleanupSimulatorToken() {
    try {
      const instance = getAxiosInstance();
      if (!instance) return;

      console.log('[NotificationManager] Nettoyage du token simulateur...');
      
      const response = await instance.post('/api/notifications/cleanup-simulator');
      
      if (response.data.success) {
        // Supprimer aussi localement
        await AsyncStorage.removeItem('apnsToken');
        console.log('[NotificationManager] Token simulateur nettoyé');
      }
    } catch (error) {
      console.error('[NotificationManager] Erreur cleanup:', error);
    }
  }

  // Enregistrer le token sur le serveur
  async registerTokenWithServer(userId, token) {
    if (!token || token === 'SIMULATOR_TOKEN' || token === 'SIMULATOR_MOCK_TOKEN') {
      console.log('[NotificationManager] Token simulateur, pas d\'envoi au serveur');
      return true;
    }

    try {
      const instance = getAxiosInstance();
      if (!instance) {
        console.error('[NotificationManager] Instance Axios non disponible');
        return false;
      }

      console.log('[NotificationManager] Enregistrement du token:', token);
      
      const response = await instance.post('/api/notifications/register', {
        apnsToken: token
      });
      
      console.log('[NotificationManager] Token enregistré:', response.data);
      return true;
    } catch (error) {
      console.error('[NotificationManager] Erreur enregistrement token:', error);
      return false;
    }
  }

  // Envoyer une notification de message au serveur
  async scheduleMessageNotification(messageSender, conversationId, messagePreview, messageType = 'text', senderId = null) {
    try {
      const instance = getAxiosInstance();
      if (!instance) {
        console.error('[NotificationManager] Client HTTP non initialisé');
        return false;
      }

      // Récupérer l'ID de l'expéditeur si non fourni
      if (!senderId) {
        try {
          const userDataStr = await AsyncStorage.getItem('userData');
          if (userDataStr) {
            const userData = JSON.parse(userDataStr);
            senderId = userData?._id;
          }
        } catch (error) {
          console.error('[NotificationManager] Erreur récupération userData:', error);
        }
      }

      console.log('[NotificationManager] Envoi notification message:', {
        conversationId,
        senderId,
        senderName: messageSender,
        preview: messagePreview.substring(0, 50)
      });

      // Appeler l'API serveur pour envoyer la notification push
      const response = await instance.post('/api/notifications/message', {
        conversationId,
        senderId,
        senderName: messageSender,
        messagePreview,
        messageType
      });

      console.log('[NotificationManager] Réponse serveur:', response.data);
      return response.data.success;
    } catch (error) {
      console.error('[NotificationManager] Erreur envoi notification:', error);
      return false;
    }
  }

  // Notification d'achat
  async schedulePurchaseNotification(secretId, buyerName, price, currency) {
    try {
      const instance = getAxiosInstance();
      if (!instance) return false;

      const response = await instance.post('/api/notifications/purchase', {
        secretId,
        buyerName,
        price,
        currency
      });

      return response.data.success;
    } catch (error) {
      console.error('[NotificationManager] Erreur notification achat:', error);
      return false;
    }
  }

  // Rappel Stripe
  async scheduleStripeSetupReminderNotification(userId) {
    try {
      const instance = getAxiosInstance();
      if (!instance) return false;

      const response = await instance.post('/api/notifications/stripe-reminder', {
        userId
      });

      return response.data.success;
    } catch (error) {
      console.error('[NotificationManager] Erreur notification Stripe:', error);
      return false;
    }
  }

  // Test de notification
  async testRemoteNotification() {
    try {
      const token = await this.notificationService.getToken();
      if (!token) {
        return { success: false, message: 'Aucun token disponible' };
      }

      const instance = getAxiosInstance();
      if (!instance) {
        return { success: false, message: 'Client HTTP non initialisé' };
      }

      const response = await instance.post('/api/notifications/test', { token });
      return response.data;
    } catch (error) {
      console.error('[NotificationManager] Erreur test notification:', error);
      return { success: false, error: error.message };
    }
  }
}

export default new NotificationManager();