// NotificationDebugHelper.js
// Utilitaire pour tester et déboguer les notifications de conversation

import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { navigationRef } from '../../navigation/NavigationService';
import { getAxiosInstance } from '../../data/api/axiosInstance';

class NotificationDebugHelper {
  
  // Simuler une notification de message pour tester la navigation
  static async simulateMessageNotification(conversationId, senderName = "Test User") {
    console.log('[DEBUG] 🧪 Simulation d\'une notification de message');
    console.log('[DEBUG] 📋 ConversationId:', conversationId);
    
    try {
      // Données de notification similaires à celles envoyées par le serveur
      const notificationData = {
        type: 'new_message',
        conversationId: conversationId,
        senderId: 'test-sender-id',
        senderName: senderName,
        messageType: 'text',
        timestamp: new Date().toISOString(),
        navigationTarget: 'Chat',
        navigationScreen: 'ChatTab',
        navigationParams: { conversationId }
      };
      
      // Envoyer la notification locale
      const identifier = await Notifications.scheduleNotificationAsync({
        content: {
          title: `Message de ${senderName}`,
          body: "Ceci est un message de test pour vérifier la navigation",
          data: notificationData,
          sound: true,
        },
        trigger: { 
          seconds: 2, // Dans 2 secondes
          repeats: false 
        }
      });
      
      console.log('[DEBUG] ✅ Notification programmée avec ID:', identifier);
      console.log('[DEBUG] 📱 Données de la notification:', JSON.stringify(notificationData, null, 2));
      
      return identifier;
    } catch (error) {
      console.error('[DEBUG] ❌ Erreur lors de la simulation:', error);
      return null;
    }
  }
  
  // Tester avec une vraie notification du serveur
  static async testServerNotification(conversationId, testMessage = "Message de test serveur") {
    console.log('[DEBUG] 🌐 Test notification serveur...');
    console.log('[DEBUG] 📋 ConversationId:', conversationId);
    
    try {
      const axiosInstance = getAxiosInstance();
      if (!axiosInstance) {
        console.error('[DEBUG] ❌ Instance Axios non disponible');
        return false;
      }

      // Récupérer les données utilisateur pour l'ID expéditeur
      const userDataStr = await AsyncStorage.getItem('userData');
      if (!userDataStr) {
        console.error('[DEBUG] ❌ Données utilisateur non trouvées');
        return false;
      }

      const userData = JSON.parse(userDataStr);
      const senderId = userData._id;
      const senderName = userData.name || "Utilisateur Test";

      console.log('[DEBUG] 👤 Expéditeur:', { senderId, senderName });

      // Appeler l'API du serveur pour envoyer une notification
      const response = await axiosInstance.post('/api/notifications/message', {
        conversationId: conversationId,
        senderId: senderId,
        senderName: senderName,
        messagePreview: testMessage,
        messageType: 'text'
      });

      console.log('[DEBUG] 📡 Réponse serveur:', response.data);

      if (response.data.success) {
        console.log('[DEBUG] ✅ Notification serveur envoyée avec succès');
        console.log('[DEBUG] 📋 Détails:', response.data.details);
        return true;
      } else {
        console.log('[DEBUG] ❌ Échec notification serveur:', response.data.message);
        return false;
      }
    } catch (error) {
      console.error('[DEBUG] ❌ Erreur test notification serveur:', error);
      if (error.response) {
        console.error('[DEBUG] 📡 Réponse d\'erreur:', error.response.data);
      }
      return false;
    }
  }

  // Comparer les données de notification locale vs serveur
  static compareNotificationData() {
    console.log('[DEBUG] 🔍 COMPARAISON DES DONNÉES DE NOTIFICATION');
    
    // Structure attendue du serveur (selon votre contrôleur)
    const serverNotificationStructure = {
      type: 'new_message',
      conversationId: 'string',
      senderId: 'string',
      messageType: 'text',
      timestamp: 'ISO string'
    };

    // Structure de votre notification locale de test
    const localNotificationStructure = {
      type: 'new_message',
      conversationId: 'string',
      senderId: 'test-sender-id',
      senderName: 'string',
      messageType: 'text',
      timestamp: 'ISO string',
      navigationTarget: 'Chat',
      navigationScreen: 'ChatTab',
      navigationParams: { conversationId: 'string' }
    };

    console.log('[DEBUG] 📋 Structure serveur attendue:', JSON.stringify(serverNotificationStructure, null, 2));
    console.log('[DEBUG] 📋 Structure locale de test:', JSON.stringify(localNotificationStructure, null, 2));
    
    console.log('[DEBUG] ⚠️  DIFFÉRENCES IDENTIFIÉES:');
    console.log('[DEBUG] 1. La notification serveur n\'inclut PAS senderName');
    console.log('[DEBUG] 2. La notification serveur n\'inclut PAS navigationTarget, navigationScreen, navigationParams');
    console.log('[DEBUG] 3. Seules les données essentielles sont envoyées par le serveur');
  }

  // Simuler les données exactes du serveur (pour comparaison)
  static async simulateExactServerNotification(conversationId, senderId, senderName = "Test Serveur") {
    console.log('[DEBUG] 🎭 Simulation EXACTE des données serveur...');
    
    try {
      // Données exactement comme le serveur les envoie (sans les champs supplémentaires)
      const exactServerData = {
        type: 'new_message',
        conversationId: conversationId,
        senderId: senderId,
        messageType: 'text',
        timestamp: new Date().toISOString()
        // ATTENTION: Pas de senderName, navigationTarget, etc. comme le serveur
      };
      
      console.log('[DEBUG] 📡 Données exactes du serveur:', JSON.stringify(exactServerData, null, 2));
      
      // Envoyer la notification avec les données exactes du serveur
      const identifier = await Notifications.scheduleNotificationAsync({
        content: {
          title: `Message de ${senderName}`, // Le titre vient du serveur
          body: "🎭 Simulation exacte serveur - Cliquez pour tester",
          data: exactServerData, // Seulement les données que le serveur envoie
          sound: true,
        },
        trigger: { 
          seconds: 2,
          repeats: false 
        }
      });
      
      console.log('[DEBUG] ✅ Notification avec données serveur exactes programmée:', identifier);
      return identifier;
    } catch (error) {
      console.error('[DEBUG] ❌ Erreur simulation serveur exacte:', error);
      return null;
    }
  }

  // Test de l'écouteur de notification avec données serveur exactes
  static async testNotificationListenerWithServerData(conversationId, senderId) {
    console.log('[DEBUG] 🎧 Test écouteur avec données serveur exactes...');
    
    // Créer un écouteur temporaire pour ce test spécifique
    const testListener = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('[DEBUG] 🔔 ÉCOUTEUR TEST SERVEUR DÉCLENCHÉ !');
      console.log('[DEBUG] 📋 Données reçues:', JSON.stringify(response.notification.request.content.data, null, 2));
      
      const data = response.notification.request.content.data;
      
      // Vérifier si c'est notre test
      if (data?.type === 'new_message' && data?.conversationId === conversationId) {
        console.log('[DEBUG] ✅ Données de test serveur détectées !');
        console.log('[DEBUG] 🎯 ConversationId:', data.conversationId);
        console.log('[DEBUG] 👤 SenderId:', data.senderId);
        console.log('[DEBUG] 📅 Timestamp:', data.timestamp);
        
        // Test de navigation avec ces données exactes
        console.log('[DEBUG] 🚀 Test de navigation avec données serveur...');
        this.testDirectNavigation(data.conversationId);
      }
      
      // Nettoyer l'écouteur après 10 secondes
      setTimeout(() => {
        Notifications.removeNotificationSubscription(testListener);
        console.log('[DEBUG] 🧹 Écouteur de test serveur nettoyé');
      }, 10000);
    });
    
    // Envoyer la notification avec données serveur exactes
    setTimeout(async () => {
      await this.simulateExactServerNotification(conversationId, senderId, "Serveur Test");
    }, 1000);
    
    console.log('[DEBUG] ✅ Test écouteur avec données serveur lancé');
    console.log('[DEBUG] 📱 Cliquez sur la notification qui va apparaître !');
  }

  // Récupérer les vraies conversations de l'utilisateur
  static async getRealConversations() {
    console.log('[DEBUG] 🔍 Récupération des vraies conversations...');
    
    try {
      const axiosInstance = getAxiosInstance();
      if (!axiosInstance) {
        console.error('[DEBUG] ❌ Instance Axios non disponible');
        return [];
      }

      const response = await axiosInstance.get('/api/secrets/conversations');
      console.log('[DEBUG] 📋 Réponse conversations:', response.data);

      if (response.data && Array.isArray(response.data)) {
        const conversations = response.data.filter(conv => conv._id).slice(0, 5); // Prendre max 5 conversations
        console.log('[DEBUG] ✅ Conversations trouvées:', conversations.map(c => ({
          id: c._id,
          name: c.name || 'Sans nom',
          participantsCount: c.participants?.length || 0
        })));
        return conversations;
      } else {
        console.log('[DEBUG] ❌ Format de réponse inattendu');
        return [];
      }
    } catch (error) {
      console.error('[DEBUG] ❌ Erreur récupération conversations:', error);
      return [];
    }
  }

  // Test complet avec notification serveur réelle
  static async testWithRealServerNotification(conversationId = null) {
    console.log('[DEBUG] 🧪 ===== TEST AVEC NOTIFICATION SERVEUR RÉELLE =====');
    
    // 1. Si pas de conversationId fourni, essayer de récupérer une vraie conversation
    let realConversationId = conversationId;
    
    if (!realConversationId || realConversationId === "675a1234abcd5678efgh9012") {
      console.log('[DEBUG] 🔍 ID de conversation factice détecté, récupération d\'une vraie conversation...');
      const conversations = await this.getRealConversations();
      
      if (conversations.length > 0) {
        realConversationId = conversations[0]._id;
        console.log('[DEBUG] ✅ Utilisation de la conversation:', realConversationId);
        console.log('[DEBUG] 📋 Nom de la conversation:', conversations[0].name || 'Sans nom');
      } else {
        console.log('[DEBUG] ❌ Aucune conversation trouvée, impossible de continuer');
        return false;
      }
    }
    
    // 2. Comparer les structures
    this.compareNotificationData();
    
    // 3. Vérifier les permissions
    const hasPermissions = await this.checkNotificationPermissions();
    if (!hasPermissions) {
      console.log('[DEBUG] ❌ Test arrêté: pas de permissions');
      return false;
    }
    
    // 4. Vérifier l'état de navigation
    const navState = this.debugNavigationState();
    if (!navState) {
      console.log('[DEBUG] ❌ Test arrêté: navigation pas prête');
      return false;
    }
    
    // 5. Nettoyer les navigations en attente
    await this.clearPendingNavigations();
    
    // 6. Envoyer une vraie notification via le serveur
    console.log('[DEBUG] 🌐 Envoi de notification via le serveur...');
    console.log('[DEBUG] 🎯 ID de conversation utilisé:', realConversationId);
    const serverResult = await this.testServerNotification(realConversationId, "🧪 Test serveur - Cliquez pour tester la navigation");
    
    if (serverResult) {
      console.log('[DEBUG] ✅ Notification serveur envoyée');
      console.log('[DEBUG] 📱 Une notification devrait apparaître sur votre appareil');
      console.log('[DEBUG] 👆 CLIQUEZ SUR LA NOTIFICATION pour tester la navigation');
      
      // Attendre et vérifier si la navigation se déclenche
      setTimeout(() => {
        console.log('[DEBUG] ⏰ Si vous avez cliqué sur la notification, vous devriez voir des logs de navigation maintenant...');
      }, 5000);
      
      return true;
    } else {
      console.log('[DEBUG] ❌ Échec de l\'envoi de notification serveur');
      return false;
    }
  }
  
  // Tester la navigation directement sans notification
  static testDirectNavigation(conversationId) {
    console.log('[DEBUG] 🧪 Test de navigation directe vers conversation:', conversationId);
    
    if (navigationRef.isReady()) {
      try {
        navigationRef.navigate('MainApp', {
          screen: 'Tabs',
          params: {
            screen: 'ChatTab',
            params: {
              screen: 'Chat',
              params: { conversationId },
            },
          },
        });
        console.log('[DEBUG] ✅ Navigation directe réussie');
        return true;
      } catch (error) {
        console.error('[DEBUG] ❌ Navigation directe échouée:', error);
        return false;
      }
    } else {
      console.log('[DEBUG] ❌ NavigationRef pas prêt');
      return false;
    }
  }
  
  // Afficher l'état de navigation actuel
  static debugNavigationState() {
    console.log('[DEBUG] 🔍 Debug de l\'état de navigation');
    
    if (navigationRef.isReady()) {
      try {
        const state = navigationRef.getState();
        console.log('[DEBUG] 📋 État complet:', JSON.stringify(state, null, 2));
        
        // Analyser la structure
        if (state && state.routes) {
          console.log('[DEBUG] 🗂️ Routes principales:');
          state.routes.forEach((route, index) => {
            console.log(`[DEBUG]   ${index}: ${route.name} (clé: ${route.key})`);
            if (route.state && route.state.routes) {
              console.log(`[DEBUG]     Sous-routes:`);
              route.state.routes.forEach((subRoute, subIndex) => {
                console.log(`[DEBUG]       ${subIndex}: ${subRoute.name}`);
              });
            }
          });
        }
        
        return state;
      } catch (error) {
        console.error('[DEBUG] ❌ Erreur lors du debug:', error);
        return null;
      }
    } else {
      console.log('[DEBUG] ❌ NavigationContainer pas prêt');
      return null;
    }
  }
  
  // Vérifier les permissions de notification
  static async checkNotificationPermissions() {
    console.log('[DEBUG] 🔍 Vérification des permissions de notifications');
    
    try {
      const { status } = await Notifications.getPermissionsAsync();
      console.log('[DEBUG] 📋 Status des permissions:', status);
      
      if (status !== 'granted') {
        console.log('[DEBUG] ⚠️ Permissions non accordées, demande...');
        const { status: newStatus } = await Notifications.requestPermissionsAsync();
        console.log('[DEBUG] 📋 Nouveau status:', newStatus);
        return newStatus === 'granted';
      }
      
      return true;
    } catch (error) {
      console.error('[DEBUG] ❌ Erreur lors de la vérification:', error);
      return false;
    }
  }
  
  // Vérifier s'il y a des navigations en attente
  static async checkPendingNavigations() {
    console.log('[DEBUG] 🔍 Vérification navigations en attente');
    
    try {
      const keys = ['PENDING_NAVIGATION', 'EMERGENCY_NAVIGATION', 'PENDING_CONVERSATION_NAV'];
      
      for (const key of keys) {
        const value = await AsyncStorage.getItem(key);
        if (value) {
          console.log(`[DEBUG] 📋 ${key}:`, JSON.parse(value));
        } else {
          console.log(`[DEBUG] ❌ ${key}: aucune donnée`);
        }
      }
    } catch (error) {
      console.error('[DEBUG] ❌ Erreur lors de la vérification:', error);
    }
  }
  
  // Nettoyer toutes les navigations en attente
  static async clearPendingNavigations() {
    console.log('[DEBUG] 🧹 Nettoyage des navigations en attente');
    
    try {
      const keys = ['PENDING_NAVIGATION', 'EMERGENCY_NAVIGATION', 'PENDING_CONVERSATION_NAV'];
      await AsyncStorage.multiRemove(keys);
      console.log('[DEBUG] ✅ Navigations en attente nettoyées');
    } catch (error) {
      console.error('[DEBUG] ❌ Erreur lors du nettoyage:', error);
    }
  }
  
  // Test complet de bout en bout
  static async runFullTest(conversationId) {
    console.log('[DEBUG] 🧪 ===== TEST COMPLET DE NOTIFICATION =====');
    
    // 1. Vérifier les permissions
    const hasPermissions = await this.checkNotificationPermissions();
    if (!hasPermissions) {
      console.log('[DEBUG] ❌ Test arrêté: pas de permissions');
      return false;
    }
    
    // 2. Vérifier l'état de navigation
    const navState = this.debugNavigationState();
    if (!navState) {
      console.log('[DEBUG] ❌ Test arrêté: navigation pas prête');
      return false;
    }
    
    // 3. Nettoyer les navigations en attente
    await this.clearPendingNavigations();
    
    // 4. Tester la navigation directe
    console.log('[DEBUG] 🧪 Test navigation directe...');
    const directNavResult = this.testDirectNavigation(conversationId);
    
    // Attendre un peu puis tester la notification
    setTimeout(async () => {
      console.log('[DEBUG] 🧪 Test notification simulée...');
      await this.simulateMessageNotification(conversationId, "Test Notification");
    }, 3000);
    
    return true;
  }

  static async testServerWithClickDetection() {
    console.log('[DEBUG] 🔍 Test serveur avec détection de clic...');
    
    // Variable pour tracker si on a reçu une notification
    let notificationReceived = false;
    let notificationData = null;
    
    // Écouteur pour notification reçue
    const receivedListener = Notifications.addNotificationReceivedListener(notification => {
      console.log('[DEBUG] 📨 NOTIFICATION REÇUE !');
      const data = notification.request.content.data;
      
      if (data?.type === 'new_message') {
        notificationReceived = true;
        notificationData = data;
        console.log('[DEBUG] 💾 Données stockées pour clic:', data.conversationId);
        
        // Surveiller les clics pendant 30 secondes
        console.log('[DEBUG] 👁️ Surveillance du clic activée...');
        
        // Créer un bouton temporaire pour simuler le clic
        setTimeout(() => {
          if (notificationReceived && notificationData) {
            console.log('[DEBUG] 🎯 SIMULATION DU CLIC (navigation automatique)');
            this.testDirectNavigation(notificationData.conversationId);
          }
        }, 3000); // Navigation automatique après 3 secondes
      }
    });
    
    // Écouteur pour clic réel (au cas où)
    const clickListener = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('[DEBUG] 🎉 CLIC RÉEL DÉTECTÉ !');
      const data = response.notification.request.content.data;
      if (data?.conversationId) {
        this.testDirectNavigation(data.conversationId);
      }
    });
    
    // Envoyer la notification serveur
    const result = await this.testWithRealServerNotification();
    
    // Nettoyer après 30 secondes
    setTimeout(() => {
      Notifications.removeNotificationSubscription(receivedListener);
      Notifications.removeNotificationSubscription(clickListener);
      console.log('[DEBUG] 🧹 Écouteurs nettoyés');
    }, 30000);
    
    return result;
  }
}



export default NotificationDebugHelper;