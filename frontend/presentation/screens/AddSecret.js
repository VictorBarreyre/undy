import React, { useState, useContext, useEffect } from 'react';
import { Background } from '../../navigation/Background'; // Assurez-vous que ce chemin est correct
import { AuthContext } from '../../infrastructure/context/AuthContext';
import { useCardData } from '../../infrastructure/context/CardDataContexte';
import { Box, Text, HStack, VStack, Image, Select, Input, CheckIcon } from 'native-base';
import { Alert, Pressable, Dimensions, StyleSheet, View, KeyboardAvoidingView, Keyboard, Platform, TouchableWithoutFeedback, FlatList } from 'react-native';
import { styles } from '../../infrastructure/theme/styles';
import { FontAwesome } from '@expo/vector-icons'; // Assurez-vous que FontAwesome est disponible


const SCREEN_WIDTH = Dimensions.get('window').width;
const SCREEN_HEIGHT = Dimensions.get('window').height;


const AddSecret = () => {

    const { userData } = useContext(AuthContext); // Utilisation correcte de useContext
    const { data, handlePostSecret } = useCardData();
    const [secretText, setSecretText] = useState('');
    const [selectedLabel, setSelectedLabel] = useState(''); // État pour la sélection du label
    const [price, setPrice] = useState(''); // État pour le prix
    const [secretPostAvailable, setSecretPostAvailable] = useState('false')
    const [expiresIn, setExpiresIn] = useState(7);
    const [buttonMessage, setButtonMessage] = useState('Poster le secret');

    const MIN_PRICE = 5;
    const MIN_WORDS = 2;



    const labels = [...new Set(data.map((item) => item.label))];



    const handlePress = async () => {
        try {
            await handlePostSecret({
                secretText,
                selectedLabel,
                price,
                authToken: userData.token, // Ajoutez le token de l'utilisateur

            });

            // Réinitialiser les champs
            setSecretText('');
            setSelectedLabel('');
            setPrice('');
            Alert.alert('Succès', 'Votre secret a été posté avec succès !');
        } catch (error) {
            Alert.alert('Erreur', error.message);
        }
    };


    // Surveille les changements dans les champs et met à jour l'état de `secretPostAvailable`
    useEffect(() => {
        const isTextValid = secretText.trim().length > MIN_WORDS;
        const isLabelValid = selectedLabel.trim().length > 0;
        const isPriceValid = Number(price) >= MIN_PRICE;

        setSecretPostAvailable(isTextValid && isLabelValid && isPriceValid);

        // Définir le message approprié
        if (!isTextValid) {
            setButtonMessage('Le post doit faire plus de 2 mots');
        } else if (!isPriceValid) {
            setButtonMessage('Le prix doit être supérieur à 5€');
        } else if (!isLabelValid) {
            setButtonMessage('Sélectionnez une catégorie');
        } else {
            setButtonMessage('Poster le secret');
        }
    }, [secretText, selectedLabel, price]);

    return (
        <Background>   {/* KeyboardAvoidingView pour gérer le clavier */}
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                {/* Fermer le clavier en cliquant en dehors */}
                <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                    <FlatList
                        contentContainerStyle={{ flexGrow: 1, paddingBottom: 118, marginBottom: 200 }}
                        keyboardShouldPersistTaps="handled"
                        data={[]} // Pas de données à afficher, juste pour utiliser FlatList
                        renderItem={null} // Pas de rendu d'éléments
                        ListHeaderComponent={
                            <Box
                                flex={1}
                                paddingX={5}
                                marginBottom={10}
                                style={{
                                    minHeight: Dimensions.get('window').height * 0.635, // Remplit la hauteur de l'écran
                                }}
                            >
                                <VStack style={styles.containerAddSecret} space={4}>
                                    <Text style={styles.h3}>
                                        Ajouter un Undy
                                    </Text>
                                    <Box
                                        display="flex"
                                        width="100%"
                                        marginX="auto"
                                        minHeight="70%"
                                        borderRadius="lg"
                                        backgroundColor="white"
                                        marginTop={2}
                                        paddingTop={1}
                                        paddingBottom={4}
                                        justifyContent="space-between"
                                        style={customStyles.shadowBox}
                                    >
                                        <VStack backgroundColor="white" height={'100%'} alignItems="center" justifyContent="space-between" alignContent='center' padding={4} space={2}>
                                            <HStack alignItems="center" justifyContent="space-between" width="97%">
                                                <Box flex={1} mr={4} ml={2}>
                                                    <Text style={styles.h5}>
                                                        Posté par {userData?.name || 'Aucune description disponible.'}
                                                    </Text>
                                                </Box>
                                                <Image
                                                    src={userData?.profilePicture}
                                                    alt={`${userData?.name || 'User'}'s profile picture`}
                                                    width={45}
                                                    height={45}
                                                    borderRadius="full"
                                                />
                                            </HStack>

                                            <Box ml={2} width="95%">
                                                <Input
                                                    value={secretText}
                                                    onChangeText={(text) => setSecretText(text)}
                                                    placeholder="Quoi de neuf ?"
                                                    backgroundColor="transparent"
                                                    borderRadius="md"
                                                    fontSize="md"
                                                    p={2}
                                                    multiline
                                                    _input={{
                                                        fontSize: 20,
                                                        lineHeight: 22,
                                                        fontWeight: '600',
                                                        fontFamily: 'SF-Pro-Display-Semibold',
                                                        placeholderTextColor: '#94A3B8'
                                                    }}
                                                />
                                            </Box>

                                            <HStack mt={6} alignItems="start" alignContent="center" justifyContent="space-between" width="95%" space={2}>
                                                <VStack width="30%" alignItems="left">
                                                    <Text left={2} style={styles.ctalittle}>Catégorie</Text>
                                                    <Select
                                                        width="100%"
                                                        padding={2}
                                                        selectedValue={selectedLabel}
                                                        accessibilityLabel="Choisissez la catégorie"
                                                        placeholder="Choisissez la catégorie"
                                                        _placeholder={{
                                                            fontSize: 14,
                                                            lineHeight: 18,
                                                            fontWeight: '500',
                                                            fontFamily: 'SF-Pro-Display-Medium',
                                                            color: '#94A3B8'
                                                        }}
                                                        _customDropdownIconProps={{
                                                            display: 'none'
                                                        }}
                                                        _selectedItem={{
                                                            fontSize: 14,
                                                            lineHeight: 18,
                                                            fontWeight: '500',
                                                            fontFamily: 'SF-Pro-Display-Medium',
                                                            endIcon: (
                                                                <Box style={{ padding: 2 }}>
                                                                    <FontAwesome name="check" size={16} color="#94A3B8" />
                                                                </Box>
                                                            )
                                                        }}
                                                        mt={1}
                                                        onValueChange={(value) => setSelectedLabel(value)}
                                                    >
                                                        {labels.map((label, index) => (
                                                            <Select.Item
                                                                key={index}
                                                                label={label}
                                                                value={label}
                                                                _text={{
                                                                    fontSize: 14,
                                                                    lineHeight: 18,
                                                                    fontWeight: '500',
                                                                    fontFamily: 'SF-Pro-Display-Medium'
                                                                }}
                                                            />
                                                        ))}
                                                    </Select>
                                                </VStack>

                                                <VStack width="33%" alignItems="center">
                                                    <Text style={styles.ctalittle}>Son prix</Text>
                                                    <Input
                                                        value={price}
                                                        width="100%"
                                                        padding={0}
                                                        onChangeText={(text) => {
                                                            // Autoriser uniquement les caractères numériques
                                                            const numericText = text.replace(/[^0-9]/g, '');
                                                            setPrice(numericText);
                                                        }}
                                                        placeholder={`${MIN_PRICE}€ min`}
                                                        backgroundColor="transparent"
                                                        borderRadius="md"
                                                        keyboardType="numeric"
                                                        textAlign="center"
                                                        _input={{
                                                            fontSize: 14,
                                                            lineHeight: 18,
                                                            fontWeight: '500',
                                                            fontFamily: 'SF-Pro-Display-Medium',
                                                            placeholderTextColor: '#94A3B8'
                                                        }}
                                                    />
                                                </VStack>

                                                <VStack width="20%" alignItems="end">
                                                    <Text left={2} style={styles.ctalittle}>Durée</Text>
                                                    <Select
                                                        width="100%"
                                                        padding={2}
                                                        selectedValue={expiresIn}
                                                        accessibilityLabel="Choisir une durée"
                                                        placeholder="Choisir une durée"
                                                        _placeholder={{
                                                            fontSize: 14,
                                                            lineHeight: 18,
                                                            fontWeight: '500',
                                                            fontFamily: 'SF-Pro-Display-Medium',
                                                            color: '#94A3B8'
                                                        }}
                                                        _customDropdownIconProps={{
                                                            display: 'none'
                                                        }}
                                                        _selectedItem={{
                                                            fontSize: 14,
                                                            lineHeight: 18,
                                                            fontWeight: '500',
                                                            fontFamily: 'SF-Pro-Display-Medium',
                                                            endIcon: (
                                                                <Box style={{ padding: 2 }}>
                                                                    <FontAwesome name="check" size={16} color="#94A3B8" />
                                                                </Box>
                                                            )
                                                        }}
                                                        mt={1}
                                                        onValueChange={value => setExpiresIn(value)}
                                                    >
                                                        <Select.Item
                                                            label="24 heures"
                                                            value={1}
                                                            _text={{
                                                                fontSize: 14,
                                                                lineHeight: 18,
                                                                fontWeight: '500',
                                                                fontFamily: 'SF-Pro-Display-Medium'
                                                            }}
                                                        />
                                                        <Select.Item
                                                            label="7 jours"
                                                            value={7}
                                                            _text={{
                                                                fontSize: 14,
                                                                 lineHeight: 18,
                                                                fontWeight: '500',
                                                                fontFamily: 'SF-Pro-Display-Medium'
                                                            }}
                                                        />
                                                        <Select.Item
                                                            label="30 jours"
                                                            value={30}
                                                            _text={{
                                                                fontSize: 14,
                                                                lineHeight: 18,
                                                                fontWeight: '500',
                                                                fontFamily: 'SF-Pro-Display-Medium'
                                                            }}
                                                        />
                                                    </Select>
                                                </VStack>
                                            </HStack>
                                        </VStack>
                                    </Box>
                                    <Pressable
                                        marginTop={7}
                                        onPress={handlePress}
                                        disabled={!secretPostAvailable}
                                        style={({ pressed }) => [
                                            {
                                                backgroundColor: secretPostAvailable
                                                    ? pressed
                                                        ? '#94A3B8'
                                                        : 'black'
                                                    : '#94A3B8',
                                                transform: pressed && secretPostAvailable ? [{ scale: 0.96 }] : [{ scale: 1 }],
                                                borderRadius: 20,
                                            },
                                            { width: '100%', alignSelf: 'center', padding: 18, borderRadius: 30 },
                                        ]}
                                    >
                                        <HStack alignItems="center" justifyContent="center" space={2}>
                                            <Text fontSize="md" color="white" fontWeight="bold">
                                                {buttonMessage}
                                            </Text>
                                        </HStack>
                                    </Pressable>
                                </VStack>
                            </Box>
                        }
                    />
                </TouchableWithoutFeedback>
            </KeyboardAvoidingView>

        </Background>
    );
};

const customStyles = StyleSheet.create({

    container: {
        display: 'flex',
        flex: 1,
        height: SCREEN_HEIGHT,
        width: '100%',
        justifyContent: 'space-between', // Ajoute de l'espace entre les éléments
        alignItems: 'center',
    },

    shadowBox: {
        shadowColor: 'violet',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
        elevation: 5
    },
});


export default AddSecret;
