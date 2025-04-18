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
                
                console.log("Deep link intercepté:", url);
                const fullUrl = decodeURIComponent(url);
                
                // Normaliser l'URL
                const normalizedUrl = normalizeDeepLinkParams(fullUrl);
                const parsedUrl = new URL(normalizedUrl);

                if (normalizedUrl.includes('action=bank_update_complete')) {
                    // Traitement du retour de mise à jour de compte bancaire
                    console.log("Retour de mise à jour de compte bancaire détecté");
                    await handleStripeReturn(normalizedUrl);
                    
                    // Afficher l'alerte spécifique à la mise à jour du compte bancaire
                    Alert.alert(
                        t('stripe.bankUpdateSuccess.title'),
                        t('stripe.bankUpdateSuccess.message'),
                        [{ text: 'OK' }]
                    );
                    return;
                }
                
                // Vérifier le host et le schéma
                if (parsedUrl.protocol === 'hushy:' && 
                    (parsedUrl.hostname === 'stripe-return' || parsedUrl.hostname === 'profile' || parsedUrl.hostname === '')) {
                    
                    console.log("Traitement du retour Stripe...");
                    const result = await handleStripeReturn(normalizedUrl);
                    
                    // Définir la clé de stockage
                    const effectiveUserId = userId || (userData && userData._id);
                    const storageKey = effectiveUserId 
                        ? `pendingSecretData_${effectiveUserId}` 
                        : 'pendingSecretData';
                    
                    // Récupérer les données en attente
                    let pendingSecretData = null;
                    
                    try {
                        const pendingDataJson = await AsyncStorage.getItem(storageKey);
                        if (pendingDataJson) {
                            pendingSecretData = JSON.parse(pendingDataJson);
                            console.log("Données de secret en attente trouvées:", pendingSecretData);
                        } else {
                            console.log('Aucune donnée de secret en attente trouvée');
                        }
                    } catch (storageError) {
                        console.error("Erreur lors de la récupération des données en attente:", storageError);
                    }
                    
                    if (result.success) {
                        if (pendingSecretData) {
                            try {
                                console.log("Tentative de publication automatique du secret...");
                                
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
                                        console.log("Ajout des données de localisation au secret:", postData.location);
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
            } catch (error) {
                console.error(t('deepLink.errors.deepLinkError'), error);
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
        Linking.getInitialURL().then(url => {
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