import React, { useState, useContext, useEffect } from 'react';
import { VStack, Box, Text, Button, Pressable, Actionsheet, Input, HStack, Spinner } from 'native-base';
import DateTimePicker from '@react-native-community/datetimepicker';
import { TouchableOpacity, StyleSheet, ScrollView, Platform, Alert, Switch as RNSwitch } from 'react-native';
import { AuthContext } from '../../infrastructure/context/AuthContext';
import { FontAwesome, FontAwesome5 } from '@expo/vector-icons';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faUser, faEnvelope, faLock, faDollarSign, faBirthdayCake, faPhone, faBuildingColumns, faBell, faPerson, faUserGroup } from '@fortawesome/free-solid-svg-icons';
import { styles } from '../../infrastructure/theme/styles';
import { Background } from '../../navigation/Background';
import TypewriterLoader from '../components/TypewriterLoader';
import EarningsModal from '../components/EarningModal';
import { BlurView } from '@react-native-community/blur';
import { useCardData } from '../../infrastructure/context/CardDataContexte';
import StripeVerificationModal from '../components/StripeVerificationModal';
import Contacts from 'react-native-contacts';
import NotificationService from '../Notifications/NotificationService';



export default function Profile({ navigation }) {
    const { userData, isLoadingUserData, updateUserData, logout, downloadUserData, clearUserData, deleteUserAccount } = useContext(AuthContext);
    const [selectedField, setSelectedField] = useState(null);
    const [tempValue, setTempValue] = useState('');
    const [modalVisible, setModalVisible] = useState(false);
    const [stripeModalVisible, setStripeModalVisible] = useState(false);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [message, setMessage] = useState('');
    const [isSuccess, setIsSuccess] = useState(false);
    const [notificationsEnabled, setNotificationsEnabled] = useState(userData?.notifs || false);
    const [contactsEnabled, setContactsEnabled] = useState(userData?.contacts || false);
    const [inputValue, setInputValue] = useState('')
    const [earningsModalVisible, setEarningsModalVisible] = useState(false);
    const { resetStripeAccount, resetReadStatus, unreadCountsMap, setUnreadCountsMap, setTotalUnreadCount } = useCardData();



    const [isLoading, setIsLoading] = useState(false);

    if (userData) {
        const { profilePicture, ...userDataWithoutPicture } = userData;
        console.log('Données utilisateur :', userDataWithoutPicture);
    }

    const truncateText = (text, maxLength) => {
        if (!text) return ''; // Gérer les cas où le texte est null ou undefined
        return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
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


    useEffect(() => {
        const syncNotificationState = async () => {
            if (userData?.notifs) {
                const hasPermission = await NotificationService.checkPermissions();
                setNotificationsEnabled(hasPermission);
            }
        };

        syncNotificationState();
    }, [userData]);

    const toggleNotifications = async () => {
        try {
            const newNotifState = !notificationsEnabled;

            // On met à jour l'état local immédiatement pour une meilleure UX
            setNotificationsEnabled(newNotifState);

            if (newNotifState) {
                // Vérifier les permissions avant d'activer
                const hasPermission = await NotificationService.checkPermissions();
                if (hasPermission) {
                    // Mettre à jour la base de données
                    const result = await updateUserData({
                        notifs: true
                    });

                    if (result.success) {
                        // Envoyer la notification de test après la mise à jour réussie
                        setTimeout(async () => {
                            await NotificationService.sendTestNotification();
                        }, 500); // Délai de 500ms
                    } else {
                        // En cas d'échec, revenir à l'état précédent
                        setNotificationsEnabled(false);
                    }
                } else {
                    // Si pas de permission, revenir à l'état précédent
                    setNotificationsEnabled(false);
                }
            } else {
                // Désactiver les notifications
                const result = await updateUserData({
                    notifs: false
                });

                if (!result.success) {
                    // En cas d'échec, revenir à l'état précédent
                    setNotificationsEnabled(true);
                }
            }
        } catch (error) {
            console.error("Erreur toggleNotifications:", error);
            // En cas d'erreur, revenir à l'état précédent
            setNotificationsEnabled(!newNotifState);
            Alert.alert(
                "Erreur",
                "Un problème est survenu lors de la mise à jour des préférences de notification"
            );
        }
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


    const handleResetStripeAccount = async () => {
        Alert.alert(
            "Réinitialiser le compte Stripe",
            "Êtes-vous sûr de vouloir réinitialiser votre compte Stripe ? Vous devrez refaire le processus d'onboarding.",
            [
                {
                    text: "Annuler",
                    style: "cancel"
                },
                {
                    text: "Réinitialiser",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            const result = await resetStripeAccount();

                            if (result.success) {
                                Alert.alert(
                                    "Succès",
                                    "Votre compte Stripe a été réinitialisé. Vous allez être redirigé vers l'onboarding.",
                                    [{
                                        text: 'OK',
                                        onPress: () => {
                                            if (result.url) {
                                                // Rediriger vers l'URL d'onboarding si disponible
                                                Linking.openURL(result.url);
                                            }
                                        }
                                    }]
                                );
                                setStripeModalVisible(false);
                            } else {
                                Alert.alert(
                                    "Erreur",
                                    result.message || "Erreur lors de la réinitialisation du compte Stripe",
                                    [{ text: 'OK' }]
                                );
                            }
                        } catch (error) {
                            console.error('Erreur de réinitialisation du compte Stripe:', error);
                            Alert.alert(
                                'Erreur',
                                'Une erreur est survenue lors de la réinitialisation',
                                [{ text: 'OK' }]
                            );
                        }
                    }
                }
            ]
        );
    };



    const handleLogoutno = async () => {
        try {
            await logout();
            resetReadStatus(); // Réinitialise markedAsReadConversations
            setUnreadCountsMap({}); // Réinitialisez également les compteurs
            setTotalUnreadCount(0);
        } catch (error) {
            console.error('Erreur de déconnexion:', error);
            Alert.alert(
                "Erreur",
                "Une erreur est survenue lors de la déconnexion"
            );
        }
    };


    const openEditModal = (field, currentValue) => {
        if (field === 'income') {
            setEarningsModalVisible(true);
        } else if (field === 'bank') {
            setStripeModalVisible(true);
        } else {
            setSelectedField(field);
            setTempValue(currentValue);
            setInputValue(currentValue || '');
            setModalVisible(true);
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
                                                    <RNSwitch
                                                        value={key === 'notifs' ? notificationsEnabled : contactsEnabled}
                                                        onValueChange={key === 'notifs' ? toggleNotifications : toggleContacts}
                                                        trackColor={{
                                                            false: "#E2E8F0",
                                                            true: "#E2E8F0"
                                                        }}
                                                        thumbColor={(key === 'notifs' ? notificationsEnabled : contactsEnabled) ? "#83D9FF" : "#FF78B2"}
                                                        ios_backgroundColor="#E2E8F0"
                                                        style={{ transform: [{ scale: 0.7 }] }}
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
                navigation={navigation}
            />

            <StripeVerificationModal
                isOpen={stripeModalVisible}
                onClose={() => setStripeModalVisible(false)}
                userData={userData}
                resetStripeAccount={handleResetStripeAccount}
                navigation={navigation}
            />

            <Actionsheet isOpen={modalVisible} onClose={() => setModalVisible(false)}>
                <Actionsheet.Content>
                    <VStack width="100%" space={4} px={4}>
                        {selectedField === 'abonnements' && (!userData?.subscriptions || userData.subscriptions === 0) ? (
                            <>
                                <Text style={styles.h4} textAlign="center">
                                    Mes abonnements
                                </Text>
                                <Text
                                    style={styles.caption}
                                    color="#94A3B8"
                                    textAlign="center"
                                >
                                    Vous n'avez pas encore d'abonnements.
                                    Découvrez nos offres pour enrichir votre expérience.
                                </Text>
                                <Button
                                    onPress={() => {
                                        navigation.navigate('Subscriptions');
                                        setModalVisible(false);
                                    }}
                                    backgroundColor="black"
                                    borderRadius="full"
                                >
                                    <Text color="white" style={styles.cta}>
                                        Voir les abonnements
                                    </Text>
                                </Button>
                            </>
                        ) : (
                            <>
                                <Text style={styles.h4} textAlign="center">
                                    Modifier votre {fieldMappings[selectedField]?.label?.toLowerCase() || 'information'}
                                </Text>

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
                                            <DateTimePicker
                                                value={tempValue ? new Date(tempValue) : new Date()}
                                                mode="date"
                                                display="spinner"
                                                textColor="#000"
                                                style={styles.datePicker}
                                                onChange={handleDateChange}
                                            />
                                        )
                                    ) : (
                                        <Input
                                            placeholder={`Modifier votre ${fieldMappings[selectedField]?.label?.toLowerCase() || 'information'}`}
                                            value={inputValue}
                                            onChangeText={(text) => {
                                                setInputValue(text);
                                            }}
                                            marginTop={2}
                                            marginBottom={1}
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

                                <Button
                                    backgroundColor="black"
                                    onPress={saveChanges}
                                    borderRadius="full"
                                    py={3}
                                    _pressed={{
                                        backgroundColor: "gray.800"
                                    }}
                                >
                                    <Text color="white" style={styles.cta}>
                                        Enregistrer
                                    </Text>
                                </Button>
                            </>
                        )}
                    </VStack>
                </Actionsheet.Content>
            </Actionsheet>
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

    datePicker: {
        width: '100%',
        backgroundColor: 'white',
        borderRadius: 8,
        overflow: 'hidden',
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.2,
                shadowRadius: 4,
            },
            android: {
                elevation: 4,
            },
        }),
    },


    shadowBox: {
        shadowColor: 'violet',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
        elevation: 5
    },
});
