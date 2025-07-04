import React, { useState, useContext, useEffect, useRef } from 'react';
import { Background } from '../../navigation/Background';
import { AuthContext } from '../../infrastructure/context/AuthContext';
import { useCardData, ConfettiPresets } from '../../infrastructure/context/CardDataContexte';
import { Box, Text, HStack, VStack, Image, Select, Input, Checkbox } from 'native-base';
import { Alert, Pressable, Dimensions, StyleSheet, Linking, KeyboardAvoidingView, Keyboard, Platform, TouchableWithoutFeedback, FlatList } from 'react-native';
import { styles } from '../../infrastructure/theme/styles';
import { FontAwesome } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import * as Location from 'expo-location';
import i18n from 'i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DeepLinkHandler from '../components/DeepLinkHandler';


const SCREEN_WIDTH = Dimensions.get('window').width;
const SCREEN_HEIGHT = Dimensions.get('window').height;

const AddSecret = () => {
  const { t } = useTranslation();
  const { userData } = useContext(AuthContext);
  const {
    data,
    handlePostSecret,
    handleStripeOnboardingRefresh,
    handleStripeReturn,
    handleShareSecret,
    checkLocationPermission,
    requestLocationPermission,
    getCurrentLocation,
    userCurrency,
    triggerConfetti
  } = useCardData();

  const [secretText, setSecretText] = useState('');
  const [selectedLabel, setSelectedLabel] = useState('');
  const [price, setPrice] = useState('');
  const [secretPostAvailable, setSecretPostAvailable] = useState(false);
  const [expiresIn, setExpiresIn] = useState(7);
  const [buttonMessage, setButtonMessage] = useState(t('addSecret.postSecret'));
  const [boxHeight, setBoxHeight] = useState('70%');
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [includeLocation, setIncludeLocation] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [locationAvailable, setLocationAvailable] = useState(false);
  const [locationInfo, setLocationInfo] = useState(null);


  const currentLanguage = i18n.language || navigator.language.split('-')[0] || 'fr';


  const MIN_PRICE = 3;
  const MIN_WORDS = 2;
  const CATEGORIES = t('addSecret.categories', { returnObjects: true });

  const labels = [...new Set(data.map((item) => item.label))];

  const calculatePriceAfterMargin = (originalPrice) => {
    if (!originalPrice) return 0;
    const sellerMargin = 0.10;
    const priceNumber = Number(originalPrice);
    return (priceNumber * (1 - sellerMargin)).toFixed(2);
  };

  useEffect(() => {
    const checkLocationAvailability = async () => {
      try {
        const { status } = await Location.getForegroundPermissionsAsync();
        const isAvailable = status === 'granted';
        setLocationAvailable(isAvailable);

        // Si la localisation est disponible, cochez automatiquement la case
        if (isAvailable) {
          setIncludeLocation(true);
          const position = await getCurrentLocation();
          if (position) {
            setUserLocation(position);
            await getLocationInfo(position.latitude, position.longitude);
          }
        }
      } catch (error) {
        console.error('Erreur lors de la vérification de la disponibilité de la localisation:', error);
      }
    };

    checkLocationAvailability();
  }, []);

  const getLocationInfo = async (latitude, longitude) => {
    try {
      const geoData = await Location.reverseGeocodeAsync({
        latitude,
        longitude
      });

      if (geoData && geoData.length > 0) {
        const { city, region, country } = geoData[0];
        setLocationInfo({ city, region, country });
        return { city, region, country };
      }
      return null;
    } catch (error) {
      console.error('Erreur lors de la géolocalisation inverse:', error);
      return null;
    }
  };

  // Keyboard event handlers
  useEffect(() => {
    const keyboardWillShowListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        setKeyboardVisible(true);
        // Réduire la hauteur de la carte quand le clavier est visible
        setBoxHeight('50%');
      }
    );

    const keyboardWillHideListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setKeyboardVisible(false);
        // Restaurer la hauteur originale
        setBoxHeight('70%');
      }
    );

    return () => {
      keyboardWillShowListener.remove();
      keyboardWillHideListener.remove();
    };
  }, []);

  // Deep link handler
  useEffect(() => {
    const handleDeepLink = async (event) => {
      try {
        const url = event.url || event;

        if (!url) return;

        const fullUrl = decodeURIComponent(url);
        const parsedUrl = new URL(fullUrl);

        if (
        parsedUrl.protocol === 'hushy:' && (
        parsedUrl.hostname === 'stripe-return' || parsedUrl.hostname === 'profile'))
        {
          await handleStripeReturn(fullUrl);
        }
      } catch (error) {
        console.error(t('addSecret.errors.deepLink'), error);
        Alert.alert(t('addSecret.errors.title'), t('addSecret.errors.unableToProcessLink'));
      }
    };

    const subscription = Linking.addEventListener('url', handleDeepLink);

    Linking.getInitialURL().then((url) => {
      if (url) {
        handleDeepLink({ url });
      }
    });

    return () => {
      subscription.remove();
    };
  }, [handleStripeReturn, t]);

  const handleLocationToggle = async (isChecked) => {
    setIncludeLocation(isChecked);

    if (isChecked) {
      try {
        // Vérifier d'abord si on a déjà la permission
        const { status } = await Location.getForegroundPermissionsAsync();

        if (status !== 'granted') {
          // Si pas de permission, la demander
          const { status: newStatus } = await Location.requestForegroundPermissionsAsync();

          if (newStatus !== 'granted') {
            // Si l'utilisateur refuse, désactiver la checkbox et afficher une alerte
            setIncludeLocation(false);
            Alert.alert(
              t('location.errors.title'),
              t('location.errors.permissionDenied'),
              [
              {
                text: t('permissions.cancel'),
                style: 'cancel'
              },
              {
                text: t('permissions.openSettings'),
                onPress: () => Linking.openSettings()
              }]

            );
            return;
          }

          // Permission accordée, mettre à jour le statut
          setLocationAvailable(true);
        }

        // Maintenant qu'on a la permission, obtenir la position
        const position = await getCurrentLocation();
        if (position) {
          setUserLocation(position);
          await getLocationInfo(position.latitude, position.longitude);
        } else {
          setIncludeLocation(false);
          Alert.alert(
            t('location.errors.title'),
            t('location.errors.gettingPosition'),
            [{ text: t('permissions.ok') }]
          );
        }
      } catch (error) {
        console.error('Erreur lors de l\'obtention de la position:', error);
        setIncludeLocation(false);
        Alert.alert(
          t('location.errors.title'),
          t('location.errors.gettingPosition'),
          [{ text: t('permissions.ok') }]
        );
      }
    }
  };

  const savePendingSecretData = async (secretData) => {
    try {
      // Ajouter les données de localisation si disponibles
      const dataToSave = {
        ...secretData,
        timestamp: Date.now() // Ajouter un timestamp
      };

      // Sauvegarder la localisation si elle est activée
      if (includeLocation && userLocation) {
        dataToSave.userLocation = userLocation;
      }

      const storageKey = `pendingSecretData_${userData._id}`;
      await AsyncStorage.removeItem(storageKey);
      await AsyncStorage.setItem(storageKey, JSON.stringify(dataToSave));

    } catch (error) {
      console.error('Erreur lors de la sauvegarde des données du secret:', error);
    }
  };

  const handleStripeOnboardingSuccess = async (result) => {
    try {
      // Récupérer les données du secret en attente
      const pendingSecretDataJson = await AsyncStorage.getItem('pendingSecretData');
      if (!pendingSecretDataJson) {

        return;
      }

      const pendingSecretData = JSON.parse(pendingSecretDataJson);

      // Tenter de poster le secret maintenant que Stripe est configuré
      const postResult = await handlePostSecret(pendingSecretData);

      if (postResult && !postResult.requiresStripeSetup) {
        // Le secret a été posté avec succès
        Alert.alert(
          t('addSecret.alerts.success.title'),
          t('addSecret.alerts.success.message'),
          [
          {
            text: t('addSecret.alerts.success.shareNow'),
            onPress: async () => {
              try {
                await handleShareSecret(postResult.secret);
              } catch (error) {
                Alert.alert(t('addSecret.errors.title'), t('addSecret.errors.unableToShare'));
              } finally {
                // Reset form fields
                setSecretText('');
                setSelectedLabel('');
                setPrice('');
                setExpiresIn(7);
                // Supprimer les données en attente
                await AsyncStorage.removeItem('pendingSecretData');
              }
            }
          },
          {
            text: t('addSecret.alerts.later'),
            style: "cancel",
            onPress: async () => {
              // Reset form fields
              setSecretText('');
              setSelectedLabel('');
              setPrice('');
              setExpiresIn(7);
              // Supprimer les données en attente
              await AsyncStorage.removeItem('pendingSecretData');
            }
          }]

        );
      } else {
        // Il y a encore un problème avec Stripe
        console.error('Impossible de poster le secret après le retour de Stripe');
        Alert.alert(t('addSecret.errors.title'), t('addSecret.errors.stripePersistent'));
      }
    } catch (error) {
      console.error('Erreur lors du traitement post-Stripe:', error);
      Alert.alert(t('addSecret.errors.title'), error.message);
    }
  };



  // Remplacer la fonction handlePress par celle-ci
  const handlePress = async () => {
    try {
      // Préparer les données du secret
      const secretData = {
        selectedLabel,
        secretText,
        price,
        currency: userCurrency, // Ajoutez la devise
        expiresIn,
        language: currentLanguage
      };

      if (includeLocation && userLocation) {
        const lat = parseFloat(userLocation.latitude);
        const lng = parseFloat(userLocation.longitude);

        // Validation géographique
        if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
          secretData.location = {
            type: 'Point',
            coordinates: [lng, lat]
          };
        } else {
          Alert.alert(t('location.errors.title'), t('location.errors.invalidCoordinates'));
          return;
        }
      }

      // Sauvegarder d'abord les données
      await savePendingSecretData(secretData);

      try {
        // Vérifier le statut Stripe de l'utilisateur
        const stripeStatus = await handleStripeOnboardingRefresh();

        // Si l'utilisateur a un compte Stripe actif, poster le secret directement
        if (stripeStatus.status === 'active' || stripeStatus.stripeStatus === 'active') {
          const result = await handlePostSecret(secretData);

          await AsyncStorage.removeItem(`pendingSecretData_${userData._id}`);
          triggerConfetti({
            ...ConfettiPresets.fromBottom,
            colors: [
            '#50C8FF', // Bleu cyan électrique
            '#A78BFF', // Violet électrique
            '#FF7AC7', // Rose bonbon éclatant
            '#FF5F5F', // Rouge corail vif
            '#FFFFFF' // Blanc
            ]
          });
          setTimeout(() => {
            Alert.alert(
              t('addSecret.alerts.success.title'),
              t('addSecret.alerts.success.message'),
              [
              {
                text: t('addSecret.alerts.success.shareNow'),
                onPress: async () => {
                  try {
                    await handleShareSecret(result.secret);
                  } catch (error) {
                    Alert.alert(t('addSecret.errors.title'), t('addSecret.errors.unableToShare'));
                  } finally {
                    // Reset form fields
                    setSecretText('');
                    setSelectedLabel('');
                    setPrice('');
                    setExpiresIn(7);
                  }
                }
              },
              {
                text: t('addSecret.alerts.later'),
                style: "cancel",
                onPress: () => {
                  // Reset form fields
                  setSecretText('');
                  setSelectedLabel('');
                  setPrice('');
                  setExpiresIn(7);
                }
              }]

            );
          }, 1500); // Délai de 1.5 secondes
        } else {
          // L'utilisateur a besoin de configurer Stripe
          handleStripeConfiguration(stripeStatus);
        }
      } catch (error) {
        // Gérer spécifiquement l'erreur "Aucun compte Stripe associé"
        if (error.message.includes("Aucun compte Stripe associé") ||
        error.response?.data && error.response.data.status === 'no_account') {
          // Créer un compte Stripe pour l'utilisateur
          Alert.alert(
            t('addSecret.alerts.noStripeAccount.title'),
            t('addSecret.alerts.noStripeAccount.message'),
            [
            {
              text: t('addSecret.alerts.noStripeAccount.create'),
              onPress: async () => {
                try {
                  // Créer un nouveau compte Stripe via handlePostSecret
                  // qui va déclencher la création du compte
                  const result = await handlePostSecret(secretData);

                  if (result.requiresStripeSetup && result.stripeOnboardingUrl) {
                    await Linking.openURL(result.stripeOnboardingUrl);
                  } else {
                    Alert.alert(t('addSecret.alerts.info'), result.message);
                  }
                } catch (innerError) {
                  Alert.alert(t('addSecret.errors.title'), innerError.message);
                }
              }
            },
            {
              text: t('addSecret.alerts.later'),
              style: "cancel"
            }]

          );
        } else {
          Alert.alert(t('addSecret.errors.title'), error.message);
        }
      }
    } catch (error) {
      Alert.alert(t('addSecret.errors.title'), error.message);
    }
  };

  // Fonction auxiliaire pour gérer la configuration Stripe
  const handleStripeConfiguration = async (stripeStatus) => {
    Alert.alert(
      t('addSecret.alerts.setupRequired.title'),
      t('addSecret.alerts.setupRequired.message'),
      [
      {
        text: t('addSecret.alerts.setupRequired.configureNow'),
        onPress: async () => {
          try {
            if (stripeStatus.stripeOnboardingUrl || stripeStatus.url) {
              await Linking.openURL(stripeStatus.stripeOnboardingUrl || stripeStatus.url);
            } else {
              // Si pas d'URL, essayer de créer un compte
              const result = await handlePostSecret({
                selectedLabel,
                secretText,
                price,
                expiresIn,
                language: currentLanguage
              });

              if (result.requiresStripeSetup && result.stripeOnboardingUrl) {
                await Linking.openURL(result.stripeOnboardingUrl);
              } else {
                Alert.alert(t('addSecret.alerts.info'), result.message);
              }
            }
          } catch (error) {
            Alert.alert(t('addSecret.errors.title'), error.message);
          }
        }
      },
      {
        text: t('addSecret.alerts.later'),
        style: "cancel"
      }]

    );
  };
  useEffect(() => {
    const checkPendingSecretData = async () => {
      try {
        const storageKey = `pendingSecretData_${userData._id}`;
        const pendingSecretDataJson = await AsyncStorage.getItem(storageKey);
        if (pendingSecretDataJson) {
          const pendingSecretData = JSON.parse(pendingSecretDataJson);

          // Vérifier si le secret a déjà été posté
          // Par exemple, en vérifiant l'âge des données en attente
          const currentTime = Date.now();
          if (pendingSecretData.timestamp &&
          currentTime - pendingSecretData.timestamp > 5 * 60 * 1000) {// Plus de 5 minutes
            // Supprimer les données anciennes
            await AsyncStorage.removeItem(storageKey);
            return;
          }

          // Vérifier si les champs sont vides avant de les restaurer
          const hasEmptyFields =
          !secretText &&
          !selectedLabel &&
          !price;

          if (hasEmptyFields) {
            // Pré-remplir les champs du formulaire avec les données en attente
            setSecretText(pendingSecretData.secretText || '');
            setSelectedLabel(pendingSecretData.selectedLabel || '');
            setPrice(pendingSecretData.price?.toString() || '');
            setExpiresIn(pendingSecretData.expiresIn || 7);
          }
        }
      } catch (error) {
        console.error('Erreur lors de la vérification des données en attente:', error);
      }
    };

    checkPendingSecretData();
  }, []);

  // Validation effect
  useEffect(() => {
    const isTextValid = secretText.trim().length > MIN_WORDS;
    const isLabelValid = selectedLabel.trim().length > 0;
    const isPriceValid = Number(price) >= MIN_PRICE;

    setSecretPostAvailable(isTextValid && isLabelValid && isPriceValid);

    // Définir le message approprié
    if (!isTextValid) {
      setButtonMessage(t('addSecret.validation.tooShort'));
    } else if (!isPriceValid) {
      setButtonMessage(t('addSecret.validation.priceRequirement', { minPrice: MIN_PRICE }));
    } else if (!isLabelValid) {
      setButtonMessage(t('addSecret.validation.selectCategory'));
    } else {
      setButtonMessage(t('addSecret.postSecret'));
    }
  }, [secretText, selectedLabel, price, t]);

  return (
    <>
            <Background>
                <DeepLinkHandler
          onStripeSuccess={handleStripeOnboardingSuccess}
          userId={userData?._id} />

                <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}>

                    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                        <FlatList
              contentContainerStyle={{
                flexGrow: 1,
                paddingBottom: keyboardVisible ? 10 : 160,
                marginBottom: keyboardVisible ? 10 : 200,
                marginTop: 20
              }}
              keyboardShouldPersistTaps="handled"
              data={[]} // Pas de données à afficher, juste pour utiliser FlatList
              renderItem={null} // Pas de rendu d'éléments
              ListHeaderComponent={
              <Box
                flex={1}
                paddingX={5}
                marginBottom={keyboardVisible ? 0 : 10}
                style={{
                  minHeight: keyboardVisible ?
                  Dimensions.get('window').height * 0.5 :
                  Dimensions.get('window').height * 0.635
                }}>

                                    <VStack style={styles.containerAddSecret} space={4}>
                                        <Text style={styles.h3}>
                                            {t('addSecret.addHushy')}
                                        </Text>
                                        <Box
                    display="flex"
                    width="100%"
                    marginX="auto"
                    minHeight={boxHeight}
                    maxHeight={keyboardVisible ? '82%' : '100%'}
                    borderRadius="lg"
                    backgroundColor="white"
                    marginTop={2}
                    paddingTop={1}
                    paddingBottom={4}
                    justifyContent="space-between"
                    style={customStyles.shadowBox}>

                                            {/* Reste du composant inchangé */}
                                            <VStack backgroundColor="white" height={'100%'} alignItems="center" justifyContent="space-between" alignContent='center' padding={4} space={2}>
                                                {/* Contenu existant */}

                                                <VStack space={1}>
                                                    <HStack ml={2} mt={2} width="95%" alignItems="center" justifyContent="space-between">
                                                        <Text style={styles.caption}>
                                                            {t('location.shareLocation.title')}
                                                        </Text>
                                                        <Checkbox
                            value="includeLocation"
                            isChecked={includeLocation}
                            onChange={handleLocationToggle}
                            colorScheme="pink"
                            aria-label={t('location.shareLocation.accessibility')}
                            _checked={{
                              bg: '#FF78B2',
                              borderColor: '#FF78B2',
                              _icon: { color: 'white' }
                            }} />

                                                    </HStack>

                                                    {includeLocation && userLocation &&
                        <Text ml={2} style={[styles.littleCaption]} color="#94A3B8" textAlign="left" width="95%" mt={1}>
                                                            {locationInfo ?
                          `${locationInfo.city || ''} ${locationInfo.region ? `, ${locationInfo.region}` : ''} ${locationInfo.country ? `, ${locationInfo.country}` : ''}` :
                          t('location.shareLocation.enabled')}
                                                        </Text>
                        }
                                                </VStack>
                                                <Box ml={2} width="95%">
                                                    <Input
                          returnKeyType="done"
                          value={secretText}
                          onChangeText={(text) => setSecretText(text)}
                          placeholder={t('addSecret.whatIsNew')}
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
                          }} />

                                                </Box>

                                                {/* Reste des sélecteurs et du formulaire */}
                                                <HStack mt={6} alignItems="start" alignContent="center" justifyContent="space-between" width="95%" space={2}>
                                                    {/* Code des sélecteurs de catégorie, prix et durée */}
                                                    <VStack width="30%" alignItems="left">
                                                        <Text left={2} style={styles.ctalittle}>{t('addSecret.category')}</Text>
                                                        <Select
                            width="100%"
                            padding={2}
                            selectedValue={selectedLabel}
                            accessibilityLabel={t('addSecret.chooseCategory')}
                            placeholder={t('addSecret.chooseCategory')}
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
                              endIcon:
                              <Box style={{ padding: 2 }}>
                                                                        <FontAwesome name="check" size={16} color="#94A3B8" />
                                                                    </Box>

                            }}
                            mt={1}
                            onValueChange={(value) => setSelectedLabel(value)}>

                                                            {CATEGORIES.map((category, index) =>
                            <Select.Item
                              key={index}
                              label={category}
                              value={category}
                              _text={{
                                fontSize: 14,
                                lineHeight: 18,
                                fontWeight: '500',
                                fontFamily: 'SF-Pro-Display-Medium'
                              }} />

                            )}
                                                        </Select>
                                                    </VStack>

                                                    <VStack width="33%" alignItems="center">
                                                        <Text style={styles.ctalittle}>{t('addSecret.price')}</Text>
                                                        <Input
                            value={`${price}${price ? userCurrency : ''}`}
                            width="100%"
                            padding={0}
                            onChangeText={(text) => {
                              // Enlever les symboles de devise et tout autre caractère non numérique
                              const numericText = text.replace(/[^0-9]/g, '');
                              setPrice(numericText);
                            }}
                            placeholder={`${MIN_PRICE}${userCurrency} ${t('addSecret.min')}`}
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
                            }} />

                                                    </VStack>
                                                    <VStack width="20%" alignItems="end">
                                                        <Text left={2} style={styles.ctalittle}>{t('addSecret.duration')}</Text>
                                                        <Select
                            width="100%"
                            padding={2}
                            selectedValue={expiresIn}
                            accessibilityLabel={t('addSecret.chooseDuration')}
                            placeholder={t('addSecret.chooseDuration')}
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
                              endIcon:
                              <Box style={{ padding: 2 }}>
                                                                        <FontAwesome name="check" size={16} color="#94A3B8" />
                                                                    </Box>

                            }}
                            mt={1}
                            onValueChange={(value) => setExpiresIn(value)}>

                                                            <Select.Item
                              label={t('addSecret.duration24h')}
                              value={1}
                              _text={{
                                fontSize: 14,
                                lineHeight: 18,
                                fontWeight: '500',
                                fontFamily: 'SF-Pro-Display-Medium'
                              }} />

                                                            <Select.Item
                              label={t('addSecret.duration7d')}
                              value={7}
                              _text={{
                                fontSize: 14,
                                lineHeight: 18,
                                fontWeight: '500',
                                fontFamily: 'SF-Pro-Display-Medium'
                              }} />

                                                            <Select.Item
                              label={t('addSecret.duration30d')}
                              value={30}
                              _text={{
                                fontSize: 14,
                                lineHeight: 18,
                                fontWeight: '500',
                                fontFamily: 'SF-Pro-Display-Medium'
                              }} />

                                                        </Select>
                                                    </VStack>
                                                </HStack>
                                            </VStack>
                                        </Box>

                                        {price ?
                  <Text
                    style={[styles.caption]}
                    color="#94A3B8"
                    textAlign="center">

                                                {t('addSecret.youWillReceive', { amount: `${calculatePriceAfterMargin(price)}${userCurrency}` })}
                                            </Text> :
                  null}


                                        <Pressable
                    display={keyboardVisible ? 'none' : 'initial'}
                    marginTop={price ? 0 : 7}
                    onPress={handlePress}
                    disabled={!secretPostAvailable}
                    style={({ pressed }) => [
                    {
                      backgroundColor: secretPostAvailable ?
                      pressed ?
                      '#94A3B8' :
                      'black' :
                      '#94A3B8',
                      transform: pressed && secretPostAvailable ? [{ scale: 0.96 }] : [{ scale: 1 }],
                      borderRadius: 20
                    },
                    { width: '100%', alignSelf: 'center', padding: 18, borderRadius: 30 }]
                    }>

                                            <HStack alignItems="center" justifyContent="center" space={2}>
                                                <Text fontSize="md" color="white" fontWeight="bold">
                                                    {buttonMessage}
                                                </Text>
                                            </HStack>
                                        </Pressable>
                                    </VStack>

                                </Box>
              } />

                    </TouchableWithoutFeedback>
                </KeyboardAvoidingView>
            </Background>
        
        </>);

};

const customStyles = StyleSheet.create({
  container: {
    display: 'flex',
    flex: 1,
    height: SCREEN_HEIGHT,
    width: '100%',
    justifyContent: 'space-between',
    alignItems: 'center'
  },

  shadowBox: {
    shadowColor: 'violet',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5
  }
});

export default AddSecret;