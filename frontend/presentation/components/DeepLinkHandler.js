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
            
            // Gérer le cas où l'URL contient des paramètres mal formés
            const normalizedUrl = fullUrl.replace('?action=complete?', '?');
            
            const parsedUrl = new URL(normalizedUrl);
            
            // Vérifiez le host et le schéma
            if (parsedUrl.protocol === 'hushy:' && 
                (parsedUrl.hostname === 'stripe-return' || parsedUrl.hostname === 'profile')) {
              
              console.log("Traitement du retour Stripe...");
              const result = await handleStripeReturn(normalizedUrl);
              
              if (result.success) {
                // Si nous avons les données d'un secret en attente
                if (result.pendingSecretData) {
                  try {
                    console.log("Tentative de publication automatique du secret...");
                    const postResult = await handlePostSecret(result.pendingSecretData);
                    
                    if (postResult.requiresStripeSetup) {
                      // Si on a encore besoin de configurer Stripe, c'est étrange, notifier l'utilisateur
                      Alert.alert(
                        t('deepLink.alerts.error.title'),
                        t('deepLink.alerts.error.stillNeedsConfig'),
                        [{ text: t('deepLink.alerts.ok') }]
                      );
                    } else {
                      // Success! Le secret est posté
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
                      t('deepLink.alerts.error.postingFailed'),
                      [{ text: t('deepLink.alerts.ok') }]
                    );
                  }
                } else {
                  Alert.alert(
                    t('deepLink.alerts.success.title'),
                    t('deepLink.alerts.success.message'),
                    [{ text: t('deepLink.alerts.ok') }]
                  );
                }
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