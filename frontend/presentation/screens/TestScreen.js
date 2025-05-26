// presentation/screens/TestScreen.js
import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  ScrollView, 
  Alert, 
  ActivityIndicator,
  RefreshControl 
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NotificationDebugHelper from '../components/NotificationDebugHelper';

const TestScreen = () => {
  // États
  const [realConversations, setRealConversations] = useState([]);
  const [selectedConversationId, setSelectedConversationId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [testResults, setTestResults] = useState({});
  const [currentTest, setCurrentTest] = useState(null);

  // Charger les conversations au montage
  useEffect(() => {
    loadRealConversations();
  }, []);
  const loadRealConversations = async () => {
    setLoading(true);
    try {
      const conversations = await NotificationDebugHelper.getRealConversations();
      console.log('Conversations chargées:', conversations); // Ajoutez ce log pour vérifier les conversations chargées
      setRealConversations(conversations);
  
      if (conversations.length > 0 && !selectedConversationId) {
        setSelectedConversationId(conversations[0]._id);
      }
    } catch (error) {
      console.error('❌ Erreur chargement conversations:', error);
      Alert.alert('Erreur', 'Impossible de charger les conversations');
    }
    setLoading(false);
    setRefreshing(false);
  };

  // Fonction pour lancer un test avec feedback visuel
  const runTest = async (testName, testFunction) => {
    setCurrentTest(testName);
    setTestResults(prev => ({ ...prev, [testName]: 'running' }));
    
    try {
      const result = await testFunction();
      setTestResults(prev => ({ ...prev, [testName]: result ? 'success' : 'failed' }));
      return result;
    } catch (error) {
      console.error(`❌ Erreur test ${testName}:`, error);
      setTestResults(prev => ({ ...prev, [testName]: 'error' }));
      return false;
    } finally {
      setCurrentTest(null);
    }
  };

  // === TESTS RAPIDES ===
  const handleQuickDiagnostic = async () => {
    console.log('🏃 DIAGNOSTIC RAPIDE EN COURS...');
    
    // 1. Permissions
    await runTest('permissions', async () => {
      const result = await NotificationDebugHelper.checkNotificationPermissions();
      console.log('📱 Permissions:', result ? '✅' : '❌');
      return result;
    });
    
    // 2. Navigation
    await runTest('navigation', async () => {
      const state = NotificationDebugHelper.debugNavigationState();
      console.log('🧭 Navigation:', state ? '✅' : '❌');
      return !!state;
    });
    
    // 3. Navigations en attente
    await runTest('pending', async () => {
      await NotificationDebugHelper.checkPendingNavigations();
      return true;
    });
    
    Alert.alert(
      'Diagnostic Terminé',
      `Permissions: ${testResults.permissions === 'success' ? '✅' : '❌'}\n` +
      `Navigation: ${testResults.navigation === 'success' ? '✅' : '❌'}\n` +
      `État: Vérifié ✅`
    );
  };

  // === TEST NOTIFICATION LOCALE ===
  const handleTestLocal = async () => {
    if (!selectedConversationId) {
      Alert.alert('Erreur', 'Sélectionnez une conversation');
      return;
    }
    
    console.log('📱 TEST NOTIFICATION LOCALE');
    Alert.alert(
      'Test Local',
      'Une notification locale va apparaître dans 2 secondes. Cliquez dessus pour tester la navigation.',
      [{ text: 'OK', onPress: async () => {
        await runTest('local', async () => {
          return await NotificationDebugHelper.simulateMessageNotification(
            selectedConversationId, 
            "Test Local"
          );
        });
      }}]
    );
  };

  // === TEST NOTIFICATION SERVEUR ===
  const handleTestServer = async () => {
    if (!selectedConversationId) {
      Alert.alert('Erreur', 'Sélectionnez une conversation');
      return;
    }
    
    console.log('🌐 TEST NOTIFICATION SERVEUR');
    Alert.alert(
      'Test Serveur',
      'Une vraie notification serveur va être envoyée. Cliquez dessus pour tester la navigation.',
      [{ text: 'OK', onPress: async () => {
        await runTest('server', async () => {
          return await NotificationDebugHelper.testServerNotification(
            selectedConversationId,
            "🧪 Test Serveur - Cliquez pour naviguer"
          );
        });
      }}]
    );
  };

  // === TEST COMPLET AUTOMATISÉ ===
  const handleFullAutoTest = async () => {
    if (!selectedConversationId) {
      Alert.alert('Erreur', 'Sélectionnez une conversation');
      return;
    }
    
    console.log('🤖 TEST AUTOMATISÉ COMPLET');
    
    Alert.alert(
      'Test Automatisé',
      'Ce test va :\n' +
      '1. Vérifier les permissions\n' +
      '2. Nettoyer les navigations en attente\n' +
      '3. Tester la navigation directe\n' +
      '4. Envoyer une notification locale\n' +
      '5. Envoyer une notification serveur\n\n' +
      'Suivez les logs pour voir les résultats.',
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Démarrer', onPress: async () => {
          // 1. Permissions
          console.log('1️⃣ Vérification des permissions...');
          const hasPermissions = await runTest('permissions', 
            NotificationDebugHelper.checkNotificationPermissions
          );
          
          if (!hasPermissions) {
            Alert.alert('Erreur', 'Permissions requises');
            return;
          }
          
          // 2. Nettoyage
          console.log('2️⃣ Nettoyage des navigations en attente...');
          await runTest('cleanup', NotificationDebugHelper.clearPendingNavigations);
          
          // 3. Navigation directe
          console.log('3️⃣ Test navigation directe...');
          await runTest('directNav', () => 
            NotificationDebugHelper.testDirectNavigation(selectedConversationId)
          );
          
          // 4. Notification locale (après 2s)
          setTimeout(async () => {
            console.log('4️⃣ Test notification locale...');
            await runTest('localNotif', () => 
              NotificationDebugHelper.simulateMessageNotification(
                selectedConversationId, 
                "Test Auto Local"
              )
            );
          }, 2000);
          
          // 5. Notification serveur (après 5s)
          setTimeout(async () => {
            console.log('5️⃣ Test notification serveur...');
            await runTest('serverNotif', () => 
              NotificationDebugHelper.testServerNotification(
                selectedConversationId,
                "Test Auto Serveur"
              )
            );
          }, 5000);
        }}
      ]
    );
  };

  // === TEST ARRIÈRE-PLAN ===
  const handleBackgroundTest = async () => {
    if (!selectedConversationId) {
      Alert.alert('Erreur', 'Sélectionnez une conversation');
      return;
    }
    
    Alert.alert(
      '🌙 Test Arrière-Plan',
      'Instructions :\n\n' +
      '1. Appuyez sur "Démarrer"\n' +
      '2. Mettez IMMÉDIATEMENT l\'app en arrière-plan\n' +
      '3. Une notification arrivera dans 5 secondes\n' +
      '4. Cliquez sur la notification\n' +
      '5. Vous devriez arriver sur la conversation',
      [
        { text: 'Annuler', style: 'cancel' },
        { 
          text: 'Démarrer', 
          onPress: () => {
            console.log('🌙 TEST ARRIÈRE-PLAN DÉMARRÉ');
            setTimeout(async () => {
              await runTest('background', () => 
                NotificationDebugHelper.testServerNotification(
                  selectedConversationId,
                  "🌙 Cliquez pour revenir dans l'app"
                )
              );
            }, 5000);
          }
        }
      ]
    );
  };

  // === COMPARAISON DÉTAILLÉE ===
  const handleDetailedComparison = async () => {
    console.log('🔍 COMPARAISON DÉTAILLÉE');
    
    // Afficher la structure attendue
    NotificationDebugHelper.compareNotificationData();
    
    // Vérifier la structure serveur réelle
    if (selectedConversationId) {
      await NotificationDebugHelper.verifyServerNotificationStructure(selectedConversationId);
    }
    
    Alert.alert(
      'Comparaison',
      'Vérifiez les logs pour voir :\n' +
      '- Structure locale vs serveur\n' +
      '- Champs présents/manquants\n' +
      '- Recommandations'
    );
  };

  // Interface de statut des tests
  const getTestStatusIcon = (testName) => {
    const status = testResults[testName];
    if (currentTest === testName) return '⏳';
    switch (status) {
      case 'success': return '✅';
      case 'failed': return '❌';
      case 'error': return '⚠️';
      default: return '⭕';
    }
  };

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            loadRealConversations();
          }}
        />
      }
    >
      <View style={styles.header}>
        <Text style={styles.title}>🧪 Centre de Test Notifications</Text>
        <Text style={styles.subtitle}>Debug & Diagnostic</Text>
      </View>

      {/* Sélection de conversation */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>💬 Conversation de Test</Text>
        
        {loading ? (
          <ActivityIndicator size="large" color="#007AFF" />
        ) : realConversations.length > 0 ? (
          <>
            <View style={styles.conversationInfo}>
              <Text style={styles.label}>Active :</Text>
              <Text style={styles.value}>
                {realConversations.find(c => c._id === selectedConversationId)?.name || 'Sélectionnez'}
              </Text>
            </View>
            
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false} 
              style={styles.conversationList}
            >
              {realConversations.map((conv) => (
                <TouchableOpacity
                  key={conv._id}
                  style={[
                    styles.conversationChip,
                    selectedConversationId === conv._id && styles.selectedChip
                  ]}
                  onPress={() => setSelectedConversationId(conv._id)}
                >
                  <Text style={[
                    styles.chipText,
                    selectedConversationId === conv._id && styles.selectedChipText
                  ]}>
                    {conv.name || 'Sans nom'}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>Aucune conversation trouvée</Text>
            <TouchableOpacity 
              style={styles.refreshButton} 
              onPress={loadRealConversations}
            >
              <Text style={styles.refreshButtonText}>Réessayer</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Tests Rapides */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>⚡ Tests Rapides</Text>
        
        <TouchableOpacity 
          style={[styles.testButton, styles.diagnosticButton]}
          onPress={handleQuickDiagnostic}
        >
          <Text style={styles.testButtonText}>
            {getTestStatusIcon('permissions')} Diagnostic Rapide
          </Text>
          <Text style={styles.testDescription}>
            Vérifie permissions, navigation et état
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.testButton, styles.localButton]}
          onPress={handleTestLocal}
          disabled={!selectedConversationId}
        >
          <Text style={styles.testButtonText}>
            {getTestStatusIcon('local')} Test Local
          </Text>
          <Text style={styles.testDescription}>
            Notification locale avec navigation
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.testButton, styles.serverButton]}
          onPress={handleTestServer}
          disabled={!selectedConversationId}
        >
          <Text style={styles.testButtonText}>
            {getTestStatusIcon('server')} Test Serveur
          </Text>
          <Text style={styles.testDescription}>
            Notification réelle via backend
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tests Avancés */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>🔬 Tests Avancés</Text>
        
        <TouchableOpacity 
          style={[styles.testButton, styles.autoButton]}
          onPress={handleFullAutoTest}
          disabled={!selectedConversationId}
        >
          <Text style={styles.testButtonText}>
            🤖 Test Automatisé Complet
          </Text>
          <Text style={styles.testDescription}>
            Suite complète de tests (permissions → navigation → notifications)
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.testButton, styles.backgroundButton]}
          onPress={handleBackgroundTest}
          disabled={!selectedConversationId}
        >
          <Text style={styles.testButtonText}>
            🌙 Test Arrière-Plan
          </Text>
          <Text style={styles.testDescription}>
            Test de notification quand l'app est en background
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.testButton, styles.compareButton]}
          onPress={handleDetailedComparison}
        >
          <Text style={styles.testButtonText}>
            🔍 Analyse Détaillée
          </Text>
          <Text style={styles.testDescription}>
            Compare structures local vs serveur
          </Text>
        </TouchableOpacity>
      </View>

      {/* Actions Utiles */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>🛠️ Utilitaires</Text>
        
        <View style={styles.utilityRow}>
          <TouchableOpacity 
            style={styles.utilityButton}
            onPress={() => NotificationDebugHelper.checkPendingNavigations()}
          >
            <Text style={styles.utilityButtonText}>📋 Voir Attente</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.utilityButton}
            onPress={() => NotificationDebugHelper.clearPendingNavigations()}
          >
            <Text style={styles.utilityButtonText}>🧹 Nettoyer</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.utilityButton}
            onPress={() => NotificationDebugHelper.debugNavigationState()}
          >
            <Text style={styles.utilityButtonText}>🧭 État Nav</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Instructions */}
      <View style={styles.instructionsCard}>
        <Text style={styles.instructionsTitle}>📚 Guide d'utilisation</Text>
        <Text style={styles.instructionsText}>
          <Text style={styles.bold}>Pour débugger rapidement :</Text>
          {'\n'}1. Sélectionnez une conversation
          {'\n'}2. Lancez le "Diagnostic Rapide"
          {'\n'}3. Testez "Local" puis "Serveur"
          {'\n'}4. Vérifiez les logs [APP] dans la console
          {'\n\n'}
          <Text style={styles.bold}>Points clés à vérifier :</Text>
          {'\n'}• [APP] 📋 Données dans content.data
          {'\n'}• [APP] ✅ Notification de message valide
          {'\n'}• [APP] 🎉 Navigation notification réussie
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f0f5',
  },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    paddingTop: 40,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
  },
  card: {
    backgroundColor: '#fff',
    margin: 15,
    marginBottom: 0,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  conversationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  label: {
    fontSize: 14,
    color: '#666',
    marginRight: 10,
  },
  value: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  conversationList: {
    marginTop: 10,
  },
  conversationChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
    marginRight: 10,
  },
  selectedChip: {
    backgroundColor: '#007AFF',
  },
  chipText: {
    fontSize: 14,
    color: '#666',
  },
  selectedChipText: {
    color: '#fff',
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 10,
  },
  refreshButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#007AFF',
    borderRadius: 8,
  },
  refreshButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  testButton: {
    padding: 16,
    borderRadius: 10,
    marginBottom: 12,
  },
  testButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  testDescription: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
  },
  diagnosticButton: {
    backgroundColor: '#007AFF',
  },
  localButton: {
    backgroundColor: '#34C759',
  },
  serverButton: {
    backgroundColor: '#FF9500',
  },
  autoButton: {
    backgroundColor: '#5856D6',
  },
  backgroundButton: {
    backgroundColor: '#8E44AD',
  },
  compareButton: {
    backgroundColor: '#FF3B30',
  },
  utilityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  utilityButton: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  utilityButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  instructionsCard: {
    backgroundColor: '#e8f4f8',
    margin: 15,
    padding: 20,
    borderRadius: 12,
    marginBottom: 30,
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  instructionsText: {
    fontSize: 14,
    color: '#444',
    lineHeight: 22,
  },
  bold: {
    fontWeight: 'bold',
  },
});

export default TestScreen;