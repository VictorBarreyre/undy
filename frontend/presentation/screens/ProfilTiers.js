import React, { useState, useEffect, useContext } from 'react';
import { VStack, Box, Text, Pressable, Image, HStack, Button } from 'native-base';
import { useRoute } from '@react-navigation/native';
import { AuthContext } from '../../infrastructure/context/AuthContext';
import { FontAwesome, FontAwesome5 } from '@expo/vector-icons';
import { styles } from '../../infrastructure/theme/styles';
import { Background } from '../../navigation/Background';
import { faEllipsis } from '@fortawesome/free-solid-svg-icons';
import TypewriterLoader from '../components/TypewriterLoader';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faUnlock } from '@fortawesome/free-solid-svg-icons';


const ProfilTiers = ({ navigation }) => {
    const route = useRoute();
    const { userId, userName, profilePicture } = route.params || {};
    const { userToken, fetchUserDataById } = useContext(AuthContext);
    const [userData, setUserData] = useState(null);
    const [isExpanded, setIsExpanded] = useState(false);


    useEffect(() => {
        const loadUserData = async () => {
            try {
                const data = await fetchUserDataById(userId, userToken);
                setUserData(data);
            } catch (error) {
                console.error('Erreur lors du chargement des données de l\'utilisateur :', error);
                navigation.goBack();
            }
        };
        console.log(userData)
        if (!userData) {
            loadUserData();
        }
    }, [fetchUserDataById, userId, userToken, navigation, userData]);

    const truncateText = (text) => {
        const maxLength = 90; // Ajustez selon vos besoins
        return text.length > maxLength
            ? text.slice(0, maxLength) + '... '
            : text;
    };

    const content = "Le Lorem Ipsum est simplement du faux texte employé dans la composition et la mise en page avant impression. Le Lorem Ipsum est le faux texte standard de l'imprimerie depuis les années 1500, quand un imprimeur anonyme assembla ensemble des morceaux de texte pour réaliser un livre spécimen de polices de texte. Il n'a pas fait que survivre cinq siècles, mais s'est aussi adapté à la bureautique informatique, sans que son contenu n'en soit modifié"

    if (!userData) {
        return <TypewriterLoader />;
    }

    return (
        <Background>
            <Box flex={1} justifyContent="flex-start" padding={5}>
                <VStack space={6}>
                    <HStack alignItems="center" justifyContent="space-between" width="100%">
                        {/* Icône Back */}
                        <Pressable width={26} onPress={() => navigation.navigate('Home')}>
                            <FontAwesome name="chevron-left" size={18} color="black" />
                        </Pressable>

                        {/* Texte */}
                        <Text style={styles.h3} width='auto' textAlign="center">
                            Les secrets de
                        </Text>

                        <FontAwesomeIcon
                            icon={faEllipsis} // Icône des trois points
                            size={16}
                            color='black'
                            style={{ marginRight: 10 }}
                        />
                    </HStack>

                    <HStack space={5} justifyContent="space-between" alignItems="center" width="100%">
                        {/* Profil */}
                        <Image
                            src={userData?.profilePicture || defaultProfilePicture}
                            alt={`${userData?.name || 'User'}'s profile picture`}
                            width={75}
                            height={75}
                            borderRadius="full"
                        />

                        {/* Statistiques */}
                        <HStack flex={1} justifyContent="space-between" alignItems="center" flexWrap="wrap">
                            <VStack flex={1} alignItems="center" maxWidth="33%">
                                <Text style={styles.h4} fontWeight="bold" color="black" textAlign="center" flexShrink={1}>
                                    0
                                </Text>
                                <Text style={styles.caption} textAlign="center">
                                    Secrets
                                </Text>
                            </VStack>
                            <VStack flex={1} alignItems="center" maxWidth="33%">
                                <Text style={styles.h4} fontWeight="bold" color="black" textAlign="center" flexShrink={1}>
                                    0
                                </Text>
                                <Text style={styles.caption} textAlign="center">
                                    Abonnés
                                </Text>
                            </VStack>
                            <VStack flex={1} alignItems="center" >
                                <Text style={styles.h4} fontWeight="bold" color="black" textAlign="center" flexShrink={1}>
                                    0
                                </Text>
                                <Text style={styles.caption} textAlign="center">
                                    Abonnements
                                </Text>
                            </VStack>
                        </HStack>
                    </HStack>



                    <VStack space={2}>
                        <Text style={styles.h4}>{userData.name}</Text>
                        <Text color='#94A3B8'>
                            {!isExpanded ? (
                                <>

                                    <Text style={styles.caption}>
                                        {truncateText(content)}
                                    </Text>
                                    <Text
                                        style={styles.caption}
                                        color="#FF78B2"
                                        onPress={() => setIsExpanded(true)}
                                    >
                                        Voir plus
                                    </Text>
                                </>
                            ) : (
                                <>
                                    La bio ici
                                    <Text
                                        style={styles.caption}
                                        color="#FF78B2"
                                        onPress={() => setIsExpanded(false)}
                                    >
                                        {" "}Voir moins
                                    </Text>
                                </>
                            )}
                        </Text>
                    </VStack>
                    <Pressable
                        onPress={() => {
                            console.log('Bouton cliqué !');
                        }}
                        style={({ pressed }) => [
                            {
                                backgroundColor: pressed ? 'gray.800' : 'black',
                                transform: pressed ? [{ scale: 0.96 }] : [{ scale: 1 }],
                                borderRadius: 20,
                            },
                            { width: '100%', alignSelf: 'center', padding: 18, borderRadius: 30 },
                        ]}
                    >
                        <HStack alignItems="center" justifyContent="center" space={3}>
                            <FontAwesomeIcon icon={faUnlock} size={20} color="white" />
                            <Text fontSize="md" color="white" fontWeight="bold">
                                Tous les secrets de {userName} pour 9.99€/mois
                            </Text>
                        </HStack>
                    </Pressable>
                </VStack>
            </Box>
        </Background>
    );
};


export default ProfilTiers;
