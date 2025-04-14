import React, { useState, useEffect, useContext, useCallback, useRef } from 'react';
import {
    VStack, Text, Button, Actionsheet,
    Box, Progress, HStack
} from 'native-base';
import { Platform, Alert, Linking } from 'react-native';
import { launchImageLibrary, launchCamera } from 'react-native-image-picker';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faCamera, faImage } from '@fortawesome/free-solid-svg-icons';
import { styles } from '../../infrastructure/theme/styles';
import { useCardData } from '../../infrastructure/context/CardDataContexte';
import { useTranslation } from 'react-i18next';
import { useStripe } from '@stripe/stripe-react-native';
import { AuthContext } from '../../infrastructure/context/AuthContext';

const StripeVerificationModal = ({
    isOpen,
    onClose,
    userData,
    resetStripeAccount,
    navigation
}) => {
    const { t } = useTranslation();
    const stripe = useStripe();
    const { handleIdentityVerification, checkIdentityVerificationStatus, handleStripeOnboardingRefresh } = useCardData();
    const { fetchUserData } = useContext(AuthContext);

    const [identityDocument, setIdentityDocument] = useState(null);
    const [selfieImage, setSelfieImage] = useState(null);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [isUploading, setIsUploading] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [showDocumentOptions, setShowDocumentOptions] = useState(false);
    const [showSelfieOptions, setShowSelfieOptions] = useState(false);
    const [verificationStep, setVerificationStep] = useState('document');
    const [localUserData, setLocalUserData] = useState(userData);
    const [verificationStatus, setVerificationStatus] = useState({
        verified: userData?.stripeIdentityVerified || false,
        status: userData?.stripeVerificationStatus || 'unverified'
    });
    const [hasCompletedVerification, setHasCompletedVerification] = useState(false);
    const isStatusChecked = useRef(false);

    // Met à jour les données locales quand userData change
    useEffect(() => {
        if (JSON.stringify(localUserData) !== JSON.stringify(userData)) {
            setLocalUserData(userData);
        }
    }, [userData]);

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

    // Vérifier le statut de vérification au chargement
    const checkInitialStatus = useCallback(async () => {
        if (isOpen && localUserData?.stripeAccountStatus === 'active' && !isStatusChecked.current) {
            isStatusChecked.current = true;
            await checkStatus(false);
        }
    }, [isOpen, localUserData]);

    // Rafraîchir les données à l'ouverture du modal si l'utilisateur a terminé la vérification
    useEffect(() => {
        if (isOpen && hasCompletedVerification && !isRefreshing) {
            refreshUserDataAndUpdate();
            setHasCompletedVerification(false); // Réinitialiser l'état après le rafraîchissement
        }
    }, [isOpen, hasCompletedVerification, isRefreshing, refreshUserDataAndUpdate]);

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

                            if (stripeStatus.status === 'active') {
                                await checkStatus(true);
                            }
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

    // Fonction pour vérifier le statut de vérification
    const checkStatus = async (showAlert = true) => {
        try {
            setIsUploading(true);
            const result = await checkIdentityVerificationStatus();

            if (result.success) {
                setVerificationStatus({
                    verified: result.verified,
                    status: result.status
                });

                if (result.verified !== localUserData?.stripeIdentityVerified) {
                    await refreshUserDataAndUpdate();
                }

                if (showAlert) {
                    const statusMessages = {
                        'verified': t('stripeVerification.statusMessages.verified'),
                        'processing': t('stripeVerification.statusMessages.processing'),
                        'requires_input': t('stripeVerification.statusMessages.requiresInput'),
                        'default': t('stripeVerification.statusMessages.default', {status: result.status})
                    };

                    Alert.alert(
                        t('stripeVerification.statusMessages.title'),
                        statusMessages[result.status] || statusMessages['default']
                    );
                }

                return result;
            } else {
                if (showAlert) {
                    Alert.alert(t('stripeVerification.errors.title'), result.message);
                }
                return null;
            }
        } catch (error) {
            console.error('Erreur de vérification:', error);
            if (showAlert) {
                Alert.alert(
                    t('stripeVerification.errors.title'),
                    t('stripeVerification.errors.checkStatus')
                );
            }
            return null;
        } finally {
            setIsUploading(false);
        }
    };

    // Fonction pour initier la vérification Stripe
    const initiateStripeVerification = async () => {
        try {
            setIsUploading(true);
            console.log("Démarrage de la vérification Stripe");

            const freshUserData = await refreshUserDataAndUpdate() || localUserData;

            const sessionResponse = await handleIdentityVerification(freshUserData, {
                skipImageUpload: true
            });

            console.log("Réponse de création de session:", JSON.stringify(sessionResponse, null, 2));

            if (!sessionResponse.success) {
                throw new Error(sessionResponse.message || "Échec de création de la session de vérification");
            }

            const verificationUrl = sessionResponse.verificationUrl;
            const sessionId = sessionResponse.sessionId;

            if (!verificationUrl) {
                throw new Error("Aucune URL de vérification n'a été fournie par le serveur");
            }

            Alert.alert(
                t('stripeVerification.verification.title'),
                t('stripeVerification.verification.message'),
                [
                    {
                        text: t('stripeVerification.verification.cancel'),
                        style: 'cancel',
                        onPress: () => setIsUploading(false)
                    },
                    {
                        text: t('stripeVerification.verification.continue'),
                        onPress: async () => {
                            try {
                                const supported = await Linking.canOpenURL(verificationUrl);

                                if (supported) {
                                    await Linking.openURL(verificationUrl);

                                    setVerificationStatus({
                                        verified: false,
                                        status: 'processing'
                                    });

                                    if (sessionId) {
                                        checkVerificationStatus(sessionId);
                                    }

                                    Alert.alert(
                                        t('stripeVerification.verification.inProgress.title'),
                                        t('stripeVerification.verification.inProgress.message'),
                                        [{ text: t('stripeVerification.verification.ok') }]
                                    );

                                    setHasCompletedVerification(true); // Marquer la vérification comme terminée
                                } else {
                                    throw new Error(t('stripeVerification.errors.cannotOpenBrowser'));
                                }
                            } catch (error) {
                                console.error("Erreur lors de l'ouverture du lien:", error);
                                Alert.alert(
                                    t('stripeVerification.errors.title'),
                                    t('stripeVerification.errors.cannotOpenBrowser'),
                                    [{ text: t('stripeVerification.verification.ok') }]
                                );
                            }
                        }
                    }
                ]
            );

            return true;
        } catch (error) {
            console.error("Erreur complète de vérification:", error);
            Alert.alert(
                t('stripeVerification.errors.title'),
                `${t('stripeVerification.errors.verificationFailed')}: ${error.message}`,
                [{ text: t('stripeVerification.verification.ok') }]
            );
            return false;
        } finally {
            setIsUploading(false);
        }
    };

    // Fonction pour vérifier l'identité avec documents téléchargés
    const startStripeIdentityVerification = async () => {
        try {
            setIsUploading(true);

            if (!identityDocument || !selfieImage) {
                Alert.alert(
                    t('stripeVerification.errors.title'),
                    t('stripeVerification.errors.missingDocuments')
                );
                setIsUploading(false);
                return;
            }

            const documentData = {
                documentImage: `data:${identityDocument.type};base64,${identityDocument.base64}`,
                selfieImage: `data:${selfieImage.type};base64,${selfieImage.base64}`,
                documentType: 'identity_document',
                documentSide: 'front'
            };

            const sessionResponse = await handleIdentityVerification(localUserData, documentData);
            setUploadProgress(50);

            if (sessionResponse.success && sessionResponse.clientSecret) {
                setUploadProgress(70);

                if (stripe && stripe.presentVerificationSheet) {
                    const { error } = await stripe.presentVerificationSheet({
                        verificationSessionClientSecret: sessionResponse.clientSecret,
                    });

                    if (error) {
                        console.error('Erreur lors de la présentation de la feuille de vérification:', error);
                        Alert.alert(
                            t('stripeVerification.errors.title'),
                            error.message || t('stripeVerification.errors.verificationError')
                        );
                    } else {
                        setVerificationStatus({
                            verified: false,
                            status: 'processing'
                        });

                        Alert.alert(
                            t('stripeVerification.verification.inProgress.title'),
                            t('stripeVerification.verification.inProgress.message'),
                            [{ text: t('stripeVerification.verification.ok') }]
                        );

                        checkVerificationStatus(sessionResponse.sessionId);
                    }
                } else {
                    console.log("La méthode de vérification native n'est pas disponible");

                    Alert.alert(
                        t('stripeVerification.verification.submitted.title'),
                        t('stripeVerification.verification.submitted.message'),
                        [{ text: t('stripeVerification.verification.ok') }]
                    );

                    setVerificationStatus({
                        verified: false,
                        status: 'processing'
                    });

                    checkVerificationStatus(sessionResponse.sessionId);
                }

                setUploadProgress(100);
                setHasCompletedVerification(true); // Marquer la vérification comme terminée
            } else {
                Alert.alert(
                    t('stripeVerification.errors.title'),
                    sessionResponse.message || t('stripeVerification.errors.preparationFailed')
                );
            }
        } catch (error) {
            console.error('Erreur de vérification d\'identité:', error);
            Alert.alert(
                t('stripeVerification.errors.title'),
                t('stripeVerification.errors.verificationError')
            );
        } finally {
            setIsUploading(false);
            setUploadProgress(0);
        }
    };

    // Fonction pour vérifier périodiquement le statut et mettre à jour l'interface
    const checkVerificationStatus = (sessionId) => {
        const maxAttempts = 30;
        let attempts = 0;

        const intervalId = setInterval(async () => {
            try {
                attempts++;

                if (attempts >= maxAttempts) {
                    clearInterval(intervalId);
                    return;
                }

                const statusResult = await checkIdentityVerificationStatus();
                console.log(`Vérification du statut (tentative ${attempts}):`, statusResult);

                if (statusResult.success) {
                    if (statusResult.verified) {
                        clearInterval(intervalId);

                        setVerificationStatus({
                            verified: true,
                            status: 'verified'
                        });

                        await refreshUserDataAndUpdate();

                        Alert.alert(
                            t('stripeVerification.verification.success.title'),
                            t('stripeVerification.verification.success.message'),
                            [{ text: t('stripeVerification.verification.great') }]
                        );
                    } else if (statusResult.status === 'requires_input' || statusResult.status === 'failed') {
                        clearInterval(intervalId);

                        setVerificationStatus({
                            verified: false,
                            status: statusResult.status
                        });

                        await refreshUserDataAndUpdate();

                        if (statusResult.status === 'requires_input') {
                            Alert.alert(
                                t('stripeVerification.verification.requiresInput.title'),
                                t('stripeVerification.verification.requiresInput.message'),
                                [
                                    {
                                        text: t('stripeVerification.verification.ok'),
                                        onPress: () => {
                                            // Option pour rediriger l'utilisateur si nécessaire
                                        }
                                    }
                                ]
                            );
                        } else {
                            Alert.alert(
                                t('stripeVerification.verification.failed.title'),
                                t('stripeVerification.verification.failed.message'),
                                [{ text: t('stripeVerification.verification.ok') }]
                            );
                        }
                    }
                }
            } catch (error) {
                console.error('Erreur lors de la vérification du statut:', error);
            }
        }, 10000);
    };

    const resetVerification = () => {
        setIdentityDocument(null);
        setSelfieImage(null);
        setVerificationStep('document');
    };

    // Fonction pour le rendu du contenu basée sur l'état du compte
    const renderContent = () => {
        console.log("État du compte Stripe:", {
            stripeAccountId: localUserData?.stripeAccountId,
            stripeAccountStatus: localUserData?.stripeAccountStatus,
            stripeOnboardingComplete: localUserData?.stripeOnboardingComplete,
            stripeExternalAccount: localUserData?.stripeExternalAccount,
            stripeIdentityVerified: localUserData?.stripeIdentityVerified
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
                        onPress={async () => {
                            const stripeStatus = await handleStripeOnboardingRefresh();
                            if (stripeStatus.url) {
                                Linking.openURL(stripeStatus.url);
                            } else {
                                Alert.alert(
                                    t('stripeVerification.errors.title'),
                                    t('stripeVerification.errors.onboardingAccess')
                                );
                            }
                        }}
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

        if (!localUserData?.stripeIdentityVerified) {
            return (
                <>
                    <Text style={styles.h4} textAlign="center">
                        {t('stripeVerification.identityVerification.title')}
                    </Text>

                    <Text
                        style={styles.caption}
                        color="#94A3B8"
                        textAlign="center"
                        mb={2}
                    >
                        {t('stripeVerification.identityVerification.description')}
                    </Text>

                    <VStack space={2}>
                        <Button
                            onPress={() => {
                                initiateStripeVerification();
                            }}
                            backgroundColor="black"
                            borderRadius="full"
                        >
                            <Text color="white" style={styles.cta}>
                                {t('stripeVerification.identityVerification.verifyOnline')}
                            </Text>
                        </Button>

                        <Button
                            onPress={() => {
                                setVerificationStep('document');
                                setShowDocumentOptions(true);
                            }}
                            backgroundColor="gray.500"
                            borderRadius="full"
                        >
                            <Text color="white" style={styles.cta}>
                                {t('stripeVerification.identityVerification.uploadDocuments')}
                            </Text>
                        </Button>
                    </VStack>
                </>
            );
        }

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

                {localUserData.stripeExternalAccount && (
                    <Box
                        borderWidth={1}
                        borderColor="gray.200"
                        p={4}
                        borderRadius="md"
                        mb={4}
                    >
                        <Text style={styles.caption} color="gray.700">
                            {t('stripeVerification.accountConfigured.bankAccount')}: {localUserData.stripeExternalAccount}
                        </Text>
                    </Box>
                )}

                <VStack space={2}>
                    <Button
                        onPress={resetStripeAccount}
                        backgroundColor="orange.500"
                        borderRadius="full"
                    >
                        <Text color="white" style={styles.cta}>
                            {t('stripeVerification.accountConfigured.resetAccount')}
                        </Text>
                    </Button>

                    <Button
                        onPress={() => {
                            onClose();
                        }}
                        backgroundColor="black"
                        borderRadius="full"
                    >
                        <Text color="white" style={styles.cta}>
                            {t('stripeVerification.accountConfigured.manageAccount')}
                        </Text>
                    </Button>
                </VStack>
            </>
        );
    };

    return (
        <>
            <Actionsheet isOpen={isOpen && !showDocumentOptions && !showSelfieOptions} onClose={onClose}>
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

            <Actionsheet isOpen={showDocumentOptions} onClose={() => setShowDocumentOptions(false)}>
                <Actionsheet.Content>
                    <Actionsheet.Item
                        onPress={() => {
                            launchCamera({
                                mediaType: 'photo',
                                includeBase64: true,
                                quality: 0.8,
                            }, (response) => {
                                if (response.didCancel) return;
                                if (response.assets && response.assets.length > 0) {
                                    setIdentityDocument(response.assets[0]);
                                    setVerificationStep('selfie');
                                    setShowDocumentOptions(false);
                                    setShowSelfieOptions(true);
                                }
                            });
                        }}
                    >
                        <HStack alignItems="center" space={3}>
                            <FontAwesomeIcon icon={faCamera} size={20} color="#333" />
                            <Text>{t('stripeVerification.documentOptions.takePhoto')}</Text>
                        </HStack>
                    </Actionsheet.Item>
                    <Actionsheet.Item
                        onPress={() => {
                            launchImageLibrary({
                                mediaType: 'photo',
                                includeBase64: true,
                                quality: 0.8,
                            }, (response) => {
                                if (response.didCancel) return;
                                if (response.assets && response.assets.length > 0) {
                                    setIdentityDocument(response.assets[0]);
                                    setVerificationStep('selfie');
                                    setShowDocumentOptions(false);
                                    setShowSelfieOptions(true);
                                }
                            });
                        }}
                    >
                        <HStack alignItems="center" space={3}>
                            <FontAwesomeIcon icon={faImage} size={20} color="#333" />
                            <Text>{t('stripeVerification.documentOptions.chooseFromGallery')}</Text>
                        </HStack>
                    </Actionsheet.Item>
                </Actionsheet.Content>
            </Actionsheet>

            <Actionsheet isOpen={showSelfieOptions} onClose={() => setShowSelfieOptions(false)}>
                <Actionsheet.Content>
                    <Actionsheet.Item
                        onPress={() => {
                            launchCamera({
                                mediaType: 'photo',
                                includeBase64: true,
                                quality: 0.8,
                            }, (response) => {
                                if (response.didCancel) return;
                                if (response.assets && response.assets.length > 0) {
                                    setSelfieImage(response.assets[0]);
                                    setShowSelfieOptions(false);
                                    startStripeIdentityVerification();
                                }
                            });
                        }}
                    >
                        <HStack alignItems="center" space={3}>
                            <FontAwesomeIcon icon={faCamera} size={20} color="#333" />
                            <Text>{t('stripeVerification.documents.takeSelfie')}</Text>
                        </HStack>
                    </Actionsheet.Item>
                    <Actionsheet.Item
                        onPress={() => {
                            launchImageLibrary({
                                mediaType: 'photo',
                                includeBase64: true,
                                quality: 0.8,
                            }, (response) => {
                                if (response.didCancel) return;
                                if (response.assets && response.assets.length > 0) {
                                    setSelfieImage(response.assets[0]);
                                    setShowSelfieOptions(false);
                                    startStripeIdentityVerification();
                                }
                            });
                        }}
                    >
                        <HStack alignItems="center" space={3}>
                            <FontAwesomeIcon icon={faImage} size={20} color="#333" />
                            <Text>{t('stripeVerification.documents.selectSelfie')}</Text>
                        </HStack>
                    </Actionsheet.Item>
                </Actionsheet.Content>
            </Actionsheet>
        </>
    );
};

export default StripeVerificationModal;