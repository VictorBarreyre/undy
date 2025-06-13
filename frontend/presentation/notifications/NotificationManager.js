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

  // Nouvelle méthode pour réinitialiser complètement
  async reinitializeForUser(userData) {
    try {
      console.log('[NotificationManager] 🔄 Réinitialisation complète pour:', userData._id);
      
      // 1. Marquer comme non initialisé
      this.initialized = false;
      
      // 2. Nettoyer l'ancien token local
      await AsyncStorage.removeItem('apnsToken');
      console.log('[NotificationManager] ✅ Token local supprimé');
      
      // 3. Nettoyer sur le serveur si on est sur un vrai device
      if (!isSimulator()) {
        try {
          await this.cleanupSimulatorToken();
          console.log('[NotificationManager] ✅ Token serveur nettoyé');
        } catch (error) {
          console.log('[NotificationManager] ⚠️ Erreur nettoyage serveur:', error.message);
        }
      }
      
      // 4. Nettoyer et réinitialiser le service de notifications
      this.notificationService.cleanup();
      await this.notificationService.initialize();
      console.log('[NotificationManager] ✅ Service réinitialisé');
      
      // 5. Redemander les permissions et obtenir un nouveau token
      const { granted, token } = await this.notificationService.requestPermissions();
      console.log('[NotificationManager] 📱 Nouveau token obtenu:', token);
      
      // 6. Debug info
      console.log('[NotificationManager] 🔍 Debug info:');
      console.log('- Device type:', isSimulator() ? 'SIMULATEUR' : 'DEVICE PHYSIQUE');
      console.log('- User ID:', userData._id);
      console.log('- Token:', token);
      
      // 7. Enregistrer le nouveau token si valide
      if (granted && token && userData?._id && token !== 'SIMULATOR_MOCK_TOKEN') {
        await this.registerTokenWithServer(userData._id, token);
        console.log('[NotificationManager] ✅ Token enregistré sur le serveur');
      }
      
      // 8. Marquer comme initialisé et sauvegarder l'ID utilisateur
      this.initialized = true;
      this.currentUserId = userData._id;
      
      console.log('[NotificationManager] ✅ Réinitialisation terminée avec succès');
      return { success: true, token };
    } catch (error) {
      console.error('[NotificationManager] ❌ Erreur réinitialisation:', error);
      this.initialized = false;
      return { success: false, error: error.message };
    }
  }

  // Modifier la méthode initialize pour détecter les incohérences
  async initialize(userData) {
    try {
      console.log('[NotificationManager] 📱 Initialisation pour utilisateur:', userData._id);
      console.log('[NotificationManager] 📱 Device:', isSimulator() ? 'SIMULATEUR' : 'DEVICE PHYSIQUE');
      
      // Si déjà initialisé pour un autre utilisateur, réinitialiser
      if (this.initialized && this.currentUserId !== userData._id) {
        console.log('[NotificationManager] 👤 Changement d\'utilisateur détecté');
        return await this.reinitializeForUser(userData);
      }
      
      // Si déjà initialisé pour le même utilisateur
      if (this.initialized && this.currentUserId === userData._id) {
        // Vérifier la cohérence du token
        const currentToken = await AsyncStorage.getItem('apnsToken');
        const isOnSimulator = isSimulator();
        
        console.log('[NotificationManager] 🔍 Vérification de cohérence:');
        console.log('- Token actuel:', currentToken);
        console.log('- Sur simulateur:', isOnSimulator);
        
        // Si on est sur device physique mais qu'on a un token simulateur
        if (!isOnSimulator && currentToken === 'SIMULATOR_MOCK_TOKEN') {
          console.log('[NotificationManager] ⚠️ Token simulateur détecté sur device physique!');
          return await this.reinitializeForUser(userData);
        }
        
        // Si on est sur simulateur mais qu'on a un vrai token
        if (isOnSimulator && currentToken && currentToken !== 'SIMULATOR_MOCK_TOKEN') {
          console.log('[NotificationManager] ⚠️ Token device détecté sur simulateur!');
          return await this.reinitializeForUser(userData);
        }
        
        console.log('[NotificationManager] ✅ Déjà initialisé et cohérent');
        return true;
      }

      // Première initialisation
      console.log('[NotificationManager] 🚀 Première initialisation...');
      
      // Nettoyer d'abord les tokens simulateur si on est sur un vrai device
      if (!isSimulator()) {
        const oldToken = await AsyncStorage.getItem('apnsToken');
        if (oldToken === 'SIMULATOR_MOCK_TOKEN') {
          console.log('[NotificationManager] 🧹 Nettoyage du token simulateur existant');
          await AsyncStorage.removeItem('apnsToken');
          await this.cleanupSimulatorToken();
        }
      }
      
      // Initialiser le service
      await this.notificationService.initialize();
      console.log('[NotificationManager] ✅ Service initialisé');
      
      // Demander les permissions et obtenir le token
      const { granted, token } = await this.notificationService.requestPermissions();
      console.log('[NotificationManager] 📱 Permissions:', granted ? 'Accordées' : 'Refusées');
      console.log('[NotificationManager] 🔑 Token:', token);
      
      if (granted && token && userData?._id) {
        // Vérifier une dernière fois la cohérence avant l'enregistrement
        const isOnSimulator = isSimulator();
        const isSimulatorToken = token === 'SIMULATOR_MOCK_TOKEN';
        
        if (!isOnSimulator && isSimulatorToken) {
          console.log('[NotificationManager] ⚠️ Incohérence détectée, réinitialisation forcée');
          return await this.reinitializeForUser(userData);
        }
        
        // Enregistrer le token sur le serveur
        await this.registerTokenWithServer(userData._id, token);
      }
      
      this.initialized = true;
      this.currentUserId = userData._id;
      console.log('[NotificationManager] ✅ Initialisation terminée');
      return true;
    } catch (error) {
      console.error('[NotificationManager] ❌ Erreur initialisation:', error);
      return false;
    }
  }

  async cleanupSimulatorToken() {
    try {
      const instance = getAxiosInstance();
      if (!instance) return;

      console.log('[NotificationManager] 🧹 Nettoyage du token simulateur...');
      
      const response = await instance.post('/api/notifications/cleanup-simulator');
      
      if (response.data.success) {
        console.log('[NotificationManager] ✅ Token simulateur nettoyé sur le serveur');
      }
    } catch (error) {
      console.error('[NotificationManager] ⚠️ Erreur cleanup:', error);
    }
  }

  // Enregistrer le token sur le serveur
  async registerTokenWithServer(userId, token) {
    if (!token || token === 'SIMULATOR_TOKEN' || token === 'SIMULATOR_MOCK_TOKEN') {
      console.log('[NotificationManager] 🚫 Token simulateur, pas d\'envoi au serveur');
      return true;
    }

    try {
      const instance = getAxiosInstance();
      if (!instance) {
        console.error('[NotificationManager] ❌ Instance Axios non disponible');
        return false;
      }

      console.log('[NotificationManager] 📤 Enregistrement du token:', token.substring(0, 20) + '...');
      
      const response = await instance.post('/api/notifications/register', {
        apnsToken: token
      });
      
      console.log('[NotificationManager] ✅ Token enregistré:', response.data);
      return true;
    } catch (error) {
      console.error('[NotificationManager] ❌ Erreur enregistrement token:', error);
      return false;
    }
  }

  // Méthode pour nettoyer complètement (utilisée lors du logout)
  async cleanup() {
    try {
      console.log('[NotificationManager] 🧹 Nettoyage complet...');
      
      // Nettoyer le token local
      await AsyncStorage.removeItem('apnsToken');
      
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
            console.log('[NotificationManager] 📱 SenderId récupéré depuis AsyncStorage:', senderId);
          }
        } catch (error) {
          console.error('[NotificationManager] ❌ Erreur récupération userData:', error);
        }
      }

      if (!senderId) {
        console.error('[NotificationManager] ❌ SenderId manquant! Impossible d\'envoyer la notification');
        return false;
      }

      console.log('[NotificationManager] 📤 Envoi notification message:', {
        conversationId,
        senderId,
        senderName: messageSender,
        preview: messagePreview?.substring(0, 50),
        messageType
      });

      // Appeler l'API serveur pour envoyer la notification push
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
      console.error('[NotificationManager] ❌ Erreur envoi notification:', error);
      return false;
    }
  }

  // Notification d'achat
  async schedulePurchaseNotification(secretId, buyerId, buyerName, price, currency) {
    try {
      const instance = getAxiosInstance();
      if (!instance) return false;

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
      console.error('[NotificationManager] ❌ Erreur notification achat:', error);
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
      console.error('[NotificationManager] ❌ Erreur notification Stripe:', error);
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

      console.log('[NotificationManager] 🧪 Test de notification avec token:', token.substring(0, 20) + '...');

      const instance = getAxiosInstance();
      if (!instance) {
        return { success: false, message: 'Client HTTP non initialisé' };
      }

      const response = await instance.post('/api/notifications/test', { token });
      return response.data;
    } catch (error) {
      console.error('[NotificationManager] ❌ Erreur test notification:', error);
      return { success: false, error: error.message };
    }
  }
}

export default new NotificationManager();