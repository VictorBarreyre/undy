import React from 'react';
import { View, Image, StyleSheet } from 'react-native';
import { styles as appStyles } from '../infrastructure/theme/styles';

export function Background({ children }) {
    return (
        <View style={styles.container}>
           
            <Image
                source={require('../assets/images/backgroundbp.png')}
                style={[appStyles.staticBackground, styles.backgroundImage]} 
                resizeMode="cover"
            />

            <View style={styles.content}>
                {children}
            </View>
        </View>
    );
}

// Styles spécifiques à ce composant
const styles = StyleSheet.create({
    container: {
        flex: 1,
        position: 'relative',
    },
    backgroundImage: {
        // Si vous avez besoin d'ajouter des styles supplémentaires à l'image
        // non inclus dans appStyles.staticBackground
    },
    content: {
        flex: 1,
        zIndex: 1,
        backgroundColor: 'transparent',
    }
});