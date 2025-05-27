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
            // Attendre que la navigation soit prête
            await new Promise(resolve => setTimeout(resolve, 1000));

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
            await AsyncStorage.removeItem('APNS_NOTIFICATION_DATA');
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

    // NOUVEAU : Gestionnaire spécial pour notifications APNs via données stockées
    const checkForAPNsNotificationData = async () => {
        console.log('[DEEPLINK] 🔍 Vérification données APNs stockées...');
        
        try {
            // Vérifier si des données de notification APNs ont été stockées
            const apnsDataStr = await AsyncStorage.getItem('APNS_NOTIFICATION_DATA');
            if (apnsDataStr) {
                console.log('[DEEPLINK] 📱 Données APNs trouvées dans le storage!');
                
                const apnsData = JSON.parse(apnsDataStr);
                console.log('[DEEPLINK] 📋 Données APNs:', JSON.stringify(apnsData, null, 2));
                
                // Vérifier que c'est récent (moins de 2 minutes)
                if (Date.now() - apnsData.timestamp < 120000) {
                    console.log('[DEEPLINK] ✅ Données APNs récentes, traitement...');
                    
                    if (apnsData.type === 'new_message' && apnsData.conversationId) {
                        console.log('[DEEPLINK] 🎯 Navigation APNs vers:', apnsData.conversationId);
                        
                        const success = await navigateToConversation(apnsData.conversationId);
                        if (success) {
                            console.log('[DEEPLINK] 🎉 Navigation APNs réussie !');
                        }
                    }
                } else {
                    console.log('[DEEPLINK] ⏰ Données APNs trop anciennes, nettoyage...');
                    await AsyncStorage.removeItem('APNS_NOTIFICATION_DATA');
                }
            } else {
                console.log('[DEEPLINK] ℹ️ Aucune donnée APNs stockée');
            }
        } catch (error) {
            console.error('[DEEPLINK] ❌ Erreur vérification APNs:', error);
        }
    };

    // GESTIONNAIRE POUR NOTIFICATIONS EN PREMIER PLAN (locales uniquement)
    const handleNotificationResponse = async (response) => {
        console.log('[DEEPLINK] 📱 Notification locale reçue en premier plan');
        const content = response.notification.request.content;
        
        if (content.data?.type === 'new_message' && content.data?.conversationId) {
            console.log('[DEEPLINK] 🎯 Navigation notification locale:', content.data.conversationId);
            await navigateToConversation(content.data.conversationId);
        }
    };

    // Configuration de l'écouteur de notifications
    const setupNotificationListener = () => {
        console.log('[DEEPLINK] 🎧 Configuration de l\'écouteur de notifications locales...');
        
        // Nettoyer l'ancien écouteur s'il existe
        if (notificationSubscriptionRef.current) {
            console.log('[DEEPLINK] 🧹 Nettoyage de l\'ancien écouteur');
            notificationSubscriptionRef.current.remove();
        }

        // Créer le nouvel écouteur (pour notifications locales seulement)
        notificationSubscriptionRef.current = Notifications.addNotificationResponseReceivedListener(handleNotificationResponse);
        console.log('[DEEPLINK] ✅ Écouteur de notifications locales configuré');
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

    // Gestionnaire principal des deep links
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

            // NOUVEAU : Gestion des deep links de notifications APNs
            // Format: hushy://notification?conversationId=xxx&type=new_message&senderId=xxx
            if (fullUrl.includes('hushy://notification')) {
                console.log("[DEEPLINK] 🔔 Deep link de notification APNs détecté");
                
                try {
                    const urlObj = new URL(fullUrl);
                    const conversationId = urlObj.searchParams.get('conversationId');
                    const type = urlObj.searchParams.get('type');
                    const senderId = urlObj.searchParams.get('senderId');
                    
                    console.log("[DEEPLINK] 📋 Paramètres notification:", { conversationId, type, senderId });
                    
                    if (type === 'new_message' && conversationId) {
                        console.log("[DEEPLINK] 🎯 Navigation via deep link APNs:", conversationId);
                        setTimeout(() => {
                            navigateToConversation(conversationId);
                        }, 500);
                        return;
                    }
                } catch (parseError) {
                    console.error("[DEEPLINK] ❌ Erreur parsing URL notification:", parseError);
                }
            }

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
            setTimeout(() => {
                setupNotificationListener();
                checkForAPNsNotificationData();
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
        
        // Configuration immédiate de l'écouteur de notifications locales
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
                checkForAPNsNotificationData();
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