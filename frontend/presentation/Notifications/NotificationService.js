import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform, Alert, Linking } from 'react-native';
import i18n from 'i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

// Clés de stockage AsyncStorage
const PERMISSION_CHECKED_KEY = 'notification_permission_checked';
const PERMISSION_ASKED_KEY = 'notification_permission_asked';
const LAST_CHECK_TIMESTAMP_KEY = 'notification_last_check_timestamp';
const TOKEN_KEY = 'device_push_token';
const SIMULATOR_ALERT_SHOWN_KEY = 'notification_alert_shown_simulator';

class NotificationService {
    constructor() {
        this.initialize();
        this.permissionRequesting = false; // Variable pour éviter les demandes concurrentes
    }

    async initialize() {
        console.log("[NOTIF] Initialisation du service de notifications...");
        
        // Configuration des notifications
        Notifications.setNotificationHandler({
            handleNotification: async () => ({
                shouldShowAlert: true,
                shouldPlaySound: true,
                shouldSetBadge: true,
            }),
        });
        
        // Configuration du canal pour Android
        if (Platform.OS === 'android') {
            await Notifications.setNotificationChannelAsync('default', {
                name: 'default',
                importance: Notifications.AndroidImportance.MAX,
                vibrationPattern: [0, 250, 250, 250],
                lightColor: '#FF231F7C',
            });
        }
        
        console.log("[NOTIF] Configuration terminée");
        return true;
    }

    /**
     * Vérifie les permissions de notification
     * @param {boolean} forceAlert - Si true, force l'affichage de l'alerte de demande de permission
     * @returns {Promise<boolean>} - true si les permissions sont accordées
     */
    async checkPermissions(forceAlert = false) {
        // Ne pas exécuter plusieurs vérifications en même temps
        if (this.permissionRequesting) {
            console.log("[NOTIF] Une vérification des permissions est déjà en cours");
            return false;
        }

        this.permissionRequesting = true;
        console.log("[NOTIF] Vérification des permissions sur:", Device.isDevice ? "appareil physique" : "simulateur");

        try {
            // Cas du simulateur - retourner immédiatement
            if (!Device.isDevice) {
                if (__DEV__) {
                    console.log(i18n.t('notifications.logs.devModePermission'));
                    this.permissionRequesting = false;
                    return true;
                }

                // Vérifier si l'alerte a déjà été affichée pour simulateur
                const alertShown = !forceAlert && await AsyncStorage.getItem(SIMULATOR_ALERT_SHOWN_KEY) === 'true';
                if (!alertShown) {
                    console.log("[NOTIF] Affichage de l'alerte pour simulateur");
                    Alert.alert(i18n.t('notifications.alerts.simulatorWarning'), null, [
                        {
                            text: "OK",
                            onPress: async () => {
                                await AsyncStorage.setItem(SIMULATOR_ALERT_SHOWN_KEY, 'true');
                            }
                        }
                    ]);
                }
                this.permissionRequesting = false;
                return false;
            }

            // Vérifier si on a déjà demandé les permissions récemment
            const lastCheckStr = await AsyncStorage.getItem(LAST_CHECK_TIMESTAMP_KEY);
            const permissionAskedBefore = await AsyncStorage.getItem(PERMISSION_ASKED_KEY) === 'true';
            const now = Date.now();
            
            if (lastCheckStr && !forceAlert) {
                const lastCheck = parseInt(lastCheckStr);
                const timeSinceLastCheck = now - lastCheck;
                
                // Ne pas redemander avant 24h sauf si forceAlert est true
                if (timeSinceLastCheck < 24 * 60 * 60 * 1000 && permissionAskedBefore) {
                    console.log("[NOTIF] Dernière vérification récente, utilisation du statut existant");
                    const { status } = await Notifications.getPermissionsAsync();
                    this.permissionRequesting = false;
                    return status === 'granted';
                }
            }

            // Vérifier le statut existant
            const { status: existingStatus } = await Notifications.getPermissionsAsync();
            console.log("[NOTIF] Statut des permissions:", existingStatus);

            // Si déjà accordées, pas besoin de demander à nouveau
            if (existingStatus === 'granted') {
                await AsyncStorage.setItem(LAST_CHECK_TIMESTAMP_KEY, now.toString());
                await AsyncStorage.setItem(PERMISSION_CHECKED_KEY, 'true');
                this.permissionRequesting = false;
                return true;
            }

            // Si permissions déjà vérifiées mais pas accordées, ne pas redemander sauf si forceAlert
            if (permissionAskedBefore && !forceAlert) {
                console.log("[NOTIF] Permissions précédemment refusées et forceAlert=false");
                this.permissionRequesting = false;
                return false;
            }

            // Demander les permissions uniquement si forceAlert ou première demande
            if (forceAlert || !permissionAskedBefore) {
                console.log("[NOTIF] Demande de permissions...");
                const { status } = await Notifications.requestPermissionsAsync();
                console.log("[NOTIF] Nouveau statut des permissions:", status);
                
                // Marquer que nous avons déjà demandé les permissions
                await AsyncStorage.setItem(PERMISSION_ASKED_KEY, 'true');
                await AsyncStorage.setItem(LAST_CHECK_TIMESTAMP_KEY, now.toString());
                
                this.permissionRequesting = false;
                return status === 'granted';
            }

            this.permissionRequesting = false;
            return existingStatus === 'granted';
        } catch (error) {
            console.error("[NOTIF] ERREUR lors de la vérification des permissions:", error);
            console.error(i18n.t('notifications.errors.permissionCheck'), error);
            this.permissionRequesting = false;
            return false;
        }
    }

    async getToken() {
        console.log("[NOTIF] Tentative de récupération du token...");
        
        // Vérifier si nous sommes sur un simulateur
        if (!Device.isDevice) {
            console.log("[NOTIF] Exécution sur simulateur, token simulé utilisé");
            return "SIMULATOR_MOCK_TOKEN";
        }
        
        try {
            // Vérifier les permissions avant de récupérer un token
            const hasPermission = await this.checkPermissions(false);
            if (!hasPermission) {
                console.log("[NOTIF] Permissions non accordées, impossible d'obtenir un token");
                return null;
            }
            
            // Essayer de récupérer un token APNs natif
            const tokenData = await Notifications.getDevicePushTokenAsync();
            console.log("[NOTIF] Token APNs natif récupéré:", tokenData.data);
            
            if (tokenData && tokenData.data) {
                // Stocker le token pour référence future
                await AsyncStorage.setItem(TOKEN_KEY, tokenData.data);
                return tokenData.data;
            }
            
            // Récupérer le dernier token connu si aucun nouveau n'est obtenu
            const lastToken = await AsyncStorage.getItem(TOKEN_KEY);
            if (lastToken) {
                console.log("[NOTIF] Utilisation du dernier token connu:", lastToken);
                return lastToken;
            }
            
            console.log("[NOTIF] Aucun token obtenu");
            return null;
        } catch (error) {
            console.error("[NOTIF] ERREUR lors de la récupération du token:", error);
            
            // En cas d'erreur, essayer de récupérer le dernier token connu
            try {
                const lastToken = await AsyncStorage.getItem(TOKEN_KEY);
                if (lastToken) {
                    console.log("[NOTIF] Utilisation du dernier token connu après erreur:", lastToken);
                    return lastToken;
                }
            } catch (storageError) {
                console.error("[NOTIF] Erreur lors de la récupération du dernier token:", storageError);
            }
            
            return null;
        }
    }

    async sendLocalNotification(title, body, data = {}) {
        console.log("[NOTIF] Tentative d'envoi de notification locale");
        console.log("[NOTIF] Titre:", title);
        console.log("[NOTIF] Corps:", body);
        console.log("[NOTIF] Données:", JSON.stringify(data));
        
        // Vérifier si le titre et le corps sont des notifications de "Notifications activées"
        // Pour éviter d'envoyer des notifications test dupliquées
        const isActivationNotification = 
            (title.includes("Notifications activées") || title.includes("Notifications enabled")) &&
            (body.includes("désormais") || body.includes("now receive"));
        
        // Si c'est une notification d'activation et qu'elle a déjà été envoyée récemment, ne pas l'envoyer
        if (isActivationNotification) {
            const lastActivationTime = await AsyncStorage.getItem('last_activation_notification_time');
            const now = Date.now();
            
            if (lastActivationTime) {
                const timeSinceLastActivation = now - parseInt(lastActivationTime);
                
                // Ne pas envoyer si moins de 1 heure s'est écoulée
                if (timeSinceLastActivation < 60 * 60 * 1000) {
                    console.log("[NOTIF] Notification d'activation déjà envoyée récemment, ignorée");
                    return true;
                }
            }
            
            // Enregistrer le moment de l'envoi de cette notification d'activation
            await AsyncStorage.setItem('last_activation_notification_time', now.toString());
        }
        
        try {
            const identifier = await Notifications.scheduleNotificationAsync({
                content: {
                    title,
                    body,
                    data,
                    sound: true,
                },
                trigger: { 
                    seconds: 1, // Réduire à 1 seconde pour un test plus rapide
                    repeats: false 
                }
            });
            
            console.log("[NOTIF] Notification programmée avec succès, identifiant:", identifier);
            return true;
        } catch (error) {
            console.error("[NOTIF] ERREUR lors de l'envoi:", error);
            return false;
        }
    }

    async activateNotifications() {
        try {
            // Vérifier si une activation a déjà été faite récemment
            const lastActivationTime = await AsyncStorage.getItem('last_activation_attempt_time');
            const now = Date.now();
            
            if (lastActivationTime) {
                const timeSinceLastActivation = now - parseInt(lastActivationTime);
                
                // Ne pas redemander si moins de 30 minutes se sont écoulées
                if (timeSinceLastActivation < 30 * 60 * 1000) {
                    console.log("[NOTIF] Tentative d'activation récente, utilisation du statut existant");
                    const { status } = await Notifications.getPermissionsAsync();
                    return status === 'granted';
                }
            }
            
            // Enregistrer le moment de cette tentative d'activation
            await AsyncStorage.setItem('last_activation_attempt_time', now.toString());
            
            const hasPermission = await this.checkPermissions(true); // Forcer l'affichage de l'alerte
            
            if (hasPermission) {
                // Tester les notifications en envoyant une notification locale
                console.log("[NOTIF] Permissions accordées, envoi d'une notification de test");
                await this.sendTestNotification();
                return true;
            }
            return false;
        } catch (error) {
            console.error("[NOTIF] Erreur lors de l'activation:", error);
            console.error(i18n.t('notifications.errors.activation'), error);
            return false;
        }
    }

    async sendTestNotification() {
        console.log("[NOTIF_SERVICE] Vérification avant envoi d'une notification de test");
        
        // Vérifier si une notification test a été envoyée récemment
        const lastTestTime = await AsyncStorage.getItem('last_test_notification_time');
        const now = Date.now();
        
        if (lastTestTime) {
            const timeSinceLastTest = now - parseInt(lastTestTime);
            
            // Ne pas envoyer si moins de 10 secondes se sont écoulées
            if (timeSinceLastTest < 10 * 1000) {
                console.log("[NOTIF_SERVICE] Notification test envoyée trop récemment, ignorée");
                return true; // Simuler un succès pour ne pas bloquer le flux
            }
        }
        
        // Enregistrer le moment de l'envoi de cette notification test
        await AsyncStorage.setItem('last_test_notification_time', now.toString());
        
        try {
            const result = await this.sendLocalNotification(
                i18n.t('notifications.test.title'),
                i18n.t('notifications.test.body'),
                { type: 'test' }
            );
            console.log("[NOTIF_SERVICE] Notification de test envoyée:", result);
            return result;
        } catch (error) {
            console.warn("[NOTIF_SERVICE] Erreur lors de l'envoi de la notification de test:", error);
            return false;
        }
    }

    async testRemoteNotification() {
        console.log("[NOTIF_SERVICE] Test de notification distante");
        
        try {
            // Récupérer le token
            const token = await this.getToken();
            if (!token) {
                console.error("[NOTIF_SERVICE] Impossible d'obtenir un token pour le test");
                return {
                    success: false,
                    message: "Aucun token disponible"
                };
            }
            
            console.log("[NOTIF_SERVICE] Test de notification avec le token:", token);
            return {
                success: true,
                token: token
            };
        } catch (error) {
            console.error("[NOTIF_SERVICE] Erreur lors du test de notification:", error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    async cancelAllNotifications() {
        await Notifications.cancelAllScheduledNotificationsAsync();
    }
}

export default new NotificationService();