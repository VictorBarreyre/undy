import { useEffect, useRef, useContext } from 'react';
import { AppState, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { AuthContext } from '../../infrastructure/context/AuthContext';
import NotificationService from '../notifications/NotificationService';
import NotificationManager from '../notifications/NotificationManager';
import PushNotificationIOS from '@react-native-community/push-notification-ios';

const NotificationHandler = () => {
  const navigation = useNavigation();
  const { userData } = useContext(AuthContext);
  const appStateRef = useRef(AppState.currentState);
  const removeNotificationListener = useRef(null);

  useEffect(() => {
    let isSubscribed = true;

    const initializeNotifications = async () => {
      if (userData && isSubscribed) {
        console.log('[NotificationHandler] ✅ Initialisation pour l\'utilisateur:', userData._id);
        
        try {
          // Initialiser le service de notifications
          await NotificationService.initialize();
          console.log('[NotificationHandler] ✅ NotificationService initialisé');
          
          // Initialiser le manager
          await NotificationManager.initialize(userData);
          console.log('[NotificationHandler] ✅ NotificationManager initialisé');
          
          // Ajouter un listener pour les clics sur notifications
          removeNotificationListener.current = NotificationService.addNotificationListener((data) => {
            console.log('[NotificationHandler] 🔔 Listener déclenché avec data:', JSON.stringify(data, null, 2));
            handleNotificationData(data);
          });
          console.log('[NotificationHandler] ✅ Listener enregistré');

          // Vérifier s'il y a une notification initiale
          try {
            const initialNotification = await PushNotificationIOS.getInitialNotification();
            console.log('[NotificationHandler] 📱 Notification initiale:', initialNotification);
            
            if (initialNotification) {
              // Extraire les données
              let data = null;
              if (initialNotification._data) {
                data = initialNotification._data;
              } else if (initialNotification.userInfo) {
                data = initialNotification.userInfo;
              } else if (initialNotification.data) {
                data = initialNotification.data;
              }
              
              if (data && data.conversationId) {
                console.log('[NotificationHandler] 📱 Navigation depuis notification initiale');
                // Délai pour s'assurer que la navigation est prête
                setTimeout(() => handleNotificationData(data), 1500);
              }
            }
          } catch (error) {
            console.log('[NotificationHandler] ℹ️ Pas de notification initiale ou erreur:', error.message);
          }
        } catch (error) {
          console.error('[NotificationHandler] ❌ Erreur d\'initialisation:', error);
        }
      }
    };

    initializeNotifications();

    // Écouter les changements d'état de l'app
    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      console.log('[NotificationHandler] 🧹 Nettoyage des listeners');
      isSubscribed = false;
      subscription.remove();
      
      // Retirer le listener des notifications
      if (removeNotificationListener.current) {
        removeNotificationListener.current();
      }
    };
  }, [userData, navigation]);

  const handleAppStateChange = (nextAppState) => {
    console.log('[NotificationHandler] 📱 App state change:', appStateRef.current, '→', nextAppState);
    if (appStateRef.current.match(/inactive|background/) && nextAppState === 'active') {
      // L'app revient au premier plan, effacer le badge
      NotificationService.setBadgeCount(0);
    }
    appStateRef.current = nextAppState;
  };

  const handleNotificationData = (data) => {
    console.log('[NotificationHandler] 🎯 handleNotificationData appelé');
    console.log('[NotificationHandler] 📊 Données complètes:', JSON.stringify(data, null, 2));
    console.log('[NotificationHandler] 🧭 Navigation disponible:', !!navigation);
    console.log('[NotificationHandler] 📍 Type:', data?.type);
    console.log('[NotificationHandler] 🆔 ConversationId:', data?.conversationId);

    if (!data) {
      console.log('[NotificationHandler] ❌ Pas de données');
      return;
    }

    if (!navigation) {
      console.log('[NotificationHandler] ❌ Navigation non disponible');
      return;
    }

    // S'assurer que la navigation est prête
    setTimeout(() => {
      console.log('[NotificationHandler] ⏰ Tentative de navigation après délai');
      
      // Navigation selon le type de notification
      switch (data.type) {
        case 'new_message':
          if (data.conversationId) {
            console.log('[NotificationHandler] 🚀 Navigation vers la conversation:', data.conversationId);
            
            try {
              // CORRECTION: Utiliser la structure correcte de votre navigation
              // DrawerNavigator → TabNavigator → ConversationStackNavigator → ChatScreen
              navigation.navigate('MainApp', {
                screen: 'Tabs',
                params: {
                  screen: 'ChatTab',
                  params: {
                    screen: 'Chat',
                    params: {
                      conversationId: data.conversationId,
                      senderId: data.senderId || '',
                      senderName: data.senderName || '',
                    },
                  },
                },
              });
              
              console.log('[NotificationHandler] ✅ Navigation réussie');
            } catch (error) {
              console.error('[NotificationHandler] ❌ Erreur navigation:', error);
              
              // Essayer une approche différente
              try {
                // D'abord naviguer vers le tab Chat
                navigation.navigate('ChatTab');
                
                // Puis vers la conversation après un délai
                setTimeout(() => {
                  navigation.navigate('Chat', { 
                    conversationId: data.conversationId,
                    senderId: data.senderId || '',
                    senderName: data.senderName || ''
                  });
                }, 300);
                
                console.log('[NotificationHandler] ✅ Navigation alternative réussie');
              } catch (altError) {
                console.error('[NotificationHandler] ❌ Erreur navigation alternative:', altError);
                
                // Dernière tentative : afficher une alerte
                Alert.alert(
                  'Nouveau message',
                  `De: ${data.senderName || 'Inconnu'}`,
                  [
                    { text: 'Ignorer', style: 'cancel' },
                    { 
                      text: 'Voir', 
                      onPress: () => {
                        // Essayer de naviguer juste vers l'onglet chat
                        try {
                          navigation.navigate('ChatTab');
                        } catch (err) {
                          console.error('[NotificationHandler] ❌ Impossible de naviguer:', err);
                        }
                      }
                    }
                  ]
                );
              }
            }
          } else {
            console.log('[NotificationHandler] ❌ Pas de conversationId');
          }
          break;

        case 'purchase':
          if (data.secretId) {
            console.log('[NotificationHandler] 🚀 Navigation vers le secret:', data.secretId);
            // Adapter selon votre structure de navigation pour les secrets
            try {
              navigation.navigate('SecretDetail', { secretId: data.secretId });
            } catch (error) {
              console.error('[NotificationHandler] ❌ Erreur navigation purchase:', error);
            }
          }
          break;

        case 'stripe_setup_reminder':
          console.log('[NotificationHandler] 🚀 Navigation vers les paramètres Stripe');
          try {
            // CORRECTION: Utiliser 'ProfileTab' au lieu de 'Profile'
            navigation.navigate('MainApp', {
              screen: 'Tabs',
              params: {
                screen: 'ProfileTab',
                params: {
                  screen: 'ProfilSettings'
                }
              }
            });
          } catch (error) {
            console.error('[NotificationHandler] ❌ Erreur navigation Stripe:', error);
          }
          break;

        case 'test':
          console.log('[NotificationHandler] 🧪 Notification de test reçue');
          Alert.alert('Test', 'Notification de test reçue avec succès !');
          break;

        default:
          console.log('[NotificationHandler] ❓ Type de notification non géré:', data.type);
      }
    }, 100);
  };

  return null;
};

export default NotificationHandler;