import { DATABASE_URL_PRODUCTION, DATABASE_URL_DEVELOPMENT } from '@env';

const getAPIURL = () => {
    // En production, utilisez l'URL Heroku
    if (process.env.NODE_ENV === 'production') {
        return DATABASE_URL_PRODUCTION;
    }

    // En développement, utilisez l'URL locale
    return DATABASE_URL_DEVELOPMENT;
};

const API_URL = getAPIURL();

export default API_URL;
