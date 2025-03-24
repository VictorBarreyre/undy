import React, { useState } from 'react';
import {
    VStack, Text, Button, Actionsheet,
    Box, Progress, HStack, Icon
} from 'native-base';
import { Platform, Alert } from 'react-native';
import { launchImageLibrary, launchCamera } from 'react-native-image-picker';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faCamera, faImage } from '@fortawesome/free-solid-svg-icons';
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
    const [identityDocument, setIdentityDocument] = useState(null);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [isUploading, setIsUploading] = useState(false);
    const [showDocumentOptions, setShowDocumentOptions] = useState(false);

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
            Alert.alert(
                t('stripeVerification.errors.title'),
                t('stripeVerification.errors.selectDocument')
            );
            return;
        }

        const instance = getAxiosInstance();

        try {
            setIsUploading(true);

            // Préparer le document en base64 pour l'envoi
            const documentData = {
                image: `data:${identityDocument.type};base64,${identityDocument.base64}`,
                documentType: 'identity_document',
                documentSide: 'front' // Vous pourriez implémenter une option pour choisir recto/verso
            };

            // Envoi au serveur
            const response = await instance.post('/api/secrets/verify-identity', documentData, {
                onUploadProgress: (progressEvent) => {
                    const percentCompleted = Math.round(
                        (progressEvent.loaded * 100) / progressEvent.total
                    );
                    setUploadProgress(percentCompleted);
                }
            });

            if (response.data.success) {
                Alert.alert(
                    t('stripeVerification.success.title'),
                    t('stripeVerification.success.documentSubmitted'),
                    [
                        {
                            text: 'OK',
                            onPress: () => {
                                setIdentityDocument(null);
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
            }
        } catch (error) {
            console.error(t('stripeVerification.errors.uploadError'), error);

            // Afficher un message d'erreur plus détaillé si disponible
            const errorMessage = error.response?.data?.message ||
                error.message ||
                t('stripeVerification.errors.uploadFailed');

            Alert.alert(
                t('stripeVerification.errors.title'),
                errorMessage
            );
        } finally {
            setIsUploading(false);
            setUploadProgress(0);
        }
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
                        {!userData?.stripeAccountStatus || userData?.stripeAccountStatus === 'pending' ? (
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
                        ) : userData?.stripeAccountStatus === 'active' && !userData?.stripeIdentityVerified ? (
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
                                            />
                                        )}
                                    </Box>
                                ) : null}

                                <HStack space={2} justifyContent="center">
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
                                </HStack>
                            </>
                        ) : (
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
                                        // Action pour gérer le compte Stripe
                                    }}
                                    backgroundColor="black"
                                    borderRadius="full"
                                >
                                    <Text color="white" style={styles.cta}>
                                        {t('stripeVerification.accountConfigured.manageAccount')}
                                    </Text>
                                </Button>
                            </>
                        )}
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