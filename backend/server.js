// server.js
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware pour analyser le corps des requêtes JSON
app.use(express.json());

// Configuration CORS
const corsOptions = {
    origin: ['http://localhost:8081', 'https://undy-93a12c731bb4.herokuapp.com'], // Domaines autorisés
    methods: ['GET', 'POST', 'PUT', 'DELETE'], // Méthodes autorisées
    allowedHeaders: ['Content-Type', 'Authorization'], // En-têtes autorisés
    credentials: true // Permettre l'envoi de cookies et d'en-têtes d'autorisation
};

app.use(cors(corsOptions));

// Middleware pour gérer les en-têtes CORS dans toutes les réponses
app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", req.headers.origin); // Dynamique pour autoriser le domaine d'origine
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.header("Access-Control-Allow-Credentials", "true");
    next();
});

// Route racine pour tester si le serveur fonctionne
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
