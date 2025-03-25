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
    const { presentVerificationSheet } = useStripe(); // Fonction pour présenter l'interface de vérification
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

    useEffect(() => {
        console.log('Données de vérification Stripe:', {
            stripeIdentityVerified: userData?.stripeIdentityVerified,
            stripeVerificationStatus: userData?.stripeVerificationStatus,
            stripeVerificationSessionId: userData?.stripeVerificationSessionId,
            stripeIdentityDocumentId: userData?.stripeIdentityDocumentId,
            stripeIdentityVerificationDate: userData?.stripeIdentityVerificationDate
        });
    }, [userData]);



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
   // Fonction complètement réécrite pour initier la vérification Stripe avec seulement l'approche native
const initiateStripeVerification = async () => {
    try {
        setIsUploading(true);

        // 1. D'abord, vérifier si une session est déjà en cours
        const statusCheck = await checkIdentityVerificationStatus();
        console.log("Vérification du statut existant:", statusCheck);

        // Si une session existe déjà et nécessite une action
        if (statusCheck.success && statusCheck.status === 'requires_input') {
            // Créer une nouvelle session plutôt que d'essayer de réutiliser l'ancienne
            console.log("Session existante nécessitant des inputs, création d'une nouvelle session");
        }

        // 2. Créer une nouvelle session de vérification
        const sessionResponse = await handleIdentityVerification(userData, {
            skipImageUpload: true
        });

        console.log("Réponse de création de session:", JSON.stringify(sessionResponse, null, 2));

        if (!sessionResponse.success) {
            throw new Error(sessionResponse.message || "Échec de création de la session de vérification");
        }

        // 3. IMPORTANT: Vérifier qu'on a un client secret valide
        if (!sessionResponse.clientSecret) {
            throw new Error("Client secret manquant dans la réponse");
        }

        // Mémoriser la session ID pour les vérifications ultérieures
        const sessionId = sessionResponse.sessionId;

        // 4. Utiliser UNIQUEMENT l'API native Stripe
        if (Platform.OS !== 'web' && stripe && stripe.presentVerificationSheet) {
            try {
                console.log("Tentative de vérification native avec client secret");

                const { error } = await stripe.presentVerificationSheet({
                    verificationSessionClientSecret: sessionResponse.clientSecret,
                });

                if (error) {
                    console.error("Erreur Stripe native:", error);
                    throw new Error(`Erreur présentation Stripe: ${error.message}`);
                } else {
                    // Si l'expérience native réussit
                    setVerificationStatus({
                        verified: false,
                        status: 'processing'
                    });

                    if (sessionId) {
                        checkVerificationStatus(sessionId);
                    }
                    
                    // Afficher un message de succès
                    Alert.alert(
                        'Vérification en cours',
                        'Nous vérifions actuellement votre identité. Cela peut prendre quelques minutes.',
                        [{ text: 'OK' }]
                    );
                }
            } catch (nativeError) {
                console.error("Exception native:", nativeError);
                Alert.alert(
                    'Erreur',
                    "La vérification d'identité a échoué. Veuillez réessayer plus tard.",
                    [{ text: 'OK' }]
                );
            }
        } else {
            // Si l'API native n'est pas disponible (par exemple sur le web ou si le SDK n'est pas correctement installé)
            Alert.alert(
                'Non disponible',
                "La vérification d'identité n'est pas disponible sur cet appareil. Veuillez utiliser un appareil mobile compatible.",
                [{ text: 'OK' }]
            );
        }

    } catch (error) {
        console.error('Erreur de vérification:', error);
        Alert.alert(
            'Erreur',
            error.message || 'Erreur lors de la vérification d\'identité'
        );
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


    // Fonction pour obtenir une image depuis la galerie (document)
    const pickFromGallery = (forSelfie = false) => {
        launchImageLibrary({
            mediaType: 'photo',
            quality: 0.8,
            selectionLimit: 1,
            includeBase64: true,
            maxWidth: 1200,
            maxHeight: 1200,
        }, (response) => {
            if (response.didCancel) {
                console.log(t('stripeVerification.logs.userCancelled'));
            } else if (response.errorCode) {
                Alert.alert(
                    t('stripeVerification.errors.title'),
                    response.errorMessage || t('stripeVerification.errors.generic')
                );
            } else if (response.assets && response.assets.length > 0) {
                if (forSelfie) {
                    setSelfieImage(response.assets[0]);
                    setShowSelfieOptions(false);
                    setVerificationStep('review');
                } else {
                    setIdentityDocument(response.assets[0]);
                    setShowDocumentOptions(false);
                    setVerificationStep('selfie');
                }
            }
        });
    };

    // Fonction pour prendre une photo avec l'appareil photo
    const takePhoto = (forSelfie = false) => {
        launchCamera({
            mediaType: 'photo',
            quality: 0.8,
            includeBase64: true,
            maxWidth: 1200,
            maxHeight: 1200,
            saveToPhotos: false,
        }, (response) => {
            if (response.didCancel) {
                console.log(t('stripeVerification.logs.userCancelled'));
            } else if (response.errorCode) {
                Alert.alert(
                    t('stripeVerification.errors.title'),
                    response.errorMessage || t('stripeVerification.errors.generic')
                );
            } else if (response.assets && response.assets.length > 0) {
                if (forSelfie) {
                    setSelfieImage(response.assets[0]);
                    setShowSelfieOptions(false);
                    setVerificationStep('review');
                } else {
                    setIdentityDocument(response.assets[0]);
                    setShowDocumentOptions(false);
                    setVerificationStep('selfie');
                }
            }
        });
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

    // Affichage en fonction du statut Stripe et de la vérification
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

        // Compte vérifié et identité vérifiée
        if (verificationStatus.verified) {
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

                    {/* Affichage des informations bancaires si disponibles */}
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
        }

        // Compte actif mais identité pas encore vérifiée
        if (userData?.stripeAccountStatus === 'active' &&
            (!verificationStatus.verified && verificationStatus.status !== 'verified')) {

            // Étape document d'identité
            if (verificationStep === 'document') {
                return (
                    <>
                        <Text style={styles.h4} textAlign="center">
                            {t('stripeVerification.identityVerification.documentTitle')}
                        </Text>

                        <Text
                            style={styles.caption}
                            color="#94A3B8"
                            textAlign="center"
                            mb={2}
                        >
                            {t('stripeVerification.identityVerification.documentDescription')}
                        </Text>

                        <Button
                            onPress={initiateStripeVerification}
                            backgroundColor="black"
                            borderRadius="full"
                        >
                            <Text color="white" style={styles.cta}>
                                {t('stripeVerification.identityVerification.selectDocument')}
                            </Text>
                        </Button>
                    </>
                );
            }

            // Étape selfie
            if (verificationStep === 'selfie') {
                return (
                    <>
                        <Text style={styles.h4} textAlign="center">
                            {t('stripeVerification.identityVerification.selfieTitle')}
                        </Text>

                        <Text
                            style={styles.caption}
                            color="#94A3B8"
                            textAlign="center"
                            mb={2}
                        >
                            {t('stripeVerification.identityVerification.selfieDescription')}
                        </Text>

                        {identityDocument && (
                            <Box mb={4}>
                                <Text style={styles.caption} textAlign="center">
                                    {t('stripeVerification.identityVerification.documentSelected', {
                                        name: identityDocument.fileName || 'Document d\'identité'
                                    })}
                                </Text>
                            </Box>
                        )}

                        <Button
                            onPress={() => setShowSelfieOptions(true)}
                            backgroundColor="black"
                            borderRadius="full"
                        >
                            <Text color="white" style={styles.cta}>
                                {t('stripeVerification.identityVerification.takeSelfie')}
                            </Text>
                        </Button>

                        <Button
                            onPress={resetVerification}
                            backgroundColor="gray.200"
                            borderRadius="full"
                            mt={2}
                        >
                            <Text color="black" style={styles.cta}>
                                {t('stripeVerification.identityVerification.changeDocument')}
                            </Text>
                        </Button>
                    </>
                );
            }

            // Étape révision et soumission
            if (verificationStep === 'review') {
                return (
                    <>
                        <Text style={styles.h4} textAlign="center">
                            {t('stripeVerification.identityVerification.reviewTitle')}
                        </Text>

                        <Text
                            style={styles.caption}
                            color="#94A3B8"
                            textAlign="center"
                            mb={2}
                        >
                            {t('stripeVerification.identityVerification.reviewDescription')}
                        </Text>

                        <Box mb={4}>
                            {identityDocument && (
                                <Text style={styles.caption} textAlign="center" mb={1}>
                                    ✓ {t('stripeVerification.identityVerification.documentSelected', {
                                        name: identityDocument.fileName || 'Document d\'identité'
                                    })}
                                </Text>
                            )}

                            {selfieImage && (
                                <Text style={styles.caption} textAlign="center">
                                    ✓ {t('stripeVerification.identityVerification.selfieSelected')}
                                </Text>
                            )}
                        </Box>

                        {isUploading && (
                            <Progress
                                value={uploadProgress}
                                mx={4}
                                my={2}
                                colorScheme="emerald"
                            />
                        )}

                        <Button
                            onPress={startStripeIdentityVerification}
                            backgroundColor="black"
                            borderRadius="full"
                            isDisabled={isUploading}
                        >
                            <Text color="white" style={styles.cta}>
                                {isUploading
                                    ? t('stripeVerification.identityVerification.submitting')
                                    : t('stripeVerification.identityVerification.submit')
                                }
                            </Text>
                        </Button>

                        <Button
                            onPress={resetVerification}
                            backgroundColor="gray.200"
                            borderRadius="full"
                            mt={2}
                            isDisabled={isUploading}
                        >
                            <Text color="black" style={styles.cta}>
                                {t('stripeVerification.identityVerification.restart')}
                            </Text>
                        </Button>
                    </>
                );
            }

            // Vérification en cours
            if (verificationStatus.status === 'processing') {
                return (
                    <>
                        <Text style={styles.h4} textAlign="center">
                            {t('stripeVerification.identityVerification.processingTitle')}
                        </Text>

                        <Text
                            style={styles.caption}
                            color="#94A3B8"
                            textAlign="center"
                            mb={2}
                        >
                            {t('stripeVerification.identityVerification.processingDescription')}
                        </Text>

                        <Button
                            onPress={checkStatus}
                            backgroundColor="black"
                            borderRadius="full"
                            isDisabled={isUploading}
                        >
                            <Text color="white" style={styles.cta}>
                                {t('stripeVerification.identityVerification.checkStatus')}
                            </Text>
                        </Button>
                    </>
                );
            }
        }

        // Fallback
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
                    onPress={onClose}
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

            {/* Actionsheet pour choisir la source du document d'identité */}
            <Actionsheet isOpen={showDocumentOptions} onClose={() => setShowDocumentOptions(false)}>
                <Actionsheet.Content>
                    <Actionsheet.Item
                        alignContent='center'
                        justifyContent='center'
                        onPress={() => takePhoto(false)}
                        startIcon={<FontAwesomeIcon icon={faCamera} size={20} color="#000" />}
                    >
                        {t('stripeVerification.documentOptions.takePhoto')}
                    </Actionsheet.Item>
                    <Actionsheet.Item
                        alignContent='center'
                        justifyContent='center'
                        onPress={() => pickFromGallery(false)}
                        startIcon={<FontAwesomeIcon icon={faImage} size={20} color="#000" />}
                    >
                        {t('stripeVerification.documentOptions.chooseFromGallery')}
                    </Actionsheet.Item>
                    <Actionsheet.Item onPress={() => setShowDocumentOptions(false)}>
                        {t('stripeVerification.documentOptions.cancel')}
                    </Actionsheet.Item>
                </Actionsheet.Content>
            </Actionsheet>

            {/* Actionsheet pour choisir la source de la selfie */}
            <Actionsheet isOpen={showSelfieOptions} onClose={() => setShowSelfieOptions(false)}>
                <Actionsheet.Content>
                    <Actionsheet.Item
                        alignContent='center'
                        justifyContent='center'
                        onPress={() => takePhoto(true)}
                        startIcon={<FontAwesomeIcon icon={faCamera} size={20} color="#000" />}
                    >
                        {t('stripeVerification.selfieOptions.takePhoto')}
                    </Actionsheet.Item>
                    <Actionsheet.Item
                        alignContent='center'
                        justifyContent='center'
                        onPress={() => pickFromGallery(true)}
                        startIcon={<FontAwesomeIcon icon={faImage} size={20} color="#000" />}
                    >
                        {t('stripeVerification.selfieOptions.chooseFromGallery')}
                    </Actionsheet.Item>
                    <Actionsheet.Item onPress={() => setShowSelfieOptions(false)}>
                        {t('stripeVerification.selfieOptions.cancel')}
                    </Actionsheet.Item>
                </Actionsheet.Content>
            </Actionsheet>
        </>
    );
};

export default StripeVerificationModal;