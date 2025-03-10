import React, { useState } from 'react';
import { 
    VStack, Text, Button, Actionsheet, 
    Box, Progress, HStack 
} from 'native-base';
import { Platform, Alert } from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';
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

    const pickIdentityDocument = () => {
        launchImageLibrary({
            mediaType: 'photo',
            quality: 0.8,
            selectionLimit: 1,
            includeBase64: false,
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
            }
        });
    };

    const uploadIdentityDocument = async () => {
        if (!identityDocument) {
            Alert.alert(
                t('stripeVerification.errors.title'), 
                t('stripeVerification.errors.selectDocument')
            );
            return;
        }

        const instance = getAxiosInstance();
        const formData = new FormData();
        
        formData.append('identityDocument', {
            uri: identityDocument.uri,
            type: identityDocument.type,
            name: identityDocument.fileName
        });

        try {
            setIsUploading(true);
            const response = await instance.post('/api/users/verify-identity', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
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
                    t('stripeVerification.success.documentSubmitted')
                );
                onClose();
            } else {
                Alert.alert(
                    t('stripeVerification.errors.title'), 
                    response.data.message || t('stripeVerification.errors.verificationFailed')
                );
            }
        } catch (error) {
            console.error(t('stripeVerification.errors.uploadError'), error);
            Alert.alert(
                t('stripeVerification.errors.title'), 
                t('stripeVerification.errors.uploadFailed')
            );
        } finally {
            setIsUploading(false);
            setUploadProgress(0);
        }
    };

    return (
        <Actionsheet isOpen={isOpen} onClose={onClose}>
            <Actionsheet.Content 
                backgroundColor="white"
                maxHeight="100%"
                _content={{
                    py: 0,  // Supprime le padding vertical
                    px: 6   // Garde un padding horizontal si nécessaire
                }}
            >
                <VStack width="97%"  space={4}  px={4}>
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
                                            name: identityDocument.fileName
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
                                        {t('stripeVerification.identityVerification.chooseDocument')}
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
                                            {t('stripeVerification.identityVerification.submit')}
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
    );
};

export default StripeVerificationActionSheet;