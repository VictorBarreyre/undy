// server.js
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware pour analyser les requêtes JSON
app.use(express.json());

// Configuration CORS
const corsOptions = {
    origin: ['http://localhost:8081', 'https://undy-93a12c731bb4.herokuapp.com'],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
};

// Activer CORS avec les options
app.use(cors(corsOptions));

// Interception des requêtes préflight (OPTIONS)
app.options('*', cors(corsOptions)); // Activer CORS pour toutes les routes

// Middleware pour forcer les en-têtes CORS dans toutes les réponses
app.use((req, res, next) => {
    const allowedOrigins = ['http://localhost:8081', 'https://undy-93a12c731bb4.herokuapp.com'];
    const origin = req.headers.origin;

    if (allowedOrigins.includes(origin)) {
        res.header("Access-Control-Allow-Origin", origin);
    }

    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.header("Access-Control-Allow-Credentials", "true");

    // Si la requête est une préflight, envoyer une réponse 200
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }

    next();
});

// Route racine pour vérifier le bon fonctionnement du serveur
app.get('/', (req, res) => {
    res.send('Why are you here man?');
});

// Import des routes utilisateurs
const userRoutes = require('./routes/userRoutes');
app.use('/api/users', userRoutes);

// Connexion à MongoDB
mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => console.log('MongoDB connecté'))
.catch(err => console.error(err));

// Démarrage du serveur
app.listen(PORT, () => {
    console.log(`Serveur démarré sur le port ${PORT}`);
});
