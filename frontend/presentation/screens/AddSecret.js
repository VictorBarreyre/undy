import React, { useState, useContext,useEffect } from 'react';
import { Background } from '../../navigation/Background'; // Assurez-vous que ce chemin est correct
import { AuthContext } from '../../infrastructure/context/AuthContext';
import { useCardData } from '../../infrastructure/context/CardDataContexte';
import { Box, Text, HStack, VStack, Image, Select, Input, CheckIcon } from 'native-base';
import { Alert, Pressable, Dimensions, StyleSheet, View, KeyboardAvoidingView, Keyboard, Platform, TouchableWithoutFeedback } from 'react-native';
import { styles } from '../../infrastructure/theme/styles';
import { FontAwesome } from '@expo/vector-icons'; // Assurez-vous que FontAwesome est disponible


const SCREEN_WIDTH = Dimensions.get('window').width;


const AddSecret = () => {

    const { userData } = useContext(AuthContext); // Utilisation correcte de useContext
    const { data, handlePostSecret } = useCardData();
    const [secretText, setSecretText] = useState('');
    const [selectedLabel, setSelectedLabel] = useState(''); // État pour la sélection du label
    const [price, setPrice] = useState(''); // État pour le prix
    const [secretPostAvailable, setSecretPostAvailable] = useState('false')



    const labels = [...new Set(data.map((item) => item.label))];


    useEffect(() => {
        if (userData && userData.token) {
            console.log('Token utilisateur :', userData.token);
        } else {
            console.log('Token utilisateur non disponible.');
        }
    }, [userData]);
    


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
        setSecretPostAvailable(
            secretText.trim().length > 0 && selectedLabel.trim().length > 0 && price.trim().length > 0
        );
        console.log(secretText,selectedLabel, price)
    }, [secretText, selectedLabel, price]);

    return (
        <Background>   {/* KeyboardAvoidingView pour gérer le clavier */}
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                {/* Fermer le clavier en cliquant en dehors */}
                <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                    <Box flex={1} padding={5} paddingTop={1}>
                        <VStack space={4} alignItems="center" justifyContent="start" flex={1}>
                            <Text style={styles.h2} fontSize="lg" fontWeight="bold">
                                Ajouter un Secret
                            </Text>
                            <Box
                                display="flex"
                                width="100%"
                                marginX="auto"
                                height="75%"
                                borderRadius="lg"
                                backgroundColor="white"
                                marginTop={2}
                                paddingTop={1}
                                paddingBottom={4}
                                justifyContent="space-between"
                                style={[styles.cardStyle, customStyles.shadowBox]}
                            >
                                {/* Contenu texte */}
                                <VStack backgroundColor="white" height={'100%'} justifyContent="space-between" padding={4} space={2}>
                                    <HStack alignItems="center" justifyContent="space-between" width="95%">
                                        {/* Texte aligné à gauche */}
                                        <Box flex={1} mr={4} ml={2} >
                                            <Text left={2} style={styles.h5}>
                                                Posté par {userData.name || 'Aucune description disponible.'}
                                            </Text>
                                        </Box>
                                        <Image
                                            width={35} // Ajustez la taille de l'image ici
                                            height={35} // Ajustez la taille de l'image ici
                                            borderRadius="full" // Rendre l'image ronde
                                        />

                                    </HStack>

                                    <Box ml={2} width="95%" >
                                        <Input
                                            value={secretText}
                                            onChangeText={(text) => setSecretText(text)}
                                            placeholder="Tapez ici votre secret..."
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

                                    <HStack mt={6} alignItems="center" justifyContent="space-between" alignContent='center' width="100%">

                                        {/* Section des categ et prix */}
                                        <Box ml={2} mt={6} width="55%">
                                            <Text left={2} style={styles.ctalittle} >
                                                Catégorie
                                            </Text>
                                            <Select
                                                width="10%"
                                                padding={2}
                                                selectedValue={selectedLabel}
                                                accessibilityLabel="Choisissez la catégorie"
                                                placeholder="Choisissez la catégorie"
                                                _placeholder={{
                                                    color: "#94A3B8",
                                                }}
                                                _customDropdownIconProps={{
                                                    display:'none'
                                                }}
                                                _selectedItem={{
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
                                                    <Select.Item key={index} label={label} value={label} />
                                                ))}
                                            </Select>
                                        </Box>

                                        {/* Champ pour définir le prix */}
                                        <Box justifyContent="center" alignContent='center' alignItems='center' mt={6} width="45%">
                                            <Text style={styles.ctalittle} >
                                                Son prix
                                            </Text>
                                            <Input
                                                value={price}
                                                padding={2}
                                                ml={1}
                                                onChangeText={(text) => setPrice(text)}
                                                placeholder="Prix (€)"
                                                backgroundColor="transparent"
                                                borderRadius="md"
                                                keyboardType="numeric" // Affiche un clavier numérique
                                                textAlign="center"
                                                _input={{
                                                    fontSize: 14,
                                                    lineHeight: 18,
                                                    fontWeight: '500',
                                                    fontFamily: 'SF-Pro-Display-Medium',
                                                    placeholderTextColor: '#94A3B8',
                                                    width: '100%' // Ajustez cette valeur selon vos besoins
                                                }}
                                            />
                                        </Box>
                                    </HStack>


                                </VStack>
                            </Box>
                            <Pressable
                                onPress={handlePress}
                                disabled={!secretPostAvailable} // Désactive le bouton si l'état est faux
                                style={({ pressed }) => [
                                    {
                                        backgroundColor: secretPostAvailable
                                            ? pressed
                                                ? 'gray.800'
                                                : 'black'
                                            : 'gray',
                                        transform: pressed && secretPostAvailable ? [{ scale: 0.96 }] : [{ scale: 1 }],
                                        borderRadius: 20,
                                    },
                                    { width: '100%', alignSelf: 'center', marginTop: 18, padding: 18, borderRadius: 30 },
                                ]}
                            >
                                <HStack alignItems="center" justifyContent="center" space={2}>
                                    
                                    <Text fontSize="md" color="white" fontWeight="bold">
                                    { !secretPostAvailable ? "Il manque des infos sur votre secret" : "Poster le secret" }
                                    </Text>
                                </HStack>
                            </Pressable>
                        </VStack>
                    </Box>
                </TouchableWithoutFeedback>
            </KeyboardAvoidingView>

        </Background>
    );
};

const customStyles = StyleSheet.create({
    shadowBox: {
        shadowColor: 'violet',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
        elevation: 5
    },
});


export default AddSecret;
