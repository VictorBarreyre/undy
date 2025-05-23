import React, { useEffect, useContext } from 'react';
import { Linking, Alert, AppState } from 'react-native';
import * as Notifications from 'expo-notifications';
import { useCardData } from '../../infrastructure/context/CardDataContexte';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { AuthContext } from '../../infrastructure/context/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NotificationManager from '../Notifications/NotificationManager'; 

const DeepLinkHandler = ({ onStripeSuccess, userId }) => {
    const { t } = useTranslation();
    const { handleStripeReturn, handlePostSecret, handleShareSecret } = useCardData();
    const navigation = useNavigation();
    const { userData, isLoggedIn } = useContext(AuthContext);

    const normalizeDeepLinkParams = (url) => {
        // Gérer le cas où l'URL contient des paramètres mal formés
        if (url.includes('?action=complete?action=')) {
            return url.replace('?action=complete?action=', '?action=');
        } else if (url.includes('?path=?action=')) {
            return url.replace('?path=?action=', '?action=');
        }
        return url;
    };

    // Navigation robuste vers une conversation
    const navigateToConversation = (conversationId) => {
        if (!isLoggedIn) {
            console.log('[DEEPLINK] ❌ Utilisateur non connecté, navigation impossible');
            return;
        }

        console.log('[DEEPLINK] 🚀 DÉBUT Navigation vers conversation:', conversationId);
        
        try {
            // Méthode 1: Navigation complète via la structure
            console.log('[DEEPLINK] 📍 Tentative méthode 1: MainApp > Tabs > ChatTab > Chat');
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
            console.log('[DEEPLINK] ✅ Navigation réussie (structure complète)');
        } catch (error) {
            console.log('[DEEPLINK] ❌ Échec méthode 1:', error.message);
            try {
                // Méthode 2: Navigation directe vers le tab
                console.log('[DEEPLINK] 📍 Tentative méthode 2: Tabs > ChatTab > Chat');
                navigation.navigate('Tabs', {
                    screen: 'ChatTab',
                    params: {
                        screen: 'Chat',
                        params: { conversationId },
                    },
                });
                console.log('[DEEPLINK] ✅ Navigation réussie (alternative 1)');
            } catch (error2) {
                console.log('[DEEPLINK] ❌ Échec méthode 2:', error2.message);
                try {
                    // Méthode 3: Navigation directe vers ChatTab
                    console.log('[DEEPLINK] 📍 Tentative méthode 3: ChatTab > Chat');
                    navigation.navigate('ChatTab', {
                        screen: 'Chat',
                        params: { conversationId },
                    });
                    console.log('[DEEPLINK] ✅ Navigation réussie (alternative 2)');
                } catch (error3) {
                    console.log('[DEEPLINK] ❌ Échec méthode 3:', error3.message);
                    try {
                        // Méthode 4: Navigation très directe
                        console.log('[DEEPLINK] 📍 Tentative méthode 4: Chat direct');
                        navigation.navigate('Chat', { conversationId });
                        console.log('[DEEPLINK] ✅ Navigation réussie (directe)');
                    } catch (error4) {
                        console.error('[DEEPLINK] ❌ TOUTES les méthodes ont échoué:', error4.message);
                        
                        // Debug supplémentaire
                        try {
                            const state = navigation.getState?.();
                            console.log('[DEEPLINK] 🔍 État de navigation:', JSON.stringify(state, null, 2));
                        } catch (debugError) {
                            console.log('[DEEPLINK] 🔍 Impossible d\'obtenir l\'état de navigation');
                        }
                    }
                }
            }
        }
    };

    // Gestionnaire principal des deep links
    const handleDeepLink = async (event) => {
        try {
            const url = event.url || event;
            
            if (!url) return;
            
            console.log("Deep link intercepté:", url);
            
            // Ignorer les URLs de développement Expo
            if (url.includes('expo-development-client')) {
                console.log("[DEEPLINK] URL de développement Expo ignorée");
                return;
            }
            
            const fullUrl = decodeURIComponent(url);
            
            // === GESTION STRIPE ===
            if (fullUrl.includes('action=bank_update_complete')) {
                console.log("Retour de mise à jour de compte bancaire détecté");
                await handleStripeReturn(fullUrl);
                
                Alert.alert(
                    t('stripe.bankUpdateSuccess.title'),
                    t('stripe.bankUpdateSuccess.message'),
                    [{ text: 'OK' }]
                );
                return;
            }
            
            // Normaliser l'URL pour Stripe
            const normalizedUrl = normalizeDeepLinkParams(fullUrl);
            
            try {
                const parsedUrl = new URL(normalizedUrl);

                if (parsedUrl.protocol === 'hushy:' && 
                    (parsedUrl.hostname === 'stripe-return' || parsedUrl.hostname === 'profile' || parsedUrl.hostname === '')) {
                    
                    console.log("Traitement du retour Stripe...");
                    const result = await handleStripeReturn(normalizedUrl);
                    
                    // Définir la clé de stockage
                    const effectiveUserId = userId || (userData && userData._id);
                    const storageKey = effectiveUserId 
                        ? `pendingSecretData_${effectiveUserId}` 
                        : 'pendingSecretData';
                    
                    // Récupérer les données en attente
                    let pendingSecretData = null;
                    
                    try {
                        const pendingDataJson = await AsyncStorage.getItem(storageKey);
                        if (pendingDataJson) {
                            pendingSecretData = JSON.parse(pendingDataJson);
                            console.log("Données de secret en attente trouvées:", pendingSecretData);
                        } else {
                            console.log('Aucune donnée de secret en attente trouvée');
                        }
                    } catch (storageError) {
                        console.error("Erreur lors de la récupération des données en attente:", storageError);
                    }
                    
                    if (result.success) {
                        if (pendingSecretData) {
                            try {
                                console.log("Tentative de publication automatique du secret...");
                                
                                // Préparer les données du secret avec localisation si disponibles
                                const postData = { ...pendingSecretData };
                                
                                // Si des données de localisation étaient stockées, les inclure
                                if (pendingSecretData.userLocation) {
                                    const lat = parseFloat(pendingSecretData.userLocation.latitude);
                                    const lng = parseFloat(pendingSecretData.userLocation.longitude);
                                    
                                    if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
                                        postData.location = {
                                            type: 'Point',
                                            coordinates: [lng, lat]
                                        };
                                        console.log("Ajout des données de localisation au secret:", postData.location);
                                    }
                                }
                                
                                const postResult = await handlePostSecret(postData);
                                
                                // Nettoyer les données en attente
                                await AsyncStorage.removeItem(storageKey);
                                
                                if (postResult.requiresStripeSetup) {
                                    // Si on a encore besoin de configurer Stripe, c'est étrange
                                    Alert.alert(
                                        t('deepLink.alerts.error.title'),
                                        t('deepLink.alerts.error.stillNeedsConfig'),
                                        [{ text: t('deepLink.alerts.ok') }]
                                    );
                                } else {
                                    // Success! Le secret est posté
                                    Alert.alert(
                                        t('addSecret.alerts.success.title'),
                                        t('addSecret.alerts.success.message'),
                                        [
                                            {
                                                text: t('addSecret.alerts.success.shareNow'),
                                                onPress: async () => {
                                                    try {
                                                        await handleShareSecret(postResult.secret);
                                                    } catch (error) {
                                                        Alert.alert(t('addSecret.errors.title'), t('addSecret.errors.unableToShare'));
                                                    }
                                                }
                                            },
                                            {
                                                text: t('addSecret.alerts.later'),
                                                style: "cancel"
                                            }
                                        ]
                                    );
                                }
                            } catch (error) {
                                console.error("Erreur lors de la publication automatique:", error);
                                Alert.alert(
                                    t('deepLink.alerts.error.title'),
                                    error.message || t('deepLink.alerts.error.postingFailed'),
                                    [{ text: t('deepLink.alerts.ok') }]
                                );
                            }
                        } else {
                            // Le compte Stripe est configuré mais pas de données de secret en attente
                            Alert.alert(
                                t('deepLink.alerts.success.title'),
                                t('deepLink.alerts.success.accountCreated'),
                                [{ 
                                    text: t('deepLink.alerts.returnToPost'),
                                    onPress: () => {
                                        // Naviguer vers AddSecret
                                        navigation.navigate('AddSecret');
                                    }
                                }]
                            );
                        }
                        
                        // Appeler le callback si fourni
                        if (onStripeSuccess && typeof onStripeSuccess === 'function') {
                            onStripeSuccess(result);
                        }
                    } else {
                        // Configuration Stripe pas encore terminée
                        Alert.alert(
                            t('deepLink.alerts.configInProgress.title'),
                            result.message || t('deepLink.alerts.configInProgress.message'),
                            [{ text: t('deepLink.alerts.ok') }]
                        );
                    }
                    return;
                }

                // === GESTION NAVIGATION VERS CONVERSATIONS ===
                // Gérer les URLs de type hushy://chat/conversationId ou hushy://secret/secretId
                if (parsedUrl.protocol === 'hushy:') {
                    const pathParts = parsedUrl.pathname.split('/').filter(Boolean);
                    
                    if (pathParts.length >= 2) {
                        const [type, id] = pathParts;
                        
                        if (type === 'chat' && id) {
                            console.log('[DEEPLINK] Navigation vers conversation via deep link:', id);
                            // Attendre un peu pour que l'app soit prête
                            setTimeout(() => {
                                navigateToConversation(id);
                            }, 500);
                            return;
                        }
                        
                        if (type === 'secret' && id) {
                            console.log('[DEEPLINK] Navigation vers secret partagé:', id);
                            navigation.navigate('SharedSecret', { secretId: id });
                            return;
                        }
                    }
                }

                // === GESTION HTTPS (pour les liens partagés) ===
                if (parsedUrl.protocol === 'https:' && parsedUrl.hostname === 'hushy.app') {
                    const pathParts = parsedUrl.pathname.split('/').filter(Boolean);
                    
                    if (pathParts.length >= 2) {
                        const [type, id] = pathParts;
                        
                        if (type === 'secret' && id) {
                            console.log('[DEEPLINK] Navigation vers secret partagé via HTTPS:', id);
                            navigation.navigate('SharedSecret', { secretId: id });
                            return;
                        }
                        
                        if (type === 'chat' && id) {
                            console.log('[DEEPLINK] Navigation vers conversation via HTTPS:', id);
                            setTimeout(() => {
                                navigateToConversation(id);
                            }, 500);
                            return;
                        }
                    }
                }
            } catch (urlError) {
                console.error('[DEEPLINK] Erreur lors du parsing de l\'URL:', urlError);
                // Continuer le traitement même si l'URL n'est pas parsable
            }

        } catch (error) {
            console.error(t('deepLink.errors.deepLinkError'), error);
            Alert.alert(
                t('deepLink.errors.title'), 
                error.message || t('deepLink.errors.unableToProcessLink'),
                [{ text: t('deepLink.alerts.ok') }]
            );
        }
    };

    // Gestionnaire des notifications - VERSION RENFORCÉE
    const handleNotificationResponse = (response) => {
        console.log('[DEEPLINK] 🔔 NOTIFICATION CLIQUÉE - DÉBUT DU TRAITEMENT');
        console.log('[DEEPLINK] 📱 Response complète:', JSON.stringify(response, null, 2));
        
        const data = response.notification.request.content.data;
        console.log('[DEEPLINK] 📋 Données extraites:', JSON.stringify(data, null, 2));
        
        if (data?.type === 'new_message' && data?.conversationId) {
            console.log('[DEEPLINK] ✅ Type de notification valide: new_message');
            console.log('[DEEPLINK] 🎯 ConversationId trouvé:', data.conversationId);
            console.log('[DEEPLINK] 👤 SenderId:', data.senderId);
            
            // Délai pour s'assurer que l'app est prête
            console.log('[DEEPLINK] ⏱️ Délai de 1 seconde avant navigation...');
            setTimeout(() => {
                console.log('[DEEPLINK] 🚀 LANCEMENT DE LA NAVIGATION');
                navigateToConversation(data.conversationId);
            }, 1000);
        } else {
            console.log('[DEEPLINK] ❌ Notification ignorée - type ou conversationId manquant');
            console.log('[DEEPLINK] 🔍 Type reçu:', data?.type);
            console.log('[DEEPLINK] 🔍 ConversationId reçu:', data?.conversationId);
        }
    };

    // Vérifier les notifications initiales - VERSION RENFORCÉE
    const checkInitialNotification = async () => {
        console.log('[DEEPLINK] 🔍 Vérification des notifications initiales...');
        try {
            const response = await Notifications.getLastNotificationResponseAsync();
            if (response) {
                console.log('[DEEPLINK] 📱 Notification initiale trouvée!');
                console.log('[DEEPLINK] 📋 Données:', JSON.stringify(response.notification.request.content.data, null, 2));
                
                const data = response.notification.request.content.data;
                if (data?.type === 'new_message' && data?.conversationId) {
                    console.log('[DEEPLINK] 🎯 Navigation initiale vers conversation:', data.conversationId);
                    setTimeout(() => {
                        console.log('[DEEPLINK] 🚀 LANCEMENT NAVIGATION INITIALE');
                        navigateToConversation(data.conversationId);
                    }, 2000);
                }
            } else {
                console.log('[DEEPLINK] ℹ️ Aucune notification initiale trouvée');
            }
        } catch (error) {
            console.error('[DEEPLINK] ❌ Erreur lors de la vérification des notifications:', error);
        }
    };

    // Gestionnaire d'état de l'app - NOUVEAU
    const handleAppStateChange = (nextAppState) => {
        console.log('[DEEPLINK] 📱 Changement d\'état de l\'app:', nextAppState);
        if (nextAppState === 'active') {
            console.log('[DEEPLINK] ✅ App active - vérification des notifications...');
            setTimeout(() => {
                checkInitialNotification();
            }, 500);
        }
    };

    // CORRECTION: Initialiser avec l'import statique
    const initializeNotifications = async () => {
        try {
            console.log('[DEEPLINK] 🔧 Initialisation des notifications...');
            
            if (NotificationManager && typeof NotificationManager.initialize === 'function') {
                // Passer les données utilisateur si disponibles
                const userDataStr = await AsyncStorage.getItem('userData');
                let userData = null;
                if (userDataStr) {
                    try {
                        userData = JSON.parse(userDataStr);
                    } catch (parseError) {
                        console.error('[DEEPLINK] ❌ Erreur lors du parsing des données utilisateur:', parseError);
                    }
                }
                
                const result = await NotificationManager.initialize(userData);
                console.log('[DEEPLINK] ✅ NotificationManager initialisé:', result);
            } else {
                console.error('[DEEPLINK] ❌ NotificationManager non disponible ou méthode initialize manquante');
                console.error('[DEEPLINK] 🔍 Type de NotificationManager:', typeof NotificationManager);
                console.error('[DEEPLINK] 🔍 NotificationManager:', NotificationManager);
            }
        } catch (error) {
            console.error('[DEEPLINK] ❌ Erreur lors de l\'initialisation du gestionnaire:', error);
        }
    };

    useEffect(() => {
        console.log('[DEEPLINK] 🔄 INITIALISATION DU DEEPLINK HANDLER');
        console.log('[DEEPLINK] 👤 Utilisateur connecté:', isLoggedIn);
        
        // Configuration des notifications
        Notifications.setNotificationHandler({
            handleNotification: async () => {
                console.log('[DEEPLINK] 📢 Notification reçue en premier plan');
                return {
                    shouldShowAlert: true,
                    shouldPlaySound: true,
                    shouldSetBadge: true,
                };
            },
        });

        // Écouteurs d'événements
        console.log('[DEEPLINK] 🎧 Configuration des écouteurs...');
        
        const linkingSubscription = Linking.addEventListener('url', handleDeepLink);
        
        // ÉCOUTEUR NOTIFICATIONS - Version renforcée
        const notificationSubscription = Notifications.addNotificationResponseReceivedListener((response) => {
            console.log('[DEEPLINK] 🔔 ÉCOUTEUR NOTIFICATION DÉCLENCHÉ!');
            handleNotificationResponse(response);
        });
        console.log('[DEEPLINK] ✅ Écouteur de notifications configuré');

        // Écouteur d'état de l'app
        const appStateSubscription = AppState.addEventListener('change', handleAppStateChange);

        // Vérifier l'URL initiale au lancement
        Linking.getInitialURL().then(url => {
            if (url) {
                console.log('[DEEPLINK] 🔗 URL initiale trouvée:', url);
                handleDeepLink({ url });
            }
        });

        // Vérifier les notifications initiales et initialiser le gestionnaire
        if (isLoggedIn) {
            console.log('[DEEPLINK] 👤 Utilisateur connecté - initialisation...');
            checkInitialNotification();
            initializeNotifications();
        } else {
            console.log('[DEEPLINK] ❌ Utilisateur non connecté - attente...');
        }

        return () => {
            console.log('[DEEPLINK] 🧹 Nettoyage des écouteurs...');
            linkingSubscription.remove();
            if (notificationSubscription) {
                Notifications.removeNotificationSubscription(notificationSubscription);
            }
            appStateSubscription.remove();
        };
    }, [userId, userData, onStripeSuccess, isLoggedIn]);

    return null;
};

export default DeepLinkHandler;