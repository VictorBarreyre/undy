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
    this.currentUserId = null;
  }

  // Méthode principale d'initialisation
  async initialize(userData) {
    try {




      // Si déjà initialisé pour le même utilisateur, ne rien faire
      if (this.initialized && this.currentUserId === userData._id) {

        return true;
      }

      // Si changement d'utilisateur, réinitialiser
      if (this.initialized && this.currentUserId !== userData._id) {

        await this.cleanup();
      }

      // Nettoyer les anciens tokens simulateur sur device physique
      if (Constants.isDevice) {
        const oldToken = await AsyncStorage.getItem('apnsToken');
        if (oldToken === 'SIMULATOR_MOCK_TOKEN') {

          await AsyncStorage.removeItem('apnsToken');
        }
      }

      // Initialiser le service de notifications
      await this.notificationService.initialize();


      // Demander les permissions et obtenir le token
      const { granted, token } = await this.notificationService.requestPermissions();



      if (granted && token && userData?._id) {
        // Enregistrer le token sur le serveur
        await this.registerTokenWithServer(userData._id, token);
      }

      // Marquer comme initialisé
      this.initialized = true;
      this.currentUserId = userData._id;


      return true;
    } catch (error) {
      console.error('[NotificationManager] ❌ Erreur initialisation:', error);
      this.initialized = false;
      return false;
    }
  }

  // Enregistrer le token sur le serveur
  async registerTokenWithServer(userId, token) {
    // Ne pas envoyer les tokens simulateur au serveur
    if (!token || token === 'SIMULATOR_TOKEN' || token === 'SIMULATOR_MOCK_TOKEN') {

      return true;
    }

    try {
      const instance = getAxiosInstance();
      if (!instance) {
        console.error('[NotificationManager] ❌ Instance Axios non disponible');
        return false;
      }



      const response = await instance.post('/api/notifications/register', {
        apnsToken: token
      });

      if (response.data.success) {

        // Sauvegarder localement pour référence
        await AsyncStorage.setItem('lastRegisteredToken', token);
      } else {

      }

      return response.data.success;
    } catch (error) {
      console.error('[NotificationManager] ❌ Erreur enregistrement token:', error.response?.data || error.message);
      return false;
    }
  }

  // Nettoyer les tokens simulateur sur le serveur
  async cleanupSimulatorToken() {
    try {
      const instance = getAxiosInstance();
      if (!instance) return;



      const response = await instance.post('/api/notifications/cleanup-simulator');

      if (response.data.success) {

      }
    } catch (error) {
      console.error('[NotificationManager] ⚠️ Erreur cleanup:', error.message);
    }
  }

  // Méthode de nettoyage complet
  async cleanup() {
    try {


      // Nettoyer le service
      this.notificationService.cleanup();

      // Réinitialiser les variables
      this.initialized = false;
      this.currentUserId = null;


    } catch (error) {
      console.error('[NotificationManager] ❌ Erreur nettoyage:', error);
    }
  }

  // Envoyer une notification de message au serveur
  async scheduleMessageNotification(messageSender, conversationId, messagePreview, messageType = 'text', senderId = null) {
    try {
      const instance = getAxiosInstance();
      if (!instance) {
        console.error('[NotificationManager] ❌ Client HTTP non initialisé');
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
          console.error('[NotificationManager] ❌ Erreur récupération userData:', error);
        }
      }

      if (!senderId) {
        console.error('[NotificationManager] ❌ SenderId manquant!');
        return false;
      }









      const response = await instance.post('/api/notifications/message', {
        conversationId,
        senderId,
        senderName: messageSender,
        messagePreview,
        messageType
      });


      return response.data.success;
    } catch (error) {
      console.error('[NotificationManager] ❌ Erreur envoi notification:', error.response?.data || error.message);
      return false;
    }
  }

  // Notification d'achat
  async schedulePurchaseNotification(secretId, buyerId, buyerName, price, currency) {
    try {
      const instance = getAxiosInstance();
      if (!instance) {
        console.error('[NotificationManager] ❌ Client HTTP non initialisé');
        return false;
      }



      const response = await instance.post('/api/notifications/purchase', {
        secretId,
        buyerId,
        buyerName,
        price,
        currency
      });

      return response.data.success;
    } catch (error) {
      console.error('[NotificationManager] ❌ Erreur notification achat:', error.response?.data || error.message);
      return false;
    }
  }

  // Rappel Stripe
  async scheduleStripeSetupReminderNotification(userId) {
    try {
      const instance = getAxiosInstance();
      if (!instance) {
        console.error('[NotificationManager] ❌ Client HTTP non initialisé');
        return false;
      }

      const response = await instance.post('/api/notifications/stripe-reminder', {
        userId
      });

      return response.data.success;
    } catch (error) {
      console.error('[NotificationManager] ❌ Erreur notification Stripe:', error.response?.data || error.message);
      return false;
    }
  }

  // Test de notification
  async testRemoteNotification() {
    try {


      // Obtenir le token actuel
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
      console.error('[NotificationManager] ❌ Erreur test notification:', error.response?.data || error.message);
      return { success: false, error: error.message };
    }
  }

  // Méthode utilitaire pour obtenir le statut actuel
  async getStatus() {
    const token = await this.notificationService.getToken();
    const isDevice = Constants.isDevice;

    return {
      initialized: this.initialized,
      currentUserId: this.currentUserId,
      hasToken: !!token,
      tokenPreview: token ? token.substring(0, 20) + '...' : 'Aucun',
      isDevice: isDevice,
      deviceType: isDevice ? 'DEVICE PHYSIQUE' : 'SIMULATEUR'
    };
  }
}

// Export d'une instance unique
export default new NotificationManager();