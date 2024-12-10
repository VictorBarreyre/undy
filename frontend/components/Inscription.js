import React, { useState, useContext, useCallback, useRef, useEffect } from 'react';
import { VStack, Box, Input, Button, Text, Link, ScrollView, Pressable, Icon } from 'native-base';
import { Animated, View } from 'react-native';
import { BlurView } from '@react-native-community/blur';
import axios from 'axios';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons';
import { AuthContext } from '../context/AuthContext';
import API_URL from '../config';
import { styles } from '../styles';
import LogoSvg from '../littlecomponents/Undy';

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

            <ScrollView
                contentContainerStyle={{ flexGrow: 1, justifyContent: 'space-between' }}
                p={4}
            >
                {/* Logo Section */}
                <Box alignItems="center" mt={16}>
                    <LogoSvg />
                </Box>

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
                        onPress={() => navigation.navigate('Register')}
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
