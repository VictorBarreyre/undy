import { useEffect, useRef, useContext } from 'react';
import { AppState } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { AuthContext } from '../../infrastructure/context/AuthContext';
import NotificationService from '../notifications/NotificationService';
import NotificationManager from '../notifications//NotificationManager';

const NotificationHandler = () => {
  const navigation = useNavigation();
  const { userData } = useContext(AuthContext);
  const appStateRef = useRef(AppState.currentState);
  const removeNotificationListener = useRef(null);

  useEffect(() => {
    let isSubscribed = true;

    const initializeNotifications = async () => {
      if (userData && isSubscribed) {
        console.log('[NotificationHandler] Initialisation pour l\'utilisateur:', userData._id);
        
        // Initialiser le service de notifications
        await NotificationService.initialize();
        
        // Initialiser le manager
        await NotificationManager.initialize(userData);
        
        // Ajouter un listener pour les clics sur notifications
        removeNotificationListener.current = NotificationService.addNotificationListener((data) => {
          handleNotificationData(data);
        });
      }
    };

    initializeNotifications();

    // Écouter les changements d'état de l'app
    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      isSubscribed = false;
      subscription.remove();
      
      // Retirer le listener des notifications
      if (removeNotificationListener.current) {
        removeNotificationListener.current();
      }
    };
  }, [userData]);

  const handleAppStateChange = (nextAppState) => {
    if (appStateRef.current.match(/inactive|background/) && nextAppState === 'active') {
      // L'app revient au premier plan, effacer le badge
      NotificationService.setBadgeCount(0);
    }
    appStateRef.current = nextAppState;
  };

  const handleNotificationData = (data) => {
    console.log('[NotificationHandler] Traitement des données:', data);

    if (!data || !navigation) return;

    // Navigation selon le type de notification
    switch (data.type) {
      case 'new_message':
        if (data.conversationId) {
          console.log('[NotificationHandler] Navigation vers la conversation:', data.conversationId);
          
          // Naviguer vers la conversation
          navigation.navigate('MainApp', {
            screen: 'Tabs',
            params: {
              screen: 'ChatTab',
              params: {
                screen: 'Chat',
                params: {
                  conversationId: data.conversationId,
                  // Passer les autres données si nécessaire
                  senderId: data.senderId,
                  senderName: data.senderName,
                },
              },
            },
          });
        }
        break;

      case 'purchase':
        if (data.secretId) {
          console.log('[NotificationHandler] Navigation vers le secret:', data.secretId);
          navigation.navigate('SecretDetail', { secretId: data.secretId });
        }
        break;

      case 'stripe_setup_reminder':
        console.log('[NotificationHandler] Navigation vers les paramètres Stripe');
        navigation.navigate('StripeSetup');
        break;

      case 'test':
        console.log('[NotificationHandler] Notification de test reçue');
        break;

      default:
        console.log('[NotificationHandler] Type de notification non géré:', data.type);
    }
  };

  return null;
};

export default NotificationHandler;