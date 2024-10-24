import React, { useState, useContext, useEffect } from 'react';
import { VStack, Box, Input, Button, Text, Pressable } from 'native-base';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext'; // Importer le contexte d'authentification

export default function Profile({ navigation }) {
    const { userToken } = useContext(AuthContext); // Récupérer le token de l'utilisateur
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [message, setMessage] = useState('');
    const [showPassword, setShowPassword] = useState(false); // État pour gérer la visibilité du mot de passe

    // Fonction pour charger les informations du profil utilisateur
    useEffect(() => {
        const loadProfile = async () => {
            try {
                const response = await axios.get('http://localhost:5000/api/users/profile', {
                    headers: { Authorization: `Bearer ${userToken}` }
                });

                setName(response.data.name);
                setEmail(response.data.email);
            } catch (error) {
                setMessage('Erreur lors du chargement des informations du profil.');
            }
        };

        loadProfile();
    }, [userToken]);

    // Fonction pour mettre à jour le profil utilisateur
    const handleUpdateProfile = async () => {
        try {
            const response = await axios.put(
                'http://localhost:5000/api/users/profile',
                { name, email, password },
                { headers: { Authorization: `Bearer ${userToken}` } }
            );

            setMessage('Profil mis à jour avec succès.');
        } catch (error) {
            setMessage('Erreur lors de la mise à jour du profil.');
        }
    };

    return (
        <Box flex={1} justifyContent="center" p={5} bg="white">
            <VStack space={4} alignItems="center">
                <Text fontSize="2xl" fontWeight="bold" color="primary.500">
                    Mon Profil
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
                    placeholder="Nouveau mot de passe"
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
                <Button onPress={handleUpdateProfile} colorScheme="primary" w="100%">
                    Mettre à jour
                </Button>
                {message ? <Text color="red.500">{message}</Text> : null}
            </VStack>
        </Box>
    );
}
