import React, { useState, useContext, useCallback, useRef, useEffect } from 'react';
import { VStack, Box, Input, Button, Text, Link, ScrollView, Pressable, Icon, HStack } from 'native-base';
import { Animated, View, Platform } from 'react-native';
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
import { GOOGLE_WEBCLIENT_ID, GOOGLE_IOS_ID } from '@env'

const Connexion = ({ navigation }) => {
    const { login } = useContext(AuthContext);

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [message, setMessage] = useState('');
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
                setMessage('Erreur lors de la génération du token.');
            }
        } catch (error) {
            console.error('Erreur détaillée:', {
                message: error.message,
                response: error.response?.data,
                status: error.response?.status,
                headers: error.response?.headers
            });
            setMessage(error.response?.data?.message || 'Erreur lors de la connexion');
        }
    }, [email, password, login, navigation]);

    // Connexion Apple
    const handleAppleLogin = useCallback(async () => {
        try {
            console.log('1. Début de la connexion Apple');
            
            const isSupported = await appleAuth.isSupported;
            console.log('2. Apple Sign In supporté:', isSupported);
            
            if (!isSupported) {
                setMessage('Connexion Apple non disponible sur cet appareil');
                return;
            }
            
            console.log('3. Tentative d\'authentification Apple - AVANT performRequest');
            let appleAuthRequestResponse;
            
            try {
                appleAuthRequestResponse = await appleAuth.performRequest({
                    requestedOperation: appleAuth.Operation.LOGIN,
                    requestedScopes: [
                        appleAuth.Scope.EMAIL,
                        appleAuth.Scope.FULL_NAME
                    ]
                });
                console.log('4. Réponse reçue de Apple après performRequest');
            } catch (appleAuthError) {
                console.error('Erreur spécifique performRequest:', {
                    message: appleAuthError.message,
                    code: appleAuthError.code,
                    name: appleAuthError.name
                });
                throw new Error(`Erreur lors de la demande Apple: ${appleAuthError.message}`);
            }
            
            console.log('5. Détails de la réponse Apple:', {
                hasUser: !!appleAuthRequestResponse.user,
                hasIdentityToken: !!appleAuthRequestResponse.identityToken,
                hasAuthorizationCode: !!appleAuthRequestResponse.authorizationCode,
                hasRealUserStatus: !!appleAuthRequestResponse.realUserStatus,
                hasFullName: !!appleAuthRequestResponse.fullName
            });
            
            if (!appleAuthRequestResponse.identityToken) {
                console.error('6. ERREUR: Pas d\'identity token reçu!');
                throw new Error('Authentification Apple incomplète: pas de token reçu');
            }
            
            console.log('7. AVANT vérification des identifiants');
            let credentialState;
            try {
                credentialState = await appleAuth.getCredentialStateForUser(
                    appleAuthRequestResponse.user
                );
                console.log('8. État des identifiants obtenu:', credentialState);
            } catch (credentialError) {
                console.error('8. Erreur de vérification des identifiants:', {
                    message: credentialError.message,
                    code: credentialError.code
                });
                throw new Error(`Erreur de vérification des identifiants: ${credentialError.message}`);
            }
            
            if (credentialState === appleAuth.State.AUTHORIZED) {
                console.log('9. Identifiants autorisés, préparation de l\'envoi au serveur');
                
                const instance = getAxiosInstance();
                console.log('10. Instance Axios obtenue:', !!instance);
                
                if (!instance) {
                    throw new Error('Impossible de créer l\'instance Axios');
                }
                
                console.log('11. Préparation des données pour le serveur');
                const requestData = {
                    identityToken: appleAuthRequestResponse.identityToken,
                    authorizationCode: appleAuthRequestResponse.authorizationCode,
                    fullName: {
                        givenName: appleAuthRequestResponse.fullName?.givenName,
                        familyName: appleAuthRequestResponse.fullName?.familyName
                    }
                };
                
                console.log('12. AVANT envoi de la requête au serveur');
                let response;
                try {
                    response = await instance.post('/api/users/apple-login', requestData);
                    console.log('13. Réponse reçue du serveur');
                } catch (serverError) {
                    console.error('13. Erreur de communication avec le serveur:', {
                        message: serverError.message,
                        responseStatus: serverError.response?.status,
                        responseData: serverError.response?.data
                    });
                    throw new Error(`Erreur serveur: ${serverError.message}`);
                }
                
                console.log('14. Contenu de la réponse:', {
                    status: response.status,
                    hasToken: !!response.data.token,
                    hasRefreshToken: !!response.data.refreshToken
                });
                
                console.log('15. AVANT login avec les tokens');
                await login(response.data.token, response.data.refreshToken);
                console.log('16. Login réussi, navigation vers MainFeed');
                navigation.navigate('HomeTab', { screen: 'MainFeed' });
            } else {
                console.error('9. ERREUR: Identifiants non autorisés, état:', credentialState);
                throw new Error(`Identifiants Apple non autorisés (état: ${credentialState})`);
            }
        } catch (error) {
            console.error('Erreur globale de connexion Apple:', {
                message: error.message,
                stack: error.stack,
                name: error.name
            });
            
            if (error.response) {
                setMessage(error.response.data?.message || 'Échec de la connexion Apple');
            } else if (error.code === appleAuth.Error.CANCELED) {
                setMessage('Connexion Apple annulée');
            } else {
                setMessage(`Erreur: ${error.message}`);
            }
        }
    }, [login, navigation]);

    // Connexion Google
    const handleGoogleLogin = useCallback(async () => {
        try {
            // Your existing Google login code...
            console.log('1. Début de la connexion Google');
            
            // Configuration de GoogleSignin
            await GoogleSignin.configure({
                webClientId: GOOGLE_WEBCLIENT_ID,
                iosClientId: GOOGLE_IOS_ID,
                offlineAccess: true,
                scopes: ['email', 'profile'],
                forceCodeForRefreshToken: true
            });
            
            // Clean previous sessions
            try {
                await GoogleSignin.signOut();
            } catch (signOutError) {
                // Silent fail - no need to show this error
                console.log('Erreur de déconnexion (normal si pas déjà connecté):', signOutError.message);
            }
            
            // Check Google Play Services (for Android)
            await GoogleSignin.hasPlayServices({
                showPlayServicesUpdateDialog: true
            });
            
            // Sign-in attempt
            const userInfo = await GoogleSignin.signIn();
            
            // Get access token
            const tokens = await GoogleSignin.getTokens();
            
            if (!tokens.accessToken) {
                throw new Error('Aucun access token récupéré');
            }
            
            // Login to server with the access token
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
            
            // Login locally with received tokens
            await login(response.data.token, response.data.refreshToken);
            
            // Navigate to main page
            navigation.navigate('HomeTab', { screen: 'MainFeed' });
            
        } catch (error) {
            console.error('Erreur détaillée de connexion Google:', error.message);
            
            // Google Sign-In specific error handling
            if (error.code) {
                switch (error.code) {
                    case statusCodes.SIGN_IN_CANCELLED:
                        // User cancelled the login flow - don't show error
                        console.log('Connexion annulée par l\'utilisateur');
                        return; // Just return without setting any message
                        
                    case statusCodes.IN_PROGRESS:
                        // Silent handling - operation already in progress
                        console.log('Connexion déjà en cours');
                        return;
                        
                    case statusCodes.PLAY_SERVICES_NOT_AVAILABLE:
                        setMessage('Services Google indisponibles');
                        break;
                        
                    default:
                        // Technical error but with user-friendly message
                        setMessage('Problème de connexion avec Google');
                        // Log the technical details for debugging only
                        console.error(`Code d'erreur technique: ${error.code}`);
                }
            } else if (error.response) {
                // Server response error - use generic message
                console.error('Détails de l\'erreur serveur:', error.response.data);
                setMessage('Échec de connexion au serveur');
            } else {
                // Generic error - user-friendly message
                setMessage('Problème de connexion');
            }
        }
    }, [login, navigation]);

    
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

                {/* Message d'erreur */}
                {message ? (
                    <Box mt={4} p={4} bg="red.100" borderRadius="md">
                        <Text color="red.500" fontFamily="SF-Pro-Display-Regular">
                            {message}
                        </Text>
                    </Box>
                ) : null}

                {/* Section de connexion */}
                <Box alignItems="center" mb={4}>
                    <Text
                        style={styles.h4}
                        mt={10}
                        textAlign="center"
                    >
                        Connectez-vous ou{'\n'}créez un compte
                    </Text>

                    <VStack mt={4} space={2} w="100%">
                        {/* Form Section */}
                        {/* Email */}
                        <Input
                            placeholder="Email"
                            value={email}
                            onChangeText={setEmail}
                            autoCapitalize="none"
                            keyboardType="email-address"
                        />

                        {/* Password */}
                        <Input
                            placeholder="Mot de passe"
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
                        Se connecter
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
                        Enfait je n’ai pas de compte{' '}
                        <Text color="black" fontFamily="SF-Pro-Display-Regular" fontSize="14px">
                            🙂
                        </Text>
                    </Link>

                    <HStack w="95%" mt={2} mb={2} alignItems="center" opacity={0.8}>
                        <Box flex={1} h="1px" bg="#94A3B8" />
                        <Text style={styles.caption} mx={2} color="#94A3B8" >ou</Text>
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
                                    Continue with Apple
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
                                Continue with Google
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
                        En vous connectant, vous acceptez nos Conditions d'utilisation et
                        Politiques de confidentialité
                    </Link>
                </Box>
            </ScrollView>
        </View>
    );
};

export default Connexion;