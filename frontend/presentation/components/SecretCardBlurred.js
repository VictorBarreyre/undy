import React, { useContext, useState, useEffect } from 'react';
import { Box, HStack, Text, Image, VStack } from 'native-base';
import { AuthContext } from '../../infrastructure/context/AuthContext';
import { styles } from '../../infrastructure/theme/styles';
import { BlurView } from '@react-native-community/blur';
import { StyleSheet, Platform } from 'react-native'

const SecretCardBlurred = ({ secret }) => {
    const { userData } = useContext(AuthContext);
    const [timeLeft, setTimeLeft] = useState('');


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


    return (
        <Box
            width='100%'
            height='100%'
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
                </HStack>

                <Box position="relative" overflow="hidden">
                    <Text style={styles.caption} flexShrink={1}>
                        <Text style={styles.caption} color="#FF78B2">Undy : </Text>
                        {secret.content}
                    </Text>
                    <BlurView
                        style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            backgroundColor: 'rgba(255, 255, 255, 0.8)',  // Ajout d'une légère opacité
                        }}
                        blurType="light"
                        blurAmount={3}  // Réduction de l'intensité du flou
                        overlayColor="transparent"  // Important pour l'effet naturel
                    />
                    {/* Ajout d'un dégradé sur les bords */}
                    <Box
                        position="absolute"
                        width='130%'
                        top={0}
                        left={0}
                        right={0}
                        bottom={0}
                        style={{
                            backgroundColor: 'transparent',
                            shadowColor: '#fff',
                            shadowOffset: { width: 0, height: 0 },
                            shadowOpacity: 0.3,
                            shadowRadius: 10,
                            elevation: 5,
                        }}
                    />
                </Box>

                <HStack justifyContent='space-between'>
                    <Text style={styles.caption}>{secret.label}</Text>
                    <Text style={styles.caption}>Prix : {secret.price} €</Text>
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