// server.js

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

// Charger les variables d'environnement
dotenv.config();

// Initialiser l'application Express
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware pour analyser les requêtes JSON
app.use(express.json());

// Configuration CORS pour autoriser toutes les origines
app.use(cors());

// Appliquer les en-têtes CORS manuellement pour les requêtes de prévalidation (OPTIONS)
app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*"); // Autorise toutes les origines
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200); // Répondre immédiatement aux requêtes de prévalidation
    }
    next();
});

// Import des routes
const userRoutes = require('./routes/userRoutes');
app.use('/api/users', userRoutes);

// Route de vérification du serveur
app.get('/', (req, res) => {
    res.send('Server is running');
});

// Connexion à MongoDB
mongoose.connect(process.env.MONGO_URI, {
})
.then(() => console.log('MongoDB connecté'))
.catch(err => console.error('Erreur de connexion MongoDB:', err));

// Démarrer le serveur
app.listen(PORT, () => {
    console.log(`Serveur démarré sur le port ${PORT}`);
});
