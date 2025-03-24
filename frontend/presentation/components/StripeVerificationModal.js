import React, { useState, useEffect } from 'react';
import {
    VStack, Text, Button, Actionsheet,
    Box, Progress, HStack
} from 'native-base';
import { Platform, Alert, Linking } from 'react-native';
import { styles } from '../../infrastructure/theme/styles';
import { getAxiosInstance } from '../../data/api/axiosInstance';
import { useTranslation } from 'react-i18next';

const StripeVerificationActionSheet = ({
    isOpen,
    onClose,
    userData,
    resetStripeAccount,
    navigation
}) => {
    const { t } = useTranslation();
    const [isLoading, setIsLoading] = useState(false);
    const [verificationStatus, setVerificationStatus] = useState(userData?.stripeVerificationStatus || 'unverified');
    const [progressValue, setProgressValue] = useState(0);
    const [progressInterval, setProgressIntervalState] = useState(null);

    // Vérifier le statut de vérification lors de l'ouverture du modal
    useEffect(() => {
        if (isOpen && userData?.stripeAccountStatus === 'active') {
            checkVerificationStatus();
        }

        // Nettoyage de l'intervalle lors du démontage du composant
        return () => {
            if (progressInterval) {
                clearInterval(progressInterval);
            }
        };
    }, [isOpen, userData]);

    // Vérifier le statut de vérification d'identité
    const checkVerificationStatus = async () => {
        const instance = getAxiosInstance();
        if (!instance) return;

        try {
            setIsLoading(true);
            const response = await instance.get('/api/secrets/identity-verification-status');
            
            if (response.data.success) {
                setVerificationStatus(response.data.status);
            }
        } catch (error) {
            console.error('Erreur lors de la vérification du statut:', error);
        } finally {
            setIsLoading(false);
        }
    };

    // Fonction pour initialiser la vérification d'identité
    const initiateIdentityVerification = async () => {
        const instance = getAxiosInstance();
        if (!instance) return;

        try {
            setIsLoading(true);
            
            // Animation de progression
            let progress = 0;
            const interval = setInterval(() => {
                progress += 5;
                if (progress <= 90) {
                    setProgressValue(progress);
                }
            }, 300);
            
            setProgressIntervalState(interval);

            const response = await instance.post('/api/secrets/create-identity-verification');

            clearInterval(interval);
            setProgressValue(100);

            if (response.data.success && response.data.url) {
                Alert.alert(
                    t('stripeVerification.success.title'),
                    t('stripeVerification.success.redirecting'),
                    [
                        {
                            text: 'OK',
                            onPress: () => {
                                // Rediriger l'utilisateur vers l'URL de vérification Stripe
                                Linking.openURL(response.data.url);
                                onClose();
                            }
                        }
                    ]
                );
            } else {
                Alert.alert(
                    t('stripeVerification.errors.title'),
                    response.data.message || t('stripeVerification.errors.verificationFailed')
                );
                setProgressValue(0);
            }
        } catch (error) {
            console.error('Erreur lors de l\'initiation de la vérification:', error);
            
            clearInterval(progressInterval);
            setProgressValue(0);

            // Afficher un message d'erreur détaillé
            const errorMessage = error.response?.data?.message ||
                error.message ||
                t('stripeVerification.errors.verificationFailed');

            Alert.alert(
                t('stripeVerification.errors.title'),
                errorMessage
            );
        } finally {
            setIsLoading(false);
        }
    };

    const renderContent = () => {
        // Pas de compte Stripe ou compte en attente
        if (!userData?.stripeAccountStatus || userData?.stripeAccountStatus === 'pending') {
            return (
                <>
                    <Text style={styles.h4} textAlign="center">
                        {t('stripeVerification.bankAccountSetup.title')}
                    </Text>

                    <Text
                        style={styles.caption}
                        color="#94A3B8"
                        textAlign="center"
                        mb={2}
                    >
                        {t('stripeVerification.bankAccountSetup.description')}
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
                            {t('stripeVerification.bankAccountSetup.publishSecret')}
                        </Text>
                    </Button>
                </>
            );
        }

        // Compte actif mais identité pas encore vérifiée ou en cours de vérification
        if (userData?.stripeAccountStatus === 'active' && 
            (verificationStatus === 'unverified' || verificationStatus === 'pending' || !userData?.stripeIdentityVerified)) {
            
            // Si en cours de vérification
            if (verificationStatus === 'pending') {
                return (
                    <>
                        <Text style={styles.h4} textAlign="center">
                            {t('stripeVerification.identityVerification.pending')}
                        </Text>

                        <Text
                            style={styles.caption}
                            color="#94A3B8"
                            textAlign="center"
                            mb={4}
                        >
                            {t('stripeVerification.identityVerification.pendingDescription')}
                        </Text>

                        <Button
                            onPress={checkVerificationStatus}
                            backgroundColor="black"
                            borderRadius="full"
                            isLoading={isLoading}
                        >
                            <Text color="white" style={styles.cta}>
                                {t('stripeVerification.identityVerification.checkStatus')}
                            </Text>
                        </Button>
                    </>
                );
            }
            
            // Si non vérifié ou nouvelle vérification nécessaire
            return (
                <>
                    <Text style={styles.h4} textAlign="center">
                        {t('stripeVerification.identityVerification.title')}
                    </Text>

                    <Text
                        style={styles.caption}
                        color="#94A3B8"
                        textAlign="center"
                        mb={4}
                    >
                        {t('stripeVerification.identityVerification.stripeDescription')}
                    </Text>

                    {progressValue > 0 && (
                        <Progress
                            value={progressValue}
                            mx={4}
                            my={2}
                            colorScheme="emerald"
                        />
                    )}

                    <Button
                        onPress={initiateIdentityVerification}
                        backgroundColor="black"
                        borderRadius="full"
                        isLoading={isLoading}
                        _loading={{
                            bg: "black",
                            _text: {
                                color: "white"
                            }
                        }}
                    >
                        <Text color="white" style={styles.cta}>
                            {t('stripeVerification.identityVerification.startVerification')}
                        </Text>
                    </Button>
                </>
            );
        }

        // Compte vérifié et identité vérifiée
        return (
            <>
                <Text style={styles.h4} textAlign="center">
                    {t('stripeVerification.accountConfigured.title')}
                </Text>

                <Text
                    style={styles.caption}
                    color="#94A3B8"
                    textAlign="center"
                    mb={2}
                >
                    {t('stripeVerification.accountConfigured.description')}
                </Text>

                <Button
                    onPress={resetStripeAccount}
                    backgroundColor="orange.500"
                    borderRadius="full"
                    mb={2}
                >
                    <Text color="white" style={styles.cta}>
                        {t('stripeVerification.accountConfigured.resetAccount')}
                    </Text>
                </Button>

                <Button
                    onPress={() => {
                        // Action pour gérer le compte Stripe - pourrait ouvrir un lien vers le dashboard Stripe
                        onClose();
                    }}
                    backgroundColor="black"
                    borderRadius="full"
                >
                    <Text color="white" style={styles.cta}>
                        {t('stripeVerification.accountConfigured.manageAccount')}
                    </Text>
                </Button>
            </>
        );
    };

    return (
        <Actionsheet isOpen={isOpen} onClose={onClose}>
            <Actionsheet.Content
                backgroundColor="white"
                maxHeight="100%"
                _content={{
                    py: 0,
                    px: 6
                }}
            >
                <VStack width="97%" space={4} px={4} py={4}>
                    {renderContent()}
                </VStack>
            </Actionsheet.Content>
        </Actionsheet>
    );
};

export default StripeVerificationActionSheet;