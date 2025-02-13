import React, { useState, useEffect } from 'react';
import { Modal, Text, View, Button, VStack, Box, Input } from 'native-base';
import { BlurView } from '@react-native-community/blur';
import { Platform } from 'react-native';
import { useStripe } from '@stripe/stripe-react-native';
import axios from 'axios';
import { styles } from '../../infrastructure/theme/styles';
import { createAxiosInstance, getAxiosInstance } from '../../data/api/axiosInstance'

const EarningsModal = ({ isOpen, onClose, userData }) => {
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
                        stripeAccountId: userData.stripeAccountId // Ajoutez le stripeAccountId ici
                    }
                });
                setTransactions(response.data);
                setIsLoading(false);
            } catch (error) {
                console.error('Erreur lors de la récupération des transactions :', error);
                setIsLoading(false);
            }
        };
    
        if (isOpen) {
            fetchTransactions();
        }
    }, [isOpen, userData.token, userData.stripeAccountId]);

    const handleTransferFunds = async () => {
        const instance = getAxiosInstance();
        try {
            // Récupérer le montant total des revenus
            const totalEarnings = transactions.reduce((total, transaction) => total + transaction.amount, 0);
    
            // Créer une intention de paiement avec Stripe
            const response = await instance.post('/api/users/create-transfer-intent', {
                amount: totalEarnings,
                stripeAccountId: userData.stripeAccountId // Ajoutez également ici
            }, {
                headers: {
                    Authorization: `Bearer ${userData.token}`,
                },
            });
    
            const { clientSecret } = response.data;
    
            // Initialiser le formulaire de paiement Stripe
            const { error } = await initPaymentSheet({
                paymentIntentClientSecret: clientSecret,
            });
    
            if (error) {
                console.error('Erreur lors de l\'initialisation du formulaire de paiement :', error);
                return;
            }
    
            // Présenter le formulaire de paiement Stripe
            const { error: presentError } = await presentPaymentSheet();
    
            if (presentError) {
                console.error('Erreur lors de la présentation du formulaire de paiement :', presentError);
                return;
            }
    
            // Le virement a été effectué avec succès
            console.log('Virement effectué avec succès !');
            onClose();
        } catch (error) {
            console.error('Erreur lors du virement des fonds :', error);
        }
    };


    return (
        <Modal isOpen={isOpen} onClose={onClose}>
            <View width='100%' style={{ flex: 1 }}>
                <BlurView
                    style={[
                        styles.blurBackground,
                        {
                            backgroundColor: 'rgba(255, 255, 255, 0.2)',
                            flex: 1,
                            justifyContent: 'center',
                            alignItems: 'center',
                        }
                    ]}
                    blurType="light"
                    blurAmount={8}
                    reducedTransparencyFallbackColor="rgba(255, 255, 255, 0.8)"
                >
                    <Modal.Content
                        width="90%"
                        style={{
                            ...styles.shadowBox,
                            shadowColor: Platform.OS === 'ios' ? 'violet' : undefined,
                            shadowOffset: Platform.OS === 'ios' ? { width: 0, height: 2 } : undefined,
                            shadowOpacity: Platform.OS === 'ios' ? 0.2 : undefined,
                            shadowRadius: Platform.OS === 'ios' ? 5 : undefined,
                            elevation: 5,
                            backgroundColor: 'white',
                            borderRadius: 8,
                            padding: 16
                        }}
                    >
                        <Modal.CloseButton
                            _icon={{
                                color: "#94A3B8",
                                size: "sm"
                            }}
                        />
                        <VStack justifyContent="space-between" width='100%' space={4}>
                            <Text style={styles.h5} numberOfLines={1} ellipsizeMode="tail">
                                Détails des revenus
                            </Text>
                            <Box width="100%">
                                {isLoading ? (
                                    <Text>Chargement des transactions...</Text>
                                ) : (
                                    <>
                                        {transactions.map((transaction) => (
                                            <View key={transaction.id}>
                                                <Text>Montant : {transaction.amount} €</Text>
                                                <Text>Date : {transaction.date}</Text>
                                                {/* Affichez d'autres détails de la transaction */}
                                            </View>
                                        ))}
                                        <Text>Total des revenus : {userData.totalEarnings} €</Text>
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
                                <Text color="white" style={styles.ctalittle}>
                                    Virer les fonds
                                </Text>
                            </Button>
                        </VStack>
                    </Modal.Content>
                </BlurView>
            </View>
        </Modal>
    );
};

export default EarningsModal;