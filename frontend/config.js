import NetInfo from '@react-native-community/netinfo';
import { DATABASE_URL_PRODUCTION } from '@env';

const getAPIURL = async () => {
    if (process.env.NODE_ENV === 'production') {
        return DATABASE_URL_PRODUCTION; // Utilise l'URL de production
    }

    // En développement, récupère l'adresse IP locale dynamiquement
    try {
        const state = await NetInfo.fetch();
        if (state.details && state.details.ipAddress) {
            return `http://${state.details.ipAddress}:5000`; // Remplacez le port si nécessaire
        } else {
            throw new Error('Impossible de récupérer l\'adresse IP locale');
        }
    } catch (error) {
        console.error('Erreur lors de la récupération de l\'adresse IP locale :', error);
        return 'http://localhost:5000'; // Valeur par défaut en cas d'échec
    }
};

export default getAPIURL;
