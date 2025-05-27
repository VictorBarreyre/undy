import React from 'react';
import { Button, View, Alert, Text } from 'react-native';
import PushNotificationIOS from '@react-native-community/push-notification-ios';

const SimulatorNotificationTest = () => {
  // Test avec presentLocalNotification (immédiat)
  const testImmediateNotification = () => {
    console.log('[TEST] Envoi notification immédiate');
    
    PushNotificationIOS.presentLocalNotification({
      alertTitle: "Message de Victor Barreyre",
      alertBody: "Test notification simulateur",
      alertAction: "view",
      userInfo: {
        type: 'new_message',
        conversationId: '6834506cf3c68470b83a18c3',
        senderId: '67ab77a2e80ecb6011a7bd04',
        senderName: 'Victor Barreyre',
        messageType: 'text',
        timestamp: new Date().toISOString(),
        userInteraction: true
      },
      applicationIconBadgeNumber: 1
    });
  };

  // Test avec addNotificationRequest (iOS 10+)
  const testScheduledNotification = () => {
    console.log('[TEST] Programmation notification dans 5s');
    
    PushNotificationIOS.addNotificationRequest({
      id: 'test-' + Date.now(),
      title: 'Message de Test User',
      body: 'Cliquez pour ouvrir la conversation',
      category: 'MESSAGE',
      userInfo: {
        type: 'new_message',
        conversationId: '6834506cf3c68470b83a18c3',
        senderId: 'test-user-id',
        senderName: 'Test User',
        messageType: 'text',
        timestamp: new Date().toISOString()
      },
      fireDate: new Date(Date.now() + 5000), // Dans 5 secondes
      repeats: false
    });

    Alert.alert(
      'Notification programmée',
      'Mettez l\'app en arrière-plan dans les 5 prochaines secondes',
      [{ text: 'OK' }]
    );
  };

  // Test de navigation directe
  const testDirectNavigation = () => {
    console.log('[TEST] Test navigation d