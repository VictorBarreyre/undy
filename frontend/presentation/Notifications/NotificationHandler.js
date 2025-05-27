import React, { useEffect, useContext, useRef } from 'react';
import { Platform, AppState } from 'react-native';
import * as Notifications from 'expo-notifications';
import { useNavigation } from '@react-navigation/native';
import { AuthContext } from '../../infrastructure/context/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Configuration globale des notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

const NotificationHandler = () => {
  const navigation = useNavigation();
  const { isLoggedIn } = useContext(AuthContext);
  const notificationListener = useRef();
  const responseListener = useRef();
  const appState = useRef(AppState.currentState);

  // Fonction pour naviguer vers une conversation
  const navigateToConversation = (conversationId) => {
    if (!isLoggedIn || !conversationId) {
      console.log('[NOTIF] Navigation impossible - utilisateur non connecté ou ID manquant');
      return;
    }

    console.log('[NOTIF] Navigation vers conversation:', conversationId);
    
    // Navigation directe vers la conversation
    navigation.navigate('MainApp', {
      screen: 'Tabs',
      params: {
        screen: 'ChatTab',
        params: {
          screen: 'Chat',
          params: { conversationId },
        },
      },
    });
  };

  // Gérer la réponse aux notifications (clic sur la notification)
  const handleNotificationResponse = (response) => {
    console.log('[NOTIF] Réponse notification reçue:', response);
    
    const data = response.notification.request.content.data;
    
    if (data?.conversationId && data?.type === 'new_message') {
      // Petit délai pour s'assurer que l'app est bien active
      setTimeout(() => {
        navigateToConversation(data.conversationId);
      }, 100);
    }
  };

  // Vérifier les notifications au démarrage
  const checkInitialNotification = async () => {
    try {
      // Vérifier la dernière réponse de notification
      const lastResponse = await Notifications.getLastNotificationResponseAsync();
      
      if (lastResponse) {
        console.log('[NOTIF] Notification initiale trouvée');
        handleNotificationResponse(lastResponse);
      }
    } catch (error) {
      console.error('[NOTIF] Erreur vérification initiale:', error);
    }
  };

  // Gérer les changements d'état de l'app
  const handleAppStateChange = (nextAppState) => {
    if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
      console.log('[NOTIF] App redevenue active');
      // Vérifier s'il y a une notification en attente
      checkInitialNotification();
    }
    appState.current = nextAppState;
  };

  useEffect(() => {
    if (!isLoggedIn) return;

    console.log('[NOTIF] Configuration du gestionnaire de notifications');

    // Listener pour les notifications reçues pendant que l'app est ouverte
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      console.log('[NOTIF] Notification reçue:', notification);
    });

    // Listener pour les interactions avec les notifications
    responseListener.current = Notifications.addNotificationResponseReceivedListener(handleNotificationResponse);

    // Listener pour les changements d'état de l'app
    const appStateSubscription = AppState.addEventListener('change', handleAppStateChange);

    // Vérifier s'il y a une notification au démarrage
    checkInitialNotification();

    // Nettoyage
    return () => {
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(notificationListener.current);
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
      appStateSubscription.remove();
    };
  }, [isLoggedIn, navigation]);

  return null;
};

export default NotificationHandler;