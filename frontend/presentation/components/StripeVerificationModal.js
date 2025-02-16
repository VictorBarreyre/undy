import React, { useState } from 'react';
import { 
    VStack, Text, Button, Actionsheet, 
    Box, Progress, HStack 
} from 'native-base';
import { Platform, Alert } from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import { styles } from '../../infrastructure/theme/styles';
import { getAxiosInstance } from '../../data/api/axiosInstance';

const StripeVerificationActionSheet = ({ 
    isOpen, 
    onClose, 
    userData, 
    resetStripeAccount, 
    navigation 
}) => {
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
                console.log('User cancelled image picker');
            } else if (response.errorCode) {
                Alert.alert('Erreur', response.errorMessage || 'Une erreur est survenue');
            } else if (response.assets && response.assets.length > 0) {
                setIdentityDocument(response.assets[0]);
            }
        });
    };

    const uploadIdentityDocument = async () => {
        if (!identityDocument) {
            Alert.alert('Erreur', 'Veuillez sélectionner un document');
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
                    'Succès', 
                    'Votre document d\'identité a été soumis avec succès. Nous vérifions actuellement vos informations.'
                );
                onClose();
            } else {
                Alert.alert('Erreur', response.data.message || 'Échec de la vérification');
            }
        } catch (error) {
            console.error('Erreur d\'upload:', error);
            Alert.alert('Erreur', 'Une erreur est survenue lors de l\'upload');
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
                                Configuration du compte bancaire
                            </Text>

                            <Text
                                style={styles.caption}
                                color="#94A3B8"
                                textAlign="center"
                                mb={2}
                            >
                                Votre compte bancaire sera configuré automatiquement lors de la publication de votre premier secret.
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
                                    Publier un secret
                                </Text>
                            </Button>
                        </>
                    ) : userData?.stripeAccountStatus === 'active' && !userData?.stripeIdentityVerified ? (
                        <>
                            <Text style={styles.h4} textAlign="center">
                                Vérification d'identité
                            </Text>

                            <Text
                                style={styles.caption}
                                color="#94A3B8"
                                textAlign="center"
                                mb={2}
                            >
                                Pour finaliser la configuration de votre compte Stripe, 
                                nous avons besoin d'une photo de votre pièce d'identité.
                                Ne tardez pas si voulez pouvoir continuer à recevoir des paiements et à les transférer sur votre compte
                            </Text>

                            {identityDocument ? (
                                <Box>
                                    <Text style={styles.caption} textAlign="center">
                                        Document sélectionné : {identityDocument.fileName}
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
                                        Choisir un document
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
                                            Soumettre
                                        </Text>
                                    </Button>
                                )}
                            </HStack>
                        </>
                    ) : (
                        <>
                            <Text style={styles.h4} textAlign="center">
                                Compte Stripe configuré
                            </Text>

                            <Text
                                style={styles.caption}
                                color="#94A3B8"
                                textAlign="center"
                                mb={2}
                            >
                                Votre compte bancaire est actif. Vous pouvez réinitialiser ou gérer votre compte Stripe si nécessaire.
                            </Text>

                            <Button
                                onPress={resetStripeAccount}
                                backgroundColor="orange.500"
                                borderRadius="full"
                                mb={2}
                            >
                                <Text color="white" style={styles.cta}>
                                    Réinitialiser le compte Stripe
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
                                    Gérer mon compte
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