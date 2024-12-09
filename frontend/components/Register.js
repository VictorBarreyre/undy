import React, { useState, useContext, useCallback } from 'react';
import { VStack, Box, Input, Button, Text, Link, Pressable, Image, Flex } from 'native-base';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import API_URL from '../config';
import { styles } from '../styles';

const Register = React.memo(function Register({ navigation }) {
    const { login } = useContext(AuthContext);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [message, setMessage] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    const handleRegister = useCallback(async () => {
        try {
            const response = await axios.post(`${API_URL}/api/users/register`, {
                name,
                email: email.trim().toLowerCase(),
                password,
            });

            if (response.data.token) {
                login(response.data.token);
                setMessage('Inscription réussie, connexion en cours...');
            } else {
                setMessage('Erreur lors de la génération du token.');
            }
        } catch (error) {
            console.error('Erreur Axios:', error.response || error.message);
            setMessage(error.response?.data?.message || "Erreur lors de l'inscription");
        }
    }, [name, email, password, login]);

    return (
        <Flex flex={1} justifyContent="center" alignItems="center" p={5}>
            <Image
                source={require('../assets/images/u1.png')}
                alt="Logo de l'application"
                style={{ width: 50, height: 50, marginBottom: 10, resizeMode: 'contain' }}
            />
            <VStack space={4} alignItems="center" w="90%">
                <Text style={styles.h2} marginBottom="3">
                    Inscription
                </Text>
                <Input style={styles.caption} placeholder="Nom" value={name} onChangeText={setName} />
                <Input style={styles.caption} placeholder="Email" value={email} onChangeText={setEmail} />
                <Input
                    style={styles.caption}
                    placeholder="Mot de passe"
                    value={password}
                    secureTextEntry={!showPassword}
                    onChangeText={setPassword}
                />
                <Pressable onPress={() => setShowPassword(!showPassword)}>
                    <Text color="primary.500">
                        {showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                    </Text>
                </Pressable>
                <Button style={styles.cta} onPress={handleRegister} w="100%">
                    S'inscrire
                </Button>
                {message ? <Text color="red.500">{message}</Text> : null}
                <Link
                    onPress={() => navigation.navigate('Login')}
                    mt={3}
                    _text={{ color: 'primary.500' }}
                >
                    Déjà un compte ? Connectez-vous ici
                </Link>
                
            </VStack>
        </Flex>
    );
});

export default Register;
