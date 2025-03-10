import { registerRootComponent } from 'expo';
import 'react-native-gesture-handler';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { NativeModules, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Import des fichiers de traduction
import en from './infrastructure/localizations/translations/en.js';
import fr from './infrastructure/localizations/translations/fr.js';

// Fonction pour détecter la langue du dispositif
const getDeviceLanguage = () => {
  try {
    // Pour iOS
    if (Platform.OS === 'ios') {
      const locale = NativeModules.SettingsManager.settings.AppleLocale || 
                    NativeModules.SettingsManager.settings.AppleLanguages[0];
      return locale.substring(0, 2); // Récupère les 2 premiers caractères (fr, en, etc.)
    }
    
    // Pour Android
    if (Platform.OS === 'android') {
      return NativeModules.I18nManager.localeIdentifier.substring(0, 2);
    }
    
    return 'fr'; // Valeur par défaut si la détection échoue
  } catch (error) {
    console.error('Erreur lors de la détection de la langue:', error);
    return 'fr'; // Fallback sur français si erreur
  }
};

// Fonction pour changer et sauvegarder la langue
export const changeLanguage = async (lng) => {
  try {
    await AsyncStorage.setItem('userLanguage', lng);
    await i18n.changeLanguage(lng);
    return true;
  } catch (error) {
    console.error('Erreur lors du changement de langue:', error);
    return false;
  }
};

// Initialisation i18n avec la langue détectée
i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      fr: { translation: fr }
    },
    lng: getDeviceLanguage(), // Utilise la langue du dispositif
    fallbackLng: 'fr',
    interpolation: {
      escapeValue: false
    },
    compatibilityJSON: 'v3'
  });

// Chargement de la langue sauvegardée après initialisation
(async () => {
  try {
    const savedLanguage = await AsyncStorage.getItem('userLanguage');
    if (savedLanguage) {
      await i18n.changeLanguage(savedLanguage);
    }
  } catch (error) {
    console.error('Erreur lors du chargement de la langue sauvegardée:', error);
  }
})();

import App from './App';
registerRootComponent(App);