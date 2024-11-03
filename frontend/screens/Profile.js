import React, { useState, useContext, useEffect } from 'react';
import { VStack, Box, Text, Button, Pressable, Modal, Input, HStack, Spinner } from 'native-base';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { FontAwesome } from '@expo/vector-icons';

export default function Profile({ navigation }) {
    const { userToken, logout } = useContext(AuthContext);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [selectedField, setSelectedField] = useState(null);
    const [modalVisible, setModalVisible] = useState(false);
    const [tempValue, setTempValue] = useState('');

    useEffect(() => {
        const loadProfile = async () => {
            try {
                const response = await axios.get(`${DATABASE_URL}/api/users/profile`, {
                    headers: { Authorization: `Bearer ${userToken}` }
                });
                setName(response.data.name);
                setEmail(response.data.email);
            } catch (error) {
                setMessage(error.response?.data.message || 'Erreur lors du chargement des informations du profil.');
            } finally {
                setIsLoading(false);
            }
        };
        loadProfile();
    }, [userToken]);

    const handleUpdateProfile = async () => {
        try {
            const response = await axios.put(
                `${LOCAL_DATABASE_URL}/api/users/profile`,
                { name, email },
                { headers: { Authorization: `Bearer ${userToken}` } }
            );
            setMessage('Profil mis à jour avec succès.');
        } catch (error) {
            setMessage('Erreur lors de la mise à jour du profil.');
        }
    };

    const openEditModal = (field, currentValue) => {
        setSelectedField(field);
        setTempValue(currentValue);
        setModalVisible(true);
    };

    const saveChanges = () => {
        if (selectedField === 'name') setName(tempValue);
        if (selectedField === 'email') setEmail(tempValue);
        setModalVisible(false);
        handleUpdateProfile();
    };

    if (isLoading) {
        return (
            <Box flex={1} justifyContent="center" alignItems="center">
                <Spinner size="lg" />
            </Box>
        );
    }

    return (
        <Box flex={1} p={5} bg="white">
            <VStack space={4} width="100%">
                <Text fontSize="2xl" fontWeight="bold" color="black" textAlign="center">
                    Mon Profil
                </Text>

                {/* Liste des informations du profil avec icône flèche */}
                <Pressable onPress={() => openEditModal('name', name)}>
                    <HStack justifyContent="space-between" py={3} px={4} borderBottomWidth={1} borderColor="gray.200" alignItems="center">
                        <Box>
                            <Text fontSize="md" color="gray.500">Nom</Text>
                            <Text fontSize="lg" color="black">{name}</Text>
                        </Box>
                        <FontAwesome name="chevron-right" size={20} color="gray" />
                    </HStack>
                </Pressable>

                <Pressable onPress={() => openEditModal('email', email)}>
                    <HStack justifyContent="space-between" py={3} px={4} borderBottomWidth={1} borderColor="gray.200" alignItems="center">
                        <Box>
                            <Text fontSize="md" color="gray.500">Email</Text>
                            <Text fontSize="lg" color="black">{email}</Text>
                        </Box>
                        <FontAwesome name="chevron-right" size={20} color="gray" />
                    </HStack>
                </Pressable>

                <Button onPress={logout} colorScheme="red" mt={5} w="100%">
                    Déconnexion
                </Button>

                {message ? <Text color="red.500" textAlign="center" mt={2}>{message}</Text> : null}
            </VStack>

            {/* Modal pour éditer l'information sélectionnée */}
            <Modal isOpen={modalVisible} onClose={() => setModalVisible(false)}>
                <Modal.Content maxWidth="400px">
                    <Modal.CloseButton />
                    <Modal.Header>Modifier {selectedField === 'name' ? 'Nom' : 'Email'}</Modal.Header>
                    <Modal.Body>
                        <Input
                            placeholder={`Nouveau ${selectedField}`}
                            value={tempValue}
                            onChangeText={(text) => setTempValue(text)}
                        />
                    </Modal.Body>
                    <Modal.Footer>
                        <Button backgroundColor='black' onPress={saveChanges}>Enregistrer</Button>
                    </Modal.Footer>
                </Modal.Content>
            </Modal>
        </Box>
    );
}
