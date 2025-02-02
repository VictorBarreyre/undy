import React, { useState } from 'react';
import { Box, VStack } from 'native-base';
import { Image, SafeAreaView } from 'react-native';
import { styles } from '../infrastructure/theme/styles';


export function Background({ children }) {
    return (
        <Box flex={1} position="relative">
           
            <Image
                source={require('../assets/images/backgroundbp.png')}
                style={styles.staticBackground} 
                resizeMode="cover"
            />

            <Box flex={1} zIndex={1} backgroundColor="transparent">
                {children}
            </Box>
        </Box>
    );
}