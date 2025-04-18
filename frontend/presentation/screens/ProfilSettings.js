import React, { useState, useContext, useEffect, useRef } from 'react';
import { VStack, Box, Text, Button, Pressable, Actionsheet, HStack, Spinner } from 'native-base';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Linking, Animated, StyleSheet, ScrollView, Platform, Alert, Switch as RNSwitch, KeyboardAvoidingView, Keyboard, TouchableWithoutFeedback, useWindowDimensions, TextInput } from 'react-native';
import { AuthContext } from '../../infrastructure/context/AuthContext';
import { FontAwesome, FontAwesome5 } from '@expo/vector-icons';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faUser, faEnvelope, faLock, faDollarSign, faBirthdayCake, faPhone, faBuildingColumns, faBell, faPerson, faUserGroup, faLocationDot } from '@fortawesome/free-solid-svg-icons';
import { styles } from '../../infrastructure/theme/styles';
import { Background } from '../../navigation/Background';
import TypewriterLoader from '../components/TypewriterLoader';
import EarningsModal from '../components/EarningModal';
import { BlurView } from '@react-native-community/blur';
import { useCardData } from '../../infrastructure/context/CardDataContexte';
import StripeVerificationModal from '../components/StripeVerificationModal';
import * as ExpoContacts from 'expo-contacts';
import * as Location from 'expo-location';
import NotificationService from '../Notifications/NotificationService';
import { useTranslation } from 'react-i18next';
import Clipboard from '@react-native-clipboard/clipboard';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STRIPE_PUBLISHABLE_KEY } from '@env';
import { StripeProvider } from '@stripe/stripe-react-native';
import { createAxiosInstance, getAxiosInstance } from '../../data/api/axiosInstance';


export default function Profile({ navigation }) {
    const { t } = useTranslation();
    const { userData, isLoadingUserData, updateUserData, logout, downloadUserData, clearUserData, deleteUserAccount, getContacts } = useContext(AuthContext);
    const [selectedField, setSelectedField] = useState(null);
    const [tempValue, setTempValue] = useState('');
    const [modalVisible, setModalVisible] = useState(false);
    const [stripeModalVisible, setStripeModalVisible] = useState(false);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [message, setMessage] = useState('');
    const [isSuccess, setIsSuccess] = useState(false);
    const [notificationsEnabled, setNotificationsEnabled] = useState(userData?.notifs || false);
    const [contactsPermissionStatus, setContactsPermissionStatus] = useState(false);
    const [locationPermissionStatus, setLocationPermissionStatus] = useState(false);
    const [inputValue, setInputValue] = useState('');
    const [earningsModalVisible, setEarningsModalVisible] = useState(false);
    const { resetStripeAccount, resetReadStatus, unreadCountsMap, setUnreadCountsMap, setTotalUnreadCount } = useCardData();
    const inputRef = useRef(null);
    const [keyboardHeight, setKeyboardHeight] = useState(0);
    const { height: windowHeight } = useWindowDimensions();
    const [actionSheetPosition] = useState(new Animated.Value(0));
    const [accurateEarnings, setAccurateEarnings] = useState(null);

    const fetchAccurateEarnings = async () => {
        try {
          const instance = getAxiosInstance();
          if (!instance) {
            console.error("Axios instance not initialized");
            return;
          }
          
          const response = await instance.get('/api/users/transactions');
          
          if (response.data) {
            // Calculer le total des revenus à partir des transactions
            const totalEarnings = response.data.transactions
              .filter(transaction => transaction.type === 'payment')
              .reduce((total, transaction) => total + (transaction.netAmount || 0), 0);
            
            console.log(`Revenus précis chargés: ${totalEarnings}€`);
            setAccurateEarnings(totalEarnings);
          }
        } catch (error) {
          console.error('Erreur lors du chargement des revenus précis:', error);
        }
      };
      

      console.log(userData?.phone)

      useEffect(() => {
        if (userData?.stripeAccountId && userData?.stripeAccountStatus === 'active') {
          fetchAccurateEarnings();
        }
      
      }, [userData]); // Recharger si userData change
      

    useEffect(() => {
        const keyboardWillShowListener = Keyboard.addListener(
            Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
            (e) => {
                // Animation synchronisée avec le clavier
                Animated.timing(actionSheetPosition, {
                    toValue: e.endCoordinates.height,
                    duration: e.duration || 250,
                    useNativeDriver: false,
                }).start();
            }
        );

        const keyboardWillHideListener = Keyboard.addListener(
            Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
            (e) => {
                Animated.timing(actionSheetPosition, {
                    toValue: 0,
                    duration: e.duration || 250,
                    useNativeDriver: false,
                }).start();
            }
        );

        return () => {
            keyboardWillShowListener.remove();
            keyboardWillHideListener.remove();
        };
    }, []);

    useEffect(() => {
        if (modalVisible && inputRef.current) {
            // Court délai pour laisser le rendu se terminer
            const timer = setTimeout(() => {
                inputRef.current?.focus();
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [modalVisible]);

    const alertsCheckedRef = useRef({
        notification: false,
        location: false,
        contacts: false
    });


    useEffect(() => {
        let permissionCheckInterval;

        const checkPermissions = async () => {
            // Vérifier l'état de la permission des contacts
            if (!alertsCheckedRef.current.contacts) {
                try {
                    const { status } = await ExpoContacts.getPermissionsAsync();
                    const contactsStatus = status === 'granted';

                    // Ne mettre à jour l'état que si la valeur a changé
                    if (contactsPermissionStatus !== contactsStatus) {
                        setContactsPermissionStatus(contactsStatus);
                    }

                    // Marquer comme vérifié une fois qu'on a obtenu le statut initial
                    alertsCheckedRef.current.contacts = true;
                } catch (error) {
                    console.error('Erreur lors de la vérification des permissions de contacts:', error);
                }
            }

            // Vérifier l'état de la permission de localisation
            if (!alertsCheckedRef.current.location) {
                try {
                    const { status } = await Location.getForegroundPermissionsAsync();
                    const locationStatus = status === 'granted';

                    // Ne mettre à jour l'état que si la valeur a changé
                    if (locationPermissionStatus !== locationStatus) {
                        setLocationPermissionStatus(locationStatus);
                    }

                    // Marquer comme vérifié une fois qu'on a obtenu le statut initial
                    alertsCheckedRef.current.location = true;
                } catch (error) {
                    console.error('Erreur lors de la vérification des permissions de localisation:', error);
                }
            }

            // Vérifier l'état des permissions de notification sans forcer l'alerte
            if (!alertsCheckedRef.current.notification) {
                try {
                    const hasPermission = await NotificationService.checkPermissions(false); // false = ne pas forcer l'alerte

                    // Ne mettre à jour l'état que si la valeur a changé
                    if (notificationsEnabled !== hasPermission) {
                        setNotificationsEnabled(hasPermission);
                    }

                    // Marquer comme vérifié une fois qu'on a obtenu le statut initial
                    alertsCheckedRef.current.notification = true;
                } catch (error) {
                    console.error('Erreur lors de la vérification des permissions de notifications:', error);
                }
            }
        };

        // Exécuter la vérification une seule fois au montage du composant
        checkPermissions();

        // Configurer un intervalle moins fréquent pour vérifier uniquement les changements d'état
        // sans afficher d'alertes (utile si l'utilisateur change les permissions dans les paramètres système)
        permissionCheckInterval = setInterval(async () => {
            try {
                // Uniquement vérifier si les états ont changé sans modifier les refs ou afficher des alertes
                const contactsStatus = (await ExpoContacts.getPermissionsAsync()).status === 'granted';
                if (contactsPermissionStatus !== contactsStatus) {
                    setContactsPermissionStatus(contactsStatus);
                }

                const locationStatus = (await Location.getForegroundPermissionsAsync()).status === 'granted';
                if (locationPermissionStatus !== locationStatus) {
                    setLocationPermissionStatus(locationStatus);
                }

                const notificationStatus = await NotificationService.checkPermissions(false);
                if (notificationsEnabled !== notificationStatus) {
                    setNotificationsEnabled(notificationStatus);
                }
            } catch (error) {
                console.error('Erreur lors de la vérification périodique des permissions:', error);
            }
        }, 10000); // Vérifier toutes les 10 secondes

        return () => {
            if (permissionCheckInterval) {
                clearInterval(permissionCheckInterval);
            }
        };
    }, []);


    if (userData) {
        const { profilePicture, ...userDataWithoutPicture } = userData;
        console.log(t('settings.userDataLog'), userDataWithoutPicture);
    }

    const truncateText = (text, maxLength) => {
        if (!text) return ''; // Gérer les cas où le texte est null ou undefined
        return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
    };

    const saveChanges = async () => {
        console.log(t('settings.selectedFieldLog'), selectedField);
        console.log(t('settings.inputValueLog'), inputValue);

        // Utilisez la valeur correcte en fonction du type de champ
        const valueToUpdate = selectedField === 'birthdate' ? tempValue : inputValue;

        const updatedData = {
            ...userData,
            [selectedField]: valueToUpdate
        };

        console.log(t('settings.dataToUpdateLog'), updatedData);

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

    const getStatusText = (key, isEnabled) => {
        if (!isEnabled) {
            // Pour les états désactivés
            switch (key) {
                case 'notifs':
                    return t('settings.disabledFemininePlural');  // "Désactivées"
                case 'location':
                    return t('settings.disabledFeminin');  // "Désactivée"
                default:
                    return t('settings.disabled');  // "Désactivé"
            }
        } else {
            // Pour les états activés
            switch (key) {
                case 'notifs':
                    return t('settings.enabledFemininePlural');  // "Activées"
                case 'location':
                    return t('settings.enabledFeminin');  // "Activée"
                default:
                    return t('settings.enabled');  // "Activé"
            }
        }
    };

    const handleNotificationsSettings = async () => {
        await NotificationService.checkPermissions(true); // true = forcer l'alerte
    };


    // Fonction pour gérer les contacts - redirige vers les paramètres système
    const handleContactsSettings = () => {
        Alert.alert(
            t('permissions.contactsNeededTitle'),
            t('permissions.contactsSettingsMessage'),
            [
                {
                    text: t('permissions.cancel'),
                    style: 'cancel'
                },
                {
                    text: t('permissions.openSettings'),
                    onPress: () => Linking.openSettings()
                }
            ]
        );
    };

    // Fonction pour gérer la localisation - redirige vers les paramètres système
    const handleLocationSettings = () => {
        Alert.alert(
            t('permissions.locationNeededTitle'),
            t('permissions.locationSettingsMessage'),
            [
                {
                    text: t('permissions.cancel'),
                    style: 'cancel'
                },
                {
                    text: t('permissions.openSettings'),
                    onPress: () => Linking.openSettings()
                }
            ]
        );
    };

    // Navigation vers l'écran des contacts - vérifie d'abord la permission
    const handleContactsPress = async () => {
        if (!contactsPermissionStatus) {
            // Si l'accès aux contacts n'est pas autorisé, proposer d'aller dans les paramètres
            handleContactsSettings();
        } else {
            // Si les contacts sont déjà autorisés, naviguer directement
            navigation.navigate('Contacts');
        }
    };



    const handleDownloadUserData = async () => {
        try {
            const response = await downloadUserData();
            console.log(t('settings.dataReceivedLog'), response);

            // Utiliser la méthode setString de @react-native-clipboard/clipboard
            Clipboard.setString(JSON.stringify(response, null, 2));

            Alert.alert(
                t('settings.success'),
                t('settings.dataCopiedToClipboard'),
                [{ text: t('settings.ok') }]
            );

            setMessage(t('settings.dataDownloadSuccess'));
            setIsSuccess(true);
        } catch (error) {
            console.error(t('settings.errors.genericLog'), error);
            Alert.alert(
                t('settings.errors.title'),
                t('settings.errors.dataDownloadError'),
                [{ text: t('settings.ok') }]
            );
            setIsSuccess(false);
        }
    };

    const handleClearUserData = async () => {
        Alert.alert(
            t('settings.confirmation'),
            t('settings.clearDataConfirmation'),
            [
                {
                    text: t('settings.cancel'),
                    style: "cancel"
                },
                {
                    text: t('settings.clear'),
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await clearUserData();
                            Alert.alert(t('settings.success'), t('settings.dataClearedSuccess'));
                            setMessage(t('settings.dataClearedSuccess'));
                            setIsSuccess(true);
                        } catch (error) {
                            console.error(t('settings.errors.genericLog'), error);
                            Alert.alert(t('settings.errors.title'), t('settings.errors.genericError'));
                            setIsSuccess(false);
                        }
                    }
                }
            ]
        );
    };

    const handleDeleteUserAccount = async () => {
        Alert.alert(
            t('settings.confirmation'),
            t('settings.deleteAccountConfirmation'),
            [
                {
                    text: t('settings.cancel'),
                    style: "cancel"
                },
                {
                    text: t('settings.delete'),
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await deleteUserAccount();
                            Alert.alert(t('settings.success'), t('settings.accountDeletedSuccess'));
                            setMessage(t('settings.accountDeletedSuccess'));
                            setIsSuccess(true);
                            // Navigation vers l'écran de connexion ou autre
                            navigation.navigate('Login');
                        } catch (error) {
                            console.error(t('settings.errors.genericLog'), error);
                            Alert.alert(t('settings.errors.title'), t('settings.errors.genericError'));
                            setIsSuccess(false);
                        }
                    }
                }
            ]
        );
    };

    const handleResetStripeAccount = async () => {
        Alert.alert(
            t('settings.resetStripeAccount'),
            t('settings.resetStripeConfirmation'),
            [
                {
                    text: t('settings.cancel'),
                    style: "cancel"
                },
                {
                    text: t('settings.reset'),
                    style: "destructive",
                    onPress: async () => {
                        try {
                            const result = await resetStripeAccount();

                            if (result.success) {
                                Alert.alert(
                                    t('settings.success'),
                                    t('settings.stripeResetSuccess'),
                                    [{
                                        text: t('settings.ok'),
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
                                    t('settings.errors.title'),
                                    result.message || t('settings.errors.stripeResetError'),
                                    [{ text: t('settings.ok') }]
                                );
                            }
                        } catch (error) {
                            console.error(t('settings.errors.stripeResetErrorLog'), error);
                            Alert.alert(
                                t('settings.errors.title'),
                                t('settings.errors.stripeResetError'),
                                [{ text: t('settings.ok') }]
                            );
                        }
                    }
                }
            ]
        );
    };

    const handleLogout = async () => {
        try {
            await logout();
            resetReadStatus(); // Réinitialise markedAsReadConversations
            setUnreadCountsMap({}); // Réinitialisez également les compteurs
            setTotalUnreadCount(0);
        } catch (error) {
            console.error(t('settings.errors.logoutErrorLog'), error);
            Alert.alert(
                t('settings.errors.title'),
                t('settings.errors.logoutError')
            );
        }
    };

    const openEditModal = (field, currentValue) => {
        if (field === 'income') {
            setEarningsModalVisible(true);
        } else if (field === 'bank') {
            setStripeModalVisible(true);
        } else if (field === 'contacts') {
            handleContactsSettings();
        } else if (field === 'location') {
            handleLocationSettings();
        } else if (field === 'notifs') {
            handleNotificationsSettings();
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
        name: { label: t('settings.fields.name'), icon: faUser, truncateLength: 10 },
        email: { label: t('settings.fields.email'), icon: faEnvelope, truncateLength: 10 },
        password: { label: t('settings.fields.password'), icon: faLock, value: '*********' },
        phone: { label: t('settings.fields.phone'), icon: faPhone, truncateLength: 10 },
        birthdate: { label: t('settings.fields.birthdate'), icon: faBirthdayCake, truncateLength: 10 },
        income: {
            label: t('settings.fields.income'),
            icon: faDollarSign,
            truncateLength: 15,
            getValue: (userData) => {
              // Utiliser accurateEarnings s'il est disponible, sinon userData.totalEarnings
              const earningsValue = accurateEarnings !== null ? accurateEarnings : (userData?.totalEarnings || 0);
              
              return new Intl.NumberFormat('fr-FR', {
                style: 'currency',
                currency: 'EUR'
              }).format(earningsValue);
            }
          },
        bank: {
            label: t('settings.fields.bank'),
            icon: faBuildingColumns,
            truncateLength: 20,
            getValue: (userData) => {
                if (!userData?.stripeAccountStatus || userData.stripeAccountStatus !== 'active') {
                    return t('settings.notConfigured');
                }
                return userData.stripeExternalAccount || t('settings.notConfigured');
            }
        },
        notifs: { label: t('settings.fields.notifications'), icon: faBell, truncateLength: 10 },
        contacts: { label: t('settings.fields.contacts'), icon: faUserGroup, truncateLength: 10 },
        location: { label: t('settings.fields.location'), icon: faLocationDot, truncateLength: 10 },
    };

    const accountFieldMapping = {
        download: { label: t('settings.account.downloadData') },
        clear: { label: t('settings.account.clearData') },
        delete: { label: t('settings.account.deleteAccount') },
    };

    return (
        <Background>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0} // Ajustez cette valeur selon vos besoins
            >
                <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
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
                                        {t('settings.title')}
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
                                        <Text paddingBottom={1} style={styles.h5}>{t('settings.generalSection')}</Text>
                                    </VStack>

                                    <VStack justifyContent="space-between">
                                        {Object.keys(fieldMappings).map((key, index) => {
                                            const field = fieldMappings[key];
                                            const value = key === 'password'
                                                ? field.value
                                                : key === 'income' || key === 'bank'
                                                    ? field.getValue(userData)
                                                    : key === 'notifs'
                                                        ? (notificationsEnabled ? t('settings.enabled') : t('settings.disabled'))
                                                        : key === 'contacts'
                                                            ? (contactsPermissionStatus ? t('settings.enabled') : t('settings.disabled'))
                                                            : key === 'location'
                                                                ? (locationPermissionStatus ? t('settings.enabled') : t('settings.disabled'))
                                                                : truncateText(userData?.[key] || t('settings.notSpecified'), field.truncateLength || 15);

                                            // Vérifie si c'est le dernier élément
                                            const isLast = index === Object.keys(fieldMappings).length - 1;

                                            return (
                                                <Pressable key={key} onPress={() => openEditModal(key, userData?.[key])}>
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
                                                                    ? getStatusText('notifs', notificationsEnabled)
                                                                    : key === 'contacts'
                                                                        ? getStatusText('contacts', contactsPermissionStatus)
                                                                        : key === 'location'
                                                                            ? getStatusText('location', locationPermissionStatus)
                                                                            : truncateText(value, field.truncateLength || 15)}
                                                            </Text>
                                                        </HStack>
                                                        <FontAwesome name="chevron-right" size={14} color="#94A3B8" />
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
                                        <Text paddingBottom={1} style={styles.h5}>{t('settings.dataSection')}</Text>
                                    </VStack>
                                    <VStack justifyContent="space-between">
                                        {Object.keys(accountFieldMapping).map((key, index) => {
                                            const field = accountFieldMapping[key];
                                            const value = key === 'password'
                                                ? field.value
                                                : userData?.[key] || t('settings.notSpecified'); // Priorité à une valeur spécifique (ex: password)

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
                                                        console.error(t('settings.errors.genericLog'), error);
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
                                    <Pressable onPress={handleLogout}>
                                        <HStack justifyContent="start" px={4} >
                                            <Text style={styles.h5} color="#FF78B2" fontSize="md">{t('settings.logout')}</Text>
                                        </HStack>
                                    </Pressable>
                                </Box>
                            </VStack>
                        </Box>
                    </ScrollView>
                </TouchableWithoutFeedback>
            </KeyboardAvoidingView>

            <EarningsModal
                isOpen={earningsModalVisible}
                onClose={() => setEarningsModalVisible(false)}
                userData={userData}
                navigation={navigation}
            />

            <StripeProvider
                publishableKey={STRIPE_PUBLISHABLE_KEY}
                urlScheme="hushy" // S'assurer que c'est le même que dans app.json
                merchantIdentifier="merchant.com.hushy" // Ajouter pour Apple Pay si nécessaire
            >
                <StripeVerificationModal
                    isOpen={stripeModalVisible}
                    onClose={() => setStripeModalVisible(false)}
                    userData={userData}
                    resetStripeAccount={handleResetStripeAccount}
                    navigation={navigation}
                />
            </StripeProvider>

            <Actionsheet
                isOpen={modalVisible}
                onClose={() => {
                    Keyboard.dismiss();
                    setModalVisible(false);
                }}
                bottom={selectedField === 'birthdate' ? undefined : "32%"}

            >
                <Actionsheet.Content>

                    <VStack width="100%" space={4} px={4}>

                        {selectedField === 'abonnements' && (!userData?.subscriptions || userData.subscriptions === 0) ? (
                            <>
                                <Text style={styles.h4} textAlign="center">
                                    {t('settings.mySubscriptions')}
                                </Text>
                                <Text
                                    style={styles.caption}
                                    color="#94A3B8"
                                    textAlign="center"
                                >
                                    {t('settings.noSubscriptionsYet')}
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
                                        {t('settings.viewSubscriptions')}
                                    </Text>
                                </Button>
                            </>
                        ) : (
                            <>
                                <Text style={styles.h4} textAlign="center">
                                    {t('settings.editField', { field: fieldMappings[selectedField]?.label?.toLowerCase() || t('settings.information') })}
                                </Text>

                                <Box width="100%">
                                    {selectedField === 'birthdate' ? (
                                        Platform.OS === 'web' ? (
                                            <TextInput
                                                value={tempValue}
                                                onChangeText={setTempValue}
                                                placeholder="YYYY-MM-DD"
                                                style={{
                                                    height: 48,
                                                    paddingHorizontal: 16,
                                                    backgroundColor: '#f5f5f5',
                                                    borderRadius: 6,  // borderRadius="md" approximation
                                                    fontSize: 16,
                                                    borderWidth: 1,
                                                    borderColor: 'transparent'
                                                }}
                                                keyboardType={Platform.OS === 'ios' ? 'numbers-and-punctuation' : 'default'}
                                            />
                                        ) : (
                                            <DateTimePicker
                                                value={tempValue ? new Date(tempValue) : new Date()}
                                                mode="date"
                                                display="spinner"
                                                textColor="#000"c
                                                style={styles.datePicker}
                                                onChange={handleDateChange}
                                            />
                                        )
                                    ) : (
                                        <TextInput
                                            ref={inputRef}
                                            placeholder={t('settings.editFieldPlaceholder', { field: fieldMappings[selectedField]?.label?.toLowerCase() || t('settings.information') })}
                                            value={inputValue}
                                            onChangeText={(text) => {
                                                console.log('Texte modifié:', text);
                                                setInputValue(text);
                                            }}
                                            style={{
                                                marginTop: 16,
                                                marginBottom: 16,
                                                paddingHorizontal: 16,
                                                paddingVertical: 12,
                                                backgroundColor: '#f5f5f5',
                                                borderRadius: 30,
                                                fontSize: 16,
                                                borderWidth: 1,
                                                borderColor: 'transparent'
                                            }}
                                            autoCorrect={false}
                                            spellCheck={false}
                                            onFocus={() => console.log('Focus acquis')}
                                            onBlur={() => console.log('Focus perdu')}
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
                                        {t('settings.save')}
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