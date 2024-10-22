import React, { useState, useContext } from 'react';
import { View, TextInput, Button, Text, StyleSheet, TouchableOpacity } from 'react-native';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext'; // Importer le contexte d'authentification

export default function Login({ navigation }) {
    const { login } = useContext(AuthContext); // Récupérer la fonction login depuis le contexte
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [message, setMessage] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    const handleLogin = async () => {
        try {
            const response = await axios.post('http://localhost:5000/api/users/login', {
                email,
                password
            });

            if (response.data.token) {
                login(response.data.token); // Appelle login pour mettre à jour le contexte
                setMessage('Connexion réussie');
            } else {
                setMessage('Erreur lors de la génération du token.');
            }
        } catch (error) {
            setMessage('Erreur lors de la Connexion');
        }
    };

    return (
        <View style={styles.container}>
            <Text>Connexion</Text>
            <TextInput
                style={styles.input}
                placeholder="Email"
                value={email}
                onChangeText={setEmail}
            />
            <TextInput
                style={styles.input}
                placeholder="Mot de passe"
                value={password}
                secureTextEntry={!showPassword}
                onChangeText={setPassword}
            />
            <TouchableOpacity
                style={styles.showButton}
                onPress={() => setShowPassword(!showPassword)}
            >
                <Text>{showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}</Text>
            </TouchableOpacity>

            <Button title="Se connecter" onPress={handleLogin} />
            {message ? <Text>{message}</Text> : null}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        padding: 20,
    },
    input: {
        height: 40,
        borderColor: 'gray',
        borderWidth: 1,
        marginBottom: 10,
        padding: 10,
    },
});
