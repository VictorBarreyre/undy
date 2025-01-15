import React, { useState, useContext, useEffect } from 'react';
import { VStack, Box, Text, Pressable, Image, HStack, FlatList } from 'native-base';
import { AuthContext } from '../../infrastructure/context/AuthContext';
import { useCardData } from '../../infrastructure/context/CardDataContexte';
import { FontAwesome, FontAwesome5 } from '@expo/vector-icons';
import { styles } from '../../infrastructure/theme/styles';
import { Background } from '../../navigation/Background';
import SecretCard from '../components/SecretCard';


export default function Profile({ navigation }) {
    const { userData, userToken } = useContext(AuthContext);
    const { fetchUserSecretsWithCount } = useCardData();
    const [secretCount, setSecretCount] = useState(0);
    const [userSecrets, setUserSecrets] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isExpanded, setIsExpanded] = useState(false);
    const [activeTab, setActiveTab] = useState(0);
    const [error, setError] = useState(null);

    const tabs = [
        {
            title: 'Vos secrets',
            content: isLoading ? (
                <Text>Chargement...</Text>
            ) : (
                <Box flex={1} width="100%">
                    <FlatList
                        width='100%'
                        overflow='unset'
                        data={userSecrets.slice().reverse()}
                        renderItem={({ item }) => <SecretCard secret={item} />}
                        keyExtractor={item => item._id}
                        ListEmptyComponent={<Text>Aucun secret disponible.</Text>}
                    />
                </Box>
            )
        },
        {
            title: 'Ceux des autres',
            content: <Text>Contenu pour les secrets des autres.</Text>
        }
    ];

    const truncateText = (text) => {
        const maxLength = 90; // Ajustez selon vos besoins
        return text.length > maxLength
            ? text.slice(0, maxLength) + '... '
            : text;
    };

    const content = "Le Lorem Ipsum est simplement du faux texte employé dans la composition et la mise en page avant impression. Le Lorem Ipsum est le faux texte standard de l'imprimerie depuis les années 1500, quand un imprimeur anonyme assembla ensemble des morceaux de texte pour réaliser un livre spécimen de polices de texte. Il n'a pas fait que survivre cinq siècles, mais s'est aussi adapté à la bureautique informatique, sans que son contenu n'en soit modifié"


    useEffect(() => {
        const loadUserData = async () => {
            try {
                setIsLoading(true);
                setError(null);

                if (!userToken) {
                    throw new Error('Token non disponible');
                }

                // Charger les secrets et leur nombre en une seule requête
                const { secrets, count } = await fetchUserSecretsWithCount(userToken);
                setUserSecrets(secrets);
                setSecretCount(count);

            } catch (error) {
                console.error('Erreur chargement données:', error);
                setError(error.message);
            } finally {
                setIsLoading(false);
            }
        };

        loadUserData();
    }, [userToken]);



    return (
        <Background>
            <Box flex={1} justifyContent="flex-start" padding={5}>
                <VStack space={6}>
                    <HStack alignItems="center" justifyContent="space-between" width="100%">
                        {/* Icône Back */}
                        <Pressable onPress={() => console.log('Retour en arrière')}>
                            <FontAwesome name="chevron-left" size={18} color="black" />
                        </Pressable>

                        {/* Texte */}
                        <Text style={styles.h3} width='auto' textAlign="center">
                            Mon Profil
                        </Text>

                        {/* Icône Settings */}
                        <Pressable onPress={() => console.log('Paramètres')}>
                            <FontAwesome5 name="cog" size={26} color="black" solid={false} />
                        </Pressable>
                    </HStack>

                    <HStack space={5} justifyContent='space-between' alignItems="center">
                        <Image
                            src={userData.profilePicture}
                            alt={`${userData?.name || 'User'}'s profile picture`}
                            width={75}
                            height={75}
                            borderRadius="full"
                        />

                        <HStack space={5} paddingX='24px' justifyContent='space-between' alignItems="center" >
                            <VStack justifyContent='space-between' alignItems="center">
                                <Text style={styles.h4} fontWeight="bold" color="black" textAlign="center">
                                    {secretCount || 0}
                                </Text>
                                <Text style={styles.caption} textAlign="center">
                                    Secrets
                                </Text>
                            </VStack>
                            <VStack alignItems="center">
                                <Text style={styles.h4} fontWeight="bold" color="black" textAlign="center">
                                    {0}
                                </Text>
                                <Text style={styles.caption} textAlign="center">
                                    Abonnés
                                </Text>
                            </VStack>
                            <VStack alignItems="center">
                                <Text style={styles.h4} fontWeight="bold" color="black" textAlign="center">
                                    {0}
                                </Text>
                                <Text style={styles.caption} textAlign="center">
                                    Abonnements
                                </Text>
                            </VStack>
                        </HStack>

                    </HStack>


                    <VStack space={2}>
                        <Text style={styles.h4}>{userData.name} </Text>
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
                                    {content}
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

                    <HStack

                        justifyContent="space-around">
                        {tabs.map((tab, index) => (
                            <Pressable
                                alignContent='center'
                                alignItems='center'
                                width='50%'
                                key={index}
                                onPress={() => setActiveTab(index)}
                                borderBottomWidth={activeTab === index ? 3 : 3}
                                borderBottomColor={activeTab === index ? "#FF78B2" : "#94A3B8"}
                                paddingBottom={2}
                                opacity={activeTab === index ? 100 : 40}
                                zIndex={activeTab === index ? 1 : 0}
                            >
                                <Text style={styles.h5}>{tab.title}</Text>
                            </Pressable>
                        ))}
                    </HStack>

                    <Box mt={2}>
                        <Text>{tabs[activeTab].content}</Text>
                    </Box>


                </VStack>

            </Box>
        </Background>
    );
};


