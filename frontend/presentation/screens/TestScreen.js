// presentation/screens/TestScreen.js
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NotificationDebugHelper from '../components/NotificationDebugHelper';

const TestScreen = () => {

  // État pour stocker les vraies conversations
  const [realConversations, setRealConversations] = useState([]);
  const [selectedConversationId, setSelectedConversationId] = useState("675a1234abcd5678efgh9012");
  const [loading, setLoading] = useState(false);

  // Charger les vraies conversations au montage du composant
  useEffect(() => {
    loadRealConversations();
  }, []);

  const loadRealConversations = async () => {
    setLoading(true);
    console.log('🔍 Chargement des vraies conversations...');
    try {
      const conversations = await NotificationDebugHelper.getRealConversations();
      setRealConversations(conversations);

      // Utiliser la première conversation réelle si disponible
      if (conversations.length > 0) {
        setSelectedConversationId(conversations[0]._id);
        console.log('✅ Conversation sélectionnée:', conversations[0]._id);
      }
    } catch (error) {
      console.error('❌ Erreur chargement conversations:', error);
    }
    setLoading(false);
  };

  // Tests de base - utiliser l'ID sélectionné
  const handleTestDirectNavigation = () => {
    console.log('🧪 Test navigation directe...');
    NotificationDebugHelper.testDirectNavigation(selectedConversationId);
  };

  const handleTestNotification = () => {
    console.log('🧪 Test notification simulée...');
    NotificationDebugHelper.simulateMessageNotification(selectedConversationId, "Test User");
  };

  const handleDebugNavigation = () => {
    console.log('🧪 Debug état navigation...');
    NotificationDebugHelper.debugNavigationState();
  };

  const handleFullTest = () => {
    console.log('🧪 Test complet...');
    NotificationDebugHelper.runFullTest(selectedConversationId);
  };

  const handleCheckPermissions = async () => {
    console.log('🧪 Vérification permissions...');
    const result = await NotificationDebugHelper.checkNotificationPermissions();
    console.log('Résultat permissions:', result);
  };

  const handleCheckPendingNav = () => {
    console.log('🧪 Vérification navigations en attente...');
    NotificationDebugHelper.checkPendingNavigations();
  };

  const handleClearPendingNav = () => {
    console.log('🧪 Nettoyage navigations en attente...');
    NotificationDebugHelper.clearPendingNavigations();
  };

  // Nouveaux tests serveur
  const handleCompareNotificationData = () => {
    console.log('🧪 Comparaison des données...');
    NotificationDebugHelper.compareNotificationData();
  };

  const handleSimulateServerNotification = async () => {
    console.log('🧪 Simulation notification serveur...');
    try {
      const userDataStr = await AsyncStorage.getItem('userData');
      if (userDataStr) {
        const userData = JSON.parse(userDataStr);
        await NotificationDebugHelper.simulateExactServerNotification(
          selectedConversationId,
          userData._id,
          userData.name || "Test User"
        );
      } else {
        console.error('Données utilisateur non trouvées');
      }
    } catch (error) {
      console.error('Erreur simulation serveur:', error);
    }
  };

  const handleTestExactServerData = async () => {
    console.log('🧪 Test données serveur exactes...');
    try {
      const userDataStr = await AsyncStorage.getItem('userData');
      if (userDataStr) {
        const userData = JSON.parse(userDataStr);
        await NotificationDebugHelper.testNotificationListenerWithServerData(
          selectedConversationId,
          userData._id
        );
      } else {
        console.error('Données utilisateur non trouvées');
      }
    } catch (error) {
      console.error('Erreur test serveur exact:', error);
    }
  };

  const handleTestServerNotification = async () => {
    console.log('🧪 Test notification serveur réelle...');
    // Passer null pour forcer l'utilisation d'une vraie conversation
    const result = await NotificationDebugHelper.testWithRealServerNotification();
    console.log('Résultat test serveur:', result);
  };

  const handleTestServerBackground = async () => {
    console.log('🧪 Test serveur en arrière-plan...');

    Alert.alert(
      "Test Serveur Arrière-Plan",
      "1. Appuyez sur OK\n2. Mettez l'app en ARRIÈRE-PLAN (bouton home)\n3. Une notification serveur arrivera dans 5 secondes\n4. Cliquez sur la notification pour tester",
      [
        {
          text: "OK - Lancer le test",
          onPress: async () => {
            console.log('⏰ Mettez l\'app en arrière-plan MAINTENANT !');
            console.log('📱 Notification serveur dans 5 secondes...');

            // Attendre 5 secondes puis envoyer la notification serveur
            setTimeout(async () => {
              console.log('🌐 Envoi notification serveur...');
              const result = await NotificationDebugHelper.testWithRealServerNotification();
              console.log('📡 Notification serveur envoyée:', result);
            }, 5000);
          }
        }
      ]
    );
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Test des Notifications</Text>

      {/* Sélection de conversation */}
      <View style={styles.conversationSection}>
        <Text style={styles.sectionTitle}>💬 Conversations Disponibles</Text>
        {loading ? (
          <Text style={styles.loadingText}>Chargement des conversations...</Text>
        ) : realConversations.length > 0 ? (
          <View>
            <Text style={styles.selectedText}>
              Sélectionnée: {realConversations.find(c => c._id === selectedConversationId)?.name || 'Sans nom'}
            </Text>
            <Text style={styles.selectedId}>ID: {selectedConversationId}</Text>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.conversationList}>
              {realConversations.map((conv) => (
                <TouchableOpacity
                  key={conv._id}
                  style={[
                    styles.conversationItem,
                    selectedConversationId === conv._id && styles.selectedConversation
                  ]}
                  onPress={() => setSelectedConversationId(conv._id)}
                >
                  <Text style={[
                    styles.conversationText,
                    selectedConversationId === conv._id && styles.selectedConversationText
                  ]}>
                    {conv.name || 'Sans nom'}
                  </Text>
                  <Text style={styles.conversationId}>
                    {conv._id.substring(0, 8)}...
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TouchableOpacity style={styles.refreshButton} onPress={loadRealConversations}>
              <Text style={styles.refreshButtonText}>🔄 Actualiser</Text>
            </TouchableOpacity>
            
          </View>
        ) : (
          <View>
            <Text style={styles.noConversationsText}>
              ❌ Aucune conversation trouvée.
            </Text>
            <TouchableOpacity style={styles.refreshButton} onPress={loadRealConversations}>
              <Text style={styles.refreshButtonText}>🔄 Réessayer</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Tests de base */}
      <Text style={styles.sectionTitle}>📱 Tests de Base</Text>

      <TouchableOpacity style={styles.button} onPress={handleTestDirectNavigation}>
        <Text style={styles.buttonText}>🚀 Test Navigation Directe</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.button} onPress={handleTestNotification}>
        <Text style={styles.buttonText}>🔔 Test Notification Locale</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.button} onPress={handleDebugNavigation}>
        <Text style={styles.buttonText}>🔍 Debug État Navigation</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.button} onPress={handleCheckPermissions}>
        <Text style={styles.buttonText}>🔐 Vérifier Permissions</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.button} onPress={handleCheckPendingNav}>
        <Text style={styles.buttonText}>📋 Vérifier Nav. En Attente</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.button} onPress={handleClearPendingNav}>
        <Text style={styles.buttonText}>🧹 Nettoyer Nav. En Attente</Text>
      </TouchableOpacity>

      {/* Tests serveur */}
      <Text style={styles.sectionTitle}>🌐 Tests Serveur</Text>

      <TouchableOpacity style={[styles.button, styles.serverButton]} onPress={handleCompareNotificationData}>
        <Text style={[styles.buttonText, styles.serverButtonText]}>🔍 Comparer Données Local/Serveur</Text>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.button, styles.serverButton]} onPress={handleSimulateServerNotification}>
        <Text style={[styles.buttonText, styles.serverButtonText]}>🎭 Simuler Données Serveur Exactes</Text>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.button, styles.serverButton]} onPress={handleTestExactServerData}>
        <Text style={[styles.buttonText, styles.serverButtonText]}>🎧 Test Écouteur + Données Serveur</Text>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.button, styles.criticalButton]} onPress={handleTestServerNotification}>
        <Text style={[styles.buttonText, styles.criticalButtonText]}>🌐 TEST SERVEUR RÉEL</Text>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.button, styles.backgroundTestButton]} onPress={handleTestServerBackground}>
        <Text style={[styles.buttonText, styles.backgroundTestButtonText]}>📱 TEST SERVEUR ARRIÈRE-PLAN</Text>
      </TouchableOpacity>

      {/* Test complet */}
      <Text style={styles.sectionTitle}>🧪 Test Global</Text>

      <TouchableOpacity style={[styles.button, styles.primaryButton]} onPress={handleFullTest}>
        <Text style={[styles.buttonText, styles.primaryButtonText]}>🧪 TEST COMPLET ORIGINAL</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, styles.fixTestButton]}
        onPress={() => NotificationDebugHelper.debugCurrentNotificationState()}
      >
        <Text style={styles.buttonText}>🔍 Diagnostic État Notifications</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, styles.fixTestButton]}
        onPress={() => NotificationDebugHelper.testServerNotificationWithNewFix(selectedConversationId)}
      >
        <Text style={styles.buttonText}>🔧 TEST NOUVELLE CORRECTION</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, styles.backgroundTestButton]}
        onPress={() => NotificationDebugHelper.testBackgroundNotificationBehavior(selectedConversationId)}
      >
        <Text style={styles.buttonText}>🌙 Test Arrière-Plan</Text>
      </TouchableOpacity>

      <Text style={styles.note}>
        ⚠️ Vérifiez les logs de la console pour voir les résultats des tests.
        {'\n'}
        📱 Pour les tests de notification, des notifications apparaîtront sur votre appareil.
        {'\n'}
        👆 CLIQUEZ sur les notifications pour tester la navigation.
        {'\n'}
        🌐 Le test serveur réel enverra une vraie notification via votre backend.
      </Text>

      <Text style={styles.instructions}>
        📋 <Text style={styles.bold}>Ordre de test recommandé :</Text>
        {'\n'}1. Comparer Données Local/Serveur
        {'\n'}2. Simuler Données Serveur Exactes
        {'\n'}3. Test Écouteur + Données Serveur
        {'\n'}4. TEST SERVEUR RÉEL
      </Text>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
    color: '#333',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 10,
    color: '#333',
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
  },
  serverButton: {
    backgroundColor: '#34C759', // Vert pour les tests serveur
  },
  primaryButton: {
    backgroundColor: '#FF3B30',
    marginTop: 10,
  },
  criticalButton: {
    backgroundColor: '#FF9500', // Orange pour le test critique
    marginTop: 10,
  },
  buttonText: {
    color: 'white',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
  },
  serverButtonText: {
    fontSize: 15,
  },
  primaryButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  criticalButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  note: {
    fontSize: 12,
    color: '#666',
    marginTop: 20,
    textAlign: 'center',
    fontStyle: 'italic',
    lineHeight: 18,
  },
  instructions: {
    fontSize: 13,
    color: '#444',
    marginTop: 15,
    padding: 15,
    backgroundColor: '#e8f4f8',
    borderRadius: 10,
    lineHeight: 20,
  },
  conversationSection: {
    marginBottom: 20,
    padding: 15,
    backgroundColor: '#fff',
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  loadingText: {
    textAlign: 'center',
    fontStyle: 'italic',
    color: '#666',
  },
  selectedText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  selectedId: {
    fontSize: 12,
    color: '#666',
    fontFamily: 'monospace',
    marginBottom: 10,
  },
  conversationList: {
    marginBottom: 10,
  },
  conversationItem: {
    padding: 10,
    marginRight: 10,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    minWidth: 120,
  },
  selectedConversation: {
    backgroundColor: '#007AFF',
  },
  conversationText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
  selectedConversationText: {
    color: 'white',
  },
  conversationId: {
    fontSize: 10,
    color: '#999',
    textAlign: 'center',
    marginTop: 2,
    fontFamily: 'monospace',
  },
  refreshButton: {
    backgroundColor: '#34C759',
    padding: 8,
    borderRadius: 6,
    alignSelf: 'center',
  },
  refreshButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  noConversationsText: {
    textAlign: 'center',
    color: '#FF3B30',
    fontWeight: '600',
    marginBottom: 10,
  },
  bold: {
    fontWeight: 'bold',
    color: '#222',
  },
  backgroundTestButton: {
    backgroundColor: '#8E44AD',
    marginTop: 10,
  },
  backgroundTestButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  fixTestButton: {
    backgroundColor: '#9C27B0', // Violet pour les tests de correction
    marginTop: 5,
  },
  
  verificationButton: {
    backgroundColor: '#2196F3', // Bleu pour les vérifications
    marginTop: 5,
  },
  
  comparisonButton: {
    backgroundColor: '#FF5722', // Orange foncé pour les comparaisons
    marginTop: 5,
  },
});

export default TestScreen;