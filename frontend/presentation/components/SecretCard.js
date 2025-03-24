import React, { useState, useContext, useEffect } from 'react';
import { Box, HStack, Text, VStack, Pressable } from 'native-base';
import { AuthContext } from '../../infrastructure/context/AuthContext';
import { useCardData } from '../../infrastructure/context/CardDataContexte';
import { styles } from '../../infrastructure/theme/styles';
import { StyleSheet, Platform, Alert } from 'react-native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faEllipsis, faTrashAlt } from '@fortawesome/free-solid-svg-icons';
import { useTranslation } from 'react-i18next';
import { useDateFormatter } from '../../utils/dateFormatters';

const calculatePrices = (originalPrice) => {
    const buyerMargin = 0.10; // 10% pour l'acheteur
    const sellerMargin = 0.15; // 15% pour le vendeur
    
    const buyerPrice = originalPrice * (1 + buyerMargin);
    const sellerEarnings = originalPrice * (1 - sellerMargin);
    
    return {
        originalPrice,
        buyerPrice: Number(buyerPrice.toFixed(2)),
        sellerEarnings: Number(sellerEarnings.toFixed(2))
    };
};

const SecretCard = ({ secret, isPurchased = false, onDeleteSuccess }) => {
    const { t } = useTranslation();
    const dateFormatter = useDateFormatter();
    const { userData } = useContext(AuthContext);
    const [timeLeft, setTimeLeft] = useState('');
    const priceDetails = calculatePrices(secret.price);
    const [isDeleting, setIsDeleting] = useState(false);
    
    // Accéder aux fonctions du contexte CardData
    const { deleteSecret } = useCardData();

    const getTimeAgo = (createdAt) => {
        const diffTime = Date.now() - new Date(createdAt);
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 0) return t('secretCard.timeAgo.today');
        if (diffDays === 1) return t('secretCard.timeAgo.yesterday');
        if (diffDays < 7) return t('secretCard.timeAgo.days', { count: diffDays });
        if (diffDays < 30) {
            const weeks = Math.floor(diffDays / 7);
            return t('secretCard.timeAgo.weeks', { count: weeks });
        }
        if (diffDays < 365) {
            const months = Math.floor(diffDays / 30);
            return t('secretCard.timeAgo.months', { count: months });
        }
        const years = Math.floor(diffDays / 365);
        return t('secretCard.timeAgo.years', { count: years });
    };

    useEffect(() => {
        const calculateTimeLeft = () => {
            return dateFormatter.formatTimeLeft(secret.expiresAt);
        };

        setTimeLeft(calculateTimeLeft());
        const timer = setInterval(() => {
            setTimeLeft(calculateTimeLeft());
        }, 60000);

        return () => clearInterval(timer);
    }, [secret.expiresAt, dateFormatter]);

    const handleDelete = async () => {
        try {
            // Demander confirmation directement avec Alert
            Alert.alert(
                t('secretCard.deleteConfirm.title', 'Supprimer ce secret ?'),
                t('secretCard.deleteConfirm.message', 'Cette action est irréversible.'),
                [
                    {
                        text: t('secretCard.deleteConfirm.cancel', 'Annuler'),
                        style: 'cancel'
                    },
                    {
                        text: t('secretCard.deleteConfirm.confirm', 'Supprimer'),
                        style: 'destructive',
                        onPress: async () => {
                            setIsDeleting(true);
                            try {
                                // Supprimer le secret
                                await deleteSecret(secret._id);
                                
                                // Notifier le parent du succès de la suppression
                                if (onDeleteSuccess) {
                                    onDeleteSuccess(secret._id);
                                }
                                
                                // Afficher une confirmation
                                Alert.alert(
                                    t('secretCard.deleteSuccess.title', 'Secret supprimé'),
                                    t('secretCard.deleteSuccess.message', 'Le secret a été supprimé avec succès.')
                                );
                            } catch (error) {
                                console.error('Erreur lors de la suppression du secret:', error);
                                Alert.alert(
                                    t('secretCard.deleteError.title', 'Erreur'),
                                    t('secretCard.deleteError.message', 'Impossible de supprimer ce secret.')
                                );
                            } finally {
                                setIsDeleting(false);
                            }
                        }
                    }
                ]
            );
        } catch (error) {
            console.error('Erreur lors de la confirmation de suppression:', error);
        }
    };

    const renderPriceInfo = () => {
        // Si c'est un secret acheté
        if (isPurchased) {
            return (
                <Text style={styles.caption}>
                    {t('secretCard.pricePaid', { price: priceDetails.buyerPrice })}
                </Text>
            );
        }

        // Si c'est le créateur du secret qui le voit
        if (secret.user === userData?.id) {
            return (
                <HStack justifyContent="space-between" alignItems="center">
                    <Text style={styles.caption}>{secret.label}</Text>
                    <VStack alignItems="end">
                       
                        <Text style={[styles.littleCaption, { color: '#94A3B8' }]}>
                            {t('secretCard.yourEarnings', { earnings: priceDetails.sellerEarnings })}
                        </Text>
                    </VStack>
                </HStack>
            );
        }

        // Pour les autres utilisateurs
        return (
            <HStack justifyContent="space-between">
                <Text style={styles.caption}>{secret.label}</Text>
                <Text style={styles.caption}>
                    {t('secretCard.price', { price: priceDetails.buyerPrice })}
                </Text>
            </HStack>
        );
    };

    const isOwner = secret.user === userData?.id;

    return (
        <Box
            width="100%"
            height="100%"
            borderRadius="md"
            p={4}
            backgroundColor="white"
            style={{
                ...styles.shadowBox,
                shadowColor: Platform.OS === 'ios' ? 'violet' : undefined,
                shadowOffset: Platform.OS === 'ios' ? { width: 0, height: 2 } : undefined,
                shadowOpacity: Platform.OS === 'ios' ? 0.2 : undefined,
                shadowRadius: Platform.OS === 'ios' ? 5 : undefined,
                elevation: 5
            }}
        >
            <VStack justifyContent="space-between" width="100%" space={2} flexGrow={1} flexShrink={1}>
                <HStack space={2} justifyContent="space-between" flexWrap="wrap">
                    <VStack>
                        <Text color="#94A3B8" style={styles.caption}>{getTimeAgo(secret.createdAt)}</Text>
                        <Text color="#FF78B2" mt={1} style={styles.littleCaption}>
                            {t('secretCard.expiresIn')} {timeLeft}
                        </Text>
                    </VStack>
                    
                    {/* Icône de suppression si l'utilisateur est propriétaire */}
                    {isOwner ? (
                        <Pressable onPress={handleDelete} disabled={isDeleting}>
                            <FontAwesomeIcon
                                icon={faTrashAlt}
                                size={15}
                                color="#FF78B2"
                              
                            />
                        </Pressable>
                    ) : (
                        <FontAwesomeIcon
                            icon={faEllipsis}
                            size={16}
                            color="#94A3B8"
                      
                        />
                    )}
                </HStack>
                
                <Text
                    style={[
                        styles.h4,
                        {
                            flexShrink: 1,
                            flexWrap: 'wrap',
                        }
                    ]}
                    numberOfLines={10}
                    ellipsizeMode="tail"
                >
                    "{secret.content}"
                </Text>

                {renderPriceInfo()}
            </VStack>
        </Box>
    );
};

export default SecretCard;