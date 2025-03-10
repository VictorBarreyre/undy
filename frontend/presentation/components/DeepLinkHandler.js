import React, { useEffect } from 'react';
import { Linking, Alert } from 'react-native';
import { useCardData } from '../../infrastructure/context/CardDataContexte';
import { useTranslation } from 'react-i18next';

const DeepLinkHandler = () => {
    const { t } = useTranslation();
    const { handleStripeReturn } = useCardData();

    useEffect(() => {
        const handleDeepLink = async (event) => {
            try {
                const url = event.url || event;
                
                if (!url) return;

                const parsedUrl = new URL(url);
                
                // Vérifiez le host et le schéma
                if (parsedUrl.protocol === 'hushy:' && 
                    (parsedUrl.hostname === 'stripe-return' || parsedUrl.hostname === 'profile')) {
                    
                    const result = await handleStripeReturn(url);
                    
                    if (result.success) {
                        Alert.alert(
                            t('deepLink.alerts.success.title'),
                            t('deepLink.alerts.success.message'),
                            [{ text: t('deepLink.alerts.ok') }]
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
    }, []);

    return null; // Ce composant ne rend rien, il gère uniquement les liens
};

export default DeepLinkHandler;