import React, { useState, useContext } from 'react';
import { View, TextInput, Button, Text, StyleSheet, TouchableOpacity } from 'react-native';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext'; // Importer le contexte d'authentification

export default function Register({ navigation }) {
    const { login } = useContext(AuthContext); // Récupérer la fonction login depuis le contexte
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [message, setMessage] = useState('');
    const [showPassword, setShowPassword] = useState(false); // État pour gérer la visibilité du mot de passe

    const handleRegister = async () => {
        try {
            const response = await axios.post('http://localhost:5000/api/users/register', {
                name,
                email,
                password
            });

            if (response.data.token) {
                // Appeler la fonction login pour stocker le token et mettre à jour l'état de connexion
                login(response.data.token);
                setMessage('Inscription réussie, connexion en cours...');
            } else {
                setMessage('Erreur lors de la génération du token.');
            }
        } catch (error) {
            setMessage('Erreur lors de l\'inscription');
        }
    };

    return (
        <View style={styles.container}>
            <Text>Inscription</Text>
            <TextInput
                style={styles.input}
                placeholder="Nom"
                value={name}
                onChangeText={setName}
            />
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
                onPress={() => setShowPassword(!showPassword)} // Basculer la visibilité
            >
                <Text>{showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}</Text>
            </TouchableOpacity>
            <Button title="S'inscrire" onPress={handleRegister} />
            {message ? <Text>{message}</Text> : null}
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                <Text style={styles.linkText}>Déjà un compte ? Connectez-vous ici</Text>
            </TouchableOpacity>
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
    showButton: {
        padding: 5,
    },
    linkText: {
        marginTop: 15,
        color: 'blue',
        textAlign: 'center',
    },
});
