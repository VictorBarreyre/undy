import React, { useState, useContext, useEffect } from 'react';
import { Platform, VStack, Box, Text, Button, Pressable, Modal, Input, HStack, Spinner } from 'native-base';
import DateTimePicker from '@react-native-community/datetimepicker';
import { TouchableOpacity } from 'react-native';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { FontAwesome } from '@expo/vector-icons';

export default function Profile({ navigation }) {
    const { userToken, logout } = useContext(AuthContext);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [birthdate, setBirthdate] = useState('');
    const [phone, setPhone] = useState('');
    const [message, setMessage] = useState('');
    const [isSuccess, setIsSuccess] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedField, setSelectedField] = useState(null);
    const [modalVisible, setModalVisible] = useState(false);
    const [tempValue, setTempValue] = useState('');
    const [showDatePicker, setShowDatePicker] = useState(false);

    useEffect(() => {
        const loadProfile = async () => {
            try {
                const response = await axios.get(`${DATABASE_URL}/api/users/profile`, {
                    headers: { Authorization: `Bearer ${userToken}` }
                });
                setName(response.data.name);
                setEmail(response.data.email);
                setBirthdate(response.data.birthdate || '');
                setPhone(response.data.phone || '');
            } catch (error) {
                setMessage(error.response?.data.message || 'Erreur lors du chargement des informations du profil.');
                setIsSuccess(false);
            } finally {
                setIsLoading(false);
            }
        };
        loadProfile();
    }, [userToken]);

    const handleUpdateProfile = async () => {
        try {
            const response = await axios.put(
                `${DATABASE_URL}/api/users/profile`,
                { name, email, birthdate, phone },
                { headers: { Authorization: `Bearer ${userToken}` } }
            );
            setMessage('Profil mis à jour avec succès.');
            setIsSuccess(true);
        } catch (error) {
            setMessage('Erreur lors de la mise à jour du profil.');
            setIsSuccess(false);
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
        if (selectedField === 'birthdate') setBirthdate(tempValue);
        if (selectedField === 'phone') setPhone(tempValue);
        setModalVisible(false);
        handleUpdateProfile();
    };

    const handleDateChange = (event, selectedDate) => {
        const currentDate = selectedDate || new Date(tempValue);
        setShowDatePicker(false);
        setTempValue(currentDate.toISOString().split('T')[0]);
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

                <Pressable onPress={() => openEditModal('name', name)}>
                    <HStack justifyContent="space-between" py={3} px={4} borderBottomWidth={1} borderColor="gray.200" alignItems="center">
                        <Box>
                            <Text fontSize="md" color="gray.500">Nom</Text>
                            <Text fontSize="lg" color="black">{name}</Text>
                        </Box>
                        <FontAwesome name="chevron-right" size={10} color="gray" />
                    </HStack>
                </Pressable>

                <Pressable onPress={() => openEditModal('email', email)}>
                    <HStack justifyContent="space-between" py={3} px={4} borderBottomWidth={1} borderColor="gray.200" alignItems="center">
                        <Box>
                            <Text fontSize="md" color="gray.500">Email</Text>
                            <Text fontSize="lg" color="black">{email}</Text>
                        </Box>
                        <FontAwesome name="chevron-right" size={10} color="gray" />
                    </HStack>
                </Pressable>

                <Pressable onPress={() => openEditModal('birthdate', birthdate)}>
                    <HStack justifyContent="space-between" py={3} px={4} borderBottomWidth={1} borderColor="gray.200" alignItems="center">
                        <Box>
                            <Text fontSize="md" color="gray.500">Date de naissance</Text>
                            <Text fontSize="lg" color="black">{birthdate || 'Non renseignée'}</Text>
                        </Box>
                        <FontAwesome name="chevron-right" size={10} color="gray" />
                    </HStack>
                </Pressable>

                <Pressable onPress={() => openEditModal('phone', phone)}>
                    <HStack justifyContent="space-between" py={3} px={4} borderBottomWidth={1} borderColor="gray.200" alignItems="center">
                        <Box>
                            <Text fontSize="md" color="gray.500">Numéro de téléphone</Text>
                            <Text fontSize="lg" color="black">{phone || 'Non renseigné'}</Text>
                        </Box>
                        <FontAwesome name="chevron-right" size={10} color="gray" />
                    </HStack>
                </Pressable>

              
                {message ? (
                    <Text color={isSuccess ? "green.500" : "red.500"} textAlign="center" mt={2}>
                        {message}
                    </Text>
                ) : null}

                  {/* Texte de déconnexion en rouge */}
                  <Pressable onPress={logout}>
                    <Text color="red.500" py={3} px={4} fontSize="md" textAlign="left" mt={5}>
                        Déconnexion
                    </Text>
                </Pressable>
            </VStack>

            <Modal isOpen={modalVisible} onClose={() => setModalVisible(false)}>
                <Modal.Content maxWidth="400px">
                    <Modal.CloseButton />
                    <Modal.Header>Modifier {selectedField === 'name' ? 'Nom' : selectedField === 'email' ? 'Email' : selectedField === 'birthdate' ? 'Date de naissance' : 'Numéro de téléphone'}</Modal.Header>
                    <Modal.Body>
                        {selectedField === 'birthdate' ? (
                            Platform.OS === 'web' ? (
                                <Input
                                    type="date"
                                    value={tempValue}
                                    onChange={(e) => setTempValue(e.target.value)}
                                    backgroundColor="#E0E0E0"
                                    padding={2}
                                    borderRadius={5}
                                />
                            ) : (
                                <>
                                    <TouchableOpacity onPress={() => setShowDatePicker(true)} style={{ backgroundColor: "#E0E0E0", padding: 10, borderRadius: 5, alignItems: 'center' }}>
                                        <Text>Sélectionner une date</Text>
                                    </TouchableOpacity>
                                    {showDatePicker && (
                                        <DateTimePicker
                                            value={tempValue ? new Date(tempValue) : new Date()}
                                            mode="date"
                                            display="calendar"
                                            onChange={handleDateChange}
                                        />
                                    )}
                                </>
                            )
                        ) : (
                            <Input
                                placeholder={`Nouveau ${selectedField}`}
                                value={tempValue}
                                onChangeText={(text) => setTempValue(text)}
                            />
                        )}
                    </Modal.Body>
                    <Modal.Footer>
                        <Button backgroundColor='black' onPress={saveChanges}>Enregistrer</Button>
                    </Modal.Footer>
                </Modal.Content>
            </Modal>
        </Box>
    );
}
