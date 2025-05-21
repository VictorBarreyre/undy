import React, { useEffect, useRef, useContext } from 'react';
import { Platform, AppState } from 'react-native';
import * as Notifications from 'expo-notifications';
import { useNavigation, useNavigationState } from '@react-navigation/native';
import { AuthContext } from '../../infrastructure/context/AuthContext';
import NotificationManager from './NotificationManager';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Configuration du gestionnaire de notifications pour iOS
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
  const appState = useRef(AppState.currentState);
  const notificationListener = useRef();
  const responseListener = useRef();
  const navigationState = useNavigationState(state => state);

  // Fonction de navigation vers une conversation
  const navigateToConversation = (conversationId) => {
    // Vérifier si l'utilisateur est connecté avant de naviguer
    if (!isLoggedIn) {
      console.log('[NOTIF_HANDLER] Utilisateur non connecté, navigation impossible');
      return;
    }

    console.log('[NOTIF_HANDLER] Navigation vers la conversation:', conversationId);
    
    // Adapter ce code selon votre structure de navigation
    try {
      // Option 1: Navigation simple si vous êtes déjà dans l'application principale
      if (navigation.canGoBack()) {
        // Vérifier si nous sommes déjà sur l'écran de conversation
        const currentRoute = navigationState.routes[navigationState.index];
        if (currentRoute?.name === 'Chat' && 
            currentRoute?.params?.conversationId === conversationId) {
          console.log('[NOTIF_HANDLER] Déjà sur la conversation cible');
          return;
        }
        
        // Naviguer vers le tab Chat puis l'écran de conversation
        navigation.navigate('MainApp', {
          screen: 'ChatTab',
          params: {
            screen: 'Chat',
            params: { conversationId },
          },
        });
      } 
      // Option 2: Si nous ne sommes pas encore dans l'application principale
      else {
        navigation.navigate('MainApp', {
          screen: 'ChatTab',
          params: {
            screen: 'Chat',
            params: { conversationId },
          },
        });
      }
    } catch (error) {
      console.error('[NOTIF_HANDLER] Erreur de navigation:', error);
      // Alternative simplifiée en cas d'échec
      navigation.navigate('Chat', { conversationId });
    }
  };

  useEffect(() => {
    if (!isLoggedIn) {
      console.log('[NOTIF_HANDLER] Utilisateur non connecté, configuration ignorée');
      return;
    }

    console.log('[NOTIF_HANDLER] Configuration des écouteurs de notifications');

    // Écouteur pour les notifications reçues lorsque l'app est au premier plan
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      console.log('[NOTIF_HANDLER] Notification reçue en premier plan:', notification.request.content.data);
      // Mise à jour de l'UI si nécessaire, mais pas de navigation automatique en premier plan
    });

    // Écouteur pour les interactions avec les notifications (clic)
    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      const { notification } = response;
      const data = notification.request.content.data;
      
      console.log('[NOTIF_HANDLER] Réponse à la notification reçue:', data);
      
      // Rediriger vers la conversation si c'est une notification de message
      if (data.type === 'new_message' && data.conversationId) {
        navigateToConversation(data.conversationId);
      }
    });

    // Gestionnaire pour les notifications ouvertes (lorsque l'app était fermée)
    const getInitialNotification = async () => {
      try {
        const initialNotification = await Notifications.getLastNotificationResponseAsync();
        if (initialNotification) {
          const data = initialNotification.notification.request.content.data;
          console.log('[NOTIF_HANDLER] Notification initiale:', data);
          
          // Attendre un peu pour que la navigation soit prête
          setTimeout(() => {
            if (data.type === 'new_message' && data.conversationId) {
              navigateToConversation(data.conversationId);
            }
          }, 1000);
        }
      } catch (error) {
        console.error('[NOTIF_HANDLER] Erreur lors de la récupération de la notification initiale:', error);
      }
    };
    
    // Vérifier les notifications en attente au démarrage
    getInitialNotification();

    // Écouteur de changement d'état de l'application
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        // L'app revient au premier plan, vérifier s'il y a une notification
        getInitialNotification();
      }
      appState.current = nextAppState;
    });

    // Si c'est la première configuration, initialiser le gestionnaire de notifications
    const initializeNotifications = async () => {
      try {
        if (NotificationManager && typeof NotificationManager.initialize === 'function') {
          // Passer les données utilisateur si disponibles
          const userDataStr = await AsyncStorage.getItem('userData');
          let userData = null;
          if (userDataStr) {
            try {
              userData = JSON.parse(userDataStr);
            } catch (parseError) {
              console.error('[NOTIF_HANDLER] Erreur lors du parsing des données utilisateur:', parseError);
            }
          }
          
          await NotificationManager.initialize(userData);
          console.log('[NOTIF_HANDLER] NotificationManager initialisé');
        }
      } catch (error) {
        console.error('[NOTIF_HANDLER] Erreur lors de l\'initialisation du gestionnaire:', error);
      }
    };
    
    initializeNotifications();

    // Nettoyage lors du démontage du composant
    return () => {
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(notificationListener.current);
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
      subscription.remove();
    };
  }, [isLoggedIn, navigation, navigationState]);

  // Ce composant ne rend rien
  return null;
};

export default NotificationHandler;