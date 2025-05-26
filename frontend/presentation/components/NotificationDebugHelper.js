// NotificationDebugHelper.js
// Version améliorée et synthétisée pour un debug efficace

import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { navigationRef } from '../../navigation/NavigationService';
import { getAxiosInstance } from '../../data/api/axiosInstance';

class NotificationDebugHelper {
  
  // === MÉTHODES PRINCIPALES ===
  
  /**
   * Diagnostic rapide complet
   * Vérifie permissions, navigation et état global
   */
  static async quickDiagnostic() {
    console.log('\n🏃 === DIAGNOSTIC RAPIDE ===\n');
    
    const results = {
      permissions: false,
      navigation: false,
      pendingNav: false,
      token: null
    };
    
    // 1. Permissions
    try {
      const { status } = await Notifications.getPermissionsAsync();
      results.permissions = status === 'granted';
      console.log(`1️⃣ Permissions: ${results.permissions ? '✅ Accordées' : '❌ Refusées'} (${status})`);
    } catch (error) {
      console.error('❌ Erreur permissions:', error.message);
    }
    
    // 2. Navigation
    try {
      results.navigation = navigationRef.isReady();
      console.log(`2️⃣ Navigation: ${results.navigation ? '✅ Prête' : '❌ Pas prête'}`);
      
      if (results.navigation) {
        const state = navigationRef.getState();
        console.log('   📍 Route actuelle:', state?.routes[state.index]?.name || 'Inconnue');
      }
    } catch (error) {
      console.error('❌ Erreur navigation:', error.message);
    }
    
    // 3. Navigations en attente
    try {
      const keys = ['PENDING_CONVERSATION_NAV', 'EMERGENCY_NAVIGATION', 'PENDING_NAVIGATION'];
      let hasPending = false;
      
      for (const key of keys) {
        const value = await AsyncStorage.getItem(key);
        if (value) {
          hasPending = true;
          const data = JSON.parse(value);
          console.log(`3️⃣ Navigation en attente (${key}):`, data.conversationId || data.name);
        }
      }
      
      results.pendingNav = !hasPending;
      if (!hasPending) {
        console.log('3️⃣ Navigations en attente: ✅ Aucune');
      }
    } catch (error) {
      console.error('❌ Erreur vérification attente:', error.message);
    }
    
    // 4. Token (bonus)
    try {
      const tokenData = await Notifications.getDevicePushTokenAsync();
      results.token = tokenData?.data;
      console.log(`4️⃣ Token: ${results.token ? '✅ Disponible' : '❌ Non disponible'}`);
    } catch (error) {
      console.log('4️⃣ Token: ⚠️ Non récupérable (normal sur simulateur)');
    }
    
    console.log('\n📊 RÉSUMÉ:');
    console.log(`   Système: ${Object.values(results).filter(v => v === true).length}/3 ✅`);
    console.log(`   Prêt pour les tests: ${results.permissions && results.navigation ? '✅ OUI' : '❌ NON'}`);
    console.log('\n=== FIN DIAGNOSTIC ===\n');
    
    return results;
  }
  
  /**
   * Test de notification locale simple
   */
  static async simulateMessageNotification(conversationId, senderName = "Test User") {
    console.log('\n📱 === TEST NOTIFICATION LOCALE ===');
    console.log('🎯 ConversationId:', conversationId);
    console.log('👤 Expéditeur:', senderName);
    
    try {
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
      
      const identifier = await Notifications.scheduleNotificationAsync({
        content: {
          title: `Message de ${senderName}`,
          body: "Test de navigation locale",
          data: notificationData,
          sound: true,
        },
        trigger: { 
          seconds: 2,
          repeats: false 
        }
      });
      
      console.log('✅ Notification programmée:', identifier);
      console.log('⏰ Apparition dans 2 secondes...');
      console.log('👆 CLIQUEZ sur la notification pour tester');
      console.log('=== FIN TEST LOCAL ===\n');
      
      return identifier;
    } catch (error) {
      console.error('❌ Erreur notification locale:', error);
      return null;
    }
  }
  
  /**
   * Test de notification serveur
   */
  static async testServerNotification(conversationId, testMessage = "Test serveur") {
    console.log('\n🌐 === TEST NOTIFICATION SERVEUR ===');
    console.log('🎯 ConversationId:', conversationId);
    console.log('💬 Message:', testMessage);
  
    try {
      const axiosInstance = getAxiosInstance();
      if (!axiosInstance) {
        throw new Error('Instance Axios non disponible');
      }
  
      // Récupérer les données utilisateur
      const userDataStr = await AsyncStorage.getItem('userData');
      if (!userDataStr) {
        throw new Error('Utilisateur non connecté');
      }
  
      const userData = JSON.parse(userDataStr);
      console.log('👤 Expéditeur:', userData.name || userData._id);
  
      // Envoyer la notification
      console.log('📡 Envoi au serveur...');
      const response = await axiosInstance.post('/api/notifications/message', {
        conversationId: conversationId,
        senderId: userData._id,
        senderName: userData.name || "Utilisateur Test",
        messagePreview: testMessage,
        messageType: 'text'
      });
  
      console.log('📨 Réponse:', response.data.success ? '✅ Succès' : '❌ Échec');
  
      if (response.data.details) {
        const { sent, failed } = response.data.details.results || {};
        if (sent?.length) console.log(`✅ Envoyé à ${sent.length} destinataire(s)`);
        if (failed?.length) console.log(`❌ Échec pour ${failed.length} destinataire(s)`);
      }
  
      console.log('👆 CLIQUEZ sur la notification pour tester');
      console.log('=== FIN TEST SERVEUR ===\n');
  
      return response.data.success;
    } catch (error) {
      console.error('❌ Erreur notification serveur:', error.message);
      if (error.response?.data) {
        console.error('📡 Détails:', error.response.data);
      }
      return false;
    }
  }
  
  /**
   * Test de navigation directe (sans notification)
   */
  static testDirectNavigation(conversationId) {
    console.log('\n🚀 === TEST NAVIGATION DIRECTE ===');
    console.log('🎯 ConversationId:', conversationId);
    
    if (!navigationRef.isReady()) {
      console.log('❌ NavigationRef pas prêt');
      return false;
    }    try {
        console.log('🧭 Navigation vers la conversation...');
        navigationRef.navigate('ChatTab', {
          screen: 'Chat',
          params: { conversationId }
        });
  
        console.log('✅ Navigation réussie');
        console.log('=== FIN TEST NAVIGATION ===\n');
        return true;
      } catch (error) {
        console.error('❌ Erreur navigation:', error.message);
        return false;
      }
    }
  
    // === MÉTHODES UTILITAIRES ===
  
    /**
     * Vérifie les permissions de notification
     */
    static async checkNotificationPermissions() {
      try {
        const { status } = await Notifications.getPermissionsAsync();
        const granted = status === 'granted';
  
        if (!granted) {
          console.log('⚠️ Permissions non accordées - Demande en cours...');
          const { status: newStatus } = await Notifications.requestPermissionsAsync();
          return newStatus === 'granted';
        }
  
        return granted;
      } catch (error) {
        console.error('❌ Erreur vérification permissions:', error.message);
        return false;
      }
    }
  
    /**
     * Affiche l'état actuel de navigation
     */
    static debugNavigationState() {
      if (!navigationRef.isReady()) {
        console.log('⚠️ NavigationRef non prêt');
        return null;
      }
  
      const state = navigationRef.getState();
      console.log('\n🧭 === ÉTAT NAVIGATION ===');
  
      if (!state) {
        console.log('❌ Aucun état disponible');
        return null;
      }
  
      console.log('📍 Route actuelle:', state.routes[state.index].name);
      console.log('📄 Pile de navigation:');
  
      state.routes.forEach((route, index) => {
        console.log(`  ${index + 1}. ${route.name}`);
        if (route.params) {
          console.log(`     🔹 Params:`, route.params);
        }
      });
  
      console.log('=== FIN ÉTAT NAVIGATION ===\n');
      return state;
    }
  
    /**
     * Vérifie les navigations en attente
     */
    static async checkPendingNavigations() {
      console.log('\n🔄 === NAVIGATIONS EN ATTENTE ===');
  
      const keys = ['PENDING_CONVERSATION_NAV', 'EMERGENCY_NAVIGATION', 'PENDING_NAVIGATION'];
      let hasPending = false;
  
      for (const key of keys) {
        const value = await AsyncStorage.getItem(key);
        if (value) {
          hasPending = true;
          const data = JSON.parse(value);
          console.log(`⚠️ ${key}:`, data.conversationId || data.name);
        }
      }
  
      if (!hasPending) {
        console.log('✅ Aucune navigation en attente');
      }
  
      console.log('=== FIN VÉRIFICATION ATTENTE ===\n');
      return hasPending;
    }
  
    /**
     * Nettoie les navigations en attente
     */
    static async clearPendingNavigations() {
      console.log('\n🧹 === NETTOYAGE NAVIGATIONS ===');
  
      const keys = ['PENDING_CONVERSATION_NAV', 'EMERGENCY_NAVIGATION', 'PENDING_NAVIGATION'];
      let clearedCount = 0;
  
      for (const key of keys) {
        const value = await AsyncStorage.getItem(key);
        if (value) {
          await AsyncStorage.removeItem(key);
          clearedCount++;
          console.log(`✅ Nettoyé: ${key}`);
        }
      }
  
      if (clearedCount === 0) {
        console.log('✅ Rien à nettoyer');
      }
  
      console.log('=== FIN NETTOYAGE ===\n');
      return clearedCount;
    }
  
    /**
     * Compare la structure des notifications
     */
    static compareNotificationData() {
      console.log('\n🔍 === COMPARAISON STRUCTURE NOTIFICATIONS ===');
  
      const localStructure = {
        type: 'new_message',
        conversationId: 'string',
        senderId: 'string',
        senderName: 'string',
        messageType: 'text|image|video',
        timestamp: 'ISOString',
        navigationTarget: 'string',
        navigationScreen: 'string',
        navigationParams: 'object'
      };
  
      const serverStructure = {
        notification: {
          title: 'string',
          body: 'string',
          data: {
            type: 'new_message',
            conversationId: 'string',
            senderId: 'string',
            senderName: 'string',
            messageType: 'text|image|video',
            timestamp: 'ISOString',
            navigationTarget: 'string',
            navigationScreen: 'string',
            navigationParams: 'object'
          }
        },
        recipients: ['array'],
        priority: 'high'
      };
  
      console.log('📋 Structure Locale:');
      console.log(localStructure);
  
      console.log('\n📡 Structure Serveur:');
      console.log(serverStructure);
  
      console.log('\n🔎 Points clés à vérifier:');
      console.log('1. Tous les champs requis sont présents');
      console.log('2. Les types de données correspondent');
      console.log('3. navigationParams contient conversationId');
      console.log('4. Les timestamps sont au format ISO');
  
      console.log('=== FIN COMPARAISON ===\n');
    }
  
    /**
     * Vérifie la structure d'une notification serveur réelle
     */
    static async verifyServerNotificationStructure(conversationId) {
      console.log('\n🔎 === VÉRIFICATION STRUCTURE SERVEUR ===');
      console.log('🎯 ConversationId:', conversationId);
  
      try {
        const axiosInstance = getAxiosInstance();
        if (!axiosInstance) {
          throw new Error('Instance Axios non disponible');
        }
  
        // Récupérer les données utilisateur
        const userDataStr = await AsyncStorage.getItem('userData');
        if (!userDataStr) {
          throw new Error('Utilisateur non connecté');
        }
  
        const userData = JSON.parse(userDataStr);
  
        // Demander une notification de test
        console.log('📡 Demande de notification de test...');
        const response = await axiosInstance.post('/api/notifications/test-structure', {
          conversationId: conversationId,
          senderId: userData._id
        });
  
        if (response.data.notification) {
          console.log('✅ Structure reçue:');
          console.log('📋 Type:', response.data.notification.data.type);
          console.log('🔑 conversationId:', response.data.notification.data.conversationId);
          console.log('👤 senderId:', response.data.notification.data.senderId);
          console.log('📅 Timestamp:', response.data.notification.data.timestamp);
          console.log('🎯 Navigation:', response.data.notification.data.navigationTarget);
  
          // Vérifications
          const data = response.data.notification.data;
          const errors = [];
  
          if (data.type !== 'new_message') errors.push('Type incorrect');
          if (!data.conversationId) errors.push('conversationId manquant');
          if (!data.senderId) errors.push('senderId manquant');
          if (!data.timestamp) errors.push('timestamp manquant');
          if (!data.navigationTarget) errors.push('navigationTarget manquant');
          if (!data.navigationParams?.conversationId) errors.push('conversationId dans params manquant');
  
          if (errors.length > 0) {
            console.log('⚠️ Problèmes détectés:', errors.join(', '));
          } else {
            console.log('✅ Structure valide');
          }
        } else {
          console.log('❌ Aucune notification dans la réponse');
        }
  
        console.log('=== FIN VÉRIFICATION ===\n');
        return response.data.success;
      } catch (error) {
        console.error('❌ Erreur vérification structure:', error.message);
        if (error.response?.data) {
          console.error('📡 Détails:', error.response.data);
        }
        return false;
      }
    }
  
    /**
     * Récupère les conversations réelles pour les tests
     */
    static async getRealConversations() {
        console.log('\n💬 === CHARGEMENT CONVERSATIONS ===');
      
        try {
          const axiosInstance = getAxiosInstance();
          if (!axiosInstance) {
            throw new Error('Instance Axios non disponible');
          }
      
          const response = await axiosInstance.get('/api/secrets/conversations');
          console.log('Réponse de l\'API:', response.data); // Ajoutez ce log pour vérifier la structure de la réponse
      
          if (!response.data) {
            throw new Error('La réponse de l\'API ne contient pas de conversations');
          }
      
          // La réponse est un tableau de conversations, pas un objet avec une propriété `conversations`
          const conversations = Array.isArray(response.data) ? response.data : [response.data];
          console.log(`✅ ${conversations.length} conversations chargées`);
      
          if (conversations.length === 0) {
            console.log('⚠️ Aucune conversation disponible');
          }
      
          console.log('=== FIN CHARGEMENT ===\n');
          return conversations;
        } catch (error) {
          console.error('❌ Erreur chargement conversations:', error.message);
          return [];
        }
      }
  }
  
  export default NotificationDebugHelper;
  