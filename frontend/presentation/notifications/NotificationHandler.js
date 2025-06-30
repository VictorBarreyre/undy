import { useEffect, useRef, useContext } from 'react';
import { AppState } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { AuthContext } from '../../infrastructure/context/AuthContext';
import { useCardData } from '../../infrastructure/context/CardDataContexte';
import NotificationService from '../notifications/NotificationService';
import NotificationManager from '../notifications/NotificationManager';
import PushNotificationIOS from '@react-native-community/push-notification-ios';
import Constants from 'expo-constants';

const NotificationHandler = () => {
  const navigation = useNavigation();
  const { userData } = useContext(AuthContext);
  const appStateRef = useRef(AppState.currentState);
  const removeNotificationListener = useRef(null);
  // ✅ Importer getConversationMessages depuis useCardData
  const { getUserConversations, getConversationMessages } = useCardData();

  useEffect(() => {
    let isSubscribed = true;

    const initializeNotifications = async () => {
      if (userData && isSubscribed) {


        try {
          // Initialiser le service de notifications
          await NotificationService.initialize();


          // Initialiser le manager
          await NotificationManager.initialize(userData);


          const currentToken = await NotificationService.getToken();







          // Ajouter un listener pour les clics sur notifications
          removeNotificationListener.current = NotificationService.addNotificationListener((data) => {

            handleNotificationData(data);
          });


          // Vérifier s'il y a une notification initiale
          try {
            const initialNotification = await PushNotificationIOS.getInitialNotification();



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

                // Délai pour s'assurer que la navigation est prête
                setTimeout(() => handleNotificationData(data), 1500);
              }
            }
          } catch (error) {

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

      isSubscribed = false;
      subscription.remove();

      // Retirer le listener des notifications
      if (removeNotificationListener.current) {
        removeNotificationListener.current();
      }
    };
  }, [userData, navigation, getUserConversations, getConversationMessages]); // ✅ Ajouter getConversationMessages aux dépendances

  const handleAppStateChange = (nextAppState) => {

    if (appStateRef.current.match(/inactive|background/) && nextAppState === 'active') {
      // L'app revient au premier plan, effacer le badge
      NotificationService.setBadgeCount(0);
    }
    appStateRef.current = nextAppState;
  };

  const handleNotificationData = async (data) => {






    if (!data) {

      return;
    }

    if (!navigation) {

      return;
    }

    // S'assurer que la navigation est prête
    setTimeout(async () => {


      // Navigation selon le type de notification
      switch (data.type) {
        case 'new_message':
          if (data.conversationId) {


            try {


              // Utiliser getUserConversations déjà importé
              const conversations = await getUserConversations();


              // Trouver la conversation spécifique
              const targetConversation = conversations.find(
                (conv) => conv._id === data.conversationId
              );

              if (targetConversation) {


                let conversationWithMessages = targetConversation;

                // ✅ CORRECTION: Charger les messages en utilisant getConversationMessages

                try {
                  const messagesData = await getConversationMessages(targetConversation._id);

                  // Vérifier la structure de la réponse
                  if (messagesData && messagesData.messages) {
                    conversationWithMessages = {
                      ...targetConversation,
                      messages: messagesData.messages
                    };

                  } else {

                    conversationWithMessages = {
                      ...targetConversation,
                      messages: []
                    };
                  }
                } catch (error) {
                  console.error('[NotificationHandler] ❌ Erreur chargement messages:', error);
                  // Continuer avec une conversation sans messages plutôt que de bloquer
                  conversationWithMessages = {
                    ...targetConversation,
                    messages: []
                  };
                }

                // Préparer les données secretData selon ce que ChatScreen attend
                const secretData = {
                  _id: targetConversation.secret._id,
                  content: targetConversation.secret.content,
                  label: targetConversation.secret.label,
                  user: targetConversation.secret.user,
                  shareLink: targetConversation.secret.shareLink || `hushy://secret/${targetConversation.secret._id}`
                };








                // Navigation structurée avec la conversation complète incluant les messages
                navigation.navigate('MainApp', {
                  screen: 'Tabs',
                  params: {
                    screen: 'ChatTab',
                    params: {
                      screen: 'Chat',
                      params: {
                        conversationId: conversationWithMessages._id,
                        conversation: conversationWithMessages, // ✅ Conversation avec messages
                        secretData: secretData,
                        showModalOnMount: false,
                        fromNotification: true
                      }
                    }
                  }
                });



              } else {
                console.error('[NotificationHandler] ❌ Conversation non trouvée:', data.conversationId);


                // Fallback: navigation simple avec juste l'ID
                try {
                  navigation.navigate('MainApp', {
                    screen: 'Tabs',
                    params: {
                      screen: 'ChatTab',
                      params: {
                        screen: 'Chat',
                        params: {
                          conversationId: data.conversationId,
                          conversation: null, // ChatScreen devra charger les données
                          secretData: null,
                          fromNotification: true
                        }
                      }
                    }
                  });


                } catch (fallbackError) {
                  console.error('[NotificationHandler] ❌ Erreur navigation fallback:', fallbackError);


                }
              }

            } catch (error) {
              console.error('[NotificationHandler] ❌ Erreur lors du chargement de la conversation:', error);

              // Navigation alternative en cas d'erreur avec juste l'ID
              try {
                navigation.navigate('MainApp', {
                  screen: 'Tabs',
                  params: {
                    screen: 'ChatTab',
                    params: {
                      screen: 'Chat',
                      params: {
                        conversationId: data.conversationId,
                        conversation: null,
                        secretData: null,
                        fromNotification: true
                      }
                    }
                  }
                });


              } catch (altError) {
                console.error('[NotificationHandler] ❌ Erreur navigation alternative:', altError);


              }
            }
          } else {

          }
          break;

        case 'purchase':
          if (data.secretId) {

            try {
              navigation.navigate('SecretDetail', { secretId: data.secretId });
            } catch (error) {
              console.error('[NotificationHandler] ❌ Erreur navigation purchase:', error);
            }
          }
          break;

        case 'stripe_setup_reminder':

          try {
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

          break;

        default:

      }
    }, 100);
  };

  return null;
};

export default NotificationHandler;