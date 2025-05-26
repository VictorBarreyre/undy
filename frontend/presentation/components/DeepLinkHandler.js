import React, { useEffect, useContext, useRef } from 'react';
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
    const notificationSubscriptionRef = useRef(null);
    const lastProcessedNotificationRef = useRef(null);

    const normalizeDeepLinkParams = (url) => {
        if (url.includes('?action=complete?action=')) {
            return url.replace('?action=complete?action=', '?action=');
        } else if (url.includes('?path=?action=')) {
            return url.replace('?path=?action=', '?action=');
        }
        return url;
    };

    // Navigation robuste vers une conversation
    const navigateToConversation = async (conversationId) => {
        if (!isLoggedIn) {
            console.log('[DEEPLINK] ❌ Utilisateur non connecté');
            return false;
        }

        console.log('[DEEPLINK] 🚀 === NAVIGATION VERS CONVERSATION ===');
        console.log('[DEEPLINK] 🎯 ConversationId:', conversationId);

        try {
            // Attendre un peu que la navigation soit prête
            await new Promise(resolve => setTimeout(resolve, 800));

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

            console.log('[DEEPLINK] ✅ Navigation réussie');
            
            // Nettoyer toute navigation en attente
            await AsyncStorage.removeItem('PENDING_CONVERSATION_NAV');
            return true;
        } catch (error) {
            console.error('[DEEPLINK] ❌ Erreur navigation:', error);

            // Sauvegarder pour plus tard
            try {
                await AsyncStorage.setItem('PENDING_CONVERSATION_NAV', JSON.stringify({
                    conversationId,
                    timestamp: Date.now()
                }));
                console.log('[DEEPLINK] 💾 Navigation sauvegardée');
            } catch (storageError) {
                console.error('[DEEPLINK] ❌ Erreur sauvegarde:', storageError);
            }
            return false;
        }
    };

    // Extraction des données de notification - FONCTION COMMUNE
    const extractNotificationData = (notificationData) => {
        console.log('[DEEPLINK] 🔍 === EXTRACTION DES DONNÉES ===');
        console.log('[DEEPLINK] 📋 Données brutes:', JSON.stringify(notificationData, null, 2));

        let data = null;

        // Cas 1: Structure APNs native - données directement disponibles
        if (notificationData.conversationId && notificationData.type) {
            console.log('[DEEPLINK] ✅ Données trouvées directement (APNs native/iOS)');
            data = {
                type: notificationData.type,
                conversationId: notificationData.conversationId,
                senderId: notificationData.senderId,
                senderName: notificationData.senderName,
                messageType: notificationData.messageType || 'text',
                timestamp: notificationData.timestamp || new Date().toISOString(),
                navigationTarget: notificationData.navigationTarget,
                navigationScreen: notificationData.navigationScreen,
                navigationParams: notificationData.navigationParams
            };
        }
        // Cas 2: Structure imbriquée - données dans content.data
        else if (notificationData.content && notificationData.content.data) {
            console.log('[DEEPLINK] ✅ Données trouvées dans content.data');
            const contentData = notificationData.content.data;
            data = {
                type: contentData.type,
                conversationId: contentData.conversationId,
                senderId: contentData.senderId,
                senderName: contentData.senderName,
                messageType: contentData.messageType || 'text',
                timestamp: contentData.timestamp || new Date().toISOString(),
                navigationTarget: contentData.navigationTarget,
                navigationScreen: contentData.navigationScreen,
                navigationParams: contentData.navigationParams
            };
        }
        // Cas 3: Structure React Native standard
        else if (notificationData.data) {
            console.log('[DEEPLINK] ✅ Données trouvées dans data');
            data = notificationData.data;
        }

        console.log('[DEEPLINK] 📋 Données extraites:', JSON.stringify(data, null, 2));
        return data;
    };

    // TRAITEMENT UNIFIÉ DES NOTIFICATIONS
    const processNotification = async (data, source = 'unknown') => {
        console.log(`[DEEPLINK] 🔔 === TRAITEMENT NOTIFICATION (${source}) ===`);

        // Éviter le double traitement
        const notificationId = `${data?.conversationId}_${data?.timestamp}`;
        if (lastProcessedNotificationRef.current === notificationId) {
            console.log('[DEEPLINK] ⚠️ Notification déjà traitée, ignorée');
            return;
        }
        lastProcessedNotificationRef.current = notificationId;

        const extractedData = extractNotificationData(data);

        // Validation et traitement
        if (extractedData?.type === 'new_message' && extractedData?.conversationId) {
            console.log('[DEEPLINK] ✅ Notification de message valide détectée');
            console.log('[DEEPLINK] 🎯 ConversationId:', extractedData.conversationId);
            console.log('[DEEPLINK] 👤 SenderName:', extractedData.senderName);

            // Vérifier si l'utilisateur est connecté
            if (!isLoggedIn) {
                console.log('[DEEPLINK] ❌ Utilisateur non connecté, navigation impossible');
                return;
            }

            // Navigation
            console.log('[DEEPLINK] 🚀 Déclenchement navigation...');
            const success = await navigateToConversation(extractedData.conversationId);
            
            if (success) {
                console.log('[DEEPLINK] 🎉 Navigation notification réussie !');
            } else {
                console.log('[DEEPLINK] ⏳ Navigation sauvegardée pour plus tard');
            }

        } else {
            console.log('[DEEPLINK] ❌ Notification ignorée - données invalides');
            console.log('[DEEPLINK] 🔍 Type reçu:', extractedData?.type);
            console.log('[DEEPLINK] 🔍 ConversationId reçu:', extractedData?.conversationId);
        }
    };

    // GESTIONNAIRE POUR NOTIFICATIONS EN PREMIER PLAN
    const handleNotificationResponse = async (response) => {
        console.log('[DEEPLINK] 📱 Notification reçue en premier plan');
        const content = response.notification.request.content;
        await processNotification(content.data, 'foreground');
    };

    // Configuration de l'écouteur de notifications
    const setupNotificationListener = () => {
        console.log('[DEEPLINK] 🎧 Configuration de l\'écouteur de notifications...');
        
        // Nettoyer l'ancien écouteur s'il existe
        if (notificationSubscriptionRef.current) {
            console.log('[DEEPLINK] 🧹 Nettoyage de l\'ancien écouteur');
            notificationSubscriptionRef.current.remove();
        }

        // Créer le nouvel écouteur
        notificationSubscriptionRef.current = Notifications.addNotificationResponseReceivedListener(handleNotificationResponse);
        console.log('[DEEPLINK] ✅ Écouteur de notifications configuré');
    };

    // MÉCANISME SPÉCIAL POUR NOTIFICATIONS EN ARRIÈRE-PLAN
    const checkForBackgroundNotification = async () => {
        console.log('[DEEPLINK] 🔍 Vérification notification en arrière-plan...');
        
        try {
            // Vérifier si on revient d'une notification (iOS log présent)
            // Utiliser un délai pour laisser le temps à la notification d'être traitée
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Essayer de récupérer la dernière notification
            const response = await Notifications.getLastNotificationResponseAsync();
            if (response) {
                console.log('[DEEPLINK] 📱 Dernière notification trouvée');
                console.log('[DEEPLINK] 📋 Response:', JSON.stringify(response, null, 2));
                
                const content = response.notification.request.content;
                await processNotification(content.data, 'background_check');
            }
            
            // MÉCANISME ALTERNATIF : Vérifier s'il y a eu interaction récente
            // Si on voit des logs système iOS mais aucune notification React Native,
            // essayer de parser les dernières notifications
            const notifications = await Notifications.getPresentedNotificationsAsync();
            console.log('[DEEPLINK] 📋 Notifications présentées:', notifications.length);
            
            if (notifications.length > 0) {
                const lastNotification = notifications[0];
                console.log('[DEEPLINK] 📋 Dernière notification présentée:', JSON.stringify(lastNotification, null, 2));
                
                if (lastNotification.request.content.data) {
                    await processNotification(lastNotification.request.content.data, 'presented_check');
                }
            }
            
        } catch (error) {
            console.error('[DEEPLINK] ❌ Erreur vérification arrière-plan:', error);
        }
    };

    // Vérifier et exécuter les navigations en attente
    const checkPendingConversationNav = async () => {
        try {
            const pendingNavStr = await AsyncStorage.getItem('PENDING_CONVERSATION_NAV');
            if (pendingNavStr) {
                const pendingNav = JSON.parse(pendingNavStr);

                // Ne traiter que les navigations récentes (moins de 2 minutes)
                if (Date.now() - pendingNav.timestamp < 120000) {
                    console.log('[DEEPLINK] 🔄 Exécution navigation en attente:', pendingNav.conversationId);
                    setTimeout(() => {
                        navigateToConversation(pendingNav.conversationId);
                    }, 1000);
                }

                await AsyncStorage.removeItem('PENDING_CONVERSATION_NAV');
            }
        } catch (error) {
            console.error('[DEEPLINK] ❌ Erreur vérification navigations:', error);
        }
    };

    // Gestionnaire principal des deep links (CONSERVÉ)
    const handleDeepLink = async (event) => {
        try {
            const url = event.url || event;

            if (!url) return;

            console.log("[DEEPLINK] Deep link intercepté:", url);

            // Ignorer les URLs de développement Expo
            if (url.includes('expo-development-client')) {
                console.log("[DEEPLINK] URL de développement Expo ignorée");
                return;
            }

            const fullUrl = decodeURIComponent(url);

            // === GESTION STRIPE (CONSERVÉE INTÉGRALEMENT) ===
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

            const normalizedUrl = normalizeDeepLinkParams(fullUrl);

            try {
                const parsedUrl = new URL(normalizedUrl);

                // === GESTION STRIPE (CONSERVÉE INTÉGRALEMENT) ===
                if (parsedUrl.protocol === 'hushy:' &&
                    (parsedUrl.hostname === 'stripe-return' || parsedUrl.hostname === 'profile' || parsedUrl.hostname === '')) {

                    console.log("Traitement du retour Stripe...");
                    const result = await handleStripeReturn(normalizedUrl);

                    const effectiveUserId = userId || (userData && userData._id);
                    const storageKey = effectiveUserId
                        ? `pendingSecretData_${effectiveUserId}`
                        : 'pendingSecretData';

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

                                const postData = { ...pendingSecretData };

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

                                await AsyncStorage.removeItem(storageKey);

                                if (postResult.requiresStripeSetup) {
                                    Alert.alert(
                                        t('deepLink.alerts.error.title'),
                                        t('deepLink.alerts.error.stillNeedsConfig'),
                                        [{ text: t('deepLink.alerts.ok') }]
                                    );
                                } else {
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
                            Alert.alert(
                                t('deepLink.alerts.success.title'),
                                t('deepLink.alerts.success.accountCreated'),
                                [{
                                    text: t('deepLink.alerts.returnToPost'),
                                    onPress: () => {
                                        navigation.navigate('AddSecret');
                                    }
                                }]
                            );
                        }

                        if (onStripeSuccess && typeof onStripeSuccess === 'function') {
                            onStripeSuccess(result);
                        }
                    } else {
                        Alert.alert(
                            t('deepLink.alerts.configInProgress.title'),
                            result.message || t('deepLink.alerts.configInProgress.message'),
                            [{ text: t('deepLink.alerts.ok') }]
                        );
                    }
                    return;
                }

                // === GESTION NAVIGATION VERS CONVERSATIONS VIA LIENS ===
                if (parsedUrl.protocol === 'hushy:') {
                    const pathParts = parsedUrl.pathname.split('/').filter(Boolean);

                    if (pathParts.length >= 2) {
                        const [type, id] = pathParts;

                        if (type === 'chat' && id) {
                            console.log('[DEEPLINK] Navigation vers conversation via deep link:', id);
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
                console.error('[DEEPLINK] Erreur parsing URL:', urlError);
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

    // Gestionnaire d'état de l'app
    const handleAppStateChange = (nextAppState) => {
        console.log('[DEEPLINK] 📱 Changement état app:', nextAppState);
        if (nextAppState === 'active') {
            // CORRECTION : Vérifier les notifications en arrière-plan
            setTimeout(() => {
                setupNotificationListener();
                checkForBackgroundNotification();
                checkPendingConversationNav();
            }, 500);
        }
    };

    // Initialiser les notifications
    const initializeNotifications = async () => {
        try {
            console.log('[DEEPLINK] 🔧 Initialisation du NotificationManager...');

            if (NotificationManager && typeof NotificationManager.initialize === 'function') {
                const userDataStr = await AsyncStorage.getItem('userData');
                let userData = null;
                if (userDataStr) {
                    try {
                        userData = JSON.parse(userDataStr);
                    } catch (parseError) {
                        console.error('[DEEPLINK] ❌ Erreur parsing userData:', parseError);
                    }
                }

                const result = await NotificationManager.initialize(userData);
                console.log('[DEEPLINK] ✅ NotificationManager initialisé:', result);
            } else {
                console.error('[DEEPLINK] ❌ NotificationManager non disponible');
            }
        } catch (error) {
            console.error('[DEEPLINK] ❌ Erreur initialisation NotificationManager:', error);
        }
    };

    useEffect(() => {
        console.log('[DEEPLINK] 🔄 INITIALISATION DEEPLINK HANDLER');
        console.log('[DEEPLINK] 👤 Utilisateur connecté:', isLoggedIn);

        // Écouteurs d'événements
        const linkingSubscription = Linking.addEventListener('url', handleDeepLink);
        const appStateSubscription = AppState.addEventListener('change', handleAppStateChange);
        
        // Configuration immédiate de l'écouteur de notifications
        setupNotificationListener();

        // Vérifier l'URL initiale au lancement
        Linking.getInitialURL().then(url => {
            if (url) {
                console.log('[DEEPLINK] 🔗 URL initiale trouvée:', url);
                handleDeepLink({ url });
            }
        });

        // Initialiser uniquement si utilisateur connecté
        if (isLoggedIn) {
            console.log('[DEEPLINK] 👤 Utilisateur connecté - initialisation...');
            setTimeout(() => {
                checkForBackgroundNotification();
                checkPendingConversationNav();
                initializeNotifications();
            }, 1000);
        } else {
            console.log('[DEEPLINK] ❌ Utilisateur non connecté - attente...');
        }

        return () => {
            console.log('[DEEPLINK] 🧹 Nettoyage des écouteurs...');
            linkingSubscription.remove();
            appStateSubscription.remove();
            
            // Nettoyer l'écouteur de notifications
            if (notificationSubscriptionRef.current) {
                notificationSubscriptionRef.current.remove();
                notificationSubscriptionRef.current = null;
            }
        };
    }, [userId, userData, onStripeSuccess, isLoggedIn]);

    return null;
};

export default DeepLinkHandler;