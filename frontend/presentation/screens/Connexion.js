import React, { useState, useContext, useCallback, useRef, useEffect } from 'react';
import { VStack, Box, Input, Button, Text, Link, ScrollView, Pressable, Icon, HStack } from 'native-base';
import { Animated, View, Platform } from 'react-native';
import { BlurView } from '@react-native-community/blur';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faEye, faEyeSlash, faEnvelope } from '@fortawesome/free-solid-svg-icons';
import { faGoogle, faApple } from '@fortawesome/free-brands-svg-icons';
import { styles } from '../../infrastructure/theme/styles';
import LogoSvg from '../littlecomponents/Undy';
import createAxiosInstance from '../../data/api/axiosInstance';
import { AuthContext } from '../../infrastructure/context/AuthContext';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { appleAuth } from '@invertase/react-native-apple-authentication';

const Connexion = ({ navigation }) => {
    const { login } = useContext(AuthContext);

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [message, setMessage] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    // Animation setup for background rotation
    const rotateValue = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        // Configuration des services de connexion
        GoogleSignin.configure({
            webClientId: '780283646479-0202heave6heusabd5c2frfkrcdvd8.apps.googleusercontent.com',
            iosClientId: '780283646479-0202heave6heusabd5c2frfkrcdvd8.apps.googleusercontent.com',
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
            const axiosInstance = await createAxiosInstance();

            if (!axiosInstance) {
                throw new Error('Impossible de créer l\'instance Axios');
            }

            const response = await axiosInstance.post('/api/users/login', {
                email: email.trim().toLowerCase(),
                password,
            });

            if (response.data.token) {
                await login(response.data.token, response.data.refreshToken);
                setMessage('Connexion réussie !');
                navigation.navigate('Home');
            } else {
                setMessage('Erreur lors de la génération du token.');
            }
        } catch (error) {
            setMessage(error.response?.data?.message || 'Erreur lors de la connexion');
        }
    }, [email, password, login, navigation]);

    // Connexion Google
    const handleGoogleLogin = useCallback(async () => {
        try {
            await GoogleSignin.hasPlayServices();
            const userInfo = await GoogleSignin.signIn();

            const axiosInstance = await createAxiosInstance();
            const response = await axiosInstance.post('/api/users/google-login', {
                token: userInfo.idToken,
            });

            await login(response.data.token, response.data.refreshToken);
            navigation.navigate('Home');
        } catch (error) {
            setMessage('Échec de la connexion Google');
            console.error('Erreur de connexion Google:', error);
        }
    }, [login, navigation]);

    // Connexion Apple
    const handleAppleLogin = useCallback(async () => {
        try {
            const appleAuthRequestResponse = await appleAuth.performRequest({
                requestedOperation: appleAuth.Operation.LOGIN,
                requestedScopes: [appleAuth.Scope.EMAIL, appleAuth.Scope.FULL_NAME],
            });

            const credentialState = await appleAuth.getCredentialStateForUser(appleAuthRequestResponse.user);

            if (credentialState === appleAuth.State.AUTHORIZED) {
                const axiosInstance = await createAxiosInstance();
                const response = await axiosInstance.post('/api/users/apple-login', {
                    identityToken: appleAuthRequestResponse.identityToken,
                    authorizationCode: appleAuthRequestResponse.authorizationCode,
                });

                await login(response.data.token, response.data.refreshToken);
                navigation.navigate('Home');
            }
        } catch (error) {
            setMessage('Échec de la connexion Apple');
            console.error('Erreur de connexion Apple:', error);
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

                    <VStack mt={4} space={2} w="100%%">
                        {/* Bouton Apple */}
                        <Button
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

                        {/* Bouton Google */}
                        <Button
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

                        {/* Bouton Email */}
                        <Button
                            paddingY={4}
                            w="100%"
                            bg="black"
                            _text={{ fontFamily: 'SF-Pro-Display-Bold' }}
                            justifyContent="center"
                            onPress={() => navigation.navigate('Inscription')}
                        >
                            <HStack space={2} alignItems="center" justifyContent="center">
                                <FontAwesomeIcon icon={faEnvelope} size={16} color="#fff" />
                                <Text color="white" fontFamily="SF-Pro-Display-Bold">
                                    Continue avec l'adresse mail
                                </Text>
                            </HStack>
                        </Button>
                    </VStack>

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