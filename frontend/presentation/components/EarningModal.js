import React, { useState, useEffect } from 'react';
import { Actionsheet, Text, VStack, Box, HStack, Button } from 'native-base';
import { ScrollView, Alert } from 'react-native';
import { useStripe } from '@stripe/stripe-react-native';
import { styles } from '../../infrastructure/theme/styles';
import { getAxiosInstance } from '../../data/api/axiosInstance';
import { useTranslation } from 'react-i18next';

const EarningsActionSheet = ({
    isOpen,
    onClose,
    userData,
    navigation
}) => {
    const { t } = useTranslation();
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

                console.log(t('earnings.logs.allData'), data);

                // Filtrer uniquement les transactions de type 'payment' et avec netAmount positif
                const totalEarnings = data.transactions
                    .filter(transaction => transaction.type === 'payment')
                    .reduce((total, transaction) =>
                        total + (transaction.netAmount || 0), 0);

                console.log(t('earnings.logs.totalMoney'), totalEarnings);

                setTransactionStats({
                    ...data.stats,
                    totalEarnings: totalEarnings
                });

                setTransactions(data.transactions);

            } catch (error) {
                console.error(t('earnings.errors.generic'), error);
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
        // Vérifier qu'il y a un montant disponible
        if (!transactionStats.availableBalance || transactionStats.availableBalance <= 0) {
            Alert.alert(
                t('earnings.error'),
                t('earnings.noAvailableFunds'),
                [{ text: t('earnings.ok') }]
            );
            return;
        }

        // Afficher une confirmation avant le transfert
        Alert.alert(
            t('earnings.confirmTransfer'),
            t('earnings.confirmTransferMessage', { amount: transactionStats.availableBalance.toFixed(2) }),
            [
                {
                    text: t('earnings.cancel'),
                    style: 'cancel'
                },
                {
                    text: t('earnings.confirm'),
                    onPress: async () => {
                        try {
                            // Créer le payout
                            const response = await instance.post('/api/users/create-transfer-intent', {
                                amount: transactionStats.availableBalance
                            });

                            if (response.data.success) {
                                Alert.alert(
                                    t('earnings.success'),
                                    t('earnings.transferSuccessMessage', { 
                                        amount: response.data.amount,
                                        arrivalDate: new Date(response.data.arrivalDate * 1000).toLocaleDateString()
                                    }),
                                    [{ 
                                        text: t('earnings.ok'),
                                        onPress: () => {
                                            onClose();
                                            // Optionnel : rafraîchir les données
                                            fetchTransactions();
                                        }
                                    }]
                                );
                            }
                        } catch (error) {
                            console.error(t('earnings.errors.transferFunds'), error);
                            
                            // Gestion des erreurs spécifiques
                            let errorMessage = t('earnings.errors.generic');
                            
                            if (error.response?.data?.code === 'INSUFFICIENT_FUNDS') {
                                errorMessage = t('earnings.errors.insufficientFunds');
                            } else if (error.response?.data?.code === 'INVALID_BANK_ACCOUNT') {
                                errorMessage = t('earnings.errors.noBankAccount');
                            } else if (error.response?.data?.message) {
                                errorMessage = error.response.data.message;
                            }
                            
                            Alert.alert(
                                t('earnings.error'),
                                errorMessage,
                                [{ text: t('earnings.ok') }]
                            );
                        }
                    }
                }
            ]
        );
    } catch (error) {
        console.error(t('earnings.errors.transferFunds'), error);
        Alert.alert(
            t('earnings.error'),
            t('earnings.errors.generic'),
            [{ text: t('earnings.ok') }]
        );
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
                            {t('earnings.title')}
                        </Text>
                        <Text
                            style={styles.caption}
                            color="#94A3B8"
                            textAlign="center"
                            mb={2}
                        >
                            {t('earnings.noEarningsYet')}
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
                                {t('earnings.publishSecret')}
                            </Text>
                        </Button>
                    </VStack>
                ) : (
                    <VStack space={4} width="97%" >
                        <Text style={styles.h4} textAlign="center">
                            {t('earnings.title')}
                        </Text>

                        {isLoading ? (
                            <Text textAlign="center">{t('earnings.loadingTransactions')}</Text>
                        ) : (
                            <>
                                <ScrollView
                                    maxHeight={400}
                                    width="100%"
                                    showsVerticalScrollIndicator={true}
                                >

                                    {transactions.map((transaction, index) => (
                                        <VStack
                                            key={transaction.id}
                                            mb={4}
                                            width="100%"
                                        >
                                            <Box
                                                width="100%"
                                                padding={4}
                                                borderBottomWidth={index === transactions.length - 1 ? 0 : 1} // Enlever la bordure pour le dernier élément
                                                borderColor="#94A3B820"
                                            >
                                                <HStack justifyContent="space-between" alignItems="center" mb={2}>
                                                    <Text fontWeight="bold" color="black">
                                                        {transaction.type === 'transfer' ? t('earnings.transfer') : t('earnings.sale')}
                                                    </Text>
                                                    <Text color={transaction.status === 'succeeded' ? '#40D861' : '#FF78B2'}>
                                                        {transaction.status === 'succeeded' ? t('earnings.succeeded') : t('earnings.pending')}
                                                    </Text>
                                                </HStack>

                                                <HStack justifyContent="space-between" alignItems="flex-start">
                                                    <VStack space={2}>
                                                      
                                                    <Text style={styles.caption} color="#94A3B8">
                                                        {transaction.date}
                                                    </Text>
                                                    </VStack>

                                                    <VStack space={2} alignItems="flex-end">
                                                      
                                                        <Text fontWeight="bold" color="#40D861">
                                                            {(transaction.netAmount || 0).toFixed(2)} €
                                                        </Text>
                                                    </VStack>
                                                </HStack>

                                                <HStack justifyContent="space-between" alignItems="center" mt={3}>
                                            
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
                                            <Text style={styles.caption}>{t('earnings.totalEarned')}</Text>
                                            <Text fontWeight="bold">
                                                {(transactionStats.totalEarnings || 0).toFixed(2)} €
                                            </Text>
                                        </HStack>

                                        <HStack justifyContent="space-between">
                                            <Text style={styles.caption}>{t('earnings.available')}</Text>
                                            <Text color="#40D861">
                                                {(transactionStats.availableBalance || 0).toFixed(2)} €
                                            </Text>
                                        </HStack>

                                        <HStack justifyContent="space-between">
                                            <Text style={styles.caption}>{t('earnings.pending')}</Text>
                                            <Text color="#FF78B2">
                                                {(transactionStats.pendingBalance || 0).toFixed(2)} €
                                            </Text>
                                        </HStack>
                                    </VStack>
                                </Box>
                                <Text mt={2} mb={2} style={styles.h4} textAlign="center">
                                    {t('earnings.availableEarnings')}: {userData.totalEarnings} €
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
                                    ? t('earnings.noAvailableFunds')
                                    : t('earnings.retrieveFunds')
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