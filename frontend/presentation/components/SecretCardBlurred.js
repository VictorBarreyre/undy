import React, { useContext, useState, useEffect } from 'react';
import { Box, HStack, Text, Image, VStack } from 'native-base';
import { AuthContext } from '../../infrastructure/context/AuthContext';
import { styles } from '../../infrastructure/theme/styles';
import { BlurView } from '@react-native-community/blur';
import { StyleSheet, Platform } from 'react-native';
import { faEllipsis } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { Pressable } from 'react-native';
import BlurredTextComponent from './SelectiveBlurText';
import PaymentSheet from './PaymentSheet';
import { useCardData } from '../../infrastructure/context/CardDataContexte';
import { useNavigation } from '@react-navigation/native';



const SecretCardBlurred = ({ secret, isExpanded }) => {
    const { userData } = useContext(AuthContext);
    const [timeLeft, setTimeLeft] = useState('');
    const navigation = useNavigation();
    const { purchaseAndAccessConversation } = useCardData();

    const getTimeAgo = (createdAt) => {
        const diffTime = Date.now() - new Date(createdAt);
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 0) return "Aujourd'hui";
        if (diffDays === 1) return "Hier";
        if (diffDays < 7) return `Il y a ${diffDays} jours`;
        if (diffDays < 30) return `Il y a ${Math.floor(diffDays / 7)} semaine${Math.floor(diffDays / 7) > 1 ? 's' : ''}`;
        if (diffDays < 365) return `Il y a ${Math.floor(diffDays / 30)} mois`;
        return `Il y a ${Math.floor(diffDays / 365)} an${Math.floor(diffDays / 365) > 1 ? 's' : ''}`;
    };


    useEffect(() => {
        const calculateTimeLeft = () => {
            const expirationDate = new Date(secret.expiresAt);
            const now = new Date();
            const difference = expirationDate - now;

            if (difference <= 0) {
                return 'Expiré';
            }

            const days = Math.floor(difference / (1000 * 60 * 60 * 24));
            const hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
            const minutes = Math.floor((difference / 1000 / 60) % 60);

            return `${days}j ${hours}h ${minutes}m`;
        };

        setTimeLeft(calculateTimeLeft());
        const timer = setInterval(() => {
            setTimeLeft(calculateTimeLeft());
        }, 60000); // Mise à jour chaque minute

        return () => clearInterval(timer);
    }, [secret.expiresAt]);

    const handlePaymentSuccess = async (paymentId) => {
        try {
            const { conversationId, conversation } = await purchaseAndAccessConversation(
                secret._id,
                secret.price,
                paymentId
            );
    
            // Vérification et log des données
            console.log('Secret avant navigation:', secret);
            console.log('Conversation avant navigation:', conversation);
    
            // S'assurer que toutes les données nécessaires sont présentes
            const secretDataForNavigation = {
                _id: secret._id,
                label: secret.label,
                content: secret.content,
                price: secret.price,
                user: {
                    _id: secret.user?._id,
                    name: secret.user?.name || 'Utilisateur',
                    profilePicture: secret.user?.profilePicture
                },
                createdAt: secret.createdAt,
                expiresAt: secret.expiresAt
            };
    
            navigation.navigate('ChatTab', {
                screen: 'Chat',
                params: {
                    conversationId,
                    secretData: secretDataForNavigation,
                    conversation: {
                        ...conversation,
                        participants: conversation.participants?.map(p => ({
                            _id: p._id,
                            name: p.name || 'Utilisateur',
                            profilePicture: p.profilePicture
                        }))
                    },
                    showModalOnMount: true
                }
            });
        } catch (error) {
            console.error('Erreur lors de l\'achat:', error);
        }
    };


    return (
        <Box
            width='100%'
            height={isExpanded ? 'auto' : '100%'}
            borderRadius="md"
            p={4}
            mb={4}
            backgroundColor="white"  // Assurez-vous d'avoir un backgroundColor
            style={{
                ...styles.shadowBox,
                shadowColor: Platform.OS === 'ios' ? 'violet' : undefined,
                shadowOffset: Platform.OS === 'ios' ? { width: 0, height: 2 } : undefined,
                shadowOpacity: Platform.OS === 'ios' ? 0.2 : undefined,
                shadowRadius: Platform.OS === 'ios' ? 5 : undefined,
                elevation: 5  // Pour Android
            }}
            overflow='visible'  // Essayez 'visible' au lieu de 'hidden'
        >

            <VStack justifyContent="space-between" width='100%' space={2} flexGrow={1} flexShrink={1}>
                <HStack space={2} justifyContent="space-between" flexWrap="wrap">
                    <VStack>
                        <Text color='#94A3B8' style={styles.caption}>{getTimeAgo(secret.createdAt)}</Text>
                        <Text color='#FF78B2' mt={1} style={styles.littleCaption}>
                            Expire dans {timeLeft}
                        </Text>
                    </VStack>
                    <FontAwesomeIcon
                        icon={faEllipsis} // Icône des trois points
                        size={16}
                        color='#94A3B8'
                        style={{ marginRight: 10 }}
                    />
                </HStack>

                <Box justifyContent='center' flex={isExpanded ? 'unset' : 1}  overflow="hidden">
                    <BlurredTextComponent
                        content={secret.content || 'Aucune description disponible.'}
                        style={{ width: '100%' }}
                        textStyle={styles.h4}
                        maxLines={4}
                       
                    />
                </Box>

                <HStack alignItems="center" justifyContent='space-between'>
                    <Text style={styles.caption}>{secret.label}</Text>
                    <PaymentSheet
                        secret={secret}
                        onPaymentSuccess={handlePaymentSuccess}
                        onPaymentError={(error) => {
                            console.error('Erreur de paiement:', error);
                        }}
                    />
                </HStack>
            </VStack>

        </Box>
    );
};

const customStyles = StyleSheet.create({
    shadowBox: {
        shadowColor: 'violet',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
        elevation: 5
    },
});

export default SecretCardBlurred;  // N'oubliez pas cette ligne !