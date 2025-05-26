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
    
    // Structure ACTUELLE du serveur (après vos corrections)
    const serverNotificationStructure = {
      type: 'new_message',
      conversationId: 'string',
      senderId: 'string',
      senderName: 'string', // ✅ MAINTENANT INCLUS
      messageType: 'text',
      timestamp: 'ISO string',
      // ✅ MAINTENANT INCLUS AUSSI
      navigationTarget: 'Chat',
      navigationScreen: 'ChatTab',
      navigationParams: { conversationId: 'string' }
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
  
    console.log('[DEBUG] 📋 Structure serveur CORRIGÉE:', JSON.stringify(serverNotificationStructure, null, 2));
    console.log('[DEBUG] 📋 Structure locale de test:', JSON.stringify(localNotificationStructure, null, 2));
    
    console.log('[DEBUG] ✅ COMPARAISON APRÈS CORRECTIONS:');
    console.log('[DEBUG] 1. ✅ La notification serveur INCLUT maintenant senderName');
    console.log('[DEBUG] 2. ✅ La notification serveur INCLUT maintenant navigationTarget, navigationScreen, navigationParams');
    console.log('[DEBUG] 3. ✅ Les structures locale et serveur sont maintenant IDENTIQUES !');
    console.log('[DEBUG] 4. 🎯 Les deux types de notifications devraient maintenant fonctionner de la même façon');
  }
  
  // AJOUTER aussi cette nouvelle méthode pour vérifier l'état du serveur
  
  // Vérifier que le serveur envoie bien les bonnes données
  static async verifyServerNotificationStructure(conversationId = null) {
    console.log('[DEBUG] 🔍 === VÉRIFICATION STRUCTURE SERVEUR RÉELLE ===');
    
    try {
      // 1. Récupérer une conversation réelle si nécessaire
      let realConversationId = conversationId;
      if (!realConversationId || realConversationId === "675a1234abcd5678efgh9012") {
        const conversations = await this.getRealConversations();
        if (conversations.length > 0) {
          realConversationId = conversations[0]._id;
        } else {
          console.log('[DEBUG] ❌ Aucune conversation trouvée');
          return false;
        }
      }
      
      // 2. Créer un écouteur temporaire pour capturer la structure exacte
      const verificationListener = Notifications.addNotificationResponseReceivedListener(response => {
        console.log('[DEBUG] 🔔 STRUCTURE SERVEUR CAPTURÉE !');
        
        try {
          const content = response.notification.request.content;
          let data = content.data;
          
          // Vérifier si les données sont dans content.data ou directement dans content
          if (!data || !data.type) {
            if (content.conversationId || content.type === 'new_message') {
              data = {
                type: content.type || 'new_message',
                conversationId: content.conversationId,
                senderId: content.senderId,
                senderName: content.senderName,
                messageType: content.messageType || 'text',
                timestamp: content.timestamp,
                navigationTarget: content.navigationTarget,
                navigationScreen: content.navigationScreen,
                navigationParams: content.navigationParams
              };
            }
          }
          
          console.log('[DEBUG] 📋 DONNÉES SERVEUR RÉELLES CAPTURÉES:');
          console.log(JSON.stringify(data, null, 2));
          
          // Vérifier chaque champ important
          const fieldsToCheck = [
            'type', 'conversationId', 'senderId', 'senderName', 
            'messageType', 'timestamp', 'navigationTarget', 
            'navigationScreen', 'navigationParams'
          ];
          
          console.log('[DEBUG] ✅ VÉRIFICATION DES CHAMPS:');
          fieldsToCheck.forEach(field => {
            const hasField = data && data[field] !== undefined;
            console.log(`[DEBUG] ${hasField ? '✅' : '❌'} ${field}: ${hasField ? 'PRÉSENT' : 'MANQUANT'}`);
          });
          
          // Conclusion
          const hasAllFields = fieldsToCheck.every(field => data && data[field] !== undefined);
          if (hasAllFields) {
            console.log('[DEBUG] 🎉 PARFAIT ! Le serveur envoie toutes les données nécessaires');
          } else {
            console.log('[DEBUG] ⚠️ Il manque encore des données côté serveur');
          }
          
        } catch (error) {
          console.error('[DEBUG] ❌ Erreur analyse structure:', error);
        }
        
        // Nettoyer
        setTimeout(() => {
          Notifications.removeNotificationSubscription(verificationListener);
          console.log('[DEBUG] 🧹 Écouteur de vérification nettoyé');
        }, 5000);
      });
      
      // 3. Envoyer une notification serveur pour capturer sa structure
      console.log('[DEBUG] 🌐 Envoi notification serveur pour vérification...');
      const result = await this.testServerNotification(
        realConversationId,
        "🔍 Vérification structure - CLIQUEZ pour analyser"
      );
      
      if (result) {
        console.log('[DEBUG] ✅ Notification serveur envoyée');
        console.log('[DEBUG] 👆 CLIQUEZ sur la notification pour voir la structure réelle !');
        return true;
      } else {
        console.log('[DEBUG] ❌ Échec envoi notification serveur');
        return false;
      }
      
    } catch (error) {
      console.error('[DEBUG] ❌ Erreur vérification structure:', error);
      return false;
    }
  }
  
  // AJOUTER cette méthode pour un test de comparaison en temps réel
  
  static async testRealTimeComparison(conversationId = null) {
    console.log('[DEBUG] 🔄 === TEST COMPARAISON EN TEMPS RÉEL ===');
    
    try {
      // 1. Récupérer une conversation réelle
      let realConversationId = conversationId;
      if (!realConversationId || realConversationId === "675a1234abcd5678efgh9012") {
        const conversations = await this.getRealConversations();
        if (conversations.length > 0) {
          realConversationId = conversations[0]._id;
        } else {
          console.log('[DEBUG] ❌ Aucune conversation trouvée');
          return false;
        }
      }
      
      console.log('[DEBUG] 🎯 Conversation utilisée:', realConversationId);
      
      // 2. Variables pour stocker les données capturées
      let serverData = null;
      let localData = null;
      
      // 3. Écouteur pour capturer les deux types
      const comparisonListener = Notifications.addNotificationResponseReceivedListener(response => {
        console.log('[DEBUG] 🔔 NOTIFICATION CAPTURÉE POUR COMPARAISON');
        
        try {
          const content = response.notification.request.content;
          let data = content.data;
          
          // Reconstruction si nécessaire
          if (!data || !data.type) {
            if (content.conversationId || content.type === 'new_message') {
              data = {
                type: content.type || 'new_message',
                conversationId: content.conversationId,
                senderId: content.senderId,
                senderName: content.senderName,
                messageType: content.messageType || 'text',
                timestamp: content.timestamp,
                navigationTarget: content.navigationTarget,
                navigationScreen: content.navigationScreen,
                navigationParams: content.navigationParams
              };
            }
          }
          
          // Identifier le type de notification (serveur vs local)
          if (data?.senderId === 'test-sender-id') {
            console.log('[DEBUG] 📱 NOTIFICATION LOCALE CAPTURÉE');
            localData = data;
          } else {
            console.log('[DEBUG] 🌐 NOTIFICATION SERVEUR CAPTURÉE');
            serverData = data;
          }
          
          // Si on a les deux, faire la comparaison
          if (serverData && localData) {
            console.log('[DEBUG] 🔍 === COMPARAISON COMPLÈTE ===');
            console.log('[DEBUG] 📋 Données serveur:', JSON.stringify(serverData, null, 2));
            console.log('[DEBUG] 📋 Données locales:', JSON.stringify(localData, null, 2));
            
            // Comparer chaque champ
            const fieldsToCompare = [
              'type', 'conversationId', 'messageType', 'timestamp',
              'senderName', 'navigationTarget', 'navigationScreen', 'navigationParams'
            ];
            
            console.log('[DEBUG] ⚖️ COMPARAISON DÉTAILLÉE:');
            fieldsToCompare.forEach(field => {
              const serverHas = serverData[field] !== undefined;
              const localHas = localData[field] !== undefined;
              const match = serverHas === localHas;
              
              console.log(`[DEBUG] ${match ? '✅' : '❌'} ${field}: Serveur=${serverHas}, Local=${localHas}`);
            });
            
            // Nettoyer
            setTimeout(() => {
              Notifications.removeNotificationSubscription(comparisonListener);
              console.log('[DEBUG] 🧹 Écouteur de comparaison nettoyé');
            }, 2000);
          }
          
        } catch (error) {
          console.error('[DEBUG] ❌ Erreur comparaison:', error);
        }
      });
      
      // 4. Envoyer une notification serveur
      console.log('[DEBUG] 🌐 Envoi notification serveur...');
      await this.testServerNotification(realConversationId, "🔄 Test comparaison serveur");
      
      // 5. Attendre puis envoyer une notification locale
      setTimeout(async () => {
        console.log('[DEBUG] 📱 Envoi notification locale...');
        await this.simulateMessageNotification(realConversationId, "Test Comparaison");
        console.log('[DEBUG] 👆 CLIQUEZ sur les deux notifications pour les comparer !');
      }, 8000);
      
      // 6. Nettoyage de sécurité
      setTimeout(() => {
        if (comparisonListener) {
          Notifications.removeNotificationSubscription(comparisonListener);
          console.log('[DEBUG] 🧹 Nettoyage de sécurité effectué');
        }
      }, 30000);
      
      return true;
      
    } catch (error) {
      console.error('[DEBUG] ❌ Erreur test comparaison:', error);
      return false;
    }
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
  static async testServerNotificationWithNewFix(conversationId = null) {
    console.log('[DEBUG] 🔧 === TEST AVEC NOUVELLE CORRECTION APP.JS ===');
    
    try {
      // 1. S'assurer qu'on a une vraie conversation
      let realConversationId = conversationId;
      
      if (!realConversationId || realConversationId === "675a1234abcd5678efgh9012") {
        console.log('[DEBUG] 🔍 Récupération d\'une vraie conversation...');
        const conversations = await this.getRealConversations();
        
        if (conversations.length > 0) {
          realConversationId = conversations[0]._id;
          console.log('[DEBUG] ✅ Conversation réelle trouvée:', realConversationId);
        } else {
          console.log('[DEBUG] ❌ Aucune conversation trouvée');
          return false;
        }
      }
      
      // 2. Nettoyer toute navigation en attente
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      await AsyncStorage.multiRemove([
        'PENDING_CONVERSATION_NAV',
        'EMERGENCY_NAVIGATION',
        'PENDING_NAVIGATION'
      ]);
      console.log('[DEBUG] 🧹 Navigations en attente nettoyées');
      
      // 3. Vérifier que le gestionnaire App.js est actif
      console.log('[DEBUG] 🎧 Le gestionnaire App.js devrait être actif maintenant');
      console.log('[DEBUG] ⚠️  IMPORTANT: Vérifiez que vous voyez ces logs au démarrage:');
      console.log('[DEBUG]     - "[APP] 🎧 Configuration de l\'écouteur global de notifications"');
      console.log('[DEBUG]     - "[APP] 🚀 NavigationContainer prêt!"');
      
      // 4. Envoyer la notification serveur
      console.log('[DEBUG] 🌐 Envoi de notification serveur avec conversation réelle...');
      const serverResult = await this.testServerNotification(
        realConversationId, 
        "🔧 Test nouvelle correction - CLIQUEZ pour tester !"
      );
      
      if (serverResult) {
        console.log('[DEBUG] ✅ Notification serveur envoyée avec succès !');
        console.log('[DEBUG] 📱 Une notification va apparaître...');
        console.log('[DEBUG] 👆 CLIQUEZ SUR LA NOTIFICATION pour tester');
        console.log('[DEBUG] 🔍 Regardez les logs pour voir:');
        console.log('[DEBUG]     1. "[APP] 🔔 === GESTIONNAIRE PRINCIPAL NOTIFICATION ==="');
        console.log('[DEBUG]     2. "[APP] ✅ Notification de message valide détectée"');
        console.log('[DEBUG]     3. "[APP] 🎯 ConversationId: ' + realConversationId + '"');
        console.log('[DEBUG]     4. "[APP] 🎉 Navigation notification réussie !"');
        
        // 5. Programmer un test de notification locale pour comparer
        setTimeout(async () => {
          console.log('[DEBUG] 📱 Envoi notification locale pour comparaison...');
          await this.simulateMessageNotification(realConversationId, "Test Local - Comparaison");
          console.log('[DEBUG] 👆 CLIQUEZ aussi sur cette notification');
          console.log('[DEBUG] 🎯 Les deux devraient maintenant fonctionner identiquement !');
        }, 15000); // 15 secondes après
        
        return true;
      } else {
        console.log('[DEBUG] ❌ Échec envoi notification serveur');
        return false;
      }
      
    } catch (error) {
      console.error('[DEBUG] ❌ Erreur dans le test:', error);
      return false;
    }
  }
  
  // Méthode pour diagnostiquer l'état actuel
  static async debugCurrentNotificationState() {
    console.log('[DEBUG] 🔍 === DIAGNOSTIC ÉTAT NOTIFICATIONS ===');
    
    try {
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      
      // 1. Vérifier les navigations en attente
      const pendingKeys = ['PENDING_CONVERSATION_NAV', 'EMERGENCY_NAVIGATION', 'PENDING_NAVIGATION'];
      
      for (const key of pendingKeys) {
        const value = await AsyncStorage.getItem(key);
        if (value) {
          console.log(`[DEBUG] 📋 ${key}:`, JSON.parse(value));
        } else {
          console.log(`[DEBUG] ✅ ${key}: Aucune donnée en attente`);
        }
      }
      
      // 2. Vérifier les permissions
      const { status } = await Notifications.getPermissionsAsync();
      console.log('[DEBUG] 🔐 Permissions notifications:', status);
      
      // 3. Vérifier l'état de navigation
      const { navigationRef } = require('../../navigation/NavigationService');
      if (navigationRef.isReady()) {
        console.log('[DEBUG] 🚀 NavigationRef: PRÊT');
        const state = navigationRef.getState();
        console.log('[DEBUG] 📍 État navigation actuel:', state?.routeNames || 'Indisponible');
      } else {
        console.log('[DEBUG] ❌ NavigationRef: PAS PRÊT');
      }
      
      // 4. Instructions pour le test
      console.log('[DEBUG] 📋 === INSTRUCTIONS DE TEST ===');
      console.log('[DEBUG] 1. Assurez-vous que l\'app est active (foreground)');
      console.log('[DEBUG] 2. Utilisez testServerNotificationWithNewFix()');
      console.log('[DEBUG] 3. Cliquez sur la notification qui apparaît');
      console.log('[DEBUG] 4. Vérifiez que vous êtes redirigé vers la conversation');
      console.log('[DEBUG] 5. Regardez les logs pour "[APP]" au lieu de "[DEEPLINK]"');
      
    } catch (error) {
      console.error('[DEBUG] ❌ Erreur diagnostic:', error);
    }
  }
  
  // Méthode pour forcer un test en arrière-plan
  static async testBackgroundNotificationBehavior(conversationId = null) {
    console.log('[DEBUG] 📱 === TEST COMPORTEMENT ARRIÈRE-PLAN ===');
    
    try {
      // Récupérer une vraie conversation
      let realConversationId = conversationId;
      if (!realConversationId || realConversationId === "675a1234abcd5678efgh9012") {
        const conversations = await this.getRealConversations();
        if (conversations.length > 0) {
          realConversationId = conversations[0]._id;
        } else {
          console.log('[DEBUG] ❌ Aucune conversation trouvée');
          return false;
        }
      }
      
      console.log('[DEBUG] ⏰ Vous avez 10 secondes pour mettre l\'app en arrière-plan');
      console.log('[DEBUG] 📱 Appuyez sur le bouton HOME maintenant !');
      
      // Attendre 10 secondes puis envoyer la notification
      setTimeout(async () => {
        console.log('[DEBUG] 🌐 Envoi notification serveur (app en arrière-plan)...');
        
        const result = await this.testServerNotification(
          realConversationId,
          "🌙 Test arrière-plan - Cliquez pour revenir à l'app !"
        );
        
        if (result) {
          console.log('[DEBUG] ✅ Notification arrière-plan envoyée');
          console.log('[DEBUG] 👆 Cliquez sur la notification pour revenir dans l\'app');
          console.log('[DEBUG] 🎯 Vous devriez arriver directement sur la conversation');
        }
      }, 10000);
      
      return true;
      
    } catch (error) {
      console.error('[DEBUG] ❌ Erreur test arrière-plan:', error);
      return false;
    }
  }
  
}



export default NotificationDebugHelper;