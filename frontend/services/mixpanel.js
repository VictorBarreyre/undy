import { Mixpanel } from "mixpanel-react-native";
import { MIXPANEL_TOKEN } from '@env';

// Configurez une instance unique de Mixpanel
const trackAutomaticEvents = false; // Désactivez le tracking automatique si non nécessaire
const mixpanel = new Mixpanel(MIXPANEL_TOKEN || "75266462deaa3d1766bfc9ebaf6b197b", trackAutomaticEvents);
mixpanel.setLoggingEnabled(__DEV__); // Active le mode debug seulement en développement

// Initialisez Mixpanel
mixpanel.init();

export default mixpanel;