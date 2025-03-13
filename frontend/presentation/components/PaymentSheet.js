import React, { useState, useContext, useEffect } from 'react';
import { Alert, Pressable, Platform } from 'react-native';
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
    const [applePaySupported, setApplePaySupported] = useState(false);
    const isDevMode = __DEV__;

    const logDiagnostics = async () => {
        // Diagnostic fonction supprimée
    };

    useEffect(() => {
        const checkApplePaySupport = async () => {
            try {
                await initStripe({
                    publishableKey: STRIPE_PUBLISHABLE_KEY,
                    merchantIdentifier: "merchant.com.hushy.payments",
                    urlScheme: "hushy",
                });
                
                if (Platform.OS === 'ios') {
                    if (typeof isPlatformPaySupported === 'function') {
                        const supported = await isPlatformPaySupported();
                        setApplePaySupported(supported);
                        
                        if (!supported && !isDevMode) {
                            setApplePaySupported(true);
                        }
                    }
                }
            } catch (error) {
                // Gestion silencieuse des erreurs
            }
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
                const forceApplePay = !isDevMode;
                const shouldEnableApplePay = applePaySupported || forceApplePay;
                
                if (shouldEnableApplePay) {
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
                }
            }
            
            // Ajouter Google Pay pour Android
            if (Platform.OS === 'android') {
                paymentSheetConfig.googlePay = {
                    merchantCountryCode: 'FR',
                    testEnv: isDevMode
                };
            }
            
            const { error } = await initPaymentSheet(paymentSheetConfig);

            if (error) {
                throw error;
            }
        } catch (error) {
            throw error;
        }
    };

    const handlePayment = async () => {
        try {
            setLoading(true);
            
            // Vérifier que secret existe et a un _id
            if (!secret || !secret._id) {
                throw new Error(t('paymentSheet.errors.invalidSecretData'));
            }
    
            const response = await fetch(`${DATABASE_URL}/api/secrets/${secret._id}/create-payment-intent`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${userToken}`,
                },
            });
    
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(errorText || t('paymentSheet.errors.paymentCreationError'));
            }
    
            const data = await response.json();
            const { clientSecret, paymentId } = data;
            
            // Réinitialiser Stripe pour s'assurer que tout est frais
            await initStripe({
                publishableKey: STRIPE_PUBLISHABLE_KEY,
                merchantIdentifier: "merchant.com.hushy.payments",
                urlScheme: "hushy",
            });
            
            await initializePaymentSheet(clientSecret);
    
            const { error: presentError } = await presentPaymentSheet();
    
            if (presentError) {
                // Différencier les annulations volontaires des autres erreurs
                if (presentError.code === 'Canceled') {
                    return;
                }
                throw presentError;
            }
    
            // Uniquement appeler onPaymentSuccess si le paiement est réellement effectué
            onPaymentSuccess(paymentId);
    
        } catch (error) {
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