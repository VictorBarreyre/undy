import React, { useState, useContext, useCallback, useRef, useEffect } from 'react';
import { VStack, Box, Input, Button, Text, Link, ScrollView, Pressable, Icon, HStack } from 'native-base';
import { Animated, View, Platform, Alert } from 'react-native';
import { BlurView } from '@react-native-community/blur';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faEye, faEyeSlash, faEnvelope } from '@fortawesome/free-solid-svg-icons';
import { faGoogle, faApple } from '@fortawesome/free-brands-svg-icons';
import { styles } from '../../infrastructure/theme/styles';
import LogoSvg from '../littlecomponents/Undy';
import { createAxiosInstance, getAxiosInstance } from '../../data/api/axiosInstance';
import { AuthContext } from '../../infrastructure/context/AuthContext';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { appleAuth } from '@invertase/react-native-apple-authentication';
import { GOOGLE_WEBCLIENT_ID, GOOGLE_IOS_ID } from '@env';
import { useTranslation } from 'react-i18next';

const Connexion = ({ navigation }) => {
    const { t } = useTranslation();
    const { login } = useContext(AuthContext);

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isAppleSignInSupported, setIsAppleSignInSupported] = useState(false);

    useEffect(() => {
        const checkAppleSignInSupport = async () => {
            try {
                const supported = await appleAuth.isSupported;
                setIsAppleSignInSupported(supported);
            } catch (error) {
                console.error('Erreur de vérification Apple Sign In:', error);
            }
        };

        checkAppleSignInSupport();
    }, []);

    // Animation setup for background rotation
    const rotateValue = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        // Configuration des services de connexion
        GoogleSignin.configure({
            webClientId: GOOGLE_WEBCLIENT_ID,
            iosClientId: GOOGLE_IOS_ID,
            offlineAccess: true,
        });

        // Animation de rotation
        const rotationAnimation = Animated.loop(
            Animated.timing(rotateValue, {
                toValue: 1,
                duration: 10000,
                useNativeDriver: true,
            })
        );
        rotationAnimation.start();

        // Nettoyage de l'animation
        return () => rotationAnimation.stop();
    }, []);

    const rotateAnimation = rotateValue.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg'],
    });

    // Connexion standard
    const handleLogin = useCallback(async () => {
        try {
            console.log('1. Début de la tentative de connexion');
            const instance = getAxiosInstance();

            console.log('2. Instance Axios créée:', !!instance);

            if (!instance) {
                throw new Error('Impossible de créer l\'instance Axios');
            }

            console.log('3. Envoi de la requête avec:', {
                email: email.trim().toLowerCase(),
                password: '***'
            });

            const response = await instance.post('/api/users/login', {
                email: email.trim().toLowerCase(),
                password,
            });

            console.log('4. Réponse reçue:', {
                status: response.status,
                hasToken: !!response.data.token,
                hasRefreshToken: !!response.data.refreshToken
            });

            if (response.data.token) {
                console.log('5. Token reçu, appel de la fonction login');
                await login(response.data.token, response.data.refreshToken);
                console.log('6. Login réussi, navigation vers MainFeed');
                navigation.navigate('HomeTab', { screen: 'MainFeed' });
            } else {
                Alert.alert(
                    t('auth.errors.connectionError'),
                    t('auth.errors.tokenError'),
                    [{ text: t('auth.alerts.ok') }]
                );
            }
        } catch (error) {
            console.error('Erreur détaillée:', {
                message: error.message,
                response: error.response?.data,
                status: error.response?.status,
                headers: error.response?.headers
            });
            Alert.alert(
                t('auth.errors.connectionError'),
                error.response?.data?.message || t('auth.errors.genericError'),
                [{ text: t('auth.alerts.ok') }]
            );
        }
    }, [email, password, login, navigation, t]);

    // Connexion Apple
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
            
            // Reste du code Apple login...
            let appleAuthRequestResponse;
            
            try {
                appleAuthRequestResponse = await appleAuth.performRequest({
                    requestedOperation: appleAuth.Operation.LOGIN,
                    requestedScopes: [
                        appleAuth.Scope.EMAIL,
                        appleAuth.Scope.FULL_NAME
                    ]
                });
            } catch (appleAuthError) {
                console.error('Erreur spécifique performRequest:', {
                    message: appleAuthError.message,
                    code: appleAuthError.code,
                    name: appleAuthError.name
                });
                throw new Error(`Erreur lors de la demande Apple: ${appleAuthError.message}`);
            }
            
            if (!appleAuthRequestResponse.identityToken) {
                throw new Error('Authentification Apple incomplète: pas de token reçu');
            }
            
            let credentialState;
            try {
                credentialState = await appleAuth.getCredentialStateForUser(
                    appleAuthRequestResponse.user
                );
            } catch (credentialError) {
                throw new Error(`Erreur de vérification des identifiants: ${credentialError.message}`);
            }
            
            if (credentialState === appleAuth.State.AUTHORIZED) {
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
                    throw new Error(`Erreur serveur: ${serverError.message}`);
                }
                
                await login(response.data.token, response.data.refreshToken);
                navigation.navigate('HomeTab', { screen: 'MainFeed' });
            } else {
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
                    t('auth.errors.connectionError'),
                    error.response.data?.message || t('auth.errors.genericError'),
                    [{ text: t('auth.alerts.ok') }]
                );
            } else if (error.code === appleAuth.Error.CANCELED) {
                // Ne rien afficher quand l'utilisateur annule
                console.log('Connexion Apple annulée par l\'utilisateur');
                return;
            } else {
                Alert.alert(
                    t('auth.errors.connectionError'),
                    `${t('auth.errors.genericError')}: ${error.message}`,
                    [{ text: t('auth.alerts.ok') }]
                );
            }
        }
    }, [login, navigation, t]);

    // Connexion Google
    const handleGoogleLogin = useCallback(async () => {
        try {
            // Configuration de GoogleSignin, etc...
            await GoogleSignin.configure({
                webClientId: GOOGLE_WEBCLIENT_ID,
                iosClientId: GOOGLE_IOS_ID,
                offlineAccess: true,
                scopes: ['email', 'profile'],
                forceCodeForRefreshToken: true
            });
            
            try {
                await GoogleSignin.signOut();
            } catch (signOutError) {
                console.log('Erreur de déconnexion (normal):', signOutError.message);
            }
            
            await GoogleSignin.hasPlayServices({
                showPlayServicesUpdateDialog: true
            });
            
            const userInfo = await GoogleSignin.signIn();
            const tokens = await GoogleSignin.getTokens();
            
            if (!tokens.accessToken) {
                throw new Error('Aucun access token récupéré');
            }
            
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
            
            await login(response.data.token, response.data.refreshToken);
            navigation.navigate('HomeTab', { screen: 'MainFeed' });
            
        } catch (error) {
            console.error('Erreur détaillée de connexion Google:', error.message);
            
            if (error.code) {
                switch (error.code) {
                    case statusCodes.SIGN_IN_CANCELLED:
                        // User cancelled the login flow - don't show error
                        console.log('Connexion annulée par l\'utilisateur');
                        return;
                        
                    case statusCodes.IN_PROGRESS:
                        // Silent handling - operation already in progress
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
                        console.error(`Code d'erreur technique: ${error.code}`);
                }
            } else if (error.response) {
                console.error('Détails de l\'erreur serveur:', error.response.data);
                Alert.alert(
                    t('auth.errors.serverError'),
                    t('auth.errors.genericError'),
                    [{ text: t('auth.alerts.ok') }]
                );
            } else {
                Alert.alert(
                    t('auth.alerts.errorTitle'),
                    t('auth.errors.genericError'),
                    [{ text: t('auth.alerts.ok') }]
                );
            }
        }
    }, [login, navigation, t]);

    
    return (
        <View style={styles.container}>
            {/* Fond animé */}
            <Animated.Image
                source={require('../../assets/images/background.png')}
                style={[styles.backgroundImage, { transform: [{ rotate: rotateAnimation }] }]}
            />

            {/* Effet de flou */}
            <BlurView
                style={styles.overlay}
                blurType="light"
                blurAmount={100}
                reducedTransparencyFallbackColor="rgba(255, 255, 255, 0.6)"
            />

            <ScrollView
                contentContainerStyle={{ flexGrow: 1, justifyContent: 'space-between' }}
                p={4}
            >
                {/* Section Logo */}
                <Box alignItems="center" mt={20}>
                    <LogoSvg />
                </Box>

                {/* Section de connexion */}
                <Box alignItems="center" mb={4}>
                    <Text
                        style={styles.h4}
                        mt={10}
                        textAlign="center"
                    >
                        {t('auth.login.title')}
                    </Text>

                    <VStack mt={4} space={2} w="100%">
                        {/* Email */}
                        <Input
                            placeholder={t('auth.login.email')}
                            value={email}
                            onChangeText={setEmail}
                            autoCapitalize="none"
                            keyboardType="email-address"
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

                    {/* CTA - Login Button */}
                    <Button
                        mt={5}
                        w="100%"
                        bg="black"
                        _text={{ color: 'white', fontFamily: 'SF-Pro-Display-Bold' }}
                        onPress={handleLogin}
                    >
                        {t('auth.login.loginButton')}
                    </Button>

                    {/* Link to Register */}
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
                        onPress={() => navigation.navigate('Inscription')}
                    >
                        {t('auth.login.noAccount')}
                    </Link>

                    <HStack w="95%" mt={2} mb={2} alignItems="center" opacity={0.8}>
                        <Box flex={1} h="1px" bg="#94A3B8" />
                        <Text style={styles.caption} mx={2} color="#94A3B8">{t('auth.login.or')}</Text>
                        <Box flex={1} h="1px" bg="#94A3B8" />
                    </HStack>

                    {Platform.OS === 'ios' && isAppleSignInSupported && (
                        <Button
                            mt={4}
                            paddingY={4}
                            w="100%"
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
                        w="100%"
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

                    <Link
                        px={10}
                        mt={4}
                        style={styles.littleCaption}
                        onPress={() => navigation.navigate('Login')}
                        _text={{
                            color: 'black',
                            fontFamily: 'SF-Pro-Display-Regular',
                            fontSize: '12',
                            textAlign: 'center',
                            lineHeight: '14',
                            textDecoration: 'none'
                        }}
                    >
                        {t('auth.login.termsAndPrivacy')}
                    </Link>
                </Box>
            </ScrollView>
        </View>
    );
};

export default Connexion;