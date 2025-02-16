import React, { useState, useEffect } from 'react';
import { Actionsheet, Text, VStack, Box, HStack, Button } from 'native-base';
import { ScrollView, Alert } from 'react-native';
import { useStripe } from '@stripe/stripe-react-native';
import { styles } from '../../infrastructure/theme/styles';
import { getAxiosInstance } from '../../data/api/axiosInstance';

const EarningsActionSheet = ({
    isOpen,
    onClose,
    userData,
    navigation
}) => {
    const [transactions, setTransactions] = useState([]);
    const [transactionStats, setTransactionStats] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const { initPaymentSheet, presentPaymentSheet } = useStripe();

    const isConfigured = userData?.stripeAccountStatus === 'active' &&
        userData?.stripeAccountId &&
        userData?.stripeOnboardingComplete;


    useEffect(() => {
        const fetchTransactions = async () => {
            const instance = getAxiosInstance();
            try {
                setIsLoading(true);
                const response = await instance.get('/api/users/transactions');
                const data = response.data;

                setTransactionStats(data.stats);
                setTransactions(data.transactions);

            } catch (error) {
                console.error('Erreur:', error);
            } finally {
                setIsLoading(false);
            }
        };

        if (isOpen && isConfigured) {
            fetchTransactions();
        }
    }, [isOpen, isConfigured]);


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

                        {isLoading ? (
                            <Text textAlign="center">Chargement des transactions...</Text>
                        ) : (
                            <>
                                <ScrollView
                                    maxHeight={400}
                                    width="100%"
                                    showsVerticalScrollIndicator={true}
                                >

                                    {transactions.map((transaction) => (
                                        <VStack
                                            key={transaction.id}
                                            mb={4}
                                            width="100%"
                                        >
                                            <Box
                                                width="100%"
                                                padding={4}
                                                borderBottomWidth={1}
                                                borderColor="#94A3B820"
                                            >
                                                <HStack justifyContent="space-between" alignItems="center" mb={2}>
                                                    <Text fontWeight="bold" color="#94A3B8">
                                                        {transaction.type === 'transfer' ? 'Transfert' : 'Vente'}
                                                    </Text>
                                                    <Text color={transaction.status === 'succeeded' ? '#40D861' : '#FF78B2'}>
                                                        {transaction.status === 'succeeded' ? 'Réussi' : 'En attente'}
                                                    </Text>
                                                </HStack>

                                                <HStack justifyContent="space-between" alignItems="flex-start">
                                                    <VStack space={2}>
                                                        <Text color="#94A3B8">Montant brut</Text>
                                                        <Text color="#94A3B8">Frais</Text>
                                                        <Text fontWeight="bold">Montant net</Text>
                                                    </VStack>

                                                    <VStack space={2} alignItems="flex-end">
                                                        <Text>{(transaction.grossAmount || 0).toFixed(2)} €</Text>
                                                        <Text color="#FF78B2">-{(transaction.fees || 0).toFixed(2)} €</Text>
                                                        <Text fontWeight="bold" color="#40D861">
                                                            {(transaction.netAmount || 0).toFixed(2)} €
                                                        </Text>
                                                    </VStack>
                                                </HStack>

                                                <HStack justifyContent="space-between" alignItems="center" mt={3}>
                                                    <Text style={styles.caption} color="#94A3B8">
                                                        {transaction.date}
                                                    </Text>
                                                    {transaction.description && (
                                                        <Text style={styles.caption} color="#94A3B8" numberOfLines={1}>
                                                            {transaction.description}
                                                        </Text>
                                                    )}
                                                </HStack>
                                            </Box>
                                        </VStack>
                                    ))}
                                </ScrollView>

                                {/* Résumé des revenus */}
                                <Box
                                    mt={4}
                                    p={4}
                                    bg="gray.50"
                                    rounded="lg"
                                    borderWidth={1}
                                    borderColor="#94A3B820"
                                >
                                    <VStack space={3}>
                                        <HStack justifyContent="space-between">
                                            <Text style={styles.caption}>Total gagné</Text>
                                            <Text fontWeight="bold">
                                                {(transactionStats.totalEarnings || 0).toFixed(2)} €
                                            </Text>
                                        </HStack>

                                        <HStack justifyContent="space-between">
                                            <Text style={styles.caption}>Disponible</Text>
                                            <Text color="#40D861">
                                                {(transactionStats.availableBalance || 0).toFixed(2)} €
                                            </Text>
                                        </HStack>

                                        <HStack justifyContent="space-between">
                                            <Text style={styles.caption}>En attente</Text>
                                            <Text color="#FF78B2">
                                                {(transactionStats.pendingBalance || 0).toFixed(2)} €
                                            </Text>
                                        </HStack>
                                    </VStack>
                                </Box>
                                <Text mt={2} mb={2} style={styles.h4} textAlign="center">
                                    Revenus disponibles : {userData.totalEarnings} €
                                </Text>
                            </>
                        )}

                        <Button
                            backgroundColor={!transactionStats.availableBalance || transactionStats.availableBalance <= 0 ? '#94A3B8' : 'black'}
                            onPress={handleTransferFunds}
                            borderRadius="full"
                            py={3}
                            isDisabled={!transactionStats.availableBalance || transactionStats.availableBalance <= 0}
                            _pressed={{
                                backgroundColor: "gray.800"
                            }}
                        >
                            <Text
                                color="white"
                                style={styles.cta}
                                
                            >
                                {!transactionStats.availableBalance || transactionStats.availableBalance <= 0
                                    ? "Aucun fonds disponible"
                                    : "Récupérer les fonds"
                                }
                            </Text>
                        </Button>
                    </VStack>
                )}
            </Actionsheet.Content>
        </Actionsheet>
    );
};

export default EarningsActionSheet;