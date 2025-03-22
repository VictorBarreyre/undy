import React, { useEffect, useContext } from 'react';
import { Linking, Alert } from 'react-native';
import { useCardData } from '../../infrastructure/context/CardDataContexte';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native'; // Pour la navigation
import AsyncStorage from '@react-native-async-storage/async-storage'; // Ajoutez cet import



const DeepLinkHandler = ({ onStripeSuccess }) => {
    const { t } = useTranslation();
    const { handleStripeReturn } = useCardData();
    const navigation = useNavigation();

    const normalizeDeepLinkParams = (url) => {
        // Gérer le cas où l'URL contient des paramètres mal formés
        if (url.includes('?action=complete?action=')) {
            return url.replace('?action=complete?action=', '?action=');
        }
        return url;
    };

    useEffect(() => {
        const handleDeepLink = async (event) => {
            try {
                const url = event.url || event;
                
                if (!url) return;

                console.log("Deep link intercepté:", url);
                const fullUrl = decodeURIComponent(url);
                const normalizedUrl = normalizeDeepLinkParams(fullUrl);
                const parsedUrl = new URL(fullUrl);
                
                // Vérifiez le host et le schéma
                if (parsedUrl.protocol === 'hushy:' && 
                    (parsedUrl.hostname === 'stripe-return' || parsedUrl.hostname === 'profile')) {
                    
                    console.log("Traitement du retour Stripe...");
                    const result = await handleStripeReturn(fullUrl);
                    const pendingSecretData = await AsyncStorage.getItem(`pendingSecretData_${userData._id}`);
                    
                    if (result.success) {
                        Alert.alert(
                            t('deepLink.alerts.success.title'),
                            t('deepLink.alerts.success.message'),
                            [{ 
                                text: t('deepLink.alerts.continuePosting'),
                                onPress: async () => {
                                    // Si nous avons un callback, l'appeler avec le résultat
                                    if (onStripeSuccess && typeof onStripeSuccess === 'function') {
                                        onStripeSuccess(result);
                                    }
                                    
                                    // Si nous avons des données en attente, les utiliser pour publier le secret
                                    if (pendingSecretData) {
                                        try {
                                            const secretData = JSON.parse(pendingSecretData);
                                            // Navigation vers AddSecret si nécessaire
                                            navigation.navigate('AddSecret', { pendingSecretData: secretData });
                                        } catch (e) {
                                            console.error("Erreur lors de la récupération des données en attente:", e);
                                        } finally {
                                            // Supprimer les données en attente
                                            await AsyncStorage.removeItem('pendingSecretData');
                                        }
                                    }
                                }
                            }]
                        );
                    } else {
                        Alert.alert(
                            t('deepLink.alerts.configInProgress.title'),
                            result.message,
                            [{ text: t('deepLink.alerts.ok') }]
                        );
                    }
                }
            } catch (error) {
                console.error(t('deepLink.errors.deepLinkError'), error);
                Alert.alert(
                    t('deepLink.errors.title'), 
                    t('deepLink.errors.unableToProcessLink')
                );
            }
        };

        // Écouteur d'événements pour les liens entrants
        const subscription = Linking.addEventListener('url', handleDeepLink);

        // Vérifier l'URL initiale au lancement
        Linking.getInitialURL().then(url => {
            if (url) {
                handleDeepLink({ url });
            }
        });

        return () => {
            subscription.remove();
        };
    }, [onStripeSuccess]);

    return null; // Ce composant ne rend rien, il gère uniquement les liens
};

export default DeepLinkHandler;