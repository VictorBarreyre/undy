// TestNotificationButton.js
import React, { useState, useContext } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet, Alert } from 'react-native';
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
    <View style={styles.container}>
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, styles.blueButton]}
          onPress={testLocalNotification}
          disabled={loading && !result}
        >
          {loading && !result ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator color="white" />
              <Text style={styles.buttonText}>Envoi...</Text>
            </View>
          ) : (
            <Text style={styles.buttonText}>Test notification locale</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.purpleButton]}
          onPress={testServerNotification}
          disabled={loading && !result}
        >
          {loading && !result ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator color="white" />
              <Text style={styles.buttonText}>Envoi...</Text>
            </View>
          ) : (
            <Text style={styles.buttonText}>Test notification serveur</Text>
          )}
        </TouchableOpacity>
      </View>

      {result && (
        <View
          style={[
            styles.resultContainer,
            result.success ? styles.successContainer : styles.errorContainer
          ]}
        >
          <View style={styles.badgeRow}>
            <View style={[
              styles.badge,
              result.success ? styles.successBadge : styles.errorBadge
            ]}>
              <Text style={styles.badgeText}>
                {result.success ? "SUCCÈS" : "ÉCHEC"}
              </Text>
            </View>
          </View>
          <Text style={styles.resultMessage}>{result.message}</Text>
          {result.error && (
            <Text style={styles.errorText}>
              Erreur: {result.error}
            </Text>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginTop: 16,
  },
  buttonContainer: {
    marginBottom: 8,
  },
  button: {
    borderRadius: 4,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  blueButton: {
    backgroundColor: '#3498db',
  },
  purpleButton: {
    backgroundColor: '#9b59b6',
  },
  buttonText: {
    color: 'white',
    fontWeight: '600',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultContainer: {
    padding: 12,
    borderRadius: 6,
    marginTop: 8,
  },
  successContainer: {
    backgroundColor: 'rgba(72, 187, 120, 0.2)',
  },
  errorContainer: {
    backgroundColor: 'rgba(245, 101, 101, 0.2)',
  },
  badgeRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  badge: {
    borderRadius: 4,
    paddingVertical: 2,
    paddingHorizontal: 8,
  },
  successBadge: {
    backgroundColor: '#48bb78',
  },
  errorBadge: {
    backgroundColor: '#f56565',
  },
  badgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  resultMessage: {
    fontWeight: '500',
  },
  errorText: {
    color: '#e53e3e',
    marginTop: 4,
  },
});

export default TestNotificationButton;