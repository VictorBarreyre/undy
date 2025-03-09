import { registerRootComponent } from 'expo';
import 'react-native-gesture-handler';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Import des fichiers de traduction
// Assurez-vous que ces fichiers existent aux emplacements spécifiés
import en from './infrastructure/localizations/translations/en.js';
import fr from './infrastructure/localizations/translations/fr.js';

// Initialisation i18n
i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },  // Notez l'utilisation de la clé "translation"
      fr: { translation: fr }   // C'est crucial pour que i18next fonctionne correctement
    },
    lng: 'fr',
    fallbackLng: 'fr',
    interpolation: {
      escapeValue: false
    },
    compatibilityJSON: 'v3'
  });

import App from './App';
registerRootComponent(App);