import React, { useState, useContext, useCallback } from 'react';
import { VStack, Box, Input, Button, Text, Link, Pressable, Image } from 'native-base';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { DATABASE_URL } from '@env';

const Register = React.memo(function Register({ navigation }) {
    const { login } = useContext(AuthContext);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [message, setMessage] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    const handleRegister = useCallback(async () => {
        try {
            const response = await axios.post(`${DATABASE_URL}/api/users/register`, {
                name,
                email,
                password
            });
            if (response.data.token) {
                login(response.data.token);
                setMessage('Inscription réussie, connexion en cours...');
            } else {
                setMessage('Erreur lors de la génération du token.');
            }
        } catch (error) {
            setMessage("Erreur lors de l'inscription");
        }
    }, [name, email, password, login]);

    return (
        <Box flex={1} justifyContent="center" alignItems="center" p={5} bg="white">
            <Image source={require('../assets/images/u.svg')} style={{ width: 50, height: 50, marginBottom: 10 }} />
            <VStack space={4} alignItems="center" w="90%">
                <Text fontSize="2xl" fontWeight="bold" color="black">Inscription</Text>
                <Input placeholder="Nom" value={name} onChangeText={setName} variant="outline" w="100%" />
                <Input placeholder="Email" value={email} onChangeText={setEmail} variant="outline" w="100%" />
                <Input placeholder="Mot de passe" value={password} secureTextEntry={!showPassword} onChangeText={setPassword} variant="outline" w="100%" />
                <Pressable onPress={() => setShowPassword(!showPassword)}>
                    <Text color="blue.500">
                        {showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                    </Text>
                </Pressable>
                <Button onPress={handleRegister} backgroundColor="black" w="100%">S'inscrire</Button>
                {message ? <Text color="red.500">{message}</Text> : null}
                <Link onPress={() => navigation.navigate('Login')} mt={3} _text={{ color: "blue.500" }}>Déjà un compte ? Connectez-vous ici</Link>
            </VStack>
        </Box>
    );
});

export default Register;
