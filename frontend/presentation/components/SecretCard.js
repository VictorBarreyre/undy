import React, { useContext } from 'react';
import { Box, HStack, Text, Image, VStack } from 'native-base';
import { AuthContext } from '../../infrastructure/context/AuthContext';
import { styles } from '../../infrastructure/theme/styles';
import { StyleSheet, Platform } from 'react-native'

const SecretCard = ({ secret }) => {
    const { userData } = useContext(AuthContext);

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

    return (
        <Box
            width='100%'  // Changé de 90% à 100%
            height="100%" // Ajouté
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
            <VStack justifyContent="space-between" width='100%' space={2} flexGrow={1} flexShrink={1}>
                <HStack space={2} justifyContent="space-between" flexWrap="wrap">
                    <Text color='#94A3B8' style={styles.caption}>{getTimeAgo(secret.createdAt)}</Text>
                </HStack>
                <Text style={styles.h3}>
                    "{secret.content}"
                </Text>
                <HStack justifyContent='space-between'>
                    <Text style={styles.caption}>{secret.label}</Text>
                    <Text style={styles.caption}>Prix : {secret.price} €</Text>
                </HStack>
            </VStack>

        </Box>
    );
};

export default SecretCard;
