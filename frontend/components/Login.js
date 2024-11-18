import React, { useState, useContext, useCallback } from 'react';
import { VStack, Box, Input, Button, Text, Pressable, Link,Image } from 'native-base';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import API_URL from '../config';

const Login = React.memo(function Login({ navigation }) {
    const { login } = useContext(AuthContext);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [message, setMessage] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    const handleLogin = useCallback(async () => {
        try {
            const response = await axios.post(`${API_URL}/api/users/login`, {
                email: email.trim().toLowerCase(), // Supprime les espaces et met en minuscules
                password
            });
    
            if (response.data.token) {
                login(response.data.token);
                setMessage('Connexion réussie');
            } else {
                setMessage('Erreur lors de la génération du token.');
            }
        } catch (error) {
            console.error('Erreur Axios:', error.response || error.message);
            setMessage(
                error.response?.data?.message || 'Erreur lors de la connexion'
            );
        }
    }, [email, password, login]);


    return (
        <Box flex={1} justifyContent="center" alignItems="center" p={5} bg="white">
            <Image source={require('../assets/images/u1.png')} alt="Logo de l'application" style={{ width: 50, height: 50, marginBottom: 10,resizeMode: 'contain' }} />
            <VStack space={4} alignItems="center" w="90%">
                <Text fontSize="2xl" fontWeight="bold" color="black" marginBottom="3">
                    Connexion
                </Text>
                <Input
                    placeholder="Email"
                    value={email}
                    onChangeText={setEmail}
                    variant="outline"
                    w="100%"
                    _focus={{
                        borderColor: "blue.500", 
                        backgroundColor: "gray.100" // (optionnel) Couleur d'arrière-plan en focus
                        // Couleur de la bordure en focus
                    }}
                />
                <Input
                    placeholder="Mot de passe"
                    value={password}
                    secureTextEntry={!showPassword}
                    onChangeText={setPassword}
                    variant="outline"
                    w="100%"
                    _focus={{
                        borderColor: "blue.500",
                        backgroundColor: "gray.100" // (optionnel) Couleur d'arrière-plan en focus
                        // Couleur de la bordure en focus
                    }}
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
});

export default Login;
