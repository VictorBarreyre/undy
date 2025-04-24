// NotificationTestScreen.js
import React, { useState, useContext } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { Box, Text, Button, VStack, HStack, Badge, Heading, Divider } from 'native-base';
import NotificationManager from '../presentation/Notifications/NotificationManager';
import NotificationService from '../presentation/Notifications/NotificationService';
import { AuthContext } from '../infrastructure/context/AuthContext';

const NotificationTestScreen = () => {
  const { userData } = useContext(AuthContext);
  const [testResults, setTestResults] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [logs, setLogs] = useState([]);

  const addLog = (message) => {
    setLogs(prevLogs => [...prevLogs, { message, timestamp: new Date().toISOString() }]);
  };

  const testNotificationSystem = async () => {
    setIsLoading(true);
    setLogs([]);
    addLog("[NOTIF_TEST] Début du test complet du système de notifications");
    
    try {
      // 1. Vérifier l'initialisation
      addLog("[NOTIF_TEST] Vérification de l'initialisation");
      const notifManager = NotificationManager;
      addLog(`[NOTIF_TEST] État d'initialisation: ${notifManager.initialized}`);
      
      // 2. Initialiser si nécessaire
      if (!notifManager.initialized) {
        addLog("[NOTIF_TEST] Initialisation du gestionnaire");
        await notifManager.initialize(userData);
      }
      
      // 3. Vérifier les permissions
      addLog("[NOTIF_TEST] Vérification des permissions");
      const hasPermission = await NotificationService.checkPermissions(true);
      addLog(`[NOTIF_TEST] Permissions: ${hasPermission}`);
      
      if (!hasPermission) {
        addLog("[NOTIF_TEST] Permissions non accordées, impossible de continuer");
        setTestResults({
          success: false,
          step: "permissions",
          message: "Les permissions de notifications ne sont pas accordées"
        });
        return;
      }
      
      // 4. Essayer d'obtenir un token
      addLog("[NOTIF_TEST] Récupération du token");
      const token = await NotificationService.getToken();
      addLog(`[NOTIF_TEST] Token obtenu: ${token}`);
      
      // 5. Envoyer une notification de test
      addLog("[NOTIF_TEST] Envoi d'une notification de test");
      const result = await NotificationService.sendTestNotification();
      addLog(`[NOTIF_TEST] Résultat de l'envoi: ${result}`);
      
      setTestResults({
        success: result,
        token: token,
        message: result 
          ? "Test de notification réussi" 
          : "Échec de l'envoi de la notification de test"
      });
    } catch (error) {
      addLog(`[NOTIF_TEST] ERREUR pendant le test: ${error.message}`);
      setTestResults({
        success: false,
        error: error.message,
        message: "Une erreur est survenue pendant le test"
      });
    } finally {
      addLog("[NOTIF_TEST] Test terminé");
      setIsLoading(false);
    }
  };

  return (
    <Box flex={1} p={4} bg="white">
      <Heading size="lg" mb={4}>Test du système de notifications</Heading>
      
      <Button 
        colorScheme="blue" 
        onPress={testNotificationSystem} 
        isLoading={isLoading}
        isLoadingText="Test en cours..."
        mb={4}
      >
        Lancer le test de notifications
      </Button>
      
      {testResults && (
        <Box mb={4} p={3} borderRadius="md" bg={testResults.success ? "green.100" : "red.100"}>
          <HStack space={2} mb={2}>
            <Badge colorScheme={testResults.success ? "success" : "error"}>
              {testResults.success ? "RÉUSSI" : "ÉCHEC"}
            </Badge>
            {testResults.step && <Badge>{testResults.step}</Badge>}
          </HStack>
          <Text>{testResults.message}</Text>
          {testResults.token && (
            <Text mt={2} fontSize="xs">
              Token: {testResults.token.substring(0, 20)}...
            </Text>
          )}
          {testResults.error && (
            <Text mt={2} color="red.600">
              Erreur: {testResults.error}
            </Text>
          )}
        </Box>
      )}
      
      <Heading size="md" mb={2}>Logs</Heading>
      <Divider mb={2} />
      
      <ScrollView style={styles.logsContainer}>
        {logs.map((log, index) => (
          <Text key={index} style={styles.logEntry}>
            {log.message}
          </Text>
        ))}
        {logs.length === 0 && (
          <Text style={styles.emptyLogs}>Aucun log disponible. Lancez le test pour voir les résultats.</Text>
        )}
      </ScrollView>
    </Box>
  );
};

const styles = StyleSheet.create({
  logsContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 8,
    borderRadius: 4
  },
  logEntry: {
    fontSize: 12,
    fontFamily: 'monospace',
    marginBottom: 4
  },
  emptyLogs: {
    textAlign: 'center',
    padding: 20,
    color: '#888'
  }
});

export default NotificationTestScreen;