import React, { useState, useContext } from 'react';
import { VStack, Box, Input, Button, Text, Pressable } from 'native-base';
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
        <Box flex={1} justifyContent="center" p={5} bg="white">
            <VStack space={4} alignItems="center">
                <Text fontSize="2xl" fontWeight="bold" color="primary.500">
                    Connexion
                </Text>
                <Input
                    placeholder="Email"
                    value={email}
                    onChangeText={setEmail}
                    variant="outline"
                    w="100%"
                />
                <Input
                    placeholder="Mot de passe"
                    value={password}
                    secureTextEntry={!showPassword}
                    onChangeText={setPassword}
                    variant="outline"
                    w="100%"
                />
                <Pressable onPress={() => setShowPassword(!showPassword)}>
                    <Text color="blue.500">
                        {showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                    </Text>
                </Pressable>
                <Button onPress={handleLogin} colorScheme="primary" w="100%">
                    Se connecter
                </Button>
                {message ? <Text color="red.500">{message}</Text> : null}
                <Text mt={3} color="blue.500" onPress={() => navigation.navigate('Register')}>
                    Vous n'avez pas de compte ? Inscrivez-vous ici
                </Text>
            </VStack>
        </Box>
    );
}
