import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform, Alert, Linking } from 'react-native';
import i18n from 'i18next'; // Importez i18n directement pour accéder aux traductions
import AsyncStorage from '@react-native-async-storage/async-storage';

const ALERT_SHOWN_SIMULATOR = 'notification_alert_shown_simulator';
const ALERT_SHOWN_PERMISSION = 'notification_alert_shown_permission';

class NotificationService {
    constructor() {
        this.initialize();
    }

    async initialize() {
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
    }

    async checkPermissions(forceAlert = false) {
        if (!Device.isDevice) {
            if (__DEV__) {
                console.log(i18n.t('notifications.logs.devModePermission'));
                return true;
            }
            
            // Vérifier si l'alerte a déjà été affichée pour simulateur
            const alertShown = !forceAlert && await AsyncStorage.getItem(ALERT_SHOWN_SIMULATOR) === 'true';
            if (!alertShown) {
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
            console.log(i18n.t('notifications.logs.existingStatus'), existingStatus);
    
            if (existingStatus === 'granted') {
                return true;
            }
    
            const { status } = await Notifications.requestPermissionsAsync();
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
            console.error(i18n.t('notifications.errors.permissionCheck'), error);
            return false;
        }
    }

    async getToken() {
        try {
            const token = await Notifications.getExpoPushTokenAsync({
                projectId: "VOTRE_PROJECT_ID" // À remplacer par votre ID de projet
            });
            return token.data;
        } catch (error) {
            console.error(i18n.t('notifications.errors.tokenRetrieval'), error);
            return null;
        }
    }

    async sendLocalNotification(title, body, data = {}) {
        try {
            await Notifications.scheduleNotificationAsync({
                content: {
                    title,
                    body,
                    data,
                    sound: true,
                },
                trigger: null // Notification immédiate
            });
            return true;
        } catch (error) {
            console.error(i18n.t('notifications.errors.sending'), error);
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

    // Pour tester les notifications
    async sendTestNotification() {
        return this.sendLocalNotification(
            i18n.t('notifications.test.title'),
            i18n.t('notifications.test.body'),
            { type: 'test' }
        );
    }

    // Pour arrêter toutes les notifications programmées
    async cancelAllNotifications() {
        await Notifications.cancelAllScheduledNotificationsAsync();
    }
}

export default new NotificationService();