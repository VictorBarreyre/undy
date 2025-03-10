import React, { useState, useContext, useEffect } from 'react';
import { Alert, Pressable, Platform } from 'react-native';
import { initStripe, useStripe, canMakePayments } from '@stripe/stripe-react-native';
import { HStack, Text } from 'native-base';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faUnlock } from '@fortawesome/free-solid-svg-icons';
import { STRIPE_PUBLISHABLE_KEY } from '@env';
import { DATABASE_URL } from '@env';
import { AuthContext } from '../../infrastructure/context/AuthContext';
import { useCardData } from '../../infrastructure/context/CardDataContexte';
import { useTranslation } from 'react-i18next';

const PaymentSheet = ({ secret, onPaymentSuccess, onPaymentError }) => {
    const { t } = useTranslation();
    const { initPaymentSheet, presentPaymentSheet } = useStripe();
    const [loading, setLoading] = useState(false);
    const { userToken } = useContext(AuthContext);
    const { purchaseAndAccessConversation } = useCardData();
    const [paymentDetails, setPaymentDetails] = useState(null);
    const [applePaySupported, setApplePaySupported] = useState(false);

    // Vérifier si Apple Pay est disponible au chargement du composant
    useEffect(() => {
        const checkApplePaySupport = async () => {
            try {
                // Initialiser Stripe avant de vérifier Apple Pay
                await initStripe({
                    publishableKey: STRIPE_PUBLISHABLE_KEY,
                    merchantIdentifier: "merchant.com.hushy.payments",
                    urlScheme: "hushy",
                });
                
                // Vérifier si Apple Pay est supporté
                if (Platform.OS === 'ios' && typeof canMakePayments === 'function') {
                    const isSupported = await canMakePayments();
                    console.log(t('paymentSheet.logs.applePaySupported'), isSupported);
                    setApplePaySupported(isSupported);
                    
                    if (isSupported) {
                        // Vérifier les capacités spécifiques
                        try {
                            const details = await canMakePayments({
                                networks: ['visa', 'mastercard'],
                                capabilities: ['3ds']
                            });
                            console.log(t('paymentSheet.logs.applePayDetails'), details);
                        } catch (detailsError) {
                            console.log(t('paymentSheet.errors.applePayDetailsError'), detailsError);
                        }
                    }
                } else {
                    console.log(t('paymentSheet.logs.applePayUnavailable'));
                }
            } catch (error) {
                console.log(t('paymentSheet.errors.applePayCheckError'), error);
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
            console.log(t('paymentSheet.logs.initializationStart'));
            
            // On suppose que Stripe est déjà initialisé dans l'useEffect
            
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
            
            // Ajouter la configuration Apple Pay uniquement si supporté
            if (Platform.OS === 'ios' && applePaySupported) {
                paymentSheetConfig.applePay = {
                    merchantCountryCode: 'FR'
                };
                paymentSheetConfig.applePayEnabled = true;
            } else {
                console.log(t('paymentSheet.logs.applePayNotConfigured'));
            }
            
            // Ajouter Google Pay pour Android
            if (Platform.OS === 'android') {
                paymentSheetConfig.googlePay = {
                    merchantCountryCode: 'FR',
                    testEnv: true
                };
            }
            
            console.log(t('paymentSheet.logs.paymentSheetConfig'), JSON.stringify(paymentSheetConfig, null, 2));
            
            const { error } = await initPaymentSheet(paymentSheetConfig);

            if (error) {
                console.log(t('paymentSheet.errors.initPaymentSheetError'), JSON.stringify(error, null, 2));
                throw error;
            }

            console.log(t('paymentSheet.logs.initializationSuccess'));
        } catch (error) {
            console.log(t('paymentSheet.errors.initializationError'), error);
            throw error;
        }
    };

    const handlePayment = async () => {
        try {
            setLoading(true);
            console.log(t('paymentSheet.logs.paymentProcessStart'));
            
            // Vérifier que secret existe et a un _id
            if (!secret || !secret._id) {
                throw new Error(t('paymentSheet.errors.invalidSecretData'));
            }
    
            console.log(t('paymentSheet.logs.creatingPaymentIntent', { secretId: secret._id }));
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
    
            console.log(t('paymentSheet.logs.apiResponseReceived'));
            const { 
                clientSecret, 
                paymentId, 
                buyerTotal 
            } = await response.json();

            console.log(t('paymentSheet.logs.clientSecretReceived', { paymentId }));
            
            // Réinitialiser Stripe pour s'assurer que tout est frais
            await initStripe({
                publishableKey: STRIPE_PUBLISHABLE_KEY,
                merchantIdentifier: "merchant.com.hushy.payments",
                urlScheme: "hushy",
            });
            
            await initializePaymentSheet(clientSecret);
    
            console.log(t('paymentSheet.logs.presentingPaymentSheet'));
            const { error: presentError } = await presentPaymentSheet();
    
            if (presentError) {
                console.log(t('paymentSheet.errors.presentationError'), JSON.stringify(presentError, null, 2));
                
                // Différencier les annulations volontaires des autres erreurs
                if (presentError.code === 'Canceled') {
                    console.log(t('paymentSheet.logs.paymentCanceled'));
                    return;
                }
                throw presentError;
            }
    
            console.log(t('paymentSheet.logs.paymentSuccess'));
            // Uniquement appeler onPaymentSuccess si le paiement est réellement effectué
            onPaymentSuccess(paymentId);
    
        } catch (error) {
            console.log(t('paymentSheet.errors.handlePaymentError'), error);
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