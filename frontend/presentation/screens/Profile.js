import React, { useState, useContext } from 'react';
import { Platform, VStack, Box, Text, Button, Pressable, Modal, Input, HStack, Spinner } from 'native-base';
import DateTimePicker from '@react-native-community/datetimepicker';
import { TouchableOpacity } from 'react-native';
import { AuthContext } from '../../infrastructure/context/AuthContext';
import { FontAwesome } from '@expo/vector-icons';

export default function Profile({ navigation }) {
    const { userData, isLoadingUserData, updateUserData, logout } = useContext(AuthContext);
    const [selectedField, setSelectedField] = useState(null);
    const [tempValue, setTempValue] = useState('');
    const [modalVisible, setModalVisible] = useState(false);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [message, setMessage] = useState('');
    const [isSuccess, setIsSuccess] = useState(false);

    const openEditModal = (field, currentValue) => {
        setSelectedField(field);
        setTempValue(currentValue);
        setModalVisible(true);
    };

    const saveChanges = async () => {
        const updatedData = { ...userData, [selectedField]: tempValue };
        const result = await updateUserData(updatedData);
        setMessage(result.message);
        setIsSuccess(result.success);
        setModalVisible(false);
    };

    const handleDateChange = (event, selectedDate) => {
        const currentDate = selectedDate || new Date(tempValue);
        setShowDatePicker(false);
        setTempValue(currentDate.toISOString().split('T')[0]);
    };

    if (isLoadingUserData) {
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

                <Pressable onPress={() => openEditModal('name', userData?.name)}>
                    <HStack justifyContent="space-between" py={3} px={4} borderBottomWidth={1} borderColor="gray.200" alignItems="center">
                        <Box>
                            <Text fontSize="md" color="gray.500">Nom</Text>
                            <Text fontSize="lg" color="black">{userData?.name}</Text>
                        </Box>
                        <FontAwesome name="chevron-right" size={10} color="gray" />
                    </HStack>
                </Pressable>

                <Pressable onPress={() => openEditModal('email', userData?.email)}>
                    <HStack justifyContent="space-between" py={3} px={4} borderBottomWidth={1} borderColor="gray.200" alignItems="center">
                        <Box>
                            <Text fontSize="md" color="gray.500">Email</Text>
                            <Text fontSize="lg" color="black">{userData?.email}</Text>
                        </Box>
                        <FontAwesome name="chevron-right" size={10} color="gray" />
                    </HStack>
                </Pressable>

                <Pressable onPress={() => openEditModal('birthdate', userData?.birthdate)}>
                    <HStack justifyContent="space-between" py={3} px={4} borderBottomWidth={1} borderColor="gray.200" alignItems="center">
                        <Box>
                            <Text fontSize="md" color="gray.500">Date de naissance</Text>
                            <Text fontSize="lg" color="black">{userData?.birthdate || 'Non renseignée'}</Text>
                        </Box>
                        <FontAwesome name="chevron-right" size={10} color="gray" />
                    </HStack>
                </Pressable>

                <Pressable onPress={() => openEditModal('phone', userData?.phone)}>
                    <HStack justifyContent="space-between" py={3} px={4} borderBottomWidth={1} borderColor="gray.200" alignItems="center">
                        <Box>
                            <Text fontSize="md" color="gray.500">Numéro de téléphone</Text>
                            <Text fontSize="lg" color="black">{userData?.phone || 'Non renseigné'}</Text>
                        </Box>
                        <FontAwesome name="chevron-right" size={10} color="gray" />
                    </HStack>
                </Pressable>

                {message ? (
                    <Text color={isSuccess ? "green.500" : "red.500"} textAlign="center" mt={2}>
                        {message}
                    </Text>
                ) : null}

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
