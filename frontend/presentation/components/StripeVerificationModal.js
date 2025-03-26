import React, { useState, useEffect } from 'react';
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

const StripeVerificationModal = ({
    isOpen,
    onClose,
    userData,
    resetStripeAccount,
    navigation
}) => {
    const { t } = useTranslation();
    const stripe = useStripe(); // Hook Stripe
    const { handleIdentityVerification, checkIdentityVerificationStatus } = useCardData();
    const [identityDocument, setIdentityDocument] = useState(null);
    const [selfieImage, setSelfieImage] = useState(null);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [isUploading, setIsUploading] = useState(false);
    const [showDocumentOptions, setShowDocumentOptions] = useState(false);
    const [showSelfieOptions, setShowSelfieOptions] = useState(false);
    const [verificationStep, setVerificationStep] = useState('document'); // 'document', 'selfie', 'review', 'complete'
    const [verificationStatus, setVerificationStatus] = useState({
        verified: userData?.stripeIdentityVerified || false,
        status: userData?.stripeVerificationStatus || 'unverified'
    });

    // Vérifier le statut de vérification au chargement
    useEffect(() => {
        const checkStatus = async () => {
            try {
                const result = await checkIdentityVerificationStatus();
                if (result.success) {
                    setVerificationStatus({
                        verified: result.verified,
                        status: result.status
                    });
                } else {
                    // Définir un état par défaut si la requête échoue
                    setVerificationStatus({
                        verified: false,
                        status: 'unverified'
                    });
                }
            } catch (error) {
                console.error('Erreur lors de la vérification du statut:', error);
                // Même en cas d'erreur, définir un état par défaut
                setVerificationStatus({
                    verified: false,
                    status: 'unverified'
                });
            }
        };

        if (isOpen && userData?.stripeAccountStatus === 'active') {
            checkStatus();
        }
    }, [isOpen, userData]);


    // Fonction complètement réécrite pour initier la vérification Stripe
    const initiateStripeVerification = async () => {
        try {
            setIsUploading(true);
            console.log("Démarrage de la vérification Stripe");
    
            // Créer une nouvelle session de vérification
            const sessionResponse = await handleIdentityVerification(userData, {
                skipImageUpload: true
            });
    
            console.log("Réponse de création de session:", JSON.stringify(sessionResponse, null, 2));
    
            if (!sessionResponse.success) {
                throw new Error(sessionResponse.message || "Échec de création de la session de vérification");
            }
    
            // Récupérer l'URL de vérification et le sessionId
            const verificationUrl = sessionResponse.verificationUrl;
            const sessionId = sessionResponse.sessionId;
    
            if (!verificationUrl) {
                throw new Error("Aucune URL de vérification n'a été fournie par le serveur");
            }
    
            // Proposer à l'utilisateur d'ouvrir la page web pour la vérification
            Alert.alert(
                'Vérification d\'identité',
                'Voulez-vous procéder à la vérification de votre identité via notre navigateur sécurisé?',
                [
                    { 
                        text: 'Annuler',
                        style: 'cancel',
                        onPress: () => setIsUploading(false)
                    },
                    { 
                        text: 'Continuer',
                        onPress: async () => {
                            try {
                                // Vérifier si l'URL peut être ouverte
                                const supported = await Linking.canOpenURL(verificationUrl);
                                
                                if (supported) {
                                    // Ouvrir l'URL officielle de vérification Stripe
                                    await Linking.openURL(verificationUrl);
                                    
                                    // Mettre à jour l'état pour indiquer que la vérification est en cours
                                    setVerificationStatus({
                                        verified: false,
                                        status: 'processing'
                                    });
                                    
                                    // Démarrer la vérification périodique du statut
                                    if (sessionId) {
                                        checkVerificationStatus(sessionId);
                                    }
                                    
                                    Alert.alert(
                                        'Vérification en cours',
                                        'Une fois la vérification terminée dans votre navigateur, revenez à l\'application. Nous vérifierons automatiquement le statut.',
                                        [{ text: 'OK' }]
                                    );
                                } else {
                                    throw new Error("Impossible d'ouvrir le navigateur pour la vérification");
                                }
                            } catch (error) {
                                console.error("Erreur lors de l'ouverture du lien:", error);
                                Alert.alert(
                                    'Erreur',
                                    "Impossible d'ouvrir le navigateur pour la vérification. Veuillez réessayer.",
                                    [{ text: 'OK' }]
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
                'Erreur',
                `La vérification a échoué: ${error.message}`,
                [{ text: 'OK' }]
            );
            return false;
        } finally {
            setIsUploading(false);
        }
    };

    const startStripeIdentityVerification = async () => {
        try {
            setIsUploading(true);

            if (!identityDocument || !selfieImage) {
                Alert.alert('Erreur', 'Veuillez fournir à la fois un document d\'identité et une photo de vous');
                setIsUploading(false);
                return;
            }

            // Préparer les données du document
            const documentData = {
                documentImage: `data:${identityDocument.type};base64,${identityDocument.base64}`,
                selfieImage: `data:${selfieImage.type};base64,${selfieImage.base64}`,
                documentType: 'identity_document',
                documentSide: 'front'
            };

            // Envoyer les documents au backend
            const sessionResponse = await handleIdentityVerification(userData, documentData);
            setUploadProgress(50);

            if (sessionResponse.success && sessionResponse.clientSecret) {
                setUploadProgress(70);

                // Vérifier si la méthode est disponible
                if (stripe && stripe.presentVerificationSheet) {
                    // Utiliser la méthode directement depuis l'objet stripe
                    const { error } = await stripe.presentVerificationSheet({
                        verificationSessionClientSecret: sessionResponse.clientSecret,
                    });

                    if (error) {
                        console.error('Erreur lors de la présentation de la feuille de vérification:', error);
                        Alert.alert('Erreur', error.message || 'Une erreur est survenue lors de la vérification');
                    } else {
                        // Mettre à jour l'état de l'interface utilisateur
                        setVerificationStatus({
                            verified: false,
                            status: 'processing'
                        });

                        // Afficher la progression à l'utilisateur
                        Alert.alert(
                            'Vérification en cours',
                            'Nous vérifions actuellement votre identité. Cela peut prendre quelques minutes.',
                            [{ text: 'OK' }]
                        );

                        // Lancer la vérification périodique du statut
                        checkVerificationStatus(sessionResponse.sessionId);
                    }
                } else {
                    // Fallback si la méthode n'est pas disponible
                    console.log("La méthode de vérification native n'est pas disponible");

                    // Informer l'utilisateur que la vérification a été soumise
                    Alert.alert(
                        'Vérification soumise',
                        'Votre documentation a été soumise pour vérification. Vous serez notifié une fois la vérification terminée.',
                        [{ text: 'OK' }]
                    );

                    // Mettre à jour le statut et lancer la vérification périodique
                    setVerificationStatus({
                        verified: false,
                        status: 'processing'
                    });

                    checkVerificationStatus(sessionResponse.sessionId);
                }

                setUploadProgress(100);
            } else {
                Alert.alert('Erreur', sessionResponse.message || 'Échec de la préparation de la vérification');
            }
        } catch (error) {
            console.error('Erreur de vérification d\'identité:', error);
            Alert.alert('Erreur', 'Une erreur est survenue lors de la vérification');
        } finally {
            setIsUploading(false);
            setUploadProgress(0);
        }
    };


    // Fonction pour vérifier périodiquement le statut et mettre à jour l'interface
    const checkVerificationStatus = (sessionId) => {
        const maxAttempts = 30; // 5 minutes avec un intervalle de 10 secondes
        let attempts = 0;

        // Créer un ID pour pouvoir annuler l'intervalle plus tard
        const intervalId = setInterval(async () => {
            try {
                attempts++;

                // Arrêter les vérifications après le nombre maximum de tentatives
                if (attempts >= maxAttempts) {
                    clearInterval(intervalId);
                    return;
                }

                // Vérifier le statut auprès du backend
                const statusResult = await checkIdentityVerificationStatus();
                console.log(`Vérification du statut (tentative ${attempts}):`, statusResult);

                if (statusResult.success) {
                    // Si la vérification est terminée avec succès
                    if (statusResult.verified) {
                        clearInterval(intervalId);

                        setVerificationStatus({
                            verified: true,
                            status: 'verified'
                        });

                        Alert.alert(
                            'Vérification réussie',
                            'Votre identité a été vérifiée avec succès.',
                            [{ text: 'Super!' }]
                        );
                    }
                    // Si la vérification a échoué ou a besoin d'informations supplémentaires
                    else if (statusResult.status === 'requires_input' || statusResult.status === 'failed') {
                        clearInterval(intervalId);

                        // Mettre à jour l'état
                        setVerificationStatus({
                            verified: false,
                            status: statusResult.status
                        });

                        // Proposer à l'utilisateur de continuer via le web si nécessaire
                        if (statusResult.status === 'requires_input') {
                            Alert.alert(
                                'Action requise',
                                'Des informations supplémentaires sont nécessaires pour compléter la vérification.',
                                [
                                    {
                                        text: 'OK',
                                        onPress: () => {
                                            // Vous pourriez diriger l'utilisateur vers une page Web ici si nécessaire
                                        }
                                    }
                                ]
                            );
                        } else {
                            Alert.alert(
                                'Vérification échouée',
                                'La vérification de votre identité a échoué. Veuillez réessayer avec des documents de meilleure qualité.',
                                [{ text: 'OK' }]
                            );
                        }
                    }
                    // Si toujours en cours, continuer à vérifier
                }
            } catch (error) {
                console.error('Erreur lors de la vérification du statut:', error);

                // Même en cas d'erreur, continuer à vérifier
            }
        }, 10000); // Vérifier toutes les 10 secondes
    };


 
  

    const resetVerification = () => {
        setIdentityDocument(null);
        setSelfieImage(null);
        setVerificationStep('document');
    };

    const checkStatus = async () => {
        try {
            setIsUploading(true);
            const result = await checkIdentityVerificationStatus();

            if (result.success) {
                setVerificationStatus({
                    verified: result.verified,
                    status: result.status
                });

                // Message personnalisé selon le statut
                const statusMessages = {
                    'verified': 'Votre identité a été vérifiée avec succès',
                    'processing': 'Vérification en cours',
                    'requires_input': 'Des informations supplémentaires sont requises',
                    'default': 'Statut de vérification : ' + result.status
                };

                Alert.alert(
                    'Statut de vérification',
                    statusMessages[result.status] || statusMessages['default']
                );
            } else {
                Alert.alert('Erreur', result.message);
            }
        } catch (error) {
            console.error('Erreur de vérification:', error);
            Alert.alert('Erreur', 'Impossible de vérifier le statut');
        } finally {
            setIsUploading(false);
        }
    };

// Updated renderContent function
const renderContent = () => {
    console.log("État du compte Stripe:", {
        stripeAccountId: userData?.stripeAccountId,
        stripeAccountStatus: userData?.stripeAccountStatus,
        stripeOnboardingComplete: userData?.stripeOnboardingComplete,
        stripeExternalAccount: userData?.stripeExternalAccount,
        stripeIdentityVerified: userData?.stripeIdentityVerified
    });

    // If the Stripe account is not configured
    if (!userData?.stripeAccountId || userData?.stripeAccountStatus !== 'active') {
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
                        // Redirect to Stripe onboarding process
                        const stripeStatus = await handleStripeOnboardingRefresh();
                        if (stripeStatus.url) {
                            Linking.openURL(stripeStatus.url);
                        } else {
                            Alert.alert('Erreur', 'Impossible d\'accéder à l\'onboarding Stripe');
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

    // If the account is configured but identity is not verified
    if (!userData?.stripeIdentityVerified) {
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
                            // Option 1: Web-based verification
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
                            // Option 2: Document and selfie upload
                            setVerificationStep('document');
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

    // If the account is configured but identity is not verified
    if (!userData?.stripeIdentityVerified) {
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
                    {t('stripeVerification.accountConfigured.descriptionIdentityPending')}
                </Text>

                {/* Display bank account information if available */}
                {userData.stripeExternalAccount && (
                    <Box
                        borderWidth={1}
                        borderColor="gray.200"
                        p={4}
                        borderRadius="md"
                        mb={4}
                    >
                        <Text style={styles.caption} color="gray.700">
                            Compte bancaire : {userData.stripeExternalAccount}
                        </Text>
                    </Box>
                )}

                <VStack space={2}>
                    <Button
                        onPress={() => {
                            // Option 1: Web-based verification
                            initiateStripeVerification();
                        }}
                        backgroundColor="black"
                        borderRadius="full"
                    >
                        <Text color="white" style={styles.cta}>
                            {t('stripeVerification.accountConfigured.verifyIdentity')}
                        </Text>
                    </Button>
                </VStack>
            </>
        );
    }

    // If the account is fully configured and verified
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

            {/* Display bank account information if available */}
            {userData.stripeExternalAccount && (
                <Box
                    borderWidth={1}
                    borderColor="gray.200"
                    p={4}
                    borderRadius="md"
                    mb={4}
                >
                    <Text style={styles.caption} color="gray.700">
                        Compte bancaire : {userData.stripeExternalAccount}
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
        </>
    );
};

export default StripeVerificationModal;