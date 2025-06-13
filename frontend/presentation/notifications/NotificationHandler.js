import { useEffect, useRef, useContext } from 'react';
import { AppState } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { AuthContext } from '../../infrastructure/context/AuthContext';
import { useCardData } from '../../infrastructure/context/CardDataContexte';
import NotificationService from '../notifications/NotificationService';
import NotificationManager from '../notifications/NotificationManager';
import PushNotificationIOS from '@react-native-community/push-notification-ios';

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
  }, [userData, navigation, getUserConversations, getConversationMessages]); // ✅ Ajouter getConversationMessages aux dépendances

  const handleAppStateChange = (nextAppState) => {
    console.log('[NotificationHandler] 📱 App state change:', appStateRef.current, '→', nextAppState);
    if (appStateRef.current.match(/inactive|background/) && nextAppState === 'active') {
      // L'app revient au premier plan, effacer le badge
      NotificationService.setBadgeCount(0);
    }
    appStateRef.current = nextAppState;
  };

  const handleNotificationData = async (data) => {
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
    setTimeout(async () => {
      console.log('[NotificationHandler] ⏰ Tentative de navigation après délai');

      // Navigation selon le type de notification
      switch (data.type) {
        case 'new_message':
          if (data.conversationId) {
            console.log('[NotificationHandler] 🚀 Navigation vers la conversation:', data.conversationId);

            try {
              console.log('[NotificationHandler] 📋 Chargement de la conversation complète...');

              // Utiliser getUserConversations déjà importé
              const conversations = await getUserConversations();
              console.log('[NotificationHandler] 📋 Conversations récupérées:', conversations.length);

              // Trouver la conversation spécifique
              const targetConversation = conversations.find(
                conv => conv._id === data.conversationId
              );

              if (targetConversation) {
                console.log('[NotificationHandler] ✅ Conversation trouvée, préparation des données...');

                let conversationWithMessages = targetConversation;

                // ✅ CORRECTION: Charger les messages en utilisant getConversationMessages
                console.log('[NotificationHandler] 📨 Chargement des messages...');
                try {
                  const messagesData = await getConversationMessages(targetConversation._id);
                  
                  // Vérifier la structure de la réponse
                  if (messagesData && messagesData.messages) {
                    conversationWithMessages = {
                      ...targetConversation,
                      messages: messagesData.messages
                    };
                    console.log('[NotificationHandler] 📨 Messages chargés:', messagesData.messages.length);
                  } else {
                    console.log('[NotificationHandler] ⚠️ Structure de messages inattendue:', messagesData);
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

                console.log('[NotificationHandler] 📦 SecretData préparé:', JSON.stringify(secretData, null, 2));
                console.log('[NotificationHandler] 💬 Conversation avec messages:', {
                  id: conversationWithMessages._id,
                  messageCount: conversationWithMessages.messages?.length || 0,
                  hasSecret: !!conversationWithMessages.secret
                });

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
                        fromNotification: true,
                      },
                    },
                  },
                });

                console.log('[NotificationHandler] ✅ Navigation réussie avec données complètes et messages');

              } else {
                console.error('[NotificationHandler] ❌ Conversation non trouvée:', data.conversationId);
                console.log('[NotificationHandler] 📋 IDs disponibles:', conversations.map(c => c._id));

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
                          fromNotification: true,
                        },
                      },
                    },
                  });

                  console.log('[NotificationHandler] ⚠️ Navigation fallback sans données complètes');
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
                        fromNotification: true,
                      },
                    },
                  },
                });

                console.log('[NotificationHandler] ✅ Navigation alternative réussie');
              } catch (altError) {
                console.error('[NotificationHandler] ❌ Erreur navigation alternative:', altError);

              
              }
            }
          } else {
            console.log('[NotificationHandler] ❌ Pas de conversationId');
          }
          break;

        case 'purchase':
          if (data.secretId) {
            console.log('[NotificationHandler] 🚀 Navigation vers le secret:', data.secretId);
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
          break;

        default:
          console.log('[NotificationHandler] ❓ Type de notification non géré:', data.type);
      }
    }, 100);
  };

  return null;
};

export default NotificationHandler;