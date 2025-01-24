import { DATABASE_URL } from '@env';

const getAPIURL = async () => {
        return DATABASE_URL; // URL de production
};

export default getAPIURL; // L'export doit être un `default`
