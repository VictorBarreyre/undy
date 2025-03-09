import React, { useState, useContext, useCallback, useRef, useEffect } from 'react';
import { VStack, Box, Input, Button, Text, Link, ScrollView, Pressable, Icon, HStack } from 'native-base';
import { Animated, View, Platform, Alert } from 'react-native';
import { BlurView } from '@react-native-community/blur';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons';
import { faGoogle, faApple } from '@fortawesome/free-brands-svg-icons';
import { AuthContext } from '../../infrastructure/context/AuthContext';
import API_URL from '../../infrastructure/config/config';
import { styles } from '../../infrastructure/theme/styles';
import LogoSvg from '../littlecomponents/Undy';
import { createAxiosInstance, getAxiosInstance } from '../../data/api/axiosInstance';
import { appleAuth } from '@invertase/react-native-apple-authentication';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { GOOGLE_WEBCLIENT_ID, GOOGLE_IOS_ID } from '@env';
import { useTranslation } from 'react-i18next';

const Inscription = ({ navigation }) => {
    const { t } = useTranslation();
    const { login } = useContext(AuthContext);

    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isAppleSignInSupported, setIsAppleSignInSupported] = useState(false);

    // Animation setup for background rotation
    const rotateValue = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        // Configuration des services de connexion
        GoogleSignin.configure({
            webClientId: GOOGLE_WEBCLIENT_ID,
            iosClientId: GOOGLE_IOS_ID,
            offlineAccess: true,
            scopes: ['email', 'profile'],
            forceCodeForRefreshToken: true
        });

        const checkAppleSignInSupport = async () => {
            try {
                const supported = await appleAuth.isSupported;
                setIsAppleSignInSupported(supported);
            } catch (error) {
                console.error('Erreur de vérification Apple Sign In:', error);
            }
        };

        checkAppleSignInSupport();

        // Animation de rotation
        Animated.loop(
            Animated.timing(rotateValue, {
                toValue: 1,
                duration: 10000, // 10 seconds for a full rotation
                useNativeDriver: true,
            })
        ).start();

        return () => {
            // Cleanup
        };
    }, []);

    const rotateAnimation = rotateValue.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg'],
    });

    const handleAppleLogin = useCallback(async () => {
        try {
            console.log('1. Début de la connexion Apple');
            
            const isSupported = await appleAuth.isSupported;
            console.log('2. Apple Sign In supporté:', isSupported);
            
            if (!isSupported) {
                Alert.alert(
                    t('auth.alerts.serviceUnavailable'),
                    t('auth.errors.appleNotAvailable'),
                    [{ text: t('auth.alerts.ok') }]
                );
                return;
            }
            
            console.log('3. Tentative d\'authentification Apple');
            let appleAuthRequestResponse;
            
            try {
                appleAuthRequestResponse = await appleAuth.performRequest({
                    requestedOperation: appleAuth.Operation.LOGIN,
                    requestedScopes: [
                        appleAuth.Scope.EMAIL,
                        appleAuth.Scope.FULL_NAME
                    ]
                });
                console.log('4. Réponse reçue de Apple');
            } catch (appleAuthError) {
                console.error('Erreur performRequest:', {
                    message: appleAuthError.message,
                    code: appleAuthError.code,
                    name: appleAuthError.name
                });
                throw new Error(`Erreur lors de la demande Apple: ${appleAuthError.message}`);
            }
            
            if (!appleAuthRequestResponse.identityToken) {
                console.error('6. ERREUR: Pas d\'identity token reçu!');
                throw new Error('Authentification Apple incomplète: pas de token reçu');
            }
            
            let credentialState;
            try {
                credentialState = await appleAuth.getCredentialStateForUser(
                    appleAuthRequestResponse.user
                );
                console.log('8. État des identifiants obtenu:', credentialState);
            } catch (credentialError) {
                console.error('Erreur de vérification des identifiants:', {
                    message: credentialError.message,
                    code: credentialError.code
                });
                throw new Error(`Erreur de vérification des identifiants: ${credentialError.message}`);
            }
            
            if (credentialState === appleAuth.State.AUTHORIZED) {
                console.log('9. Identifiants autorisés, préparation de l\'envoi au serveur');
                
                const instance = getAxiosInstance();
                
                if (!instance) {
                    throw new Error('Impossible de créer l\'instance Axios');
                }
                
                const requestData = {
                    identityToken: appleAuthRequestResponse.identityToken,
                    authorizationCode: appleAuthRequestResponse.authorizationCode,
                    fullName: {
                        givenName: appleAuthRequestResponse.fullName?.givenName,
                        familyName: appleAuthRequestResponse.fullName?.familyName
                    }
                };
                
                let response;
                try {
                    response = await instance.post('/api/users/apple-login', requestData);
                } catch (serverError) {
                    console.error('Erreur de communication avec le serveur:', {
                        message: serverError.message,
                        responseStatus: serverError.response?.status,
                        responseData: serverError.response?.data
                    });
                    throw new Error(`Erreur serveur: ${serverError.message}`);
                }
                
                await login(response.data.token, response.data.refreshToken);
                navigation.navigate('HomeTab', { screen: 'MainFeed' });
            } else {
                console.error('ERREUR: Identifiants non autorisés, état:', credentialState);
                throw new Error(`Identifiants Apple non autorisés (état: ${credentialState})`);
            }
        } catch (error) {
            console.error('Erreur globale de connexion Apple:', {
                message: error.message,
                stack: error.stack,
                name: error.name
            });
            
            if (error.response) {
                Alert.alert(
                    t('auth.alerts.errorTitle'),
                    error.response.data?.message || t('auth.errors.genericError'),
                    [{ text: t('auth.alerts.ok') }]
                );
            } else if (error.code === appleAuth.Error.CANCELED) {
                // Ne rien faire quand l'utilisateur annule
                return;
            } else {
                Alert.alert(
                    t('auth.alerts.errorTitle'),
                    `${t('auth.errors.genericError')}: ${error.message}`,
                    [{ text: t('auth.alerts.ok') }]
                );
            }
        }
    }, [login, navigation, t]);

    const handleGoogleLogin = useCallback(async () => {
        try {
            console.log('1. Début de la connexion Google');
            
            // Configuration de GoogleSignin a déjà été faite dans useEffect
            
            // Nettoyage des sessions précédentes
            try {
                await GoogleSignin.signOut();
            } catch (signOutError) {
                // Erreur silencieuse, normal si pas déjà connecté
                console.log('Erreur de déconnexion (normal):', signOutError.message);
            }
            
            // Vérification des services Google Play (pour Android)
            await GoogleSignin.hasPlayServices({
                showPlayServicesUpdateDialog: true
            });
            
            // Tentative de connexion
            const userInfo = await GoogleSignin.signIn();
            
            // Obtenir l'access token
            const tokens = await GoogleSignin.getTokens();
            
            if (!tokens.accessToken) {
                throw new Error('Aucun access token récupéré');
            }
            
            // Connexion au serveur
            const instance = getAxiosInstance();
            
            if (!instance) {
                throw new Error('Impossible de créer l\'instance Axios');
            }
            
            const response = await instance.post('/api/users/google-login', 
                { 
                    token: tokens.accessToken,
                    tokenType: 'access_token',
                    userData: userInfo.user
                },
                {
                    headers: {
                        'Content-Type': 'application/json'
                    }
                }
            );
            
            // Connexion locale avec les tokens
            await login(response.data.token, response.data.refreshToken);
            
            // Navigation vers la page principale
            navigation.navigate('HomeTab', { screen: 'MainFeed' });
            
        } catch (error) {
            console.error('Erreur détaillée de connexion Google:', error.message);
            
            // Gestion spécifique des erreurs Google Sign-In
            if (error.code) {
                switch (error.code) {
                    case statusCodes.SIGN_IN_CANCELLED:
                        // Ne rien afficher quand l'utilisateur annule
                        console.log('Connexion annulée par l\'utilisateur');
                        return;
                        
                    case statusCodes.IN_PROGRESS:
                        // Ne rien afficher non plus
                        console.log('Connexion déjà en cours');
                        return;
                        
                    case statusCodes.PLAY_SERVICES_NOT_AVAILABLE:
                        Alert.alert(
                            t('auth.alerts.serviceUnavailable'),
                            t('auth.errors.googlePlayNotAvailable'),
                            [{ text: t('auth.alerts.ok') }]
                        );
                        break;
                        
                    default:
                        Alert.alert(
                            t('auth.errors.connectionError'),
                            t('auth.errors.googleConnectionError'),
                            [{ text: t('auth.alerts.ok') }]
                        );
                        // Log technique pour le débogage
                        console.error(`Code d'erreur technique: ${error.code}`);
                }
            } else if (error.response) {
                // Erreur de réponse du serveur
                console.error('Détails de l\'erreur serveur:', error.response.data);
                Alert.alert(
                    t('auth.errors.serverError'),
                    t('auth.errors.genericError'),
                    [{ text: t('auth.alerts.ok') }]
                );
            } else {
                // Erreur générique
                Alert.alert(
                    t('auth.alerts.errorTitle'),
                    t('auth.errors.genericError'),
                    [{ text: t('auth.alerts.ok') }]
                );
            }
        }
    }, [login, navigation, t]);

    const handleRegister = useCallback(async () => {
        try {
            console.log('Tentative d\'inscription...');
            // Créer une nouvelle instance axios avec l'URL de base correcte
            const instance = await getAxiosInstance();

            console.log('Données envoyées:', {
                name,
                email: email.trim().toLowerCase(),
                password: '***'
            });

            const response = await instance.post('/api/users/register', {
                name,
                email: email.trim().toLowerCase(),
                password,
            });

            if (response.data.token) {
                console.log('Inscription réussie:', response.data);
                await login(response.data.token, response.data.refreshToken);
                Alert.alert(
                    t('auth.register.successTitle'),
                    t('auth.register.successMessage'),
                    [{ text: t('auth.alerts.ok') }]
                );
                navigation.navigate('HomeTab', { screen: 'MainFeed' });
            } else {
                console.error('Erreur: Token non reçu.');
                Alert.alert(
                    t('auth.register.errorTitle'),
                    t('auth.errors.tokenError'),
                    [{ text: t('auth.alerts.ok') }]
                );
            }
        } catch (error) {
            console.error('Erreur complète:', {
                message: error.message,
                response: error.response?.data,
                config: error.config
            });
            Alert.alert(
                t('auth.register.errorTitle'),
                error.response?.data?.message || t('auth.register.genericError'),
                [{ text: t('auth.alerts.ok') }]
            );
        }
    }, [name, email, password, login, navigation, t]);


    return (
        <View style={styles.container}>
            {/* Background rotating animation */}
            <Animated.Image
                source={require('../../assets/images/background.png')}
                style={[styles.backgroundImage, { transform: [{ rotate: rotateAnimation }] }]}
            />

            {/* Overlay with blur effect */}
            <BlurView
                style={styles.overlay}
                blurType="light"
                blurAmount={100}
                reducedTransparencyFallbackColor="rgba(255, 255, 255, 0.6)"
            />

            <ScrollView
                width='100%'
                alignContent='center'
                contentContainerStyle={{ flexGrow: 1, justifyContent: 'space-between' }}
                p={4}
            >
                {/* Logo Section */}
                <Box alignItems="center" mt={16}>
                    <LogoSvg />
                </Box>

                {/* Form Section */}
                <Box alignItems="center" mb={4}>
                    <Text
                        style={styles.h4}
                        mt={10}
                        textAlign="center"
                    >
                        {t('auth.register.title')}
                    </Text>

                    <VStack mt={4} space={2} w="90%">
                        {/* Email */}
                        <Input
                            width='100%'
                            placeholder={t('auth.login.email')}
                            value={email}
                            onChangeText={setEmail}
                            autoCapitalize="none"
                            keyboardType="email-address"
                        />

                        {/* Name */}
                        <Input
                            placeholder={t('auth.register.name')}
                            value={name}
                            onChangeText={setName}
                            autoCapitalize="words"
                        />

                        {/* Password */}
                        <Input
                            placeholder={t('auth.login.password')}
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry={!showPassword}
                            InputRightElement={
                                <Pressable onPress={() => setShowPassword(!showPassword)}>
                                    <Icon
                                        as={<FontAwesomeIcon icon={showPassword ? faEyeSlash : faEye} />}
                                        size="5"
                                        mr="3"
                                        color="gray.500"
                                    />
                                </Pressable>
                            }
                        />
                    </VStack>

                    {/* CTA - Register Button */}
                    <Button
                        mt={5}
                        w="90%"
                        bg="black"
                        _text={{ color: 'white', fontFamily: 'SF-Pro-Display-Bold' }}
                        onPress={handleRegister}
                    >
                        {t('auth.register.registerButton')}
                    </Button>

                    {/* Link to Login */}
                    <Link
                        px={10}
                        mt={4}
                        mb={4}
                        _text={{
                            color: 'black',
                            fontFamily: 'SF-Pro-Display-Regular',
                            fontSize: '14px',
                            textAlign: 'center',
                            lineHeight: '16px',
                            textDecoration: 'none',
                        }}
                        onPress={() => navigation.navigate('Connexion')}
                    >
                        {t('auth.register.hasAccount')}
                    </Link>
                    

                    {/* Séparateur avec "ou" */}
                    <HStack w="90%" mt={4} mb={2} alignItems="center" opacity={0.8}>
                        <Box flex={1} h="1px" bg="#94A3B8" />
                        <Text style={styles.caption} mx={2} color="#94A3B8">{t('auth.login.or')}</Text>
                        <Box flex={1} h="1px" bg="#94A3B8" />
                    </HStack>

                    {/* Bouton Apple Sign In (iOS uniquement) */}
                    {Platform.OS === 'ios' && isAppleSignInSupported && (
                        <Button
                            mt={2}
                            paddingY={4}
                            w="90%"
                            bg="black"
                            _text={{ fontFamily: 'SF-Pro-Display-Bold' }}
                            justifyContent="center"
                            onPress={handleAppleLogin}
                        >
                            <HStack space={2} alignItems="center" justifyContent="center">
                                <FontAwesomeIcon icon={faApple} size={16} color="#fff" />
                                <Text color="white" fontFamily="SF-Pro-Display-Bold">
                                    {t('auth.login.continueWithApple')}
                                </Text>
                            </HStack>
                        </Button>
                    )}

                    {/* Bouton Google */}
                    <Button
                        mt={2}
                        mb={4}
                        paddingY={4}
                        w="90%"
                        bg="white"
                        _text={{ fontFamily: 'SF-Pro-Display-Bold' }}
                        justifyContent="center"
                        onPress={handleGoogleLogin}
                    >
                        <HStack space={2} alignItems="center" justifyContent="center">
                            <FontAwesomeIcon icon={faGoogle} size={16} color="#000" />
                            <Text color="black" fontFamily="SF-Pro-Display-Bold">
                                {t('auth.login.continueWithGoogle')}
                            </Text>
                        </HStack>
                    </Button>

                
                    {/* Politique de confidentialité */}
                    <Link
                        px={10}
                        mt={4}
                        style={styles.littleCaption}
                        _text={{
                            color: 'black',
                            fontFamily: 'SF-Pro-Display-Regular',
                            fontSize: '12',
                            textAlign: 'center',
                            lineHeight: '14',
                            textDecoration: 'none'
                        }}
                    >
                        {t('auth.register.termsAndPrivacy')}
                    </Link>
                </Box>
            </ScrollView>
        </View>
    );
};

export default Inscription;