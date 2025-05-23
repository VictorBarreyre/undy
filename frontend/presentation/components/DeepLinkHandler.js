import React, { useEffect, useContext } from 'react';
import { Linking, Alert } from 'react-native';
import * as Notifications from 'expo-notifications';
import { useCardData } from '../../infrastructure/context/CardDataContexte';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { AuthContext } from '../../infrastructure/context/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
            console.log('[DEEPLINK] Utilisateur non connecté, navigation impossible');
            return;
        }

        console.log('[DEEPLINK] Navigation vers conversation:', conversationId);
        
        try {
            // Méthode 1: Navigation complète via la structure
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
            console.log('[DEEPLINK] Navigation réussie (structure complète)');
        } catch (error) {
            console.log('[DEEPLINK] Échec méthode 1, tentative alternative:', error);
            try {
                // Méthode 2: Navigation directe
                navigation.navigate('ChatTab', {
                    screen: 'Chat',
                    params: { conversationId },
                });
                console.log('[DEEPLINK] Navigation réussie (alternative)');
            } catch (error2) {
                console.log('[DEEPLINK] Échec méthode 2, dernière tentative:', error2);
                try {
                    // Méthode 3: Navigation très directe
                    navigation.navigate('Chat', { conversationId });
                    console.log('[DEEPLINK] Navigation réussie (directe)');
                } catch (error3) {
                    console.error('[DEEPLINK] Toutes les méthodes de navigation ont échoué:', error3);
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
            const parsedUrl = new URL(normalizedUrl);

            if (parsedUrl.protocol === 'hushy:' && 
                (parsedUrl.hostname === 'stripe-return' || parsedUrl.hostname === 'profile' || parsedUrl.hostname === '')) {
                
                console.log("Traitement du retour Stripe...");
                const result = await handleStripeReturn(normalizedUrl);
                
                // [... rest of your Stripe handling code ...]
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

        } catch (error) {
            console.error(t('deepLink.errors.deepLinkError'), error);
            Alert.alert(
                t('deepLink.errors.title'), 
                error.message || t('deepLink.errors.unableToProcessLink'),
                [{ text: t('deepLink.alerts.ok') }]
            );
        }
    };

    // Gestionnaire des notifications (clic sur notification)
    const handleNotificationResponse = (response) => {
        const data = response.notification.request.content.data;
        console.log('[DEEPLINK] Notification cliquée:', data);
        
        if (data?.type === 'new_message' && data?.conversationId) {
            console.log('[DEEPLINK] Navigation vers conversation depuis notification:', data.conversationId);
            // Délai pour s'assurer que l'app est prête
            setTimeout(() => {
                navigateToConversation(data.conversationId);
            }, 1000);
        }
    };

    // Vérifier les notifications initiales
    const checkInitialNotification = async () => {
        try {
            const response = await Notifications.getLastNotificationResponseAsync();
            if (response) {
                const data = response.notification.request.content.data;
                console.log('[DEEPLINK] Notification initiale trouvée:', data);
                
                if (data?.type === 'new_message' && data?.conversationId) {
                    console.log('[DEEPLINK] Navigation initiale vers conversation:', data.conversationId);
                    setTimeout(() => {
                        navigateToConversation(data.conversationId);
                    }, 2000);
                }
            }
        } catch (error) {
            console.error('[DEEPLINK] Erreur lors de la vérification des notifications:', error);
        }
    };

    useEffect(() => {
        // Configuration des notifications
        Notifications.setNotificationHandler({
            handleNotification: async () => ({
                shouldShowAlert: true,
                shouldPlaySound: true,
                shouldSetBadge: true,
            }),
        });

        // Écouteurs d'événements
        const linkingSubscription = Linking.addEventListener('url', handleDeepLink);
        const notificationSubscription = Notifications.addNotificationResponseReceivedListener(handleNotificationResponse);

        // Vérifier l'URL initiale au lancement
        Linking.getInitialURL().then(url => {
            if (url) {
                handleDeepLink({ url });
            }
        });

        // Vérifier les notifications initiales
        if (isLoggedIn) {
            checkInitialNotification();
        }

        return () => {
            linkingSubscription.remove();
            if (notificationSubscription) {
                Notifications.removeNotificationSubscription(notificationSubscription);
            }
        };
    }, [userId, userData, onStripeSuccess, isLoggedIn]);

    return null;
};

export default DeepLinkHandler;