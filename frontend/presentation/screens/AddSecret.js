import React, { useState, useContext, useEffect } from 'react';
import { Background } from '../../navigation/Background'; // Assurez-vous que ce chemin est correct
import { AuthContext } from '../../infrastructure/context/AuthContext';
import { useCardData } from '../../infrastructure/context/CardDataContexte';
import { Box, Text, HStack, VStack, Image, Select, Input, CheckIcon } from 'native-base';
import { Alert, Pressable, Dimensions, StyleSheet, Linking, KeyboardAvoidingView, Keyboard, Platform, TouchableWithoutFeedback, FlatList, Share } from 'react-native';
import { styles } from '../../infrastructure/theme/styles';
import { FontAwesome } from '@expo/vector-icons'; // Assurez-vous que FontAwesome est disponible
import { useTranslation } from 'react-i18next';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SCREEN_HEIGHT = Dimensions.get('window').height;

const AddSecret = () => {
    const { t } = useTranslation();
    const { userData } = useContext(AuthContext); // Utilisation correcte de useContext
    const { data, handlePostSecret, handleStripeOnboardingRefresh, handleStripeReturn } = useCardData();
    const [secretText, setSecretText] = useState('');
    const [selectedLabel, setSelectedLabel] = useState(''); // État pour la sélection du label
    const [price, setPrice] = useState(''); // État pour le prix
    const [secretPostAvailable, setSecretPostAvailable] = useState('false')
    const [expiresIn, setExpiresIn] = useState(7);
    const [buttonMessage, setButtonMessage] = useState(t('addSecret.postSecret'));
    const [boxHeight, setBoxHeight] = useState('70%');
    const [alertStep, setAlertStep] = useState(1);
    const { handleShareSecret } = useCardData();

    const MIN_PRICE = 3;
    const MIN_WORDS = 2;
    const CATEGORIES = t('addSecret.categories', { returnObjects: true });

    const labels = [...new Set(data.map((item) => item.label))];

    const calculatePriceAfterMargin = (originalPrice) => {
        if (!originalPrice) return 0;
        const sellerMargin = 0.10; // 10% maintenant
        const priceNumber = Number(originalPrice);
        return (priceNumber * (1 - sellerMargin)).toFixed(2);
    };

    useEffect(() => {
        const handleDeepLink = async (event) => {
            try {
                const url = event.url || event;
    
                if (!url) return;
    
                // Décodez et parsez l'URL
                const fullUrl = decodeURIComponent(url);
                const parsedUrl = new URL(fullUrl);
    
                // Vérifiez le schéma et le host
                if (
                    parsedUrl.protocol === 'hushy:' &&
                    (parsedUrl.hostname === 'stripe-return' || parsedUrl.hostname === 'profile')
                ) {
                    const result = await handleStripeReturn(fullUrl);
                }
            } catch (error) {
                console.error(t('addSecret.errors.deepLink'), error);
                Alert.alert(t('addSecret.errors.title'), t('addSecret.errors.unableToProcessLink'));
            }
        };
    
        // Écouteur d'événements pour les liens entrants
        const subscription = Linking.addEventListener('url', handleDeepLink);
    
        // Vérifier l'URL initiale au lancement
        Linking.getInitialURL().then(url => {
            if (url) {
                handleDeepLink({ url });
            }
        });
    
        return () => {
            subscription.remove();
        };
    }, [handleStripeReturn, t]);

    const handlePress = async () => {
        try {
            const result = await handlePostSecret({
                selectedLabel,
                secretText,
                price,
                expiresIn
            });
    
            if (result.requiresStripeSetup) {
                Alert.alert(
                    t('addSecret.alerts.setupRequired.title'),
                    t('addSecret.alerts.setupRequired.message'),
                    [
                        {
                            text: t('addSecret.alerts.setupRequired.configureNow'),
                            onPress: async () => {
                                try {
                                    const stripeStatus = await handleStripeOnboardingRefresh();
    
                                    if (stripeStatus.stripeOnboardingUrl) {
                                        await Linking.openURL(stripeStatus.stripeOnboardingUrl);
                                    } else {
                                        Alert.alert(t('addSecret.alerts.info'), stripeStatus.message);
                                    }
                                } catch (error) {
                                    Alert.alert(t('addSecret.errors.title'), error.message);
                                }
                            }
                        },
                        {
                            text: t('addSecret.alerts.later'),
                            style: "cancel"
                        }
                    ]
                );
            } else {
                Alert.alert(
                    t('addSecret.alerts.success.title'),
                    t('addSecret.alerts.success.message'),
                    [
                        {
                            text: t('addSecret.alerts.success.shareNow'),
                            onPress: async () => {
                                try {
                                    await handleShareSecret(result.secret);
                                } catch (error) {
                                    Alert.alert(t('addSecret.errors.title'), t('addSecret.errors.unableToShare'));
                                } finally {
                                    // Reset form fields
                                    setSecretText('');
                                    setSelectedLabel('');
                                    setPrice('');
                                    setExpiresIn(7);
                                }
                            }
                        },
                        {
                            text: t('addSecret.alerts.later'),
                            style: "cancel",
                            onPress: () => {
                                // Reset form fields
                                setSecretText('');
                                setSelectedLabel('');
                                setPrice('');
                                setExpiresIn(7);
                            }
                        }
                    ]
                );
            }
        } catch (error) {
            Alert.alert(t('addSecret.errors.title'), error.message);
        }
    };

    // Surveille les changements dans les champs et met à jour l'état de `secretPostAvailable`
    useEffect(() => {
        const isTextValid = secretText.trim().length > MIN_WORDS;
        const isLabelValid = selectedLabel.trim().length > 0;
        const isPriceValid = Number(price) >= MIN_PRICE;

        setSecretPostAvailable(isTextValid && isLabelValid && isPriceValid);

        // Définir le message approprié
        if (!isTextValid) {
            setButtonMessage(t('addSecret.validation.tooShort'));
        } else if (!isPriceValid) {
            setButtonMessage(t('addSecret.validation.priceRequirement', { minPrice: MIN_PRICE }));
        } else if (!isLabelValid) {
            setButtonMessage(t('addSecret.validation.selectCategory'));
        } else {
            setButtonMessage(t('addSecret.postSecret'));
        }
    }, [secretText, selectedLabel, price, t]);

    return (
        <Background>   {/* KeyboardAvoidingView pour gérer le clavier */}
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                {/* Fermer le clavier en cliquant en dehors */}
                <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                    <FlatList
                        contentContainerStyle={{ flexGrow: 1, paddingBottom: 160, marginBottom: 200 }}
                        keyboardShouldPersistTaps="handled"
                        data={[]} // Pas de données à afficher, juste pour utiliser FlatList
                        renderItem={null} // Pas de rendu d'éléments
                        ListHeaderComponent={
                            <Box
                                flex={1}
                                paddingX={5}
                                marginBottom={10}
                                style={{
                                    minHeight: Dimensions.get('window').height * 0.635, // Remplit la hauteur de l'écran
                                }}
                            >
                                <VStack style={styles.containerAddSecret} space={4}>
                                    <Text style={styles.h3}>
                                        {t('addSecret.addHushy')}
                                    </Text>
                                    <Box
                                        display="flex"
                                        width="100%"
                                        marginX="auto"
                                        minHeight='70%'
                                        borderRadius="lg"
                                        backgroundColor="white"
                                        marginTop={2}
                                        paddingTop={1}
                                        paddingBottom={4}
                                        justifyContent="space-between"
                                        style={customStyles.shadowBox}
                                    >
                                        <VStack backgroundColor="white" height={'100%'} alignItems="center" justifyContent="space-between" alignContent='center' padding={4} space={2}>
                                            <HStack alignItems="center" justifyContent="space-between" width="97%">
                                                <Box flex={1} mr={4} ml={2}>
                                                    <Text style={styles.h5}>
                                                        {t('addSecret.postedBy')} {userData?.name || t('addSecret.noDescriptionAvailable')}
                                                    </Text>
                                                </Box>
                                                <Image
                                                    src={userData?.profilePicture}
                                                    alt={`${userData?.name || 'User'}'s profile picture`}
                                                    width={45}
                                                    height={45}
                                                    borderRadius="full"
                                                />
                                            </HStack>

                                            <Box ml={2} width="95%">
                                                <Input
                                                    value={secretText}
                                                    onChangeText={(text) => setSecretText(text)}
                                                    placeholder={t('addSecret.whatIsNew')}
                                                    backgroundColor="transparent"
                                                    borderRadius="md"
                                                    fontSize="md"
                                                    p={2}
                                                    multiline
                                                    _input={{
                                                        fontSize: 20,
                                                        lineHeight: 22,
                                                        fontWeight: '600',
                                                        fontFamily: 'SF-Pro-Display-Semibold',
                                                        placeholderTextColor: '#94A3B8'
                                                    }}
                                                />
                                            </Box>

                                            <HStack mt={6} alignItems="start" alignContent="center" justifyContent="space-between" width="95%" space={2}>
                                                <VStack width="30%" alignItems="left">
                                                    <Text left={2} style={styles.ctalittle}>{t('addSecret.category')}</Text>
                                                    <Select
                                                        width="100%"
                                                        padding={2}
                                                        selectedValue={selectedLabel}
                                                        accessibilityLabel={t('addSecret.chooseCategory')}
                                                        placeholder={t('addSecret.chooseCategory')}
                                                        _placeholder={{
                                                            fontSize: 14,
                                                            lineHeight: 18,
                                                            fontWeight: '500',
                                                            fontFamily: 'SF-Pro-Display-Medium',
                                                            color: '#94A3B8'
                                                        }}
                                                        _customDropdownIconProps={{
                                                            display: 'none'
                                                        }}
                                                        _selectedItem={{
                                                            fontSize: 14,
                                                            lineHeight: 18,
                                                            fontWeight: '500',
                                                            fontFamily: 'SF-Pro-Display-Medium',
                                                            endIcon: (
                                                                <Box style={{ padding: 2 }}>
                                                                    <FontAwesome name="check" size={16} color="#94A3B8" />
                                                                </Box>
                                                            )
                                                        }}
                                                        mt={1}
                                                        onValueChange={(value) => setSelectedLabel(value)}
                                                    >
                                                        {CATEGORIES.map((category, index) => (
                                                            <Select.Item
                                                                key={index}
                                                                label={category}
                                                                value={category}
                                                                _text={{
                                                                    fontSize: 14,
                                                                    lineHeight: 18,
                                                                    fontWeight: '500',
                                                                    fontFamily: 'SF-Pro-Display-Medium'
                                                                }}
                                                            />
                                                        ))}
                                                    </Select>
                                                </VStack>

                                                <VStack width="33%" alignItems="center">
                                                    <Text style={styles.ctalittle}>{t('addSecret.price')}</Text>
                                                    <Input
                                                        value={`${price}${price ? '€' : ''}`}
                                                        width="100%"
                                                        padding={0}
                                                        onChangeText={(text) => {
                                                            // Enlever le symbole € et tout autre caractère non numérique
                                                            const numericText = text.replace(/[^0-9]/g, '');
                                                            setPrice(numericText);
                                                        }}
                                                        placeholder={`${MIN_PRICE}€ ${t('addSecret.min')}`}
                                                        backgroundColor="transparent"
                                                        borderRadius="md"
                                                        keyboardType="numeric"
                                                        textAlign="center"
                                                        _input={{
                                                            fontSize: 14,
                                                            lineHeight: 18,
                                                            fontWeight: '500',
                                                            fontFamily: 'SF-Pro-Display-Medium',
                                                            placeholderTextColor: '#94A3B8'
                                                        }}
                                                    />
                                                </VStack>
                                                <VStack width="20%" alignItems="end">
                                                    <Text left={2} style={styles.ctalittle}>{t('addSecret.duration')}</Text>
                                                    <Select
                                                        width="100%"
                                                        padding={2}
                                                        selectedValue={expiresIn}
                                                        accessibilityLabel={t('addSecret.chooseDuration')}
                                                        placeholder={t('addSecret.chooseDuration')}
                                                        _placeholder={{
                                                            fontSize: 14,
                                                            lineHeight: 18,
                                                            fontWeight: '500',
                                                            fontFamily: 'SF-Pro-Display-Medium',
                                                            color: '#94A3B8'
                                                        }}
                                                        _customDropdownIconProps={{
                                                            display: 'none'
                                                        }}
                                                        _selectedItem={{
                                                            fontSize: 14,
                                                            lineHeight: 18,
                                                            fontWeight: '500',
                                                            fontFamily: 'SF-Pro-Display-Medium',
                                                            endIcon: (
                                                                <Box style={{ padding: 2 }}>
                                                                    <FontAwesome name="check" size={16} color="#94A3B8" />
                                                                </Box>
                                                            )
                                                        }}
                                                        mt={1}
                                                        onValueChange={value => setExpiresIn(value)}
                                                    >
                                                        <Select.Item
                                                            label={t('addSecret.duration24h')}
                                                            value={1}
                                                            _text={{
                                                                fontSize: 14,
                                                                lineHeight: 18,
                                                                fontWeight: '500',
                                                                fontFamily: 'SF-Pro-Display-Medium'
                                                            }}
                                                        />
                                                        <Select.Item
                                                            label={t('addSecret.duration7d')}
                                                            value={7}
                                                            _text={{
                                                                fontSize: 14,
                                                                lineHeight: 18,
                                                                fontWeight: '500',
                                                                fontFamily: 'SF-Pro-Display-Medium'
                                                            }}
                                                        />
                                                        <Select.Item
                                                            label={t('addSecret.duration30d')}
                                                            value={30}
                                                            _text={{
                                                                fontSize: 14,
                                                                lineHeight: 18,
                                                                fontWeight: '500',
                                                                fontFamily: 'SF-Pro-Display-Medium'
                                                            }}
                                                        />
                                                    </Select>
                                                </VStack>
                                            </HStack>
                                        </VStack>
                                    </Box>

                                    {price ? (
                                        <Text
                                            style={[styles.caption]}
                                            color="#94A3B8"
                                            textAlign="center"
                                        >
                                            {t('addSecret.youWillReceive', { amount: calculatePriceAfterMargin(price) })}
                                        </Text>
                                    ) : null}
                                    <Pressable
                                        marginTop={7}
                                        onPress={handlePress}
                                        disabled={!secretPostAvailable}
                                        style={({ pressed }) => [
                                            {
                                                backgroundColor: secretPostAvailable
                                                    ? pressed
                                                        ? '#94A3B8'
                                                        : 'black'
                                                    : '#94A3B8',
                                                transform: pressed && secretPostAvailable ? [{ scale: 0.96 }] : [{ scale: 1 }],
                                                borderRadius: 20,
                                            },
                                            { width: '100%', alignSelf: 'center', padding: 18, borderRadius: 30 },
                                        ]}
                                    >
                                        <HStack alignItems="center" justifyContent="center" space={2}>
                                            <Text fontSize="md" color="white" fontWeight="bold">
                                                {buttonMessage}
                                            </Text>
                                        </HStack>
                                    </Pressable>
                                </VStack>
                            </Box>
                        }
                    />
                </TouchableWithoutFeedback>
            </KeyboardAvoidingView>
        </Background>
    );
};

const customStyles = StyleSheet.create({
    container: {
        display: 'flex',
        flex: 1,
        height: SCREEN_HEIGHT,
        width: '100%',
        justifyContent: 'space-between', // Ajoute de l'espace entre les éléments
        alignItems: 'center',
    },

    shadowBox: {
        shadowColor: 'violet',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
        elevation: 5
    },
});

export default AddSecret;