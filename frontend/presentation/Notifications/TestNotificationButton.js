// TestNotificationButton.js
import React, { useState, useContext } from 'react';
import { Button, Text, Box, VStack, HStack, Badge } from 'native-base';
import {  Alert } from 'react-native';
import { AuthContext } from '../../infrastructure/context/AuthContext';
import { getAxiosInstance } from '../../data/api/axiosInstance';
import NotificationService from '../Notifications/NotificationService';
import * as Notifications from 'expo-notifications';


const TestNotificationButton = () => {
  const { userData } = useContext(AuthContext);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const testServerNotification = async () => {
    setLoading(true);
    setResult(null);

    try {
      // 1. Obtenir le token
      const token = await NotificationService.getToken();
      console.log("[NOTIF_TEST] Token obtenu:", token);

      if (!token) {
        setResult({
          success: false,
          message: "Impossible d'obtenir un token de notification"
        });
        setLoading(false);
        return;
      }

      // 2. Envoyer une requête au serveur pour tester la notification
      const instance = getAxiosInstance();
      const response = await instance.post('/api/notifications/test', { token });

      console.log("[NOTIF_TEST] Réponse du serveur:", response.data);

      setResult({
        success: true,
        message: "Notification envoyée avec succès depuis le serveur",
        details: response.data
      });
    } catch (error) {
      console.error("[NOTIF_TEST] Erreur:", error);
      setResult({
        success: false,
        message: "Erreur lors de l'envoi de la notification",
        error: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  const testLocalNotification = async () => {
    setLoading(true);
    setResult(null);

    try {
      const result = await NotificationService.sendLocalNotification(
        "⚠️ Test LOCAL",
        "Cette notification a été envoyée localement depuis l'application",
        { type: 'local_test', timestamp: new Date().toISOString() }
      );

      setResult({
        success: result,
        message: result
          ? "Notification locale envoyée avec succès"
          : "Échec de l'envoi de la notification locale"
      });
    } catch (error) {
      setResult({
        success: false,
        message: "Erreur lors de l'envoi de la notification locale",
        error: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <VStack space={4} width="100%" mt={4}>
      <VStack space={2} justifyContent="center">
        <Button
          colorScheme="blue"
          onPress={testLocalNotification}
          isLoading={loading && !result}
          isLoadingText="Envoi..."
        >
          Test notification locale
        </Button>

        <Button
          colorScheme="purple"
          onPress={testServerNotification}
          isLoading={loading && !result}
          isLoadingText="Envoi..."
        >
          Test notification serveur
        </Button>
      </VStack>

      {result && (
        <Box
          p={3}
          borderRadius="md"
          bg={result.success ? "green.100" : "red.100"}
        >
          <HStack space={2} mb={2}>
            <Badge colorScheme={result.success ? "success" : "error"}>
              {result.success ? "SUCCÈS" : "ÉCHEC"}
            </Badge>
          </HStack>
          <Text fontWeight="medium">{result.message}</Text>
          {result.error && (
            <Text color="red.600" mt={1}>
              Erreur: {result.error}
            </Text>
          )}
        </Box>
      )}
    </VStack>
  );
};

export default TestNotificationButton;