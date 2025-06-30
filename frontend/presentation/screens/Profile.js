import React, { useState, useContext, useEffect, useRef } from 'react';
import { Dimensions, Alert, Animated } from 'react-native';
import { VStack, Box, Text, Pressable, Image, HStack, FlatList, StatusBar } from 'native-base';
import { AuthContext } from '../../infrastructure/context/AuthContext';
import { useCardData } from '../../infrastructure/context/CardDataContexte';
import { FontAwesome, FontAwesome5 } from '@expo/vector-icons';
import { styles } from '../../infrastructure/theme/styles';
import { Background } from '../../navigation/Background';
import SecretCard from '../components/SecretCard';
import TypewriterLoader from '../components/TypewriterLoader';
import { launchImageLibrary } from 'react-native-image-picker';
import { useTranslation } from 'react-i18next';


const SCREEN_WIDTH = Dimensions.get('window').width;

export default function Profile({ navigation }) {
  const { t } = useTranslation();
  const { userData, setUserData, userToken, handleProfileImageUpdate, getImageSource } = useContext(AuthContext);
  const { fetchUserSecretsWithCount, fetchPurchasedSecrets } = useCardData();
  const [secretCount, setSecretCount] = useState(0);
  const [userSecrets, setUserSecrets] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [error, setError] = useState(null);
  const defaultProfilePicture = require('../../assets/images/default.png');
  const [purchasedSecrets, setPurchasedSecrets] = useState([]);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  const screenWidth = Dimensions.get('window').width;


  const fadeAnim = useRef(new Animated.Value(0)).current;
  const photoUpdateAnim = useRef(new Animated.Value(1)).current;

  const startAnimation = () => {
    // Reset la valeur
    fadeAnim.setValue(0);

    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true
    }).start();
  };

  useEffect(() => {
    const loadUserData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Plus besoin de vérifier userToken car géré par l'intercepteur
        const { secrets, count } = await fetchUserSecretsWithCount();
        const purchasedSecretsData = await fetchPurchasedSecrets();

        setUserSecrets(secrets);
        setSecretCount(count);
        setPurchasedSecrets(purchasedSecretsData);
        startAnimation(); // Démarrer l'animation après le chargement

      } catch (error) {
        console.error(t('profile.errors.loadingData'), error);
        setError(error.message);
      } finally {
        setIsLoading(false);
      }
    };

    // Plus besoin de vérifier userToken ici
    loadUserData();
  }, []);

  const tabs = [
  {
    title: t('profile.tabs.yourSecrets'),
    content: isLoading ?
    <Text>{t('profile.loading')}</Text> :

    <Box flex={1} width="100%" height="100%">
                    <FlatList
        overflow='visible'
        horizontal={true} // Scroll horizontal
        showsHorizontalScrollIndicator={false}
        height='100%'
        width='100%'
        contentContainerStyle={{ paddingHorizontal: 10, flexGrow: 1 }}
        data={userSecrets.slice().reverse()}
        renderItem={({ item }) =>
        <Box marginLeft={2} marginRight={4} width={SCREEN_WIDTH * 0.8}>
                                <SecretCard secret={item} />
                            </Box>
        }
        keyExtractor={(item) => item._id}
        ListEmptyComponent={
        <VStack flex={1} justifyContent="center" alignItems="center" p={4}>
                                <Text style={styles.h4} textAlign="center" mt={4}>
                                    {t('profile.emptyList')}
                                </Text>
                            </VStack>
        } />

                </Box>

  },
  {
    title: t('profile.tabs.othersSecrets'),
    content: isLoading ?
    <Text>{t('profile.loading')}</Text> :

    <Box flex={1} width="100%" height="100%">
                    <FlatList
        overflow='visible'
        horizontal={true} // Scroll horizontal
        showsHorizontalScrollIndicator={false}
        height='100%'
        width='100%'
        contentContainerStyle={{ paddingHorizontal: 10, flexGrow: 1 }}
        data={purchasedSecrets}
        renderItem={({ item }) =>
        <Box marginLeft={2} marginRight={4} width={SCREEN_WIDTH * 0.8}>
                                <SecretCard secret={item} isPurchased={true} />
                            </Box>
        }
        keyExtractor={(item) => item._id}
        ListEmptyComponent={
        <VStack flex={1} justifyContent="center" alignItems="center" p={4}>
                                <Text style={styles.h4} textAlign="center" mt={4}>
                                    {t('profile.emptyList')}
                                </Text>
                            </VStack>
        } />

                </Box>

  }];


  const truncateText = (text) => {
    const maxLength = 90; // Ajustez selon vos besoins
    return text.length > maxLength ?
    text.slice(0, maxLength) + '... ' :
    text;
  };

  const animateProfilePhoto = () => {
    // Séquence d'animation: rétrécir puis grandir
    Animated.sequence([
    Animated.timing(photoUpdateAnim, {
      toValue: 0.92,
      duration: 150,
      useNativeDriver: true
    }),
    Animated.timing(photoUpdateAnim, {
      toValue: 1.05,
      duration: 200,
      useNativeDriver: true
    }),
    Animated.timing(photoUpdateAnim, {
      toValue: 1,
      duration: 150,
      useNativeDriver: true
    })]
    ).start();
  };

  const handleImageSelection = async () => {
    try {
      setIsUploadingImage(true);

      const result = await launchImageLibrary({
        mediaType: 'photo',
        quality: 0.8,
        includeBase64: false,
        maxWidth: 1000,
        maxHeight: 1000,
        // Activer le recadrage natif
        cropping: true,
        cropperCircleOverlay: false, // true pour un recadrage circulaire
        freeStyleCropEnabled: true,
        cropperToolbarTitle: t('profile.cropImage.title', 'Ajuster votre photo'),
        cropperStatusBarColor: '#FF78B2',
        cropperToolbarColor: '#FF78B2',
        cropperToolbarWidgetColor: 'white',
        // Proportion carré par défaut (1:1)
        width: 800,
        height: 800
      });

      if (result.didCancel) {

        return;
      }

      if (!result.assets || !result.assets[0]) {
        throw new Error(t('profile.imagePicker.noImageSelected'));
      }

      // L'image est déjà recadrée ici
      const imageAsset = result.assets[0];

      // Uploader directement l'image recadrée
      const updatedUser = await handleProfileImageUpdate(imageAsset);

      if (updatedUser?.profilePicture) {
        // Animer pour indiquer le succès
        animateProfilePhoto();
      }

    } catch (error) {
      console.error(t('profile.errors.fullError'), error);

      // Gestion d'erreur améliorée
      let errorMessage = t('profile.errors.unableToChangeProfilePicture');

      // Détection d'erreur réseau
      if (error?.message?.includes('Network request failed')) {
        errorMessage = t('profile.errors.networkError', 'Impossible de se connecter au serveur. Vérifiez votre connexion internet ou votre compte Apple.');
      } else if (error?.message?.includes('Cannot read property') || error?.message?.includes('null') || error?.message?.includes('undefined')) {
        // Gestion spécifique pour l'erreur que vous avez rencontrée
        errorMessage = t('profile.errors.deviceError', 'Une erreur s\'est produite avec la fonction de recadrage. Nous allons essayer sans recadrage.');

        // Réessayer sans recadrage
        try {
          const fallbackResult = await launchImageLibrary({
            mediaType: 'photo',
            quality: 0.8,
            maxWidth: 800,
            maxHeight: 800,
            includeBase64: false,
            // Désactiver le recadrage cette fois
            cropping: false
          });

          if (!fallbackResult.didCancel && fallbackResult.assets && fallbackResult.assets[0]) {
            const fallbackImageAsset = fallbackResult.assets[0];
            await handleProfileImageUpdate(fallbackImageAsset);
            animateProfilePhoto();
            return; // Exit early
          }
        } catch (fallbackError) {
          console.error('Erreur lors de la tentative de fallback:', fallbackError);
        }
      }

      Alert.alert(
        t('profile.errors.title'),
        errorMessage
      );
    } finally {
      setIsUploadingImage(false);
    }
  };

  const content = t('profile.dummyText');

  if (isLoading) {
    return <TypewriterLoader />;
  }

  return (
    <Background>
            <Animated.View
        style={{
          flex: 1,
          opacity: fadeAnim
        }}>

                <Box flex={1} justifyContent="flex-start" paddingTop={2}>
                    <Box width="100%" px={4}>
                        {/* Image de profil avec bordures arrondies et marges */}
                        <Box
              position="relative"
              width="100%"
              height={240}
              borderRadius={8}
              overflow="hidden">

                            <Image
                source={{
                  uri: userData?.profilePicture
                }}
                alt={t('profile.profilePictureAlt', { name: userData?.name || t('profile.defaultName') })}
                width="100%"
                height="100%"
                resizeMode="cover"
                fallbackSource={defaultProfilePicture} />


                            {/* Overlay pour assombrir légèrement l'image et améliorer la lisibilité du texte */}
                            <Box
                zIndex={1}
                position="absolute"
                top={0}
                left={0}
                right={0}
                bottom={0}
                bg="rgba(0,0,0,0.15)" />


                            {/* Boutons de navigation */}
                            <HStack
                zIndex={2}
                position="absolute"
                top={StatusBar.currentHeight || 4}
                left={0}
                right={0}
                px={4}
                justifyContent="space-between"
                alignItems="center">

                                <Pressable
                  onPress={handleImageSelection}
                  hitSlop={10}
                  style={{
                    borderRadius: 20,
                    padding: 8
                  }}>

                                    <FontAwesome5 name="pencil-alt" size={18} color="white" />
                                    {isUploadingImage &&
                  <Box
                    position="absolute"
                    top={0}
                    left={0}
                    right={0}
                    bottom={0}
                    bg="rgba(0,0,0,0.5)"
                    borderRadius={20}
                    alignItems="center"
                    justifyContent="center">

                                            <FontAwesome5 name="spinner" size={18} color="white" />
                                        </Box>
                  }
                                </Pressable>
                                <Pressable onPress={() => navigation.navigate('ProfilSettings')} hitSlop={10}>
                                    <FontAwesome5 name="cog" size={24} color="white" />
                                </Pressable>
                            </HStack>

                            {/* Informations utilisateur en bas de l'image */}
                            <HStack
                zIndex={2}
                position="absolute"
                bottom={4}
                left={4}
                right={4}
                justifyContent="space-between"
                alignItems="flex-end">

                                <Text color="white" fontSize="xl" fontWeight="bold" shadow={2}>
                                    {userData?.name || 'John do'}
                                </Text>
                                <Text color="white" fontSize="md" shadow={2}>
                                    {secretCount || 0} {secretCount === 1 ? 'hushy' : 'hushys'}
                                </Text>
                            </HStack>
                        </Box>
                    </Box>

                    <VStack flex={0.8} space={4}>
                        <HStack
              mt={6}
              paddingLeft={5} paddingRight={5}
              justifyContent="space-around">
                            {tabs.map((tab, index) =>
              <Pressable
                alignContent='center'
                alignItems='center'
                width='50%'
                key={index}
                onPress={() => setActiveTab(index)}
                borderBottomWidth={activeTab === index ? 3 : 1}
                borderBottomColor={activeTab === index ? "#FF78B2" : "#94A3B8"}
                paddingBottom={2}
                opacity={activeTab === index ? 100 : 40}
                zIndex={activeTab === index ? 1 : 0}>

                                    <Text color={activeTab === index ? 'black' : "#94A3B8"} style={styles.h5}>{tab.title}</Text>
                                </Pressable>
              )}
                        </HStack>

                        <Box height='auto' mt={2}>
                            <Text>{tabs[activeTab].content}</Text>
                        </Box>
                    </VStack>
                </Box>
            </Animated.View>
        </Background>);

};