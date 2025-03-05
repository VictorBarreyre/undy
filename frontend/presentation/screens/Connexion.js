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
import { GoogleSignin } from '@react-native-google-signin/google-signin';
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
            const isSupported = await appleAuth.isSupported;
            if (!isSupported) {
                setMessage('Connexion Apple non disponible sur cet appareil');
                return;
            }
    
            const appleAuthRequestResponse = await appleAuth.performRequest({
                requestedOperation: appleAuth.Operation.LOGIN,
                requestedScopes: [
                    appleAuth.Scope.EMAIL,
                    appleAuth.Scope.FULL_NAME
                ]
            });
    
            const credentialState = await appleAuth.getCredentialStateForUser(
                appleAuthRequestResponse.user
            );
    
            if (credentialState === appleAuth.State.AUTHORIZED) {
                // Utiliser l'instance existante au lieu d'en créer une nouvelle
                const instance = getAxiosInstance();
    
                if (!instance) {
                    throw new Error('Impossible de créer l\'instance Axios');
                }
    
                const response = await instance.post('/api/users/apple-login', {
                    identityToken: appleAuthRequestResponse.identityToken,
                    authorizationCode: appleAuthRequestResponse.authorizationCode,
                    fullName: {
                        givenName: appleAuthRequestResponse.fullName?.givenName,
                        familyName: appleAuthRequestResponse.fullName?.familyName
                    }
                });
    
                await login(response.data.token, response.data.refreshToken);
                navigation.navigate('HomeTab', { screen: 'MainFeed' });
            }
        } catch (error) {
            console.error('Erreur de connexion Apple :', error);
    
            if (error.response) {
                setMessage(error.response.data.message || 'Échec de la connexion Apple');
            } else if (error.code === appleAuth.Error.CANCELED) {
                setMessage('Connexion Apple annulée');
            } else {
                setMessage('Une erreur est survenue lors de la connexion');
            }
        }
    }, [login, navigation]);

    // Connexion Google
    const handleGoogleLogin = useCallback(async () => {
        try {
            await GoogleSignin.hasPlayServices();
            const userInfo = await GoogleSignin.signIn();
    
            console.log('Informations Google complètes:', JSON.stringify(userInfo, null, 2));
            console.log('ID Token:', userInfo.idToken);
            console.log('Access Token:', userInfo.accessToken);
    
            const instance = getAxiosInstance();
    
            if (!instance) {
                throw new Error('Impossible de créer l\'instance Axios');
            }
    
            // Utilisez la méthode correcte pour envoyer les données
            const response = await instance.post('/api/users/google-login', {
                token: userInfo.idToken // Assurez-vous que c'est bien idToken
            }, {
                headers: {
                    'Content-Type': 'application/json'
                }
            });
    
            await login(response.data.token, response.data.refreshToken);
            navigation.navigate('HomeTab', { screen: 'MainFeed' });
        } catch (error) {
            console.error('Détails complets de l\'erreur de connexion Google:', error.response || error);
            
            if (error.response) {
                // Erreur de réponse du serveur
                setMessage(error.response.data.message || 'Échec de la connexion Google');
            } else if (error.code) {
                // Erreurs spécifiques de GoogleSignin
                setMessage(`Erreur Google: ${error.code}`);
            } else {
                setMessage('Une erreur est survenue lors de la connexion Google');
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