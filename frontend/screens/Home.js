import React, { useContext } from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';
import { AuthContext } from '../context/AuthContext'; // Importer le contexte d'authentification

export default function Home() {
    const { logout } = useContext(AuthContext); // Récupérer la fonction logout depuis le contexte

    return (
        <View style={styles.container}>
            <Text>Bienvenue à la maison !</Text>
            <Button title="Déconnexion" onPress={logout} /> {/* Déconnecter l'utilisateur */}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
});
