import React, { useState, useContext } from 'react';
import { Alert } from 'react-native';
import { initStripe, useStripe } from '@stripe/stripe-react-native';
import { Box, HStack, Text, Pressable } from 'native-base';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faUnlock } from '@fortawesome/free-solid-svg-icons';
import { STRIPE_PUBLISHABLE_KEY } from '@env';
import { DATABASE_URL } from '@env';
import { AuthContext } from '../../infrastructure/context/AuthContext';



const PaymentSheet = ({ secret, onPaymentSuccess, onPaymentError }) => {
    const { initPaymentSheet, presentPaymentSheet } = useStripe();
    const [loading, setLoading] = useState(false);
    const {userToken} = useContext(AuthContext);
  
    const initializePaymentSheet = async (clientSecret) => {
      try {
        console.log('Début initialisation Stripe');
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
          style: 'alwaysDark',
          appearance: {
            colors: {
              primary: '#FF78B2', // Couleur principale de votre app
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
        console.log('Début du processus de paiement');
        setLoading(true);
  
        if (!secret?._id) {
          throw new Error('Secret invalide');
        }
  
        console.log('Création de l\'intention de paiement...');
        const response = await fetch(`${DATABASE_URL}/api/secrets/${secret._id}/create-payment-intent`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${userToken}`,
          },
        });
  
        if (!response.ok) {
          const errorData = await response.text();
          console.log('Réponse serveur non-ok:', errorData);
          throw new Error(`Erreur serveur: ${errorData}`);
        }
  
        const data = await response.json();
        console.log('Réponse create-payment-intent:', data);
  
        await initializePaymentSheet(data.clientSecret);
        
        console.log('Affichage PaymentSheet...');
        const { error: presentError } = await presentPaymentSheet();
  
        if (presentError) {
          console.log('Erreur presentPaymentSheet:', presentError);
          if (presentError.code === 'Canceled') {
            console.log('Paiement annulé par l\'utilisateur');
            setLoading(false);
            return;
          }
          throw presentError;
        }
  
        console.log('Paiement réussi');
        onPaymentSuccess(data.clientSecret);
  
      } catch (error) {
        console.log('Erreur capturée dans handlePayment:', error);
        Alert.alert(
          'Erreur de paiement',
          error.message || 'Une erreur est survenue lors du paiement'
        );
        onPaymentError(error);
      } finally {
        setLoading(false);
      }
    };
  
    // Retourne un composant chargement si secret est null
    if (!secret) {
      return (
        <Pressable
          disabled={true}
          style={[
            styles.paymentButton,
            { backgroundColor: '#ccc' }
          ]}
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
            backgroundColor: pressed ? 'gray.800' : 'black',
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
              : `Déverrouiller pour ${secret?.price || '0.00'} €`}
          </Text>
        </HStack>
      </Pressable>
    );
  };
  
  export default PaymentSheet;