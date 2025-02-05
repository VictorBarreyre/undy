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
      await initStripe({
        publishableKey: {STRIPE_PUBLISHABLE_KEY}
      });

      const { error } = await initPaymentSheet({
        paymentIntentClientSecret: clientSecret,
        merchantDisplayName: 'Undy',
      });

      if (error) {
        Alert.alert('Erreur', error.message);
        onPaymentError(error);
      }
    } catch (error) {
      console.error('Erreur initialisation PaymentSheet:', error);
      onPaymentError(error);
    }
  };

  const handlePayment = async () => {
    try {
      setLoading(true);
      
      // Créer l'intention de paiement
      const response = await fetch(`${DATABASE_URL}/api/secrets/${secret._id}/create-payment-intent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userToken}`,
        },
      });


      
      const { clientSecret } = await response.json();
      
      // Initialiser PaymentSheet avec le clientSecret
      await initializePaymentSheet(clientSecret);

      const responseText = await response.text();
      console.log('Response:', responseText);
      
      const data = JSON.parse(responseText);
      
      // Afficher PaymentSheet
      const { error } = await presentPaymentSheet();

      if (error) {
        Alert.alert('Erreur', error.message);
        onPaymentError(error);
      } else {
        onPaymentSuccess(clientSecret);
      }
    } catch (error) {
      console.error('Erreur paiement:', error);
      onPaymentError(error);
    } finally {
      setLoading(false);
    }
  };

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
            : `Déverrouiller pour ${secret.price || '0.00'} €`}
        </Text>
      </HStack>
    </Pressable>
  );
};

export default PaymentSheet;