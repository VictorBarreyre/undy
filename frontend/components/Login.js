import React, { useState, useContext } from 'react';
import { VStack, Box, Input, Button, Text, Pressable, Link } from 'native-base';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { DATABASE_URL } from '@env';

export default function Login({ navigation }) {
    const { login } = useContext(AuthContext);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [message, setMessage] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    const handleLogin = async () => {
        try {
            const response = await axios.post(`${DATABASE_URL}/api/users/login`,{
                email,
                password
            });

            if (response.data.token) {
                login(response.data.token);
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
                <Text fontSize="2xl" fontWeight="bold" color="black">
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
                <Button onPress={handleLogin} backgroundColor="black" w="100%">
                    Se connecter
                </Button>
                {message ? <Text color="red.500">{message}</Text> : null}
                <Link onPress={() => navigation.navigate('Register')} mt={3} _text={{ color: "blue.500" }}>
                    Pas encore de compte ? Inscrivez-vous ici
                </Link>
            </VStack>
        </Box>
    );
}
