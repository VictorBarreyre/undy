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
    } finally {
        // Désactiver l'indicateur de chargement
        setIsAuthenticationInProgress(false);
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
        if (appleAuthError.code === appleAuth.Error.CANCELED) {
          console.log('User cancelled Apple Sign In - silently returning');
          return;
        }
        console.log('Apple auth request error:', {
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
        console.log('Apple credential verification error:', credentialError);
        throw new Error(`Credential verification error: ${credentialError.message}`);
      }
  
      // Only proceed if authorized
      if (credentialState === appleAuth.State.AUTHORIZED) {
        console.log('Apple credentials authorized, proceeding with backend authentication');
  
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
  
        console.log('Sending Apple credentials to backend');
        let response;
        try {
          response = await instance.post('/api/users/apple-login', requestData);
          console.log('Backend authentication successful');
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
  }, [login, navigation, t, setIsAuthenticationInProgress]);

  const handleGoogleLogin = useCallback(async () => {
    // Si une tentative est déjà en cours, ne rien faire
    if (isGoogleSignInInProgress) {
      console.log('Connexion Google déjà en cours - ignoré');
      return;
    }
  

    try {
      // Marquer le début de la tentative
      setIsGoogleSignInInProgress(true);
      console.log('1. Début du processus de connexion Google');

      // Vérifier la disponibilité des services Google
      await GoogleSignin.hasPlayServices({
        showPlayServicesUpdateDialog: true
      });

      // Déconnexion préalable (pour éviter les conflits de session)
      try {
        await GoogleSignin.signOut();
      } catch (signOutError) {
        // Ignorer cette erreur, c'est normal
        console.log('Déconnexion préalable - ignoré:', signOutError.message);
      }

      // Tenter la connexion
      console.log('2. Tentative de connexion avec GoogleSignin.signIn()');
      const userInfo = await GoogleSignin.signIn();

      console.log('3. Résultat de GoogleSignin.signIn():', userInfo ? 'OK' : 'null');
      console.log('UserInfo details:', JSON.stringify(userInfo, null, 2));

      // Vérifier que nous avons les données utilisateur
      if (!userInfo) {
        console.log('Aucune information utilisateur reçue - arrêt silencieux');
        return;
      }

      // Récupérer les tokens
      console.log('4. Tentative de récupération des tokens');
      const tokens = await GoogleSignin.getTokens();
      console.log('5. Tokens récupérés:', tokens ? 'OK' : 'null');

      setIsAuthenticationInProgress(true);

      // Vérifier que nous avons un token
      if (!tokens || !tokens.accessToken) {
        console.log('Token d\'accès manquant - arrêt silencieux');
        return;
      }

      // Créer l'instance Axios
      console.log('6. Création de l\'instance Axios');
      const instance = getAxiosInstance();
      if (!instance) {
        console.log('Impossible de créer l\'instance Axios - arrêt silencieux');
        return;
      }

      // Préparer les données pour l'API
      const userData = userInfo.user;
      console.log('7. Données utilisateur préparées:', {
        email: userData?.email,
        id: userData?.id,
        name: userData?.name
      });

      // Appeler l'API de connexion
      console.log('8. Envoi de la requête au serveur');
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

    
      console.log('9. Réponse du serveur reçue:', {
        status: response.status,
        hasToken: !!response.data?.token,
        hasRefreshToken: !!response.data?.refreshToken
      });

      // Vérifier que nous avons une réponse valide
      if (!response.data || !response.data.token) {
        console.log('Réponse invalide du serveur - arrêt silencieux');
        return;
      }

      // Connexion réussie, procéder à la connexion locale
      console.log('10. Connexion réussie, navigation vers l\'application');
      await login(response.data.token, response.data.refreshToken);
      navigation.navigate('HomeTab', { screen: 'MainFeed' });

    } catch (error) {
      // IMPORTANT: Ne pas afficher d'alerte, juste logger l'erreur
      console.log('Erreur de connexion Google:', error.code || error.message);

      // Pour le débogage uniquement
      if (error.code) {
        switch (error.code) {
          case statusCodes.SIGN_IN_CANCELLED:
            console.log('Connexion annulée par l\'utilisateur');
            break;
          case statusCodes.IN_PROGRESS:
            console.log('Connexion déjà en cours');
            break;
          case statusCodes.PLAY_SERVICES_NOT_AVAILABLE:
            console.log('Services Google Play non disponibles');
            break;
          default:
            console.log(`Erreur Google inconnue: ${error.code}`);
        }
      } else if (error.response) {
        console.log('Erreur serveur:', error.response.status, error.response.data);
      } else {
        console.log('Erreur générique:', error.message);
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
            mb={2}
            textAlign="center"
          >
            {t('auth.login.title')}
          </Text>

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