import React, { useState, useEffect } from 'react';
import { Actionsheet, Text, VStack, Box, HStack, Button } from 'native-base';
import { Platform, Alert } from 'react-native';
import { useStripe } from '@stripe/stripe-react-native';
import { styles } from '../../infrastructure/theme/styles';
import { getAxiosInstance } from '../../data/api/axiosInstance';

const EarningsActionSheet = ({ 
    isOpen, 
    onClose, 
    userData, 
    isConfigured, 
    navigation 
}) => {
    const [transactions, setTransactions] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const { initPaymentSheet, presentPaymentSheet } = useStripe();

    useEffect(() => {
        const fetchTransactions = async () => {
            const instance = getAxiosInstance();
            try {
                setIsLoading(true);
                const response = await instance.get('/api/users/transactions', {
                    headers: {
                        Authorization: `Bearer ${userData.token}`,
                    },
                    params: {
                        stripeAccountId: userData.stripeAccountId
                    }
                });
                setTransactions(response.data);
                setIsLoading(false);
            } catch (error) {
                console.error('Erreur lors de la récupération des transactions :', error);
                setIsLoading(false);
            }
        };

        if (isOpen && isConfigured) {
            fetchTransactions();
        }
    }, [isOpen, isConfigured, userData.token, userData.stripeAccountId]);

    const handleTransferFunds = async () => {
        const instance = getAxiosInstance();
        try {
            const totalEarnings = transactions.reduce((total, transaction) => total + transaction.amount, 0);

            const response = await instance.post('/api/users/create-transfer-intent', {
                amount: totalEarnings,
                stripeAccountId: userData.stripeAccountId
            }, {
                headers: {
                    Authorization: `Bearer ${userData.token}`,
                },
            });

            const { clientSecret } = response.data;

            const { error } = await initPaymentSheet({
                paymentIntentClientSecret: clientSecret,
            });

            if (error) {
                console.error('Erreur lors de l\'initialisation du formulaire de paiement :', error);
                return;
            }

            const { error: presentError } = await presentPaymentSheet();

            if (presentError) {
                console.error('Erreur lors de la présentation du formulaire de paiement :', presentError);
                return;
            }

            console.log('Virement effectué avec succès !');
            onClose();
        } catch (error) {
            console.error('Erreur lors du virement des fonds :', error);
        }
    };

    return (
        <Actionsheet isOpen={isOpen} onClose={onClose}>
            <Actionsheet.Content 
                backgroundColor="white"
                maxHeight="100%"
                _content={{
                    py: 0,  // Supprime le padding vertical
                    px: 6  
                }}
            >
                {!isConfigured ? (
                    <VStack space={4} px={4} width="97%" alignItems="center">
                        <Text style={styles.h4} textAlign="center">
                            Détails des revenus
                        </Text>
                        <Text 
                            style={styles.caption} 
                            color="#94A3B8" 
                            textAlign="center" 
                            mb={2}
                        >
                            Vous n'avez pas encore généré de revenus. Commencez à vendre vos secrets pour gagner de l'argent.
                        </Text>
                        <Button
                            onPress={() => {
                                onClose();
                                navigation.navigate('AddSecret');
                            }}
                            backgroundColor="black"
                            borderRadius="full"
                        >
                            <Text color="white" style={styles.cta}>
                                Publier un secret
                            </Text>
                        </Button>
                    </VStack>
                ) : (
                    <VStack space={4} width="97%" >
                        <Text style={styles.h4} textAlign="center">
                            Détails des revenus
                        </Text>
                        <Box mb={2} width="100%">
                            {isLoading ? (
                                <Text textAlign="center">Chargement des transactions...</Text>
                            ) : (
                                <>
                                    {transactions.map((transaction) => (
                                        <VStack
                                            key={transaction.id}
                                            mb={4}
                                            width="100%"
                                        >
                                            <HStack
                                                space={4}
                                                justifyContent='space-between'
                                                width="100%"
                                                paddingTop={4}
                                                paddingBottom={4}
                                                px={1}
                                                borderBottomWidth={1}
                                                borderColor={"#94A3B820"}
                                            >
                                                <VStack>
                                                    <Text>Montant brut : {(transaction.grossAmount || 0).toFixed(2)} €</Text>
                                                    <Text>Frais : {(transaction.fees || 0).toFixed(2)} €</Text>
                                                    <Text fontWeight="bold">Montant net : {(transaction.netAmount || 0).toFixed(2)} €</Text>
                                                </VStack>
                                                <Text>{transaction.date}</Text>
                                            </HStack>
                                        </VStack>
                                    ))}
                                    <Text mt={4} style={styles.h4} textAlign="center">
                                        Total des revenus : {userData.totalEarnings} €
                                    </Text>
                                </>
                            )}
                        </Box>
                        <Button
                            backgroundColor="black"
                            onPress={handleTransferFunds}
                            borderRadius="full"
                            py={3}
                            _pressed={{
                                backgroundColor: "gray.800"
                            }}
                        >
                            <Text color="white" style={styles.cta}>
                                Récupérer les fonds
                            </Text>
                        </Button>
                    </VStack>
                )}
            </Actionsheet.Content>
        </Actionsheet>
    );
};

export default EarningsActionSheet;