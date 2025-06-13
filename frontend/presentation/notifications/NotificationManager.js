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
      console.log('[NotificationManager] 📱 Début initialisation pour:', userData._id);
      console.log('[NotificationManager] 📱 Type de device:', Constants.isDevice ? 'DEVICE PHYSIQUE' : 'SIMULATEUR');
      console.log('[NotificationManager] 📱 Device name:', Constants.deviceName || 'Non disponible');
      
      // Si déjà initialisé pour le même utilisateur, ne rien faire
      if (this.initialized && this.currentUserId === userData._id) {
        console.log('[NotificationManager] ✅ Déjà initialisé pour cet utilisateur');
        return true;
      }

      // Si changement d'utilisateur, réinitialiser
      if (this.initialized && this.currentUserId !== userData._id) {
        console.log('[NotificationManager] 👤 Changement d\'utilisateur détecté, réinitialisation...');
        await this.cleanup();
      }

      // Nettoyer les anciens tokens simulateur sur device physique
      if (Constants.isDevice) {
        const oldToken = await AsyncStorage.getItem('apnsToken');
        if (oldToken === 'SIMULATOR_MOCK_TOKEN') {
          console.log('[NotificationManager] 🧹 Nettoyage du token simulateur sur device physique');
          await AsyncStorage.removeItem('apnsToken');
        }
      }
      
      // Initialiser le service de notifications
      await this.notificationService.initialize();
      console.log('[NotificationManager] ✅ Service de notifications initialisé');
      
      // Demander les permissions et obtenir le token
      const { granted, token } = await this.notificationService.requestPermissions();
      console.log('[NotificationManager] 📱 Permissions:', granted ? 'Accordées' : 'Refusées');
      console.log('[NotificationManager] 🔑 Token obtenu:', token ? token.substring(0, 20) + '...' : 'Aucun');
      
      if (granted && token && userData?._id) {
        // Enregistrer le token sur le serveur
        await this.registerTokenWithServer(userData._id, token);
      }
      
      // Marquer comme initialisé
      this.initialized = true;
      this.currentUserId = userData._id;
      
      console.log('[NotificationManager] ✅ Initialisation terminée avec succès');
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
      console.log('[NotificationManager] 🚫 Token simulateur détecté, pas d\'envoi au serveur');
      return true;
    }

    try {
      const instance = getAxiosInstance();
      if (!instance) {
        console.error('[NotificationManager] ❌ Instance Axios non disponible');
        return false;
      }

      console.log('[NotificationManager] 📤 Enregistrement du token pour l\'utilisateur:', userId);
      
      const response = await instance.post('/api/notifications/register', {
        apnsToken: token
      });
      
      if (response.data.success) {
        console.log('[NotificationManager] ✅ Token enregistré avec succès');
        // Sauvegarder localement pour référence
        await AsyncStorage.setItem('lastRegisteredToken', token);
      } else {
        console.log('[NotificationManager] ⚠️ Réponse serveur:', response.data);
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

      console.log('[NotificationManager] 🧹 Nettoyage du token simulateur sur le serveur...');
      
      const response = await instance.post('/api/notifications/cleanup-simulator');
      
      if (response.data.success) {
        console.log('[NotificationManager] ✅ Token simulateur nettoyé');
      }
    } catch (error) {
      console.error('[NotificationManager] ⚠️ Erreur cleanup:', error.message);
    }
  }

  // Méthode de nettoyage complet
  async cleanup() {
    try {
      console.log('[NotificationManager] 🧹 Nettoyage complet...');
      
      // Nettoyer le service
      this.notificationService.cleanup();
      
      // Réinitialiser les variables
      this.initialized = false;
      this.currentUserId = null;
      
      console.log('[NotificationManager] ✅ Nettoyage terminé');
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
            console.log('[NotificationManager] 📱 SenderId récupéré:', senderId);
          }
        } catch (error) {
          console.error('[NotificationManager] ❌ Erreur récupération userData:', error);
        }
      }

      if (!senderId) {
        console.error('[NotificationManager] ❌ SenderId manquant!');
        return false;
      }

      console.log('[NotificationManager] 📤 Envoi notification message:', {
        conversationId,
        senderId,
        senderName: messageSender,
        preview: messagePreview?.substring(0, 50),
        messageType
      });

      const response = await instance.post('/api/notifications/message', {
        conversationId,
        senderId,
        senderName: messageSender,
        messagePreview,
        messageType
      });

      console.log('[NotificationManager] ✅ Réponse serveur:', response.data);
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

      console.log('[NotificationManager] 💰 Envoi notification d\'achat');

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
      console.log('[NotificationManager] 🧪 Début du test de notification');
      
      // Obtenir le token actuel
      const token = await this.notificationService.getToken();
      if (!token) {
        console.log('[NotificationManager] ❌ Aucun token disponible');
        return { success: false, message: 'Aucun token disponible' };
      }

      console.log('[NotificationManager] 🔑 Test avec token:', token.substring(0, 20) + '...');

      const instance = getAxiosInstance();
      if (!instance) {
        console.log('[NotificationManager] ❌ Client HTTP non initialisé');
        return { success: false, message: 'Client HTTP non initialisé' };
      }

      const response = await instance.post('/api/notifications/test', { token });
      console.log('[NotificationManager] ✅ Réponse du test:', response.data);
      
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