import { Mixpanel } from "mixpanel-react-native";

// Configurez une instance unique de Mixpanel
const trackAutomaticEvents = false; // Désactivez le tracking automatique si non nécessaire
const mixpanel = new Mixpanel("c07db210db5ab8f20d609ef11c3053e5", trackAutomaticEvents);

// Initialisez Mixpanel
mixpanel.init();

export default mixpanel;
