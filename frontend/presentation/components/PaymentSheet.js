import React, { useState, useContext } from 'react';
import { Alert, Pressable } from 'react-native';
import { initStripe, useStripe } from '@stripe/stripe-react-native';
import { Box, HStack, Text } from 'native-base';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faUnlock } from '@fortawesome/free-solid-svg-icons';
import { STRIPE_PUBLISHABLE_KEY } from '@env';
import { DATABASE_URL } from '@env';
import { AuthContext } from '../../infrastructure/context/AuthContext';
import { useCardData } from '../../infrastructure/context/CardDataContexte';


const PaymentSheet = ({ secret, onPaymentSuccess, onPaymentError }) => {
    const { initPaymentSheet, presentPaymentSheet } = useStripe();
    const [loading, setLoading] = useState(false);
    const { userToken } = useContext(AuthContext);
    const { purchaseAndAccessConversation } = useCardData();
    const [paymentDetails, setPaymentDetails] = useState(null);


    const getDisplayPrice = (price) => {
        // Calculer les frais : 10% pour le vendeur + 15% de frais de plateforme
        const sellerFee = price * 0.10;
        const platformFee = (price - sellerFee) * 0.15;
        const totalPrice = price + platformFee;
        
        return totalPrice.toFixed(2);
    };
    

    const initializePaymentSheet = async (clientSecret) => {
        try {
            console.log('Début initialisation Stripe');
            console.log(STRIPE_PUBLISHABLE_KEY)
            await initStripe({
                publishableKey: STRIPE_PUBLISHABLE_KEY,
                merchantIdentifier: "merchant.com.anonymous.frontend",
            });
            console.log('Stripe initialisé');

            console.log('Configuration PaymentSheet...');
            const { error } = await initPaymentSheet({
                paymentIntentClientSecret: clientSecret,
                merchantDisplayName: 'Undy',
                returnURL: 'frontend://',
                style: 'alwaysLight',
                appearance: {
                    colors: {
                        primary: '#FF78B2', // Couleur principale
                        background: '#ffffff', // Fond blanc
                        componentBackground: '#ffffff', // Fond des boutons en blanc
                        componentDivider: '#94A3B8', // Couleur des traits de séparation
                        icon: '#94A3B8', // Couleur de la croix de fermeture
                        secondaryText: '#94A3B8', // "Ou payer avec" en gris
                        componentBorder: '#94A3B8' // Bordures des composants
                    },
                    shapes: {
                        borderRadius: 20, // Coins arrondis
                        borderWidth: 1,
                        borderColors: '#94A3B8',
                    },
                },
                applePay: {
                    merchantCountryCode: 'FR',
                },
                googlePay: {
                    merchantCountryCode: 'FR',
                    testEnv: true, // Mettre à false en production
                }
            });

            if (error) {
                console.log('Erreur initPaymentSheet:', error);
                throw error;
            }

            console.log('PaymentSheet initialisé avec succès');
        } catch (error) {
            console.log('Erreur dans initializePaymentSheet:', error);
            throw error;
        }
    };


    const handlePayment = async () => {
        try {
            setLoading(true);
    
            const response = await fetch(`${DATABASE_URL}/api/secrets/${secret._id}/create-payment-intent`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${userToken}`,
                },
            });
    
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(errorText || 'Erreur lors de la création du paiement');
            }
    
           const { 
            clientSecret, 
            paymentId, 
            amount, 
            buyerFees 
        } = await response.json();


        setPaymentDetails(prevDetails => ({
            ...prevDetails,
            buyerFees: buyerFees
        }));
    
            await initializePaymentSheet(clientSecret);
    
            const { error: presentError } = await presentPaymentSheet();
    
            if (presentError) {
                // Différencier les annulations volontaires des autres erreurs
                if (presentError.code === 'Canceled') {
                    // Ne pas traiter comme une erreur si l'utilisateur annule volontairement
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
                    'Erreur de paiement',
                    error.message || 'Une erreur est survenue lors du paiement'
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
                style={

                    { backgroundColor: '#ccc' }
                }
            >
                <HStack alignItems="center" justifyContent="center" space={3}>
                    <Text color="white">Chargement...</Text>
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
                        ? 'Chargement...'
                        : `Déverrouiller pour ${getDisplayPrice(secret?.price || 0)} €`}
                </Text>
            </HStack>
        </Pressable>
    );
};

export default PaymentSheet;