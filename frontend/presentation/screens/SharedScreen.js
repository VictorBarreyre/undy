import React, { useState, useRef, useEffect } from 'react';
import { Animated } from 'react-native';
import { Box } from 'native-base';
import { useCardData } from '../../infrastructure/context/CardDataContexte';
import { Background } from '../../navigation/Background';
import { useNavigation } from '@react-navigation/native';
import PaymentSheet from '../components/PaymentSheet';
import TypewriterLoader from '../components/TypewriterLoader';
import CardHome from '../components/CardHome';

const SharedSecretScreen = ({ route }) => {
    const { secretId } = route.params;
    const [secretData, setSecretData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isTransitioning, setIsTransitioning] = useState(false);
    const navigation = useNavigation();
    const { purchaseAndAccessConversation } = useCardData();
    const fadeAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        const fetchSecretData = async () => {
            try {
                const response = await fetch(`${API_URL}/api/secrets/shared/${secretId}`, {
                    headers: {
                        'Authorization': `Bearer ${yourAuthToken}`
                    }
                });
                
                const data = await response.json();
                setSecretData(data.secret);
                
                // Si déjà acheté, rediriger directement vers la conversation
                if (data.hasUserPurchased) {
                    navigation.replace('ChatScreen', {
                        conversationId: data.conversation._id,
                        secretData: data.secret,
                        showModalOnMount: true
                    });
                }
            } catch (error) {
                console.error('Erreur:', error);
                Alert.alert('Erreur', 'Impossible de charger le secret.');
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
            console.error('Erreur lors de l\'achat:', error);
            setLoading(false);
            setIsTransitioning(false);
            fadeAnim.setValue(1);
        }
    };

    if (loading || isTransitioning) {
        return <TypewriterLoader text="Undy..." />;
    }

    return (
        <Background>
            <Animated.View style={[{ flex: 1, opacity: fadeAnim }]}>
                <Box
                    flex={1}
                    paddingX={5}
                    paddingY={10}
                    justifyContent="space-between"
                >
                    {/* Utilisation de CardHome */}
                    <Box flex={1}>
                        <CardHome cardData={secretData} />
                    </Box>

                    {/* PaymentSheet */}
                    <PaymentSheet
                        secret={secretData}
                        onPaymentSuccess={handlePaymentSuccess}
                        onPaymentError={(error) => {
                            console.error('Erreur de paiement:', error);
                            setLoading(false);
                            setIsTransitioning(false);
                            fadeAnim.setValue(1);
                        }}
                    />
                </Box>
            </Animated.View>
        </Background>
    );
};

export default SharedSecretScreen;