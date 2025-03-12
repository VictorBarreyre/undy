import React, { useState, useContext, useEffect } from 'react';
import { Alert, Pressable, Platform, NativeModules } from 'react-native';
import { initStripe, useStripe } from '@stripe/stripe-react-native';
import { HStack, Text } from 'native-base';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faUnlock } from '@fortawesome/free-solid-svg-icons';
import { STRIPE_PUBLISHABLE_KEY } from '@env';
import { DATABASE_URL } from '@env';
import { AuthContext } from '../../infrastructure/context/AuthContext';
import { useCardData } from '../../infrastructure/context/CardDataContexte';
import { useTranslation } from 'react-i18next';
import DeviceInfo from 'react-native-device-info';

const PaymentSheet = ({ secret, onPaymentSuccess, onPaymentError }) => {
    const { t } = useTranslation();
    const stripeObj = useStripe();
    const { initPaymentSheet, presentPaymentSheet, isPlatformPaySupported } = stripeObj;
    const [loading, setLoading] = useState(false);
    const { userToken } = useContext(AuthContext);
    const { purchaseAndAccessConversation } = useCardData();
    const [paymentDetails, setPaymentDetails] = useState(null);
    const [applePaySupported, setApplePaySupported] = useState(false);
    const isDevMode = __DEV__;

    console.log("STRIPE_PUBLISHABLE_KEY réellement utilisée:", STRIPE_PUBLISHABLE_KEY);


    // Obtenir la version de Stripe pour le diagnostic
    useEffect(() => {
        try {
            const stripeVersion = require('@stripe/stripe-react-native/package.json').version;
            console.log("Version de Stripe React Native:", stripeVersion);
        } catch (e) {
            console.log("Impossible de déterminer la version de Stripe:", e.message);
        }
    }, []);

    // Fonction de diagnostic complète
    const logDiagnostics = async () => {
        console.log("\n\n======== DIAGNOSTIC COMPLET APPLEPAY ========");
        console.log(`Environnement: ${isDevMode ? 'DÉVELOPPEMENT' : 'PRODUCTION'}`);
        console.log(`Plateforme: ${Platform.OS} v${Platform.Version}`);
        
        if (Platform.OS === 'ios') {
            // Utiliser DeviceInfo pour récupérer le vrai Bundle ID
            const bundleId = await DeviceInfo.getBundleId();
            console.log("Bundle ID:", bundleId);
            console.log("Clé Stripe (premiers caractères):", STRIPE_PUBLISHABLE_KEY?.substring(0, 10) + "...");
            console.log("Identifiant marchand configuré: merchant.com.hushy.payments");
            
            // Lister les méthodes disponibles dans l'objet useStripe()
            console.log("Méthodes disponibles dans useStripe:", Object.keys(stripeObj).join(", "));
        } else {
            console.log("Non sur iOS, Apple Pay non applicable");
            return;
        }
        
        console.log("\n>>> INITIALISATION STRIPE ET VÉRIFICATION APPLEPAY");
        try {
            console.log("Tentative d'initialisation Stripe...");
            await initStripe({
                publishableKey: STRIPE_PUBLISHABLE_KEY,
                merchantIdentifier: "merchant.com.hushy.payments",
                urlScheme: "hushy",
            });
            console.log("✓ Initialisation Stripe réussie");
            
            if (typeof isPlatformPaySupported !== 'function') {
                console.log("⚠️ ERREUR: Fonction isPlatformPaySupported non disponible!");
                return;
            }
            
            console.log("Vérification support Apple Pay...");
            const applePaySupport = await isPlatformPaySupported();
            console.log(`Support Apple Pay: ${applePaySupport ? 'OUI' : 'NON'}`);
            
        } catch (initError) {
            console.log("⚠️ ÉCHEC initialisation Stripe ou vérification Apple Pay:");
            console.log(`Message: ${initError.message}`);
            console.log(`Code: ${initError.code}`);
            console.log(`Stack: ${initError.stack}`);
        }
        console.log("==============================================\n\n");
    };

    // Diagnostic initial au chargement
    useEffect(() => {
        logDiagnostics();
    }, []);

    // Vérifier si Apple Pay est disponible au chargement du composant
    useEffect(() => {
        const checkApplePaySupport = async () => {
            console.log("\n>>> DÉMARRAGE VÉRIFICATION APPLE PAY");
            
            try {
                console.log("Initialisation Stripe pour vérification Apple Pay...");
                await initStripe({
                    publishableKey: STRIPE_PUBLISHABLE_KEY,
                    merchantIdentifier: "merchant.com.hushy.payments",
                    urlScheme: "hushy",
                });
                console.log("Stripe initialisé avec succès pour la vérification");
                
                if (Platform.OS === 'ios') {
                    // Utiliser isPlatformPaySupported au lieu de canMakePaymentsAsync
                    console.log("Vérification si Apple Pay est supporté avec isPlatformPaySupported...");
                    if (typeof isPlatformPaySupported === 'function') {
                        const supported = await isPlatformPaySupported();
                        console.log(`Résultat support Apple Pay: ${supported ? 'SUPPORTÉ' : 'NON SUPPORTÉ'}`);
                        setApplePaySupported(supported);
                        
                        if (!supported) {
                            console.log("⚠️ Apple Pay n'est pas supporté sur cet appareil");
                            if (!isDevMode) {
                                console.log("REMARQUE: Comme nous sommes en production, nous allons essayer de forcer Apple Pay");
                                setApplePaySupported(true);
                                console.log("Support Apple Pay forcé à TRUE en mode production");
                            }
                        }
                    } else {
                        console.log("⚠️ isPlatformPaySupported n'est pas une fonction disponible");
                        console.log("Méthodes disponibles:", Object.keys(stripeObj).join(", "));
                    }
                } else {
                    console.log("Apple Pay n'est pas disponible (non iOS)");
                    console.log(`Plateforme: ${Platform.OS}`);
                }
            } catch (error) {
                console.log("⚠️ ERREUR lors de la vérification du support Apple Pay:");
                console.log(`Message: ${error.message}`);
                console.log(`Code: ${error.code}`);
                console.log(`Stack: ${error.stack}`);
            }
            
            console.log("<<< FIN VÉRIFICATION APPLE PAY\n");
        };
        
        checkApplePaySupport();
    }, []);

    const getDisplayPrice = (price) => {
        // 1. Frais de plateforme sur le prix du vendeur (10%)
        const platformFeeOnSellerPrice = price * 0.10;
        
        // 2. Montant net pour le vendeur
        const sellerNetAmount = price - platformFeeOnSellerPrice;
        
        // 3. Frais supplémentaires (15% sur le montant net)
        const additionalPlatformFee = sellerNetAmount * 0.15;
        
        // 4. Prix total pour l'acheteur
        const totalPrice = price + additionalPlatformFee;
        
        return totalPrice.toFixed(2);
    };

    const initializePaymentSheet = async (clientSecret) => {
        try {
            console.log("\n>>> DÉBUT INITIALISATION PAYMENTSHEET");
            
            // Configuration de base pour la feuille de paiement
            const paymentSheetConfig = {
                paymentIntentClientSecret: clientSecret,
                merchantDisplayName: 'Hushy',
                returnURL: `hushy://payment-result`,
                style: 'alwaysLight',
                appearance: {
                    colors: {
                        primary: '#000000',
                        primaryText: '#FFFFFF',
                        background: '#ffffff',
                        componentBackground: '#ffffff',
                        componentDivider: '#94A3B8',
                        icon: '#94A3B8',
                        secondaryText: '#94A3B8',
                        componentBorder: '#94A3B8'
                    },
                    shapes: {
                        borderRadius: 20,
                        borderWidth: 1,
                        borderColors: '#94A3B8',
                    },
                }
            };
            
            // Ajouter la configuration Apple Pay
            if (Platform.OS === 'ios') {
                // En mode production, toujours activer Apple Pay
                // En mode développement, l'activer uniquement si détecté comme supporté
                const forceApplePay = !isDevMode;
                const shouldEnableApplePay = applePaySupported || forceApplePay;
                
                console.log(`Configuration Apple Pay - Statut:`);
                console.log(`- Mode: ${isDevMode ? 'Développement' : 'Production'}`);
                console.log(`- Support détecté: ${applePaySupported ? 'OUI' : 'NON'}`);
                console.log(`- Forçage activé: ${forceApplePay ? 'OUI' : 'NON'}`);
                console.log(`- Activation finale: ${shouldEnableApplePay ? 'OUI' : 'NON'}`);
                
                if (shouldEnableApplePay) {
                    console.log("Ajout de la configuration Apple Pay au PaymentSheet");
                    
                    // Configuration originale qui fait apparaître le bouton
                    paymentSheetConfig.applePay = {
                        merchantCountryCode: 'FR',
                        presentationOptions: {
                            requiredBillingContactFields: ['emailAddress', 'name'],
                        }
                    };
                    paymentSheetConfig.applePayEnabled = true;
                    
                    // Ajouter aussi la nouvelle configuration au cas où
                    paymentSheetConfig.platformPay = {
                        merchantCountryCode: 'FR',
                        applePay: {
                            merchantIdentifier: "merchant.com.hushy.payments",
                            presentationOptions: {
                                requiredBillingContactFields: ['emailAddress', 'name'],
                            }
                        }
                    };
                    
                    console.log("✓ Configuration Apple Pay ajoutée avec succès");
                } else {
                    console.log("⚠️ Apple Pay non configuré car non supporté");
                }
            } else {
                console.log("Non iOS, pas de configuration Apple Pay");
            }
            
            // Ajouter Google Pay pour Android
            if (Platform.OS === 'android') {
                console.log("Ajout de la configuration Google Pay pour Android");
                paymentSheetConfig.googlePay = {
                    merchantCountryCode: 'FR',
                    testEnv: isDevMode
                };
            }
            
            console.log("Configuration finale PaymentSheet:");
            console.log(JSON.stringify(paymentSheetConfig, null, 2));
            
            console.log("Initialisation de la feuille de paiement...");
            const { error } = await initPaymentSheet(paymentSheetConfig);

            if (error) {
                console.log("⚠️ ERREUR initialisation PaymentSheet:");
                console.log(`Message: ${error.message}`);
                console.log(`Code: ${error.code}`);
                console.log(JSON.stringify(error, null, 2));
                throw error;
            }

            console.log("✓ PaymentSheet initialisé avec succès");
            console.log("<<< FIN INITIALISATION PAYMENTSHEET\n");
        } catch (error) {
            console.log("⚠️ ERREUR FATALE initialisation PaymentSheet:");
            console.log(`Message: ${error.message}`);
            console.log(`Code: ${error.code}`);
            console.log(`Stack: ${error.stack}`);
            throw error;
        }
    };

    const handlePayment = async () => {
        try {
            setLoading(true);
            console.log("\n>>> DÉBUT PROCESSUS DE PAIEMENT");
            
            // Vérifier que secret existe et a un _id
            if (!secret || !secret._id) {
                console.log("⚠️ Données secret invalides:", secret);
                throw new Error(t('paymentSheet.errors.invalidSecretData'));
            }
    
            console.log(`Création d'intention de paiement pour le secret: ${secret._id}`);
            const response = await fetch(`${DATABASE_URL}/api/secrets/${secret._id}/create-payment-intent`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${userToken}`,
                },
            });
    
            if (!response.ok) {
                const errorText = await response.text();
                console.log(`⚠️ Échec API avec statut: ${response.status}`);
                console.log(`Réponse d'erreur: ${errorText}`);
                throw new Error(errorText || t('paymentSheet.errors.paymentCreationError'));
            }
    
            console.log("Réponse API reçue avec succès");
            const data = await response.json();
            const { clientSecret, paymentId, buyerTotal } = data;

            console.log(`Client secret reçu pour le paiement ID: ${paymentId}`);
            console.log(`Structure des données reçues: ${Object.keys(data).join(', ')}`);
            
            // Réinitialiser Stripe pour s'assurer que tout est frais
            console.log("Réinitialisation de Stripe avant présentation de la feuille de paiement");
            await initStripe({
                publishableKey: STRIPE_PUBLISHABLE_KEY,
                merchantIdentifier: "merchant.com.hushy.payments",
                urlScheme: "hushy",
            });
            
            await initializePaymentSheet(clientSecret);
    
            console.log("Présentation de la feuille de paiement à l'utilisateur");
            const { error: presentError } = await presentPaymentSheet();
    
            if (presentError) {
                console.log("⚠️ Erreur présentation PaymentSheet:");
                console.log(`Message: ${presentError.message}`);
                console.log(`Code: ${presentError.code}`);
                console.log(JSON.stringify(presentError, null, 2));
                
                // Différencier les annulations volontaires des autres erreurs
                if (presentError.code === 'Canceled') {
                    console.log("Paiement annulé par l'utilisateur - ce n'est pas une erreur");
                    return;
                }
                throw presentError;
            }
    
            console.log("✓ Paiement complété avec succès");
            // Uniquement appeler onPaymentSuccess si le paiement est réellement effectué
            onPaymentSuccess(paymentId);
            console.log("<<< FIN PROCESSUS DE PAIEMENT\n");
    
        } catch (error) {
            console.log("⚠️ ERREUR dans le processus de paiement:");
            console.log(`Message: ${error.message}`);
            console.log(`Code: ${error.code}`);
            console.log(`Stack: ${error.stack}`);
            
            // Ne pas afficher d'alerte si c'est une annulation volontaire
            if (error.code !== 'Canceled') {
                Alert.alert(
                    t('paymentSheet.errors.paymentErrorTitle'),
                    error.message || t('paymentSheet.errors.paymentErrorMessage')
                );
                onPaymentError(error);
            }
        } finally {
            setLoading(false);
        }
    };

    // Retourne un composant chargement si secret est null
    if (!secret) {
        return (
            <Pressable
                disabled={true}
                style={{ backgroundColor: '#ccc', padding: 18, borderRadius: 30, width: '100%', alignSelf: 'center' }}
            >
                <HStack alignItems="center" justifyContent="center" space={3}>
                    <Text color="white">{t('paymentSheet.loading')}</Text>
                </HStack>
            </Pressable>
        );
    }

    return (
        <Pressable
            onPress={handlePayment}
            disabled={loading}
            style={({ pressed }) => [
                {
                    backgroundColor: pressed ? '#1F2937' : '#000000',
                    transform: pressed ? [{ scale: 0.96 }] : [{ scale: 1 }],
                },
                { width: '100%', alignSelf: 'center', padding: 18, borderRadius: 30 },
            ]}
        >
            <HStack alignItems="center" justifyContent="center" space={3}>
                <FontAwesomeIcon icon={faUnlock} size={18} color="white" />
                <Text fontSize="md" color="white" fontWeight="bold">
                    {loading
                        ? t('paymentSheet.loading')
                        : t('paymentSheet.unlockForPrice', { price: getDisplayPrice(secret?.price || 0) })}
                </Text>
            </HStack>
        </Pressable>
    );
};

export default PaymentSheet;