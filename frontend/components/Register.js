import React, { useState, useContext } from 'react';
import { VStack, Box, Input, Button, Text, Link, Pressable } from 'native-base';
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
        <Box flex={1} justifyContent="center" p={5} bg="white">
            <VStack space={4} alignItems="center">
                <Text fontSize="2xl" fontWeight="bold" color="primary.500">
                    Inscription
                </Text>
                <Input
                    placeholder="Nom"
                    value={name}
                    onChangeText={setName}
                    variant="outline"
                    w="100%"
                />
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
                    <Text color="blue.500">{showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}</Text>
                </Pressable>
                <Button onPress={handleRegister} colorScheme="primary" w="100%">
                    S'inscrire
                </Button>
                {message ? <Text color="red.500">{message}</Text> : null}
                <Link onPress={() => navigation.navigate('Login')} mt={3} _text={{ color: "blue.500" }}>
                    Déjà un compte ? Connectez-vous ici
                </Link>
            </VStack>
        </Box>
    );
}
