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
import TypewriterLoader from '../components/TypewriterLoader';



const Connexion = ({ navigation }) => {
  const { t } = useTranslation();
  const { login } = useContext(AuthContext);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isAppleSignInSupported, setIsAppleSignInSupported] = useState(false);
  const [isGoogleSignInInProgress, setIsGoogleSignInInProgress] = useState(false);
  const [isAuthenticationInProgress, setIsAuthenticationInProgress] = useState(false);



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
      offlineAccess: true
    });

    // Animation de rotation
    const rotationAnimation = Animated.loop(
      Animated.timing(rotateValue, {
        toValue: 1,
        duration: 10000,
        useNativeDriver: true
      })
    );
    rotationAnimation.start();

    // Nettoyage de l'animation
    return () => rotationAnimation.stop();
  }, []);

  const rotateAnimation = rotateValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg']
  });

  // Connexion standard
  const handleLogin = useCallback(async () => {
    // Valider les champs d'entrée
    if (!email || !email.trim()) {
      Alert.alert(
        t('auth.errors.validationError'),
        t('auth.errors.emailRequired'),
        [{ text: t('auth.alerts.ok') }]
      );
      return;
    }

    if (!password) {
      Alert.alert(
        t('auth.errors.validationError'),
        t('auth.errors.passwordRequired'),
        [{ text: t('auth.alerts.ok') }]
      );
      return;
    }

    // Activer l'indicateur de chargement
    setIsAuthenticationInProgress(true);

    try {

      const instance = getAxiosInstance();



      if (!instance) {
        throw new Error('Impossible de créer l\'instance Axios');
      }






      const response = await instance.post('/api/users/login', {
        email: email.trim().toLowerCase(),
        password
      });







      if (response.data.token) {

        await login(response.data.token, response.data.refreshToken);

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
    } finally {
      // Désactiver l'indicateur de chargement
      setIsAuthenticationInProgress(false);
    }
  }, [email, password, login, navigation, t]);

  // Connexion Apple
  const handleAppleLogin = useCallback(async () => {
    try {


      // Check if Apple Sign In is supported on this device
      const isSupported = await appleAuth.isSupported;


      if (!isSupported) {
        Alert.alert(
          t('auth.alerts.serviceUnavailable'),
          t('auth.errors.appleNotAvailable'),
          [{ text: t('auth.alerts.ok') }]
        );
        return;
      }

      // Request authentication from Apple

      let appleAuthRequestResponse;

      try {
        appleAuthRequestResponse = await appleAuth.performRequest({
          requestedOperation: appleAuth.Operation.LOGIN,
          requestedScopes: [
          appleAuth.Scope.EMAIL,
          appleAuth.Scope.FULL_NAME]

        });


      } catch (appleAuthError) {
        if (appleAuthError.code === appleAuth.Error.CANCELED) {

          return;
        }





        // If user cancelled, just return without showing an error
        if (appleAuthError.code === appleAuth.Error.CANCELED) {

          return;
        }

        throw new Error(`Apple authentication request failed: ${appleAuthError.message}`);
      }

      // Validate that we got a token
      if (!appleAuthRequestResponse || !appleAuthRequestResponse.identityToken) {
        throw new Error('Apple authentication incomplete: no token received');
      }



      // Verify the user's credentials
      let credentialState;
      try {
        credentialState = await appleAuth.getCredentialStateForUser(
          appleAuthRequestResponse.user
        );

      } catch (credentialError) {

        throw new Error(`Credential verification error: ${credentialError.message}`);
      }

      // Only proceed if authorized
      if (credentialState === appleAuth.State.AUTHORIZED) {


        // Seulement MAINTENANT, on active l'écran de chargement
        // après avoir obtenu l'autorisation Apple et avant l'appel au backend
        setIsAuthenticationInProgress(true);

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


        let response;
        try {
          response = await instance.post('/api/users/apple-login', requestData);

        } catch (serverError) {
          console.error('Backend error during Apple authentication:', serverError);
          // Désactiver l'écran de chargement en cas d'erreur
          setIsAuthenticationInProgress(false);
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

      // Désactiver l'écran de chargement en cas d'erreur
      setIsAuthenticationInProgress(false);

      // Don't show error for user cancellation
      if (error.code === appleAuth.Error.CANCELED) {

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
  }, [login, navigation, t, setIsAuthenticationInProgress]);

  const handleGoogleLogin = useCallback(async () => {
    // Si une tentative est déjà en cours, ne rien faire
    if (isGoogleSignInInProgress) {

      return;
    }


    try {
      // Marquer le début de la tentative
      setIsGoogleSignInInProgress(true);


      // Vérifier la disponibilité des services Google
      await GoogleSignin.hasPlayServices({
        showPlayServicesUpdateDialog: true
      });

      // Déconnexion préalable (pour éviter les conflits de session)
      try {
        await GoogleSignin.signOut();
      } catch (signOutError) {


      }

      // Tenter la connexion

      const userInfo = await GoogleSignin.signIn();




      // Vérifier que nous avons les données utilisateur
      if (!userInfo) {

        return;
      }

      // Récupérer les tokens

      const tokens = await GoogleSignin.getTokens();


      setIsAuthenticationInProgress(true);

      // Vérifier que nous avons un token
      if (!tokens || !tokens.accessToken) {

        return;
      }

      // Créer l'instance Axios

      const instance = getAxiosInstance();
      if (!instance) {

        return;
      }

      // Préparer les données pour l'API
      const userData = userInfo.user;






      // Appeler l'API de connexion

      const response = await instance.post('/api/users/google-login',
      {
        token: tokens.accessToken,
        tokenType: 'access_token',
        userData: userData
      },
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
      );








      // Vérifier que nous avons une réponse valide
      if (!response.data || !response.data.token) {

        return;
      }

      // Connexion réussie, procéder à la connexion locale

      await login(response.data.token, response.data.refreshToken);
      navigation.navigate('HomeTab', { screen: 'MainFeed' });

    } catch (error) {
      // IMPORTANT: Ne pas afficher d'alerte, juste logger l'erreur


      // Pour le débogage uniquement
      if (error.code) {
        switch (error.code) {
          case statusCodes.SIGN_IN_CANCELLED:

            break;
          case statusCodes.IN_PROGRESS:

            break;
          case statusCodes.PLAY_SERVICES_NOT_AVAILABLE:

            break;
          default:

        }
      } else if (error.response) {

      } else {

      }
    } finally {
      // Toujours réinitialiser l'indicateur de connexion, que ce soit un succès ou un échec
      setIsGoogleSignInInProgress(false);
    }
  }, [isGoogleSignInInProgress, login, navigation]);



  if (isAuthenticationInProgress) {
    return <TypewriterLoader />;
  }

  return (
    <View style={styles.container}>
      {/* Fond animé */}
      <Animated.Image
        source={require('../../assets/images/background.png')}
        style={[styles.backgroundImage, { transform: [{ rotate: rotateAnimation }] }]} />


      {/* Effet de flou */}
      <BlurView
        style={styles.overlay}
        blurType="light"
        blurAmount={100}
        reducedTransparencyFallbackColor="rgba(255, 255, 255, 0.6)" />


      <ScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'space-between' }}
        p={4}>

        {/* Section Logo */}
        <Box alignItems="center" mt={20}>
          <LogoSvg />
        </Box>

        {/* Section de connexion */}
        <Box alignItems="center" mb={4}>
          <Text
            style={styles.h4}
            mb={2}
            textAlign="center">

            {t('auth.login.title')}
          </Text>

          {Platform.OS === 'ios' && isAppleSignInSupported &&
          <Button
            mt={4}
            paddingY={4}
            w="100%"
            bg="black"
            _text={{ fontFamily: 'SF-Pro-Display-Bold' }}
            justifyContent="center"
            onPress={handleAppleLogin}>

              <HStack space={2} alignItems="center" justifyContent="center">
                <FontAwesomeIcon icon={faApple} size={16} color="#fff" />
                <Text color="white" fontFamily="SF-Pro-Display-Bold">
                  {t('auth.login.continueWithApple')}
                </Text>
              </HStack>
            </Button>
          }

          {/* Bouton Google */}
          <Button
            mt={2}
            mb={4}
            paddingY={4}
            w="100%"
            bg="white"
            _text={{ fontFamily: 'SF-Pro-Display-Bold' }}
            justifyContent="center"
            onPress={handleGoogleLogin}>

            <HStack space={2} alignItems="center" justifyContent="center">
              <FontAwesomeIcon icon={faGoogle} size={16} color="#000" />
              <Text color="black" fontFamily="SF-Pro-Display-Bold">
                {t('auth.login.continueWithGoogle')}
              </Text>
            </HStack>
          </Button>

          <Link
            px={10}
            mt={2}
            mb={4}
            style={styles.littleCaption}
            onPress={() => navigation.navigate('Login')}
            _text={{
              color: 'black',
              fontFamily: 'SF-Pro-Display-Regular',
              fontSize: '12',
              textAlign: 'center',
              lineHeight: '14',
              textDecoration: 'none'
            }}>

            {t('auth.login.termsAndPrivacy')}
          </Link>
        </Box>
      </ScrollView>
    </View>);

};

export default Connexion;