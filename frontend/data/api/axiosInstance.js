import axios from 'axios';
import getAPIURL from '../../infrastructure/config/config'; // Assurez-vous que l'import est correct

const createAxiosInstance = async () => {
    try {
        const baseURL = await getAPIURL(); // Assurez-vous d'appeler la fonction correctement
        return axios.create({
            baseURL, // URL dynamique
            timeout: 10000,
            headers: {
                'Content-Type': 'application/json',
            },
        });
    } catch (error) {
        console.error('Erreur lors de la création de l\'instance Axios :', error);
        throw error; // Réexpédie l'erreur pour la gestion en aval
    }
};

export default createAxiosInstance;
