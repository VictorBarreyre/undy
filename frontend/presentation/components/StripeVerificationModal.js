import React, { useState, useEffect, useContext, useCallback } from 'react';
import { VStack, Text, Button, Actionsheet, Box } from 'native-base';
import { Linking, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useStripe } from '@stripe/stripe-react-native';
import { AuthContext } from '../../infrastructure/context/AuthContext';
import { useCardData } from '../../infrastructure/context/CardDataContexte';
import { styles } from '../../infrastructure/theme/styles';
import { createAxiosInstance, getAxiosInstance } from '../../data/api/axiosInstance';

const StripeVerificationModal = ({ isOpen, onClose, userData, resetStripeAccount, navigation }) => {
    const { t } = useTranslation();
    const stripe = useStripe();
    const { handleStripeOnboardingRefresh,updateStripeBankAccount } = useCardData();
    const { fetchUserData } = useContext(AuthContext);

    const [localUserData, setLocalUserData] = useState(userData);
    const [bankAccountDetails, setBankAccountDetails] = useState(null);
    const [isRefreshing, setIsRefreshing] = useState(false);

    // Met à jour les données locales quand userData change
    useEffect(() => {
        if (JSON.stringify(localUserData) !== JSON.stringify(userData)) {
            setLocalUserData(userData);
        }
        console.log(localUserData.stripeExternalAccount)
    }, [userData]);


    const fetchBankAccountDetails = useCallback(async () => {
        const instance = getAxiosInstance();

        try {
            const response = await instance.get('/api/users/bank-account-details', {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localUserData.token}` // Assurez-vous d'utiliser le bon token d'autorisation
                }
            });
            setBankAccountDetails(response.data);
        } catch (error) {
            console.error('Erreur lors de la récupération des détails du compte bancaire:', error);
        }
    }, [localUserData.token]);


    // Rafraîchit les données utilisateur
    const refreshUserDataAndUpdate = useCallback(async () => {
        setIsRefreshing(true);
        try {
            await fetchUserData();
            if (JSON.stringify(userData) !== JSON.stringify(localUserData)) {
                setLocalUserData(userData);
            }
            return userData;
        } catch (error) {
            console.error('Erreur lors du rafraîchissement des données utilisateur:', error);
            return null;
        } finally {
            setIsRefreshing(false);
        }
    }, [fetchUserData, userData, localUserData]);

    // Récupère les détails du compte bancaire lorsque le composant est monté
    useEffect(() => {
        if (localUserData.stripeAccountId && localUserData.stripeAccountStatus === 'active') {
            fetchBankAccountDetails()
                .then(setBankAccountDetails)
                .catch(error => console.error('Erreur lors de la récupération des détails du compte bancaire:', error));
        }
    }, [localUserData.stripeAccountId, localUserData.stripeAccountStatus, fetchBankAccountDetails]);

    // Gestionnaire de deep links pour les retours de Stripe
    useEffect(() => {
        const handleDeepLink = async (event) => {
            try {
                const url = event?.url;
                if (!url) return;

                if (url.includes('stripe-return') || url.includes('action=complete')) {
                    console.log("Retour de Stripe détecté, rafraîchissement des données...");

                    setTimeout(async () => {
                        await refreshUserDataAndUpdate();

                        try {
                            const stripeStatus = await handleStripeOnboardingRefresh();
                            console.log("Statut Stripe après retour:", stripeStatus);
                        } catch (stripeError) {
                            console.error("Erreur lors de la vérification du statut Stripe:", stripeError);
                        }
                    }, 2000);
                }
            } catch (error) {
                console.error("Erreur dans le gestionnaire de deep link:", error);
            }
        };

        const subscription = Linking.addEventListener('url', handleDeepLink);

        Linking.getInitialURL().then(url => {
            if (url) {
                handleDeepLink({ url });
            }
        });

        return () => {
            subscription.remove();
        };
    }, [refreshUserDataAndUpdate, handleStripeOnboardingRefresh]);

    // Fonction pour rediriger l'utilisateur vers le formulaire de modification du compte bancaire
    const redirectToStripeBankAccountForm = async () => {
        try {
            setIsLoading(true);
            
            if (!localUserData?.stripeAccountId) {
                // Si pas de compte Stripe, conserver votre logique existante pour la création
                const stripeStatus = await handleStripeOnboardingRefresh();
                // ... votre code existant ...
            } else {
                // Pour modifier un compte bancaire existant
                const result = await updateStripeBankAccount(
                    localUserData.stripeAccountId,
                    'your-app://stripe-return',
                    'your-app://stripe-refresh'
                );
                
                if (result.success && result.redirectUrl) {
                    Linking.openURL(result.redirectUrl);
                } else {
                    Alert.alert(
                        t('stripe.errorTitle'),
                        result.message
                    );
                }
            }
        } catch (error) {
            console.error('Erreur lors de la redirection vers le formulaire Stripe:', error);
            Alert.alert(
                t('stripeVerification.errors.title'),
                t('stripeVerification.errors.onboardingAccess')
            );
        } finally {
            setIsLoading(false);
        }
    };

    // Fonction pour le rendu du contenu basée sur l'état du compte
    const renderContent = () => {
        console.log("État du compte Stripe:", {
            stripeAccountId: localUserData?.stripeAccountId,
            stripeAccountStatus: localUserData?.stripeAccountStatus,
            stripeOnboardingComplete: localUserData?.stripeOnboardingComplete,
            bankAccountDetails: bankAccountDetails,
        });

        if (!localUserData?.stripeAccountId || localUserData?.stripeAccountStatus !== 'active') {
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
                        onPress={redirectToStripeBankAccountForm}
                        backgroundColor="black"
                        borderRadius="full"
                    >
                        <Text color="white" style={styles.cta}>
                            {t('stripeVerification.bankAccountSetup.configure')}
                        </Text>
                    </Button>
                </>
            );
        }

        return (
            <>
                <Text style={styles.h4} textAlign="center">
                    {t('stripeVerification.accountConfigured.title')}
                </Text>

                {bankAccountDetails && (
                    <Box
                        borderWidth={1}
                        borderColor="gray.200"
                        p={4}
                        borderRadius="md"
                        mb={4}
                    >
                        <Text style={styles.caption} color="gray.700">
                            {t('stripeVerification.accountConfigured.bankAccount')}: {bankAccountDetails.bankName}
                        </Text>
                        <Text style={styles.caption} color="gray.700">
                            {t('stripeVerification.accountConfigured.iban')}: {bankAccountDetails.routingNumber}
                        </Text>
                        <Text style={styles.caption} color="gray.700">
                            {t('stripeVerification.accountConfigured.accountNumber')}: {bankAccountDetails.accountNumber}
                        </Text>
                    </Box>
                )}

                <VStack space={2}>
                    <Button
                        onPress={redirectToStripeBankAccountForm}
                        backgroundColor="black"
                        borderRadius="full"
                    >
                        <Text color="white" style={styles.cta}>
                            {t('stripeVerification.accountConfigured.modifyBankAccount')}
                        </Text>
                    </Button>
                </VStack>
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
                <VStack width="97%" space={4} px={4}>
                    {renderContent()}
                </VStack>
            </Actionsheet.Content>
        </Actionsheet>
    );
};

export default StripeVerificationModal;
