import axios from 'axios';
import getAPIURL from './config';

const createAxiosInstance = async () => {
    const baseURL = await getAPIURL();
    return axios.create({
        baseURL, // URL dynamique obtenue depuis config.js
        timeout: 10000, // Timeout des requêtes (facultatif)
        headers: {
            'Content-Type': 'application/json',
        },
    });
};

export default createAxiosInstance;
