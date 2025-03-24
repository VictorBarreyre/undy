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

const StripeVerificationActionSheet = ({
    isOpen,
    onClose,
    userData,
    resetStripeAccount,
    navigation
}) => {
    const { t } = useTranslation();
    const { handleIdentityVerification, checkIdentityVerificationStatus } = useCardData();
    const [identityDocument, setIdentityDocument] = useState(null);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [isUploading, setIsUploading] = useState(false);
    const [showDocumentOptions, setShowDocumentOptions] = useState(false);
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
            const result = await checkIdentityVerificationStatus();
            if (result.success) {
                setVerificationStatus({
                    verified: result.verified,
                    status: result.status
                });
            }
        };

        if (isOpen && userData?.stripeAccountStatus === 'active') {
            checkStatus();
        }
    }, [isOpen, userData]);

    // Fonction pour obtenir une image depuis la galerie
    const pickFromGallery = () => {
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
                setIdentityDocument(response.assets[0]);
                setShowDocumentOptions(false);
            }
        });
    };

    // Fonction pour prendre une photo avec l'appareil photo
    const takePhoto = () => {
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
                setIdentityDocument(response.assets[0]);
                setShowDocumentOptions(false);
            }
        });
    };

    // Fonction pour ouvrir le menu de sélection du document
    const pickIdentityDocument = () => {
        setShowDocumentOptions(true);
    };

    // Fonction pour soumettre le document d'identité à Stripe
    const uploadIdentityDocument = async () => {
        if (!identityDocument) {
            Alert.alert('Erreur', 'Veuillez sélectionner un document');
            return;
        }
    
        try {
            setIsUploading(true);
            
            const documentData = {
                image: `data:${identityDocument.type};base64,${identityDocument.base64}`,
                documentType: 'identity_document', // Ou permettre à l'utilisateur de choisir
                documentSide: 'front'
            };
    
            const result = await handleIdentityVerification(userData, documentData);
    
            if (result.success && result.verificationUrl) {
                // Ouvrir l'URL de vérification Stripe
                Linking.openURL(result.verificationUrl);
    
                Alert.alert(
                    'Vérification d\'identité',
                    'Veuillez compléter la vérification dans le navigateur'
                );
            } else {
                Alert.alert('Erreur', result.message || 'Échec de la vérification');
            }
        } catch (error) {
            console.error('Erreur lors de la vérification:', error);
            Alert.alert('Erreur', 'Une erreur est survenue');
        } finally {
            setIsUploading(false);
        }
    };
    
    const checkStatus = async () => {
        try {
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
                                    // Vous pourriez ajouter une action pour ouvrir le dashboard Stripe
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
                        {verificationStatus.status === 'pending' 
                            ? t('stripeVerification.identityVerification.pending')
                            : t('stripeVerification.identityVerification.description')}
                    </Text>

                    {identityDocument ? (
                        <Box>
                            <Text style={styles.caption} textAlign="center">
                                {t('stripeVerification.identityVerification.documentSelected', {
                                    name: identityDocument.fileName || 'Photo'
                                })}
                            </Text>
                            {isUploading && (
                                <Progress
                                    value={uploadProgress}
                                    mx={4}
                                    my={2}
                                    colorScheme="emerald"
                                />
                            )}
                        </Box>
                    ) : null}

                    <HStack space={2} justifyContent="center">
                        {verificationStatus.status === 'pending' ? (
                            // Si en attente, montrer uniquement le bouton de vérification
                            <Button
                                onPress={checkStatus}
                                backgroundColor="gray.700"
                                borderRadius="full"
                                flex={1}
                            >
                                <Text color="white" style={styles.cta}>
                                    {t('stripeVerification.identityVerification.checkStatus')}
                                </Text>
                            </Button>
                        ) : (
                            // Sinon, montrer les boutons pour télécharger un document
                            <>
                                <Button
                                    onPress={pickIdentityDocument}
                                    backgroundColor="gray.200"
                                    borderRadius="full"
                                    flex={1}
                                >
                                    <Text color="black" style={styles.cta}>
                                        {identityDocument
                                            ? t('stripeVerification.identityVerification.changeDocument')
                                            : t('stripeVerification.identityVerification.chooseDocument')
                                        }
                                    </Text>
                                </Button>

                                {identityDocument && (
                                    <Button
                                        onPress={uploadIdentityDocument}
                                        backgroundColor="black"
                                        borderRadius="full"
                                        flex={1}
                                        isDisabled={isUploading}
                                    >
                                        <Text color="white" style={styles.cta}>
                                            {isUploading
                                                ? t('stripeVerification.identityVerification.uploading')
                                                : t('stripeVerification.identityVerification.submit')
                                            }
                                        </Text>
                                    </Button>
                                )}
                            </>
                        )}
                    </HStack>
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
        <>
            <Actionsheet isOpen={isOpen && !showDocumentOptions} onClose={onClose}>
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
                        onPress={takePhoto}
                        startIcon={<FontAwesomeIcon icon={faCamera} size={20} color="#000" />}
                    >
                        {t('stripeVerification.documentOptions.takePhoto')}
                    </Actionsheet.Item>
                    <Actionsheet.Item
                        alignContent='center'
                        justifyContent='center'
                        onPress={pickFromGallery}
                        startIcon={<FontAwesomeIcon icon={faImage} size={20} color="#000" />}
                    >
                        {t('stripeVerification.documentOptions.chooseFromGallery')}
                    </Actionsheet.Item>
                    <Actionsheet.Item onPress={() => setShowDocumentOptions(false)}>
                        {t('stripeVerification.documentOptions.cancel')}
                    </Actionsheet.Item>
                </Actionsheet.Content>
            </Actionsheet>
        </>
    );
};

export default StripeVerificationActionSheet;