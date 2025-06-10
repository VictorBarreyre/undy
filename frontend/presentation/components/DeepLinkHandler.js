import React, { useEffect, useContext } from 'react';
import { Linking, Alert } from 'react-native';
import { useCardData } from '../../infrastructure/context/CardDataContexte';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { AuthContext } from '../../infrastructure/context/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

const DeepLinkHandler = ({ onStripeSuccess, userId }) => {
  const { t } = useTranslation();
  const { handleStripeReturn, handlePostSecret, handleShareSecret } = useCardData();
  const navigation = useNavigation();
  const { userData } = useContext(AuthContext);

  const normalizeDeepLinkParams = (url) => {
    // Gérer le cas où l'URL contient des paramètres mal formés
    if (url.includes('?action=complete?action=')) {
      return url.replace('?action=complete?action=', '?action=');
    } else if (url.includes('?path=?action=')) {
      return url.replace('?path=?action=', '?action=');
    }
    return url;
  };

  useEffect(() => {
    const handleDeepLink = async (event) => {
      try {
        const url = event.url || event;

        if (!url) return;



        // IMPORTANT: Ignorer les URLs qui sont gérées par NotificationHandler
        // Cela évite les conflits entre les deux systèmes
        if (url.includes('/chat/') ||
        url.includes('type=new_message') ||
        url.includes('notification') ||
        url.includes('conversationId=')) {

          return;
        }

        const fullUrl = decodeURIComponent(url);

        // Normaliser l'URL
        const normalizedUrl = normalizeDeepLinkParams(fullUrl);

        // Parser l'URL
        let parsedUrl;
        try {
          parsedUrl = new URL(normalizedUrl);
        } catch (urlError) {
          console.error("[DeepLinkHandler] URL invalide:", normalizedUrl);
          return;
        }

        // Gérer le retour de mise à jour de compte bancaire Stripe
        if (normalizedUrl.includes('action=bank_update_complete')) {

          await handleStripeReturn(normalizedUrl);

          Alert.alert(
            t('stripe.bankUpdateSuccess.title'),
            t('stripe.bankUpdateSuccess.message'),
            [{ text: 'OK' }]
          );
          return;
        }

        // Gérer les retours Stripe
        if (parsedUrl.protocol === 'hushy:' && (
        parsedUrl.hostname === 'stripe-return' ||
        parsedUrl.hostname === 'profile' ||
        parsedUrl.hostname === '')) {


          const result = await handleStripeReturn(normalizedUrl);

          // Définir la clé de stockage
          const effectiveUserId = userId || userData && userData._id;
          const storageKey = effectiveUserId ?
          `pendingSecretData_${effectiveUserId}` :
          'pendingSecretData';

          // Récupérer les données en attente
          let pendingSecretData = null;

          try {
            const pendingDataJson = await AsyncStorage.getItem(storageKey);
            if (pendingDataJson) {
              pendingSecretData = JSON.parse(pendingDataJson);

            } else {

            }
          } catch (storageError) {
            console.error("[DeepLinkHandler] Erreur lors de la récupération des données en attente:", storageError);
          }

          if (result.success) {
            if (pendingSecretData) {
              try {


                // Préparer les données du secret avec localisation si disponibles
                const postData = { ...pendingSecretData };

                // Si des données de localisation étaient stockées, les inclure
                if (pendingSecretData.userLocation) {
                  const lat = parseFloat(pendingSecretData.userLocation.latitude);
                  const lng = parseFloat(pendingSecretData.userLocation.longitude);

                  if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
                    postData.location = {
                      type: 'Point',
                      coordinates: [lng, lat]
                    };

                  }
                }

                const postResult = await handlePostSecret(postData);

                // Nettoyer les données en attente
                await AsyncStorage.removeItem(storageKey);

                if (postResult.requiresStripeSetup) {
                  // Si on a encore besoin de configurer Stripe, c'est étrange
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
                          Alert.alert(
                            t('addSecret.errors.title'),
                            t('addSecret.errors.unableToShare')
                          );
                        }
                      }
                    },
                    {
                      text: t('addSecret.alerts.later'),
                      style: "cancel"
                    }]

                  );
                }
              } catch (error) {
                console.error("[DeepLinkHandler] Erreur lors de la publication automatique:", error);
                Alert.alert(
                  t('deepLink.alerts.error.title'),
                  error.message || t('deepLink.alerts.error.postingFailed'),
                  [{ text: t('deepLink.alerts.ok') }]
                );
              }
            } else {
              // Le compte Stripe est configuré mais pas de données de secret en attente
              Alert.alert(
                t('deepLink.alerts.success.title'),
                t('deepLink.alerts.success.accountCreated'),
                [{
                  text: t('deepLink.alerts.returnToPost'),
                  onPress: () => {
                    // Naviguer vers AddSecret
                    navigation.navigate('AddSecret');
                  }
                }]
              );
            }

            // Appeler le callback si fourni
            if (onStripeSuccess && typeof onStripeSuccess === 'function') {
              onStripeSuccess(result);
            }
          } else {
            // Configuration Stripe pas encore terminée
            Alert.alert(
              t('deepLink.alerts.configInProgress.title'),
              result.message || t('deepLink.alerts.configInProgress.message'),
              [{ text: t('deepLink.alerts.ok') }]
            );
          }
        }

        // Vous pouvez ajouter d'autres handlers de deep links ici
        // Par exemple pour les secrets partagés, etc.

      } catch (error) {
        console.error("[DeepLinkHandler] Erreur globale:", error);
        Alert.alert(
          t('deepLink.errors.title'),
          error.message || t('deepLink.errors.unableToProcessLink'),
          [{ text: t('deepLink.alerts.ok') }]
        );
      }
    };

    // Écouteur d'événements pour les liens entrants
    const subscription = Linking.addEventListener('url', handleDeepLink);

    // Vérifier l'URL initiale au lancement
    Linking.getInitialURL().then((url) => {
      if (url) {

        handleDeepLink({ url });
      }
    });

    return () => {
      subscription.remove();
    };
  }, [userId, userData, onStripeSuccess, t, handleStripeReturn, handlePostSecret, handleShareSecret, navigation]);

  return null; // Ce composant ne rend rien, il gère uniquement les liens
};

export default DeepLinkHandler;