import React, { useState, useContext, useCallback, useRef, useEffect } from 'react';
import { VStack, Box, Input, Button, Text, Pressable, Link, Image, HStack, ScrollView } from 'native-base';
import { Animated, StyleSheet, View } from 'react-native';
import { BlurView } from '@react-native-community/blur';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import API_URL from '../config';
import { styles } from '../styles';
import { DynamicGradientText } from '../littlecomponents/DynamicGradientText';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faGoogle, faFacebookF, faApple } from '@fortawesome/free-brands-svg-icons';
import { faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons';
import LogoSvg from '../littlecomponents/Undy';

const Register = React.memo(function Register({ navigation }) {
    const { login } = useContext(AuthContext);
    const [name, setName] = useState('');
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

    const handleRegister = useCallback(async () => {
        try {
            const response = await axios.post(`${API_URL}/api/users/register`, {
                name,
                email: email.trim().toLowerCase(),
                password,
            });

            if (response.data.token) {
                login(response.data.token);
                setMessage('Inscription réussie, connexion en cours...');
            } else {
                setMessage('Erreur lors de la génération du token.');
            }
        } catch (error) {
            console.error('Erreur Axios:', error.response || error.message);
            setMessage(error.response?.data?.message || "Erreur lors de l'inscription");
        }
    }, [name, email, password, login]);

    return (
        <View style={styles.container}>
            {/* Background rotating animation */}
            <Animated.Image
                source={require('../assets/images/background.png')} // Remplacez par le chemin de votre image
                style={[styles.backgroundImage, { transform: [{ rotate: rotateAnimation }] }]}
            />

            {/* Overlay with blur effect */}
            <BlurView
                style={styles.overlay}
                blurType="light" // Types : "light", "dark", "extraLight"
                blurAmount={10} // Intensité du flou
                reducedTransparencyFallbackColor="rgba(255, 255, 255, 0.6)" // Couleur fallback si le blur n'est pas supporté
            />

            {/* Registration Content */}
            <ScrollView flex={1} pt={20} pb={20} p={4}>
                <Box flex={1} justifyContent="space-between" py={10}>
                    <Box justifyContent="center" alignItems="center">
                        <VStack space={4} alignItems="center" w="90%">
                        <LogoSvg />
                            <Input style={styles.caption} placeholder="Nom" value={name} onChangeText={setName} />
                            <Input style={styles.caption} placeholder="Email" value={email} onChangeText={setEmail} />
                            <Input
                                style={styles.caption}
                                placeholder="Mot de passe"
                                value={password}
                                secureTextEntry={!showPassword}
                                onChangeText={setPassword}
                                InputRightElement={
                                    <Pressable onPress={() => setShowPassword(!showPassword)} mr={4}>
                                        <FontAwesomeIcon
                                            icon={showPassword ? faEyeSlash : faEye}
                                            size={16}
                                            color="#94A3B8"
                                        />
                                    </Pressable>
                                }
                            />

                            <Button style={styles.cta} onPress={handleRegister} w="100%">
                                S'inscrire
                            </Button>
                            {message ? <Text color="red.500">{message}</Text> : null}
                        </VStack>

                        {/* Ligne "Ou avec" */}
                        <HStack alignItems="center" w="85%" space={2} mt={8} mb={4}>
                            <Box flex={1} height="1px" bg="#94A3B8" />
                            <Text style={styles.caption} color="#94A3B8">Ou avec</Text>
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
                            onPress={() => navigation.navigate('Login')}
                            _text={{ color: 'primary.500' }}
                        >
                            <DynamicGradientText fontSize={16} fontFamily="SF-Pro-Display-Regular" fontWeight="400">
                                Déjà un compte ? Connectez-vous ici
                            </DynamicGradientText>
                        </Link>
                    </Box>
                </Box>
            </ScrollView>
        </View>
    );
});

export default Register;
