import React, { useState, useContext } from 'react';
import { VStack, Box, Text, Button, Pressable, Modal, Input, HStack, Spinner, Switch } from 'native-base';
import DateTimePicker from '@react-native-community/datetimepicker';
import { TouchableOpacity, StyleSheet, ScrollView, Platform, Alert, View } from 'react-native';
import { AuthContext } from '../../infrastructure/context/AuthContext';
import { FontAwesome, FontAwesome5 } from '@expo/vector-icons';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faUser, faEnvelope, faLock, faDollarSign, faBirthdayCake, faPhone, faBuildingColumns, faBell, faPerson, faUserGroup } from '@fortawesome/free-solid-svg-icons';
import { styles } from '../../infrastructure/theme/styles';
import { Background } from '../../navigation/Background';
import TypewriterLoader from '../components/TypewriterLoader';
import EarningsModal from '../components/EarningModal';
import { BlurView } from '@react-native-community/blur';



export default function Profile({ navigation }) {
    const { userData, isLoadingUserData, updateUserData, logout, downloadUserData, clearUserData, deleteUserAccount } = useContext(AuthContext);
    const [selectedField, setSelectedField] = useState(null);
    const [tempValue, setTempValue] = useState('');
    const [modalVisible, setModalVisible] = useState(false);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [message, setMessage] = useState('');
    const [isSuccess, setIsSuccess] = useState(false);
    const [notificationsEnabled, setNotificationsEnabled] = useState(userData?.notifs || false);
    const [contactsEnabled, setContactsEnabled] = useState(userData?.contacts || false);
    const [inputValue, setInputValue] = useState('')
    const [earningsModalVisible, setEarningsModalVisible] = useState(false);

    const [isLoading, setIsLoading] = useState(false);

    if (userData) {
        const { profilePicture, ...userDataWithoutPicture } = userData;
        console.log('Données utilisateur :', userDataWithoutPicture);
    }

    const truncateText = (text, maxLength) => {
        if (!text) return ''; // Gérer les cas où le texte est null ou undefined
        return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
    };

    const openEditModal = (field, currentValue) => {
        if (field === 'income') {
            setEarningsModalVisible(true);
        } else {
            setSelectedField(field);
            setTempValue(currentValue);
            setInputValue(currentValue || '');
            setModalVisible(true);
        }
    };


    const saveChanges = async () => {
        console.log('Selected Field:', selectedField);
        console.log('Input Value:', inputValue); // Ajoutez ce log pour déboguer

        // Utilisez la valeur correcte en fonction du type de champ
        const valueToUpdate = selectedField === 'birthdate' ? tempValue : inputValue;

        const updatedData = {
            ...userData,
            [selectedField]: valueToUpdate
        };

        console.log('Données à mettre à jour avant envoi:', updatedData); // Pour déboguer

        const result = await updateUserData(updatedData);
        setMessage(result.message);
        setIsSuccess(result.success);
        setModalVisible(false);
        setInputValue('');
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

    const toggleContacts = () => {
        setContactsEnabled(!notificationsEnabled);
        updateUserData({ ...userData, contacts: !contactsEnabled });
    };

    const handleDownloadUserData = async () => {
        try {
            const response = await downloadUserData();
            console.log('Données reçues:', response);

            // Utiliser la méthode setString de @react-native-clipboard/clipboard
            Clipboard.setString(JSON.stringify(response, null, 2));

            Alert.alert(
                "Succès",
                "Les données ont été copiées dans votre presse-papier",
                [{ text: "OK" }]
            );

            setMessage('Données téléchargées avec succès');
            setIsSuccess(true);
        } catch (error) {
            console.error('Erreur:', error);
            Alert.alert(
                "Erreur",
                "Une erreur est survenue lors du téléchargement des données",
                [{ text: "OK" }]
            );
            setIsSuccess(false);
        }
    };

    const handleClearUserData = async () => {
        Alert.alert(
            "Confirmation",
            "Êtes-vous sûr de vouloir effacer vos données ?",
            [
                {
                    text: "Annuler",
                    style: "cancel"
                },
                {
                    text: "Effacer",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await clearUserData();
                            Alert.alert("Succès", "Vos données ont été effacées");
                            setMessage('Données effacées avec succès');
                            setIsSuccess(true);
                        } catch (error) {
                            console.error('Erreur:', error);
                            Alert.alert("Erreur", "Une erreur est survenue");
                            setIsSuccess(false);
                        }
                    }
                }
            ]
        );
    };

    const handleDeleteUserAccount = async () => {
        Alert.alert(
            "Confirmation",
            "Êtes-vous sûr de vouloir supprimer votre compte ? Cette action est irréversible.",
            [
                {
                    text: "Annuler",
                    style: "cancel"
                },
                {
                    text: "Supprimer",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await deleteUserAccount();
                            Alert.alert("Succès", "Votre compte a été supprimé");
                            setMessage('Compte supprimé avec succès');
                            setIsSuccess(true);
                            // Navigation vers l'écran de connexion ou autre
                            navigation.navigate('Login');
                        } catch (error) {
                            console.error('Erreur:', error);
                            Alert.alert("Erreur", "Une erreur est survenue");
                            setIsSuccess(false);
                        }
                    }
                }
            ]
        );
    };


    const handleLogoutno = async () => {
        try {
            await logout();
            // Le changement de isLoggedIn dans AuthContext 
            // déclenchera automatiquement la redirection
        } catch (error) {
            console.error('Erreur de déconnexion:', error);
            Alert.alert(
                "Erreur",
                "Une erreur est survenue lors de la déconnexion"
            );
        }
    };

    if (!userData) {
        return <TypewriterLoader />;
    }

    const fieldMappings = {
        name: { label: 'Nom', icon: faUser, truncateLength: 10 },
        email: { label: 'Adresse e-mail', icon: faEnvelope, truncateLength: 10 },
        password: { label: 'Mot de passe', icon: faLock, value: '*********' },
        phone: { label: 'Numéro de téléphone', icon: faPhone, truncateLength: 10 },
        birthdate: { label: 'Date de naissance', icon: faBirthdayCake, truncateLength: 10 },
        income: {
            label: 'Vos revenus',
            icon: faDollarSign,
            truncateLength: 15,
            getValue: (userData) => {
                if (!userData?.totalEarnings && userData?.totalEarnings !== 0) {
                    return '0,00 €';
                }
                return new Intl.NumberFormat('fr-FR', {
                    style: 'currency',
                    currency: 'EUR'
                }).format(userData.totalEarnings || 0);
            }
        },
        bank: {
            label: 'Compte bancaire',
            icon: faBuildingColumns,
            truncateLength: 20,
            getValue: (userData) => {
                if (!userData?.stripeAccountStatus || userData.stripeAccountStatus !== 'active') {
                    return 'Non configuré';
                }
                return userData.stripeExternalAccount || 'Non configuré';
            }
        },
        notifs: { label: 'Mes notifications', icon: faBell, truncateLength: 10 },
        contacts: { label: 'Mes contacts', icon: faUserGroup, truncateLength: 10 },
        abonnements: { label: 'Mes abonnements', icon: faPerson, truncateLength: 10 },
    };

    const accountFieldMapping = {
        download: { label: 'Télécharger les données' },
        clear: { label: 'Effacer les données' },
        delete: { label: 'Supprimer mon compte' },
    };


    return (
        <Background>
            <ScrollView contentContainerStyle={customStyles.scrollViewContent}>
                <Box flex={1} justifyContent="flex-start" padding={5}>
                    <VStack space={6}>
                        <HStack alignItems="center" justifyContent="space-between" width="100%">
                            {/* Icône Back */}
                            <Pressable width={26} onPress={() => navigation.navigate('ProfileMain')}>
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
                                <Text paddingBottom={1} style={styles.h5}>Général</Text>
                            </VStack>


                            <VStack justifyContent="space-between">
                                {Object.keys(fieldMappings).map((key, index) => {
                                    const field = fieldMappings[key];
                                    const value = key === 'password'
                                        ? field.value
                                        : key === 'income' || key === 'bank'
                                            ? field.getValue(userData)
                                            : key === 'notifs'
                                                ? (notificationsEnabled ? 'Activé' : 'Désactivé')
                                                : key === 'contacts'
                                                    ? (contactsEnabled ? 'Activé' : 'Désactivé')
                                                    : truncateText(userData?.[key] || 'Non renseigné', field.truncateLength || 15);

                                    // Vérifie si c'est le dernier élément
                                    const isLast = index === Object.keys(fieldMappings).length - 1;

                                    return (
                                        <Pressable key={key} onPress={key !== 'notifs' && key !== 'contacts' ? () => openEditModal(key, userData?.[key]) : undefined}>
                                            <HStack
                                                justifyContent="space-between"
                                                paddingTop={4}
                                                paddingBottom={isLast ? 1 : 4}
                                                px={1}
                                                borderBottomWidth={isLast ? 0 : 1} // Retire la bordure pour le dernier élément
                                                borderColor={isLast ? "transparent" : "#94A3B820"} // Rend la bordure invisible pour le dernier élément
                                                alignItems="center"
                                                width="100%"
                                            >
                                                <HStack space={3} alignItems="center">
                                                    <FontAwesomeIcon icon={field.icon} style={{ fontSize: 18, color: 'black' }} />
                                                </HStack>
                                                <HStack flex={1} justifyContent="space-between" px={4}>
                                                    <Text style={[styles.h5]} isTruncated>{field.label}</Text>
                                                    <Text style={[styles.caption]} color="#94A3B8">
                                                        {key === 'notifs'
                                                            ? (notificationsEnabled ? 'Activé' : 'Désactivé')
                                                            : key === 'contacts'
                                                                ? (contactsEnabled ? 'Activé' : 'Désactivé')
                                                                : truncateText(value, field.truncateLength || 15)}
                                                    </Text>
                                                </HStack>
                                                {key === 'notifs' || key === 'contacts' ? (
                                                    <Switch
                                                        isChecked={key === 'notifs' ? notificationsEnabled : contactsEnabled} // Utilise la bonne variable pour l'état
                                                        onToggle={key === 'notifs' ? toggleNotifications : toggleContacts} // Utilise la bonne fonction pour le toggle
                                                        style={{ transform: [{ scale: 0.7 }] }} // Ajustez la taille ici
                                                        trackColor={{ false: "#E2E8F0", true: "#E2E8F0" }} // Couleur de la piste
                                                        thumbColor={(key === 'notifs' ? notificationsEnabled : contactsEnabled) ? "#40D861" : "#FF78B2"} // Couleur du bouton
                                                    />
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
                            padding={4}
                            justifyContent="space-between"
                            style={[styles.cardStyle, customStyles.shadowBox]}
                        >
                            <VStack backgroundColor="white">
                                <Text paddingBottom={1} style={styles.h5}>Données</Text>
                            </VStack>
                            <VStack justifyContent="space-between">
                                {Object.keys(accountFieldMapping).map((key, index) => {
                                    const field = accountFieldMapping[key];
                                    const value = key === 'password'
                                        ? field.value
                                        : userData?.[key] || 'Non renseigné'; // Priorité à une valeur spécifique (ex: password)

                                    // Vérifie si c'est le dernier élément
                                    const isLast = index === Object.keys(accountFieldMapping).length - 1;

                                    return (
                                        <Pressable key={key} onPress={async () => {
                                            try {
                                                if (key === 'download') {
                                                    await handleDownloadUserData();
                                                }
                                                else if (key === 'clear') {
                                                    await handleClearUserData();
                                                }
                                                else if (key === 'delete') {
                                                    await handleDeleteUserAccount();
                                                }
                                            } catch (error) {
                                                console.error('Error:', error);
                                            }
                                        }}>
                                            <HStack
                                                justifyContent="space-between"
                                                paddingTop={4}
                                                paddingBottom={isLast ? 1 : 4}
                                                px={1}
                                                borderBottomWidth={isLast ? 0 : 1} // Retire la bordure pour le dernier élément
                                                borderColor={isLast ? "transparent" : "gray.200"} // Rend la bordure invisible pour le dernier élément
                                                alignItems="center"
                                                width="100%"
                                            >
                                                <Text style={[styles.h5, { textDecorationLine: 'underline' }]} >{field.label}</Text>
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
                            <Pressable onPress={handleLogoutno}>
                                <HStack justifyContent="start" px={4} >
                                    <Text style={styles.h5} color="#FF78B2" fontSize="md">Déconnexion</Text>
                                </HStack>
                            </Pressable>
                        </Box>

                    </VStack>
                </Box>
            </ScrollView>

            <EarningsModal
                isOpen={earningsModalVisible}
                onClose={() => setEarningsModalVisible(false)}
                userData={userData}
            />

            <Modal isOpen={modalVisible} onClose={() => setModalVisible(false)}>
                <View width='100%' style={{ flex: 1 }}>
                    <BlurView
                        style={[
                            styles.blurBackground,
                            {
                                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                                flex: 1,
                                justifyContent: 'center',
                                alignItems: 'center',
                            }
                        ]}
                        blurType="light"
                        blurAmount={8}
                        reducedTransparencyFallbackColor="rgba(255, 255, 255, 0.8)"
                    >
                        <Modal.Content
                            width="90%"
                            style={{
                                ...styles.shadowBox,
                                shadowColor: Platform.OS === 'ios' ? 'violet' : undefined,
                                shadowOffset: Platform.OS === 'ios' ? { width: 0, height: 2 } : undefined,
                                shadowOpacity: Platform.OS === 'ios' ? 0.2 : undefined,
                                shadowRadius: Platform.OS === 'ios' ? 5 : undefined,
                                elevation: 5,
                                backgroundColor: 'white',
                                borderRadius: 8,
                                padding: 16
                            }}
                        >
                            <Modal.CloseButton
                                _icon={{
                                    color: "#94A3B8",
                                    size: "sm"
                                }}
                            />

                            <VStack justifyContent="space-between" width='100%' space={4}>
                                {/* Header */}
                                <Text style={styles.h5} numberOfLines={1} ellipsizeMode="tail">
                                    Modifier votre {fieldMappings[selectedField]?.label?.toLowerCase() || 'information'}
                                </Text>

                                {/* Input Section */}
                                <Box width="100%">
                                    {selectedField === 'birthdate' ? (
                                        Platform.OS === 'web' ? (
                                            <Input
                                                type="date"
                                                value={tempValue}
                                                onChange={(e) => setTempValue(e.target.value)}
                                                size="md"
                                                backgroundColor="gray.100"
                                                borderRadius="md"
                                            />
                                        ) : (
                                            <>
                                                <TouchableOpacity
                                                    onPress={() => setShowDatePicker(true)}
                                                    style={{
                                                        backgroundColor: "#F3F4F6",
                                                        padding: 12,
                                                        borderRadius: 8,
                                                        alignItems: 'center'
                                                    }}
                                                >
                                                    <Text style={styles.caption}>Sélectionner une date</Text>
                                                </TouchableOpacity>
                                                {showDatePicker && (
                                                    <DateTimePicker
                                                        value={tempValue ? new Date(tempValue) : new Date()}
                                                        mode="date"
                                                        display="default"
                                                        onChange={handleDateChange}
                                                    />
                                                )}
                                            </>
                                        )
                                    ) : (
                                        <Input
                                            placeholder={`Modifier votre ${fieldMappings[selectedField]?.label?.toLowerCase() || 'information'}`}
                                            value={inputValue}
                                            onChangeText={(text) => {
                                                setInputValue(text);
                                            }}
                                            marginTop={4}
                                            marginBottom={4}
                                            size="md"
                                            backgroundColor="gray.100"
                                            borderRadius="30"
                                            _focus={{
                                                backgroundColor: "gray.50",
                                                borderColor: "gray.300"
                                            }}
                                        />
                                    )}
                                </Box>

                                {/* Footer avec bouton */}
                                <Button
                                    backgroundColor="black"
                                    onPress={saveChanges}
                                    borderRadius="full"
                                    py={3}
                                    _pressed={{
                                        backgroundColor: "gray.800"
                                    }}
                                >
                                    <Text color="white" style={styles.ctalittle}>
                                        Enregistrer
                                    </Text>
                                </Button>
                            </VStack>
                        </Modal.Content>
                    </BlurView>
                </View>
            </Modal>
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
