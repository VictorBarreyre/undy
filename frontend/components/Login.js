import React, { useState, useContext, useCallback, useRef, useEffect } from 'react';
import { VStack, Box, Input, Button, Text, Pressable, Link, Image, ScrollView, HStack } from 'native-base';
import { Animated, StyleSheet, View } from 'react-native';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import API_URL from '../config';
import { styles as customStyles } from '../styles';
import { DynamicGradientText } from '../littlecomponents/DynamicGradientText';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons';
import { faGoogle, faFacebookF, faApple } from '@fortawesome/free-brands-svg-icons';
import { styles } from '../styles';
import { BlurView } from '@react-native-community/blur';



const Login = React.memo(function Login({ navigation }) {
  const { login } = useContext(AuthContext);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Animation setup
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

  const handleLogin = useCallback(async () => {
    try {
      const response = await axios.post(`${API_URL}/api/users/login`, {
        email: email.trim().toLowerCase(),
        password,
      });

      if (response.data.token) {
        login(response.data.token);
        setMessage('Connexion réussie');
      } else {
        setMessage('Erreur lors de la génération du token.');
      }
    } catch (error) {
      console.error('Erreur Axios:', error.response || error.message);
      setMessage(
        error.response?.data?.message || 'Erreur lors de la connexion'
      );
    }
  }, [email, password, login]);

  return (
    <View style={styles.container}>
      {/* Background rotating animation */}
      <Animated.Image
        source={require('../assets/images/background.png')} // Replace with your image path
        style={[styles.backgroundImage, { transform: [{ rotate: rotateAnimation }] }]}
      />



      {/* Overlay with blur effect and semi-transparent white background */}

      <BlurView
        style={styles.overlay}
        blurType="light" // Types : "light", "dark", "extraLight"
        blurAmount={10} // Intensité du flou
        reducedTransparencyFallbackColor="rgba(255, 255, 255, 0.6)" // Couleur fallback si le blur n'est pas supporté
      />

      {/* Login Content */}
      <ScrollView cflex={1} pt={20} pb={20} p={4}>
      <Box flex={1}  justifyContent="space-between" py={10}>
        <Box alignItems="center" justifyContent="center" >
          <Image
            source={require('../assets/images/u1.png')}
            alt="Logo de l'application"
            style={{ width: 50, height: 50, marginBottom: 1, resizeMode: 'contain' }}
          />
          <VStack space={4} alignItems="center" w="90%">
            <Text style={customStyles.h2} marginBottom="3">Connexion</Text>

            <Input
              style={customStyles.caption}
              placeholder="Email"
              value={email}
              onChangeText={setEmail}
              variant="outline"
              w="100%"
              _focus={{
                borderColor: 'blue.500',
                backgroundColor: 'gray.100',
              }}
            />

            <Input
              style={customStyles.caption}
              placeholder="Mot de passe"
              value={password}
              secureTextEntry={!showPassword}
              onChangeText={setPassword}
              variant="outline"
              w="100%"
              _focus={{
                borderColor: 'blue.500',
                backgroundColor: 'gray.100',
              }}
              InputRightElement={
                <Pressable onPress={() => setShowPassword(!showPassword)}>
                  <FontAwesomeIcon
                    icon={showPassword ? faEyeSlash : faEye}
                    size={16}
                    style={{ marginRight: 20 }}
                    color="#94A3B8"
                  />
                </Pressable>
              }
            />

            <Link _text={{ color: '#F97794' }} pb={0}>
              <DynamicGradientText fontSize={16} fontFamily="SF-Pro-Display-Regular" fontWeight="400">
                Mot de passe oublié ?
              </DynamicGradientText>
            </Link>

            <Button
              style={customStyles.cta}
              onPress={handleLogin}
              backgroundColor="black"
              w="100%"
            >
              Se connecter
            </Button>

            {message ? <Text color="red.500">{message}</Text> : null}
          </VStack>

          {/* Ligne "Ou avec" */}
          <HStack alignItems="center" w="85%" space={2} mt={8} mb={4}>
            <Box flex={1} height="1px" bg="#94A3B8" />
            <Text style={customStyles.caption} color="#94A3B8">
              Ou avec
            </Text>
            <Box flex={1} height="1px" bg="#94A3B8" />
          </HStack>

          {/* Boutons de connexion avec services tiers */}
          <VStack mt={5} space={4} w="90%">
            <Button
              w="100%"
              bg="white"
              borderWidth={1}
              borderColor="gray.300"
              leftIcon={<FontAwesomeIcon icon={faGoogle} size={16} color="#000" />}
              _text={{ color: 'black', fontFamily: 'SF-Pro-Display-Bold' }}
            >
              Continue with Google
            </Button>

            <Button
              w="100%"
              bg="#1877F2"
              leftIcon={<FontAwesomeIcon icon={faFacebookF} size={16} color="#fff" />}
              _text={{ color: 'white', fontFamily: 'SF-Pro-Display-Bold' }}
            >
              Continue with Facebook
            </Button>

            <Button
              w="100%"
              bg="black"
              leftIcon={<FontAwesomeIcon icon={faApple} size={16} color="#fff" />}
              _text={{ color: 'white', fontFamily: 'SF-Pro-Display-Bold' }}
            >
              Continue with Apple
            </Button>
          </VStack>
        </Box>

        <Box alignItems="center" mt={10} mb={10}>
          <Link
            onPress={() => navigation.navigate('Register')}
            _text={{ color: 'primary.500' }}
          >
            <DynamicGradientText fontSize={16} fontFamily="SF-Pro-Display-Regular" fontWeight="400">
              Pas encore de compte ? Inscrivez-vous ici
            </DynamicGradientText>
          </Link>
        </Box>
        </Box>
      </ScrollView>
    </View>
  );
});

export default Login;