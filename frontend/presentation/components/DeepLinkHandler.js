import React, { useEffect } from 'react';
import { Linking, Alert } from 'react-native';
import { useCardData } from '../../infrastructure/context/CardDataContexte';

const DeepLinkHandler = () => {
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
                            'Succès',
                            'Votre compte Stripe a été configuré avec succès !',
                            [{ text: 'OK' }]
                        );
                    } else {
                        Alert.alert(
                            'Configuration en cours',
                            result.message,
                            [{ text: 'OK' }]
                        );
                    }
                }
            } catch (error) {
                console.error('Deep link error:', error);
                Alert.alert('Erreur', 'Impossible de traiter le lien');
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