import React from 'react';
import { Button, View, Alert, Text, ScrollView } from 'react-native';
import PushNotificationIOS from '@react-native-community/push-notification-ios';
import NotificationService from '../notifications/NotificationService';
import { useNavigation } from '@react-navigation/native';
import { useCardData } from '../../infrastructure/context/CardDataContexte';

const SimulatorNotificationTest = () => {
  const navigation = useNavigation();
  const { getUserConversations } = useCardData();

  // Test 1: Notification locale simple (sans navigation)
  const testSimpleLocalNotification = () => {
    console.log('[TEST] 🔔 Test notification locale simple');
    
    PushNotificationIOS.presentLocalNotification({
      alertTitle: "Test Simple",
      alertBody: "Notification sans navigation",
      alertAction: "view",
      userInfo: {
        type: 'test',
        simple: true
      },
      applicationIconBadgeNumber: 1
    });
  };

  // Test 2: Notification avec données mais sans finish()
  const testNotificationWithoutFinish = () => {
    console.log('[TEST] 🔔 Test notification sans finish()');
    
    PushNotificationIOS.presentLocalNotification({
      alertTitle: "Message de Victor",
      alertBody: "Test sans finish",
      alertAction: "view",
      userInfo: {
        type: 'new_message',
        conversationId: '6834506cf3c68470b83a18c3',
        senderId: '67ab77a2e80ecb6011a7bd04',
        senderName: 'Victor Barreyre',
        messageType: 'text',
        timestamp: new Date().toISOString(),
        skipFinish: true
      },
      applicationIconBadgeNumber: 1
    });
  };

  // Test 3: Navigation directe (bypass notification) avec chargement complet
  const testDirectNavigation = async () => {
    console.log('[TEST] 🧭 Test navigation directe avec chargement complet');
    
    try {
      console.log("🚀 Début de la navigation vers le chat...");
      
      const conversations = await getUserConversations();
      console.log("📋 Conversations récupérées:", conversations.length);
      
      const targetConversation = conversations.find(
        conv => conv._id === '6834506cf3c68470b83a18c3'
      );
      
      if (targetConversation) {
        console.log("✅ Conversation trouvée, préparation des données...");
        console.log("🗂️ Structure de la conversation:", JSON.stringify(targetConversation, null, 2));
        
        const secretData = {
          _id: targetConversation.secret._id,
          content: targetConversation.secret.content,
          label: targetConversation.secret.label,
          user: targetConversation.secret.user,
          shareLink: targetConversation.secret.shareLink || `hushy://secret/${targetConversation.secret._id}`
        };
        
        console.log("📦 SecretData préparé:", JSON.stringify(secretData, null, 2));
        
        console.log("🧭 Navigation vers ChatTab...");
        navigation.navigate('ChatTab');
        
        setTimeout(() => {
          console.log("🧭 Navigation vers Chat avec paramètres complets...");
          navigation.navigate('Chat', {
            conversationId: targetConversation._id,
            conversation: targetConversation,
            secretData: secretData,
            showModalOnMount: false
          });
          console.log("✅ Navigation terminée !");
        }, 300);
        
        Alert.alert('Test Navigation', 'Navigation directe avec données complètes exécutée');
        
      } else {
        console.error('❌ Conversation non trouvée avec ID:', '6834506cf3c68470b83a18c3');
        console.log('📋 IDs des conversations disponibles:', conversations.map(c => c._id));
        Alert.alert('Erreur', 'Cette conversation n\'existe plus ou n\'est pas accessible');
      }
      
    } catch (error) {
      console.error('[TEST] ❌ Erreur navigation directe:', error);
      Alert.alert('Erreur', `Navigation directe échouée: ${error.message}`);
    }
  };

  // Test 4: Test du listener de notification
  const testNotificationListener = () => {
    console.log('[TEST] 👂 Test listener de notification');
    
    // Ajouter un listener temporaire
    const removeListener = NotificationService.addNotificationListener((data) => {
      console.log('[TEST] 🎯 Listener déclenché:', data);
      Alert.alert(
        'Listener Déclenché', 
        `Type: ${data.type}\nConversation: ${data.conversationId || 'N/A'}`,
        [{ text: 'OK' }]
      );
    });

    // Simuler l'appel du listener
    setTimeout(() => {
      const mockData = {
        type: 'new_message',
        conversationId: '6834506cf3c68470b83a18c3',
        senderId: '67ab77a2e80ecb6011a7bd04',
        senderName: 'Victor Barreyre'
      };
      
      // Appeler directement handleNotificationOpen pour tester
      if (NotificationService.handleNotificationOpen) {
        NotificationService.handleNotificationOpen(mockData);
      }
      
      // Retirer le listener après test
      setTimeout(() => {
        removeListener();
        console.log('[TEST] 🧹 Listener retiré');
      }, 2000);
    }, 1000);
  };

  // Test 5: Vérifier les permissions
  const checkNotificationPermissions = async () => {
    try {
      const hasPermissions = await NotificationService.checkPermissions();
      const token = await NotificationService.getToken();
      
      Alert.alert(
        'État des Notifications',
        `Permissions: ${hasPermissions ? '✅ Accordées' : '❌ Refusées'}\nToken: ${token ? '✅ Présent' : '❌ Absent'}`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      Alert.alert('Erreur', `Impossible de vérifier: ${error.message}`);
    }
  };

  // Test 6: Version corrigée - Simuler une notification avec une approche plus sûre
  const testScheduledNotification = async () => {
    console.log('[TEST] ⏰ Test notification programmée - Version corrigée');
    
    try {
      // Vérifier d'abord que le service de notification est initialisé
      await NotificationService.initialize();
      
      // Nettoyer tous les listeners existants pour éviter les conflits
      console.log('[TEST] 🧹 Nettoyage des listeners existants...');
      
      // Utiliser une approche plus sûre sans addNotificationRequest
      // qui peut causer des conflits avec les listeners existants
      
      // Option 1: Utiliser presentLocalNotification (plus stable)
      const notificationData = {
        alertTitle: 'Message de Victor Barreyre',
        alertBody: 'Cliquez pour ouvrir (test programmé)',
        alertAction: 'view',
        userInfo: {
          type: 'new_message',
          conversationId: '6834506cf3c68470b83a18c3',
          senderId: '67ab77a2e80ecb6011a7bd04',
          senderName: 'Victor Barreyre',
          messageType: 'text',
          timestamp: new Date().toISOString(),
          isTest: true
        },
        applicationIconBadgeNumber: 1
      };
      
      // Programmer la notification avec un délai
      setTimeout(() => {
        console.log('[TEST] 📨 Envoi de la notification programmée...');
        PushNotificationIOS.presentLocalNotification(notificationData);
      }, 3000);
      
      Alert.alert(
        'Notification Programmée (Version Corrigée)',
        'Mettez l\'app en arrière-plan maintenant.\nNotification dans 3 secondes.',
        [{ text: 'OK' }]
      );
      
    } catch (error) {
      console.error('[TEST] ❌ Erreur lors de la programmation:', error);
      Alert.alert('Erreur', `Impossible de programmer la notification: ${error.message}`);
    }
  };

  // Test 6 Alternatif: Test avec addNotificationRequest mais avec gestion d'erreur
  const testScheduledNotificationAlternative = async () => {
    console.log('[TEST] ⏰ Test notification programmée - Alternative');
    
    try {
      // S'assurer que le service est initialisé
      await NotificationService.initialize();
      
      // Créer un ID unique pour éviter les conflits
      const notificationId = `test-scheduled-${Date.now()}`;
      
      // Utiliser addNotificationRequest avec gestion d'erreur
      const request = {
        id: notificationId,
        title: 'Message de Victor Barreyre',
        body: 'Cliquez pour ouvrir (test programmé alternative)',
        category: 'MESSAGE_CATEGORY',
        userInfo: {
          type: 'new_message',
          conversationId: '6834506cf3c68470b83a18c3',
          senderId: '67ab77a2e80ecb6011a7bd04',
          senderName: 'Victor Barreyre',
          messageType: 'text',
          timestamp: new Date().toISOString(),
          isTest: true,
          notificationId: notificationId
        },
        fireDate: new Date(Date.now() + 3000),
        repeats: false
      };
      
      console.log('[TEST] 📋 Paramètres de la notification:', JSON.stringify(request, null, 2));
      
      // Tenter d'ajouter la notification
      PushNotificationIOS.addNotificationRequest(request);
      
      Alert.alert(
        'Notification Programmée (Alternative)',
        'Mettez l\'app en arrière-plan maintenant.\nNotification dans 3 secondes.',
        [{ text: 'OK' }]
      );
      
    } catch (error) {
      console.error('[TEST] ❌ Erreur addNotificationRequest:', error);
      Alert.alert('Erreur Alternative', `Impossible de programmer: ${error.message}`);
    }
  };

  return (
    <ScrollView style={{ padding: 20 }}>
      <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 20 }}>
        Tests de Notifications Debug
      </Text>
      
      <View style={{ gap: 10 }}>
        <Button
          title="1. Test Simple (sans navigation)"
          onPress={testSimpleLocalNotification}
          color="#4CAF50"
        />
        
        <Button
          title="2. Test sans finish() (éviter crash)"
          onPress={testNotificationWithoutFinish}
          color="#2196F3"
        />
        
        <Button
          title="3. Navigation Directe (chargement complet)"
          onPress={testDirectNavigation}
          color="#FF9800"
        />
        
        <Button
          title="4. Test Listener"
          onPress={testNotificationListener}
          color="#9C27B0"
        />
        
        <Button
          title="5. Vérifier Permissions"
          onPress={checkNotificationPermissions}
          color="#607D8B"
        />
        
        <Button
          title="6. Test Programmé (Version Sûre)"
          onPress={testScheduledNotification}
          color="#E91E63"
        />
        
        <Button
          title="6b. Test Programmé (Alternative)"
          onPress={testScheduledNotificationAlternative}
          color="#9E4E63"
        />
      </View>
    </ScrollView>
  );
};

export default SimulatorNotificationTest;