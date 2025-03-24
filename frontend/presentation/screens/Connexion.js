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
          console.log('Starting Apple login process');
          
          // Check if Apple Sign In is supported on this device
          const isSupported = await appleAuth.isSupported;
          console.log('Apple Sign In supported:', isSupported);
          
          if (!isSupported) {
            Alert.alert(
              t('auth.alerts.serviceUnavailable'),
              t('auth.errors.appleNotAvailable'),
              [{ text: t('auth.alerts.ok') }]
            );
            return;
          }
          
          // Request authentication from Apple
          console.log('Requesting Apple authentication');
          let appleAuthRequestResponse;
          
          try {
            appleAuthRequestResponse = await appleAuth.performRequest({
              requestedOperation: appleAuth.Operation.LOGIN,
              requestedScopes: [
                appleAuth.Scope.EMAIL,
                appleAuth.Scope.FULL_NAME
              ]
            });
            
            console.log('Apple auth request successful');
          } catch (appleAuthError) {
            console.error('Apple auth request error:', {
              message: appleAuthError.message,
              code: appleAuthError.code
            });
            
            // If user cancelled, just return without showing an error
            if (appleAuthError.code === appleAuth.Error.CANCELED) {
              console.log('User cancelled Apple Sign In');
              return;
            }
            
            throw new Error(`Apple authentication request failed: ${appleAuthError.message}`);
          }
          
          // Validate that we got a token
          if (!appleAuthRequestResponse || !appleAuthRequestResponse.identityToken) {
            throw new Error('Apple authentication incomplete: no token received');
          }
          
          console.log('Apple identity token received');
          
          // Verify the user's credentials
          let credentialState;
          try {
            credentialState = await appleAuth.getCredentialStateForUser(
              appleAuthRequestResponse.user
            );
            console.log('Apple credential state:', credentialState);
          } catch (credentialError) {
            console.error('Apple credential verification error:', credentialError);
            throw new Error(`Credential verification error: ${credentialError.message}`);
          }
          
          // Only proceed if authorized
          if (credentialState === appleAuth.State.AUTHORIZED) {
            console.log('Apple credentials authorized, proceeding with backend authentication');
            
            const instance = getAxiosInstance();
            if (!instance) {
              throw new Error('Unable to create Axios instance');
            }
            
            const requestData = {
              identityToken: appleAuthRequestResponse.identityToken,
              authorizationCode: appleAuthRequestResponse.authorizationCode,
              fullName: {
                givenName: appleAuthRequestResponse.fullName?.givenName,
                familyName: appleAuthRequestResponse.fullName?.familyName
              }
            };
            
            console.log('Sending Apple credentials to backend');
            let response;
            try {
              response = await instance.post('/api/users/apple-login', requestData);
              console.log('Backend authentication successful');
            } catch (serverError) {
              console.error('Backend error during Apple authentication:', serverError);
              throw new Error(`Server error: ${serverError.message}`);
            }
            
            // Handle successful login
            await login(response.data.token, response.data.refreshToken);
            navigation.navigate('HomeTab', { screen: 'MainFeed' });
          } else {
            throw new Error(`Apple credentials not authorized (state: ${credentialState})`);
          }
        } catch (error) {
          console.error('Global Apple login error:', {
            message: error.message,
            name: error.name
          });
          
          // Don't show error for user cancellation
          if (error.code === appleAuth.Error.CANCELED) {
            console.log('User cancelled Apple Sign In');
            return;
          }
          
          // Handle server errors
          if (error.response) {
            Alert.alert(
              t('auth.errors.connectionError'),
              error.response.data?.message || t('auth.errors.genericError'),
              [{ text: t('auth.alerts.ok') }]
            );
          } else {
            // Handle other errors
            Alert.alert(
              t('auth.errors.connectionError'),
              `${t('auth.errors.genericError')}: ${error.message}`,
              [{ text: t('auth.alerts.ok') }]
            );
          }
        }
      }, [login, navigation, t]);

    const handleGoogleLogin = useCallback(async () => {
        try {
            console.log('Starting Google login process');

            // First check for Play Services (Android) or proper configuration (iOS)
            await GoogleSignin.hasPlayServices({
                showPlayServicesUpdateDialog: true
            });

            console.log('Play services available, proceeding with sign in');

            // Always try to sign out first to prevent session conflicts
            try {
                await GoogleSignin.signOut();
                console.log('Successfully signed out of previous Google session');
            } catch (signOutError) {
                // This is expected if no user was signed in, so just log it
                console.log('Sign out error (this is usually normal):', signOutError.message);
            }

            // Sign in the user
            const userInfo = await GoogleSignin.signIn();
            console.log('Google sign in successful, user info received');

            if (!userInfo) {
                throw new Error('No user information received from Google');
            }

            // Get the tokens only after userInfo is successfully retrieved
            const tokens = await GoogleSignin.getTokens();
            console.log('Tokens successfully retrieved');

            if (!tokens || !tokens.accessToken) {
                throw new Error('No access token received from Google');
            }

            // Now make the API call
            const instance = getAxiosInstance();
            if (!instance) {
                throw new Error('Unable to create Axios instance');
            }

            console.log('Sending credentials to backend');
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

            console.log('Backend authentication successful');

            // Handle the successful login
            await login(response.data.token, response.data.refreshToken);
            navigation.navigate('HomeTab', { screen: 'MainFeed' });

        } catch (error) {
            console.error('Detailed Google login error:', error);

            // Handle different error cases
            if (error.code) {
                switch (error.code) {
                    case statusCodes.SIGN_IN_CANCELLED:
                        console.log('User cancelled the login flow');
                        return; // Don't show an error for user cancellation

                    case statusCodes.IN_PROGRESS:
                        console.log('Google sign-in operation already in progress');
                        return; // Don't show an error for this case

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
                            `${t('auth.errors.googleConnectionError')} (${error.code})`,
                            [{ text: t('auth.alerts.ok') }]
                        );
                }
            } else if (error.response) {
                // Handle server errors
                const statusCode = error.response.status;
                const errorMessage = error.response.data?.message || t('auth.errors.genericError');

                Alert.alert(
                    t('auth.errors.connectionError'),
                    `${errorMessage} (${statusCode})`,
                    [{ text: t('auth.alerts.ok') }]
                );
            } else {
                // Handle other errors
                Alert.alert(
                    t('auth.errors.connectionError'),
                    error.message || t('auth.errors.genericError'),
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