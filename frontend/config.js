import * as Network from 'expo-network';
import { DATABASE_URL_PRODUCTION } from '@env';

const getAPIURL = async () => {
    if (process.env.NODE_ENV === 'production') {
        return DATABASE_URL_PRODUCTION; // Utilise l'URL de production
    }

    // En développement, récupère l'adresse IP locale dynamiquement
    const localIP = await Network.getIpAddressAsync();
    return `http://${localIP}:5000`; // Remplacez le port si nécessaire
};

export default getAPIURL;
