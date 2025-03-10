import React, { useState, useRef, useEffect } from 'react';
import { Animated, Alert, TouchableOpacity, SafeAreaView, StyleSheet } from 'react-native';
import { VStack, Box, Text, HStack, Pressable } from 'native-base';
import { useCardData } from '../../infrastructure/context/CardDataContexte';
import { Background } from '../../navigation/Background';
import { useNavigation } from '@react-navigation/native';
import PaymentSheet from '../components/PaymentSheet';
import TypewriterLoader from '../components/TypewriterLoader';
import CardHome from '../components/CardHome';
import { styles } from '../../infrastructure/theme/styles';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faChevronLeft } from '@fortawesome/free-solid-svg-icons';
import { useTranslation } from 'react-i18next';

const customStyles = StyleSheet.create({
    shadowBox: {
        shadowColor: 'violet',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
        elevation: 5
    },
});

const SharedSecretScreen = ({ route }) => {
    const { t } = useTranslation();
    const { secretId } = route.params;
    const [secretData, setSecretData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isTransitioning, setIsTransitioning] = useState(false);
    const navigation = useNavigation();
    const { purchaseAndAccessConversation, getSharedSecret } = useCardData();
    const fadeAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        const fetchSecretData = async () => {
            try {
                const data = await getSharedSecret(secretId);

                const formattedSecret = {
                    ...data.secret,
                    user: data.secret.user,
                    expiresAt: data.secret.expiresAt,
                };

                setSecretData(formattedSecret);

                if (data.hasUserPurchased) {
                    navigation.replace('ChatScreen', {
                        conversationId: data.conversation._id,
                        secretData: formattedSecret,
                        showModalOnMount: true
                    });
                }
            } catch (error) {
                console.error(t('sharedSecret.errors.fetchError'), error);
                Alert.alert(
                    t('sharedSecret.errors.title'), 
                    t('sharedSecret.errors.unableToLoad')
                );
            } finally {
                setLoading(false);
            }
        };

        fetchSecretData();
    }, [secretId]);

    const handlePaymentSuccess = async (paymentId) => {
        try {
            setIsTransitioning(true);

            Animated.timing(fadeAnim, {
                toValue: 0,
                duration: 300,
                useNativeDriver: true,
            }).start(async () => {
                setLoading(true);

                const { conversationId, conversation } = await purchaseAndAccessConversation(
                    secretData._id,
                    secretData.price,
                    paymentId
                );

                navigation.navigate('ChatTab', {
                    screen: 'Chat',
                    params: {
                        conversationId,
                        secretData,
                        conversation,
                        showModalOnMount: true
                    }
                });
            });
        } catch (error) {
            console.error(t('sharedSecret.errors.purchaseError'), error);
            setLoading(false);
            setIsTransitioning(false);
            fadeAnim.setValue(1);
        }
    };

    if (loading || isTransitioning) {
        return <TypewriterLoader text={t('sharedSecret.loading')} />;
    }

    return (
        <Background>
            <SafeAreaView style={{ flex: 1 }}>
                <VStack
                    flex={1}
                    justifyContent="center"
                    alignItems="center"
                    paddingX={5}
                    paddingY={5}
                    space={4}
                >
                    <VStack
                        justifyContent="center"
                        alignItems="center"
                        space={2}
                    >
                        <HStack
                            width="100%"
                            alignItems="center"
                            position="relative"
                        >
                            <Pressable
                                style={{ position: 'absolute', left: 0, padding: 10, zIndex: 50 }}
                                onPress={() => {
                                    navigation.navigate('MainApp');
                                }}
                                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}  // Augmente la zone de touch
                            >
                                <FontAwesomeIcon
                                    icon={faChevronLeft}
                                    size={16}
                                    color="black"
                                />
                            </Pressable>
                            <VStack
                                flex={1}
                                alignItems="center"
                            >
                                <Text style={styles.h3}>
                                    {t('sharedSecret.title')}
                                </Text>
                                <Text style={styles.h5}>
                                    {t('sharedSecret.subtitle')}
                                </Text>
                            </VStack>
                        </HStack>
                    </VStack>
                    <Box
                        width="100%"
                        flex={1}
                        borderRadius="lg"
                        backgroundColor="white"
                        marginTop={2}
                        paddingTop={1}
                        style={customStyles.shadowBox}
                    >
                        <VStack
                            flex={1}
                            alignItems="center"
                            justifyContent="center"
                            paddingX={1}
                            space={2}
                        >
                            {secretData ? (
                                <CardHome cardData={secretData} />
                            ) : (
                                <TypewriterLoader />
                            )}
                        </VStack>
                    </Box>

                    {secretData && (
                        <Box width="100%" paddingTop={4} >
                            <PaymentSheet
                                secret={secretData}
                                onPaymentSuccess={handlePaymentSuccess}
                                onPaymentError={(error) => {
                                    console.error(t('sharedSecret.errors.paymentError'), error);
                                    setLoading(false);
                                    setIsTransitioning(false);
                                    fadeAnim.setValue(1);
                                }}
                            />
                        </Box>
                    )}
                </VStack>
            </SafeAreaView>
        </Background>
    );
};

export default SharedSecretScreen;