import React, { useState } from 'react';
import { Box, VStack } from 'native-base';
import { Image, SafeAreaView } from 'react-native';
import { styles } from '../infrastructure/theme/styles';


export function Background({ children }) {
    return (
        <Box flex={1} position="relative">
            {/* Fond statique derrière tout */}
            <Image
                source={require('../assets/images/backgroundbp.png')}
                style={styles.staticBackground} // zIndex: -1 est appliqué ici
                resizeMode="cover"
            />
            {/* Contenu des enfants */}
            <Box flex={1} zIndex={1} backgroundColor="transparent">
                {children}
            </Box>
        </Box>
    );
}