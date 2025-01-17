import React, { useState, useContext } from 'react';
import { Platform, VStack, Box, Text, Button, Pressable, Modal, Input, HStack, Spinner, Switch } from 'native-base';
import DateTimePicker from '@react-native-community/datetimepicker';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { AuthContext } from '../../infrastructure/context/AuthContext';
import { FontAwesome, FontAwesome5 } from '@expo/vector-icons';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faUser, faEnvelope, faLock, faDollarSign, faBirthdayCake,faPhone, faBuildingColumns, faBell } from '@fortawesome/free-solid-svg-icons';
import { styles } from '../../infrastructure/theme/styles';
import { Background } from '../../navigation/Background';

export default function Profile({ navigation }) {
    const { userData, isLoadingUserData, updateUserData, logout } = useContext(AuthContext);
    const [selectedField, setSelectedField] = useState(null);
    const [tempValue, setTempValue] = useState('');
    const [modalVisible, setModalVisible] = useState(false);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [message, setMessage] = useState('');
    const [isSuccess, setIsSuccess] = useState(false);
    const [notificationsEnabled, setNotificationsEnabled] = useState(userData?.notifs || false);


    const truncateText = (text, maxLength) => {
        if (!text) return ''; // Gérer les cas où le texte est null ou undefined
        return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
    };

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

    const toggleNotifications = () => {
        setNotificationsEnabled(!notificationsEnabled);
        updateUserData({ ...userData, notifs: !notificationsEnabled });
    };

    if (isLoadingUserData) {
        return (
            <Box flex={1} justifyContent="center" alignItems="center">
                <Spinner size="lg" />
            </Box>
        );
    }
    const fieldMappings = {
        name: { label: 'Nom', icon: faUser, truncateLength: 10 },
        email: { label: 'Adresse e-mail', icon: faEnvelope, truncateLength: 10 },
        password: { label: 'Mot de passe', icon: faLock, value: '*********' },
        phoneNumber: {label: 'Numéro de téléphone', icon:faPhone, truncateLength: 10  },
        birthdate: { label: 'Date de naissance', icon: faBirthdayCake, truncateLength: 10 },
        income: { label: 'Vos revenus', icon: faDollarSign, truncateLength: 10 },
        bank: { label: 'Compte bancaire', icon: faBuildingColumns, truncateLength: 10 },
        notifs: { label: 'Mes notifications', icon: faBell, truncateLength: 10 },
    };

    return (
        <Background>
            <Box flex={1} justifyContent="flex-start" padding={5}>
                <VStack space={6}>
                    <HStack alignItems="center" justifyContent="space-between" width="100%">
                        {/* Icône Back */}
                        <Pressable onPress={() => navigation.navigate('ProfileMain')}>
                            <FontAwesome name="chevron-left" size={18} color="black" />
                        </Pressable>

                        {/* Texte */}
                        <Text style={styles.h3} width='auto' textAlign="center">
                            Vos paramètres
                        </Text>

                        {/* Icône Settings */}
                        <Pressable onPress={() => navigation.navigate('ProfilSettings')}>
                            <FontAwesome5 name="cog" size={26} color="black" solid={false} />
                        </Pressable>
                    </HStack>
                    <Box
                        display="flex"
                        width="100%"
                        marginX="auto"
                        height="auto"
                        borderRadius="lg"
                        backgroundColor="white"
                        marginTop={2}
                        padding={4}
                        justifyContent="space-between"
                        style={[styles.cardStyle, customStyles.shadowBox]}
                    >
                        <VStack backgroundColor="white">
                            <Text style={styles.h5}>Général</Text>
                        </VStack>


                        <VStack justifyContent="space-between" space={2}>
                            {Object.keys(fieldMappings).map((key) => {
                                const field = fieldMappings[key];
                                const value = key === 'password'
                                    ? field.value
                                    : userData?.[key] || 'Non renseigné'; // Priorité à une valeur spécifique (ex: password)

                                return (
                                    <Pressable key={key} onPress={key !== 'notifs' ? () => openEditModal(key, userData?.[key]) : undefined}>
                                    <HStack
                                        justifyContent="space-between"
                                        py={5}
                                        px={1}
                                        borderBottomWidth={1}
                                        borderColor="gray.200"
                                        alignItems="center"
                                        width="100%"
                                    >
                                        <HStack space={3} alignItems="center">
                                            <FontAwesomeIcon icon={field.icon} style={{ fontSize: 18, color: 'black' }} />
                                        </HStack>
                                        <HStack flex={1} justifyContent="space-between" px={4}>
                                            <Text style={[styles.h5]} isTruncated>{field.label}</Text>
                                            <Text style={[styles.h5]} color="#94A3B8">
                                                {key !== 'notifs' ? truncateText(value, field.truncateLength || 15) : (notificationsEnabled ? 'Activé' : 'Désactivé')}
                                            </Text>
                                        </HStack>
                                        {key === 'notifs' ? (
                                            <Switch isChecked={notificationsEnabled} onToggle={toggleNotifications} />
                                        ) : (
                                            <FontAwesome name="chevron-right" size={14} color="#94A3B8" />
                                        )}
                                    </HStack>
                                </Pressable>
                                );
                            })}
                        </VStack>
                    </Box>

                    <Box
                        display="flex"
                        width="100%"
                        marginX="auto"
                        height="auto"
                        borderRadius="lg"
                        backgroundColor="white"
                        marginTop={2}
                        py={4}
                        justifyContent="space-between"
                        style={[styles.cardStyle, customStyles.shadowBox]}
                    >
                        {/* Déconnexion */}
                        <Pressable onPress={logout}>
                            <HStack justifyContent="start" px={4} >
                                <Text style={styles.h5} color="red.500" fontSize="md">Déconnexion</Text>
                            </HStack>
                        </Pressable>
                    </Box>

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

        </Background>
    );
};

const customStyles = StyleSheet.create({

    container: {
        display: 'flex',
        flex: 1,
        height: 'auto',
        width: '100%',
        justifyContent: 'space-between', // Ajoute de l'espace entre les éléments
        alignItems: 'start',
        alignContent: 'start'
    },


    shadowBox: {
        shadowColor: 'violet',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
        elevation: 5
    },
});
