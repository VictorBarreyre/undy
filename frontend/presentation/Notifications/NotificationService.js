import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform, Alert, Linking } from 'react-native';
import i18n from 'i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

const ALERT_SHOWN_SIMULATOR = 'notification_alert_shown_simulator';
const ALERT_SHOWN_PERMISSION = 'notification_alert_shown_permission';

class NotificationService {
    constructor() {
        this.initialize();
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
        
        // Vérifier si le handler est défini (méthode correcte)
        console.log("[NOTIF] Configuration terminée");
        
        // Configuration du canal pour Android
        if (Platform.OS === 'android') {
            await Notifications.setNotificationChannelAsync('default', {
                name: 'default',
                importance: Notifications.AndroidImportance.MAX,
                vibrationPattern: [0, 250, 250, 250],
                lightColor: '#FF231F7C',
            });
        }
        
        return true;
    }

    async checkPermissions(forceAlert = false) {
        console.log("[NOTIF] Vérification des permissions sur:", Device.isDevice ? "appareil physique" : "simulateur");

        if (!Device.isDevice) {
            if (__DEV__) {
                console.log(i18n.t('notifications.logs.devModePermission'));
                return true;
            }

            // Vérifier si l'alerte a déjà été affichée pour simulateur
            const alertShown = !forceAlert && await AsyncStorage.getItem(ALERT_SHOWN_SIMULATOR) === 'true';
            if (!alertShown) {
                console.log("[NOTIF] Affichage de l'alerte pour simulateur");

                Alert.alert(i18n.t('notifications.alerts.simulatorWarning'), null, [
                    {
                        text: "OK",
                        onPress: async () => {
                            await AsyncStorage.setItem(ALERT_SHOWN_SIMULATOR, 'true');
                        }
                    }
                ]);
            }
            return false;
        }

        try {
            const { status: existingStatus } = await Notifications.getPermissionsAsync();
            console.log("[NOTIF] Statut des permissions:", existingStatus);

            console.log(i18n.t('notifications.logs.existingStatus'), existingStatus);

            if (existingStatus === 'granted') {
                return true;
            }

            console.log("[NOTIF] Demande de permissions...");

            const { status } = await Notifications.requestPermissionsAsync();
            console.log("[NOTIF] Nouveau statut des permissions:", status);

            console.log(i18n.t('notifications.logs.newStatus'), status);

            if (status !== 'granted') {
                // Vérifier si l'alerte a déjà été affichée pour permissions
                const alertShown = !forceAlert && await AsyncStorage.getItem(ALERT_SHOWN_PERMISSION) === 'true';
                if (!alertShown) {
                    Alert.alert(
                        i18n.t('notifications.alerts.disabled.title'),
                        i18n.t('notifications.alerts.disabled.message'),
                        [
                            {
                                text: i18n.t('notifications.alerts.disabled.no'),
                                style: "cancel",
                                onPress: async () => {
                                    await AsyncStorage.setItem(ALERT_SHOWN_PERMISSION, 'true');
                                }
                            },
                            {
                                text: i18n.t('notifications.alerts.disabled.openSettings'),
                                onPress: async () => {
                                    await AsyncStorage.setItem(ALERT_SHOWN_PERMISSION, 'true');
                                    Linking.openSettings();
                                }
                            }
                        ]
                    );
                }
                return false;
            }

            return true;
        } catch (error) {
            console.error("[NOTIF] ERREUR lors de la vérification des permissions:", error);

            console.error(i18n.t('notifications.errors.permissionCheck'), error);
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
            // Utiliser uniquement getDevicePushTokenAsync pour obtenir un token APNs natif
            const tokenData = await Notifications.getDevicePushTokenAsync();
            console.log("[NOTIF] Token APNs natif récupéré:", tokenData.data);
            
            if (tokenData && tokenData.data) {
                // Stocker le token pour référence future
                await AsyncStorage.setItem('device_push_token', tokenData.data);
                return tokenData.data;
            }
            
            // Si on arrive ici et qu'aucun token n'est obtenu, essayer de récupérer le dernier token connu
            const lastToken = await AsyncStorage.getItem('device_push_token');
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
                const lastToken = await AsyncStorage.getItem('device_push_token');
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
        console.warn("[NOTIF] Tentative d'envoi de notification locale");
        try {
            // Testez avec un autre type de trigger
            const identifier = await Notifications.scheduleNotificationAsync({
                content: {
                    title: `🔔 ${title}`, // Ajoutez une icône pour plus de visibilité
                    body,
                    data,
                    sound: true,
                },
                trigger: { 
                    seconds: 2, // Délai de 2 secondes au lieu de 1
                    repeats: false 
                }
            });
            
            // Vérifiez les notifications programmées
            const scheduled = await Notifications.getAllScheduledNotificationsAsync();
            console.warn("[NOTIF] Notifications programmées:", scheduled.length);
            
            console.warn("[NOTIF] Notification programmée avec succès, identifiant:", identifier);
            return true;
        } catch (error) {
            console.error("[NOTIF] ERREUR lors de l'envoi:", error);
            return false;
        }
    }

    async activateNotifications() {
        try {
            const hasPermission = await this.checkPermissions();
            if (hasPermission) {
                const success = await this.sendTestNotification();
                console.log(i18n.t('notifications.logs.testSent'), success);
                return true;
            }
            return false;
        } catch (error) {
            console.error(i18n.t('notifications.errors.activation'), error);
            return false;
        }
    }

    // Dans NotificationService.js, modifiez la fonction sendTestNotification
    async sendTestNotification() {
        console.warn("[NOTIF_SERVICE] Envoi d'une notification de test");
        try {
            const result = await this.sendLocalNotification(
                i18n.t('notifications.test.title'),
                i18n.t('notifications.test.body'),
                { type: 'test' }
            );
            console.warn("[NOTIF_SERVICE] Notification de test envoyée:", result);
            return result;
        } catch (error) {
            console.warn("[NOTIF_SERVICE] Erreur lors de l'envoi de la notification de test:", error);
            return false;
        }
    }

    // Pour arrêter toutes les notifications programmées
    async cancelAllNotifications() {
        await Notifications.cancelAllScheduledNotificationsAsync();
    }
}

export default new NotificationService();