import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform, Alert, Linking } from 'react-native';

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

    async checkPermissions() {
        if (!Device.isDevice) {
            if (__DEV__) {
                console.log("Mode développement: autorisation simulateur");
                return true;
            }
            Alert.alert('Les notifications ne fonctionnent pas sur simulateur');
            return false;
        }
    
        try {
            const { status: existingStatus } = await Notifications.getPermissionsAsync();
            console.log("Status existant:", existingStatus);
    
            if (existingStatus === 'granted') {
                return true;
            }
    
            const { status } = await Notifications.requestPermissionsAsync();
            console.log("Nouveau status:", status);
    
            if (status !== 'granted') {
                Alert.alert(
                    "Notifications désactivées",
                    "Voulez-vous activer les notifications dans les paramètres ?",
                    [
                        {
                            text: "Non",
                            style: "cancel"
                        },
                        {
                            text: "Ouvrir les paramètres",
                            onPress: () => Linking.openSettings()
                        }
                    ]
                );
                return false;
            }
    
            return true;
        } catch (error) {
            console.error("Erreur de vérification des permissions:", error);
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
            console.error("Erreur lors de l'obtention du token:", error);
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
            console.error("Erreur lors de l'envoi de la notification:", error);
            return false;
        }
    }

    async activateNotifications() {
        try {
            const hasPermission = await this.checkPermissions();
            if (hasPermission) {
                const success = await this.sendTestNotification();
                console.log("Notification test envoyée:", success);
                return true;
            }
            return false;
        } catch (error) {
            console.error("Erreur d'activation:", error);
            return false;
        }
    }

    // Pour tester les notifications
    async sendTestNotification() {
        return this.sendLocalNotification(
            "Notifications activées",
            "Vous recevrez désormais des notifications de l'application",
            { type: 'test' }
        );
    }

    // Pour arrêter toutes les notifications programmées
    async cancelAllNotifications() {
        await Notifications.cancelAllScheduledNotificationsAsync();
    }
}

export default new NotificationService();