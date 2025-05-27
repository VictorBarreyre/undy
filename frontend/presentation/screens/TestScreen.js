// TestNotifications.js - À ajouter temporairement dans votre app pour tester

import React from 'react';
import { View, Button, Text, StyleSheet } from 'react-native';
import NotificationService from '../notifications/NotificationService';
import NotificationManager from '../notifications/NotificationManager';

const TestNotifications = () => {
  const [status, setStatus] = React.useState('');

  const testLocalNotification = async () => {
    setStatus('Envoi notification locale...');
    
    const id = await NotificationService.sendLocalNotification(
      'Test Local',
      'Cliquez pour ouvrir la conversation',
      {
        type: 'new_message',
        conversationId: '6834506cf3c68470b83a18c3', // Remplacez par un ID valide
        senderName: 'Test User'
      }
    );
    
    setStatus(id ? 'Notification locale envoyée!' : 'Échec');
  };

  const testRemoteNotification = async () => {
    setStatus('Test notification distante...');
    
    const result = await NotificationManager.testRemoteNotification();
    
    setStatus(result.success ? 'Test réussi!' : `Échec: ${result.message}`);
  };

  const checkPermissions = async () => {
    setStatus('Vérification permissions...');
    
    const { granted, token } = await NotificationService.requestPermissions();
    
    setStatus(`Permissions: ${granted ? 'Accordées' : 'Refusées'}\nToken: ${token || 'Aucun'}`);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Test des Notifications</Text>
      
      <Button title="Vérifier Permissions" onPress={checkPermissions} />
      <View style={styles.spacer} />
      
      <Button title="Test Notification Locale" onPress={testLocalNotification} />
      <View style={styles.spacer} />
      
      <Button title="Test Notification Distante" onPress={testRemoteNotification} />
      
      <Text style={styles.status}>{status}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  spacer: {
    height: 10,
  },
  status: {
    marginTop: 20,
    padding: 10,
    backgroundColor: '#f0f0f0',
    borderRadius: 5,
    textAlign: 'center',
  },
});

export default TestNotifications;