import React, { useState, useContext } from 'react';
import { Platform, VStack, Box, Text, Button, Pressable, Modal, Input, HStack, Spinner } from 'native-base';
import DateTimePicker from '@react-native-community/datetimepicker';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { AuthContext } from '../../infrastructure/context/AuthContext';
import { FontAwesome, FontAwesome5 } from '@expo/vector-icons';
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

    console.log(userData)

    return (
        <Background>
          <Box flex={1} justifyContent="flex-start" padding={5}>
            <VStack space={6}>
                <HStack alignItems="center" justifyContent="space-between" width="100%">
                    {/* Icône Back */}
                    <Pressable onPress={() => console.log('Retour en arrière')}>
                        <FontAwesome name="chevron-left" size={18} color="black" />
                    </Pressable>

                    {/* Texte */}
                    <Text fontSize="2xl" fontWeight="bold" color="black" textAlign="center">
                        Mon Profil
                    </Text>

                    {/* Icône Settings */}
                    <Pressable onPress={() => console.log('Paramètres')}>
                    <FontAwesome5 name="cog" size={26} color="black" solid={false} />
                    </Pressable>
                </HStack>
            </VStack>
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
