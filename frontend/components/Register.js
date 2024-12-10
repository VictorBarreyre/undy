import React, { useState, useContext, useCallback, useRef, useEffect } from 'react';
import { VStack, Box, Button, Text, Link, ScrollView, HStack } from 'native-base';
import { Animated, View } from 'react-native';
import { BlurView } from '@react-native-community/blur';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import API_URL from '../config';
import { styles } from '../styles';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faGoogle, faApple } from '@fortawesome/free-brands-svg-icons';
import { faEnvelope } from '@fortawesome/free-solid-svg-icons';
import LogoSvg from '../littlecomponents/Undy';

const Register = React.memo(function Register({ navigation }) {
    const { login } = useContext(AuthContext);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [message, setMessage] = useState('');

    // Animation setup
    const rotateValue = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.loop(
            Animated.timing(rotateValue, {
                toValue: 1,
                duration: 10000, // 10 seconds for full rotation
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
                source={require('../assets/images/background.png')}
                style={[styles.backgroundImage, { transform: [{ rotate: rotateAnimation }] }]}
            />

            {/* Overlay with blur effect */}
            <BlurView
                style={styles.overlay}
                blurType="light"
                blurAmount={100}
                reducedTransparencyFallbackColor="rgba(255, 255, 255, 0.6)"
            />

            {/* Content with spacing between top and bottom sections */}
            <ScrollView
                contentContainerStyle={{ flexGrow: 1, justifyContent: 'space-between' }}
                p={4}
            >
                {/* Section du haut : Logo */}
                <Box alignItems="center" mt={16}>
                    <LogoSvg />
                </Box>

                {/* Section du bas : Texte + Boutons + Lien */}
                <Box alignItems="center" mb={4}>
                    <Text
                        style={styles.h4}
                        mt={10}
                        textAlign="center"
                    >
                        Créez un compte ou{'\n'}connectez-vous
                    </Text>

                    <VStack mt={4} space={2} w="90%">
                        {/* Bouton Apple */}
                        <Button
                            w="100%"
                            bg="black"
                            _text={{ fontFamily: 'SF-Pro-Display-Bold' }}
                            justifyContent="center"
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
                            w="100%"
                            bg="white"
                          
                            _text={{ fontFamily: 'SF-Pro-Display-Bold' }}
                            justifyContent="center"
                        >
                            <HStack space={2} alignItems="center" justifyContent="center">
                                <FontAwesomeIcon icon={faGoogle} size={16} color="#000" />
                                <Text color="black" fontFamily="SF-Pro-Display-Bold">
                                    Continue with Google
                                </Text>
                            </HStack>
                        </Button>

                        {/* Bouton Email (remplace Facebook) */}
                        <Button
                            w="100%"
                            bg="black"
                            _text={{ fontFamily: 'SF-Pro-Display-Bold' }}
                            justifyContent="center"
                            onPress={() => navigation.navigate('Login')} // Navigation vers Login
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
                        En vous inscrivant vous acceptez nos Conditions d’utilisation et
                        Politiques de confidentialité
                    </Link>
                </Box>
            </ScrollView>
        </View>
    );
});

export default Register;
