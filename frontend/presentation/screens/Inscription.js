import React, { useState, useContext, useCallback, useRef, useEffect } from 'react';
import { VStack, Box, Input, Button, Text, Link, ScrollView, Pressable, Icon } from 'native-base';
import { Animated, View } from 'react-native';
import { BlurView } from '@react-native-community/blur';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons';
import { AuthContext } from '../../infrastructure/context/AuthContext';
import API_URL from '../../infrastructure/config/config';
import { styles } from '../../infrastructure/theme/styles';
import LogoSvg from '../littlecomponents/Undy';
import { createAxiosInstance, getAxiosInstance } from '../../data/api/axiosInstance';
import { appleAuth } from '@invertase/react-native-apple-authentication';


const Inscription = ({ navigation }) => {
    const { login } = useContext(AuthContext);

    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [message, setMessage] = useState('');

    // Animation setup for background rotation
    const rotateValue = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.loop(
            Animated.timing(rotateValue, {
                toValue: 1,
                duration: 10000, // 10 seconds for a full rotation
                useNativeDriver: true,
            })
        ).start();
    }, []);

    const rotateAnimation = rotateValue.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg'],
    });

    const handleAppleLogin = useCallback(async () => {
        try {
          // Vérifier si Apple Sign In est pris en charge
          const isSupported = await appleAuth.isSupported;
          if (!isSupported) {
            setMessage('Connexion Apple non disponible sur cet appareil');
            return;
          }
      
          // Demander l'authentification Apple
          const appleAuthRequestResponse = await appleAuth.performRequest({
            requestedOperation: appleAuth.Operation.LOGIN,
            requestedScopes: [
              appleAuth.Scope.EMAIL, 
              appleAuth.Scope.FULL_NAME
            ]
          });
      
          // Vérifier l'état des identifiants
          const credentialState = await appleAuth.getCredentialStateForUser(
            appleAuthRequestResponse.user
          );
      
          // Vérifier si l'utilisateur est autorisé
          if (credentialState === appleAuth.State.AUTHORIZED) {
            const axiosInstance = await createAxiosInstance();
            
            // Envoyer les données à votre backend
            const response = await axiosInstance.post('/api/users/apple-login', {
              identityToken: appleAuthRequestResponse.identityToken,
              authorizationCode: appleAuthRequestResponse.authorizationCode,
              fullName: {
                givenName: appleAuthRequestResponse.fullName?.givenName,
                familyName: appleAuthRequestResponse.fullName?.familyName
              }
            });
      
            // Connexion réussie
            await login(response.data.token, response.data.refreshToken);
            navigation.navigate('HomeTab', { screen: 'MainFeed' });
          }
        } catch (error) {
          console.error('Erreur de connexion Apple :', error);
          
          // Gérer différents types d'erreurs
          if (error.response) {
            setMessage(error.response.data.message || 'Échec de la connexion Apple');
          } else if (error.code === appleAuth.Error.CANCELED) {
            setMessage('Connexion Apple annulée');
          } else {
            setMessage('Une erreur est survenue');
          }
        }
      }, [login, navigation]);

      

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
                setMessage('Inscription réussie, connexion en cours...');
            } else {
                console.error('Erreur: Token non reçu.');
                setMessage('Erreur lors de la génération du token.');
            }
        } catch (error) {
            console.error('Erreur complète:', {
                message: error.message,
                response: error.response?.data,
                config: error.config
            });
            setMessage(error.response?.data?.message || "Erreur lors de l'inscription");
        }
    }, [name, email, password, login]);


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

                {message ? (
                    <Box mt={4} p={4} bg="red.100" borderRadius="md">
                        <Text color="red.500" fontFamily="SF-Pro-Display-Regular">
                            {message}
                        </Text>
                    </Box>
                ) : null}

                {/* Form Section */}
                <Box alignItems="center" mb={4}>
                    <Text
                        style={styles.h4}
                        mt={10}
                        textAlign="center"
                    >
                        Inscrivez-vous
                    </Text>

                    <VStack mt={4} space={2} w="90%">
                        {/* Email */}
                        <Input
                            width='100%'
                            placeholder="Email"
                            value={email}
                            onChangeText={setEmail}
                            autoCapitalize="none"
                            keyboardType="email-address"
                        />

                        {/* Name */}
                        <Input
                            placeholder="Nom"
                            value={name}
                            onChangeText={setName}
                            autoCapitalize="words"
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

                    {/* CTA - Register Button */}
                    <Button
                        mt={5}
                        w="90%"
                        bg="black"
                        _text={{ color: 'white', fontFamily: 'SF-Pro-Display-Bold' }}
                        onPress={handleRegister}
                    >
                        S'inscrire
                    </Button>

                    {/* Link to Login */}
                    <Link
                        px={10}
                        mt={4}
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
                        J’ai déjà un compte{' '}
                        <Text color="black" fontFamily="SF-Pro-Display-Regular" fontSize="14px">
                            🙂
                        </Text>
                    </Link>
                </Box>
            </ScrollView>
        </View>
    );
};

export default Inscription;