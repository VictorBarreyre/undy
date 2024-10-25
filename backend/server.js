// server.js
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware pour analyser les requêtes JSONs
app.use(express.json());

// Configuration CORS avec options dynamiques pour autoriser les requêtes depuis les origines spécifiées
const allowedOrigins = ['http://localhost:8081', 'https://undy-93a12c731bb4.herokuapp.com'];
app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (allowedOrigins.includes(origin)) {
        res.header("Access-Control-Allow-Origin", origin); // Autorise l'origine de la requête
    }

    // Définir les en-têtes CORS
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.header("Access-Control-Allow-Credentials", "true");

    // Répondre aux requêtes préflight immédiatement avec un statut 200
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
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
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => console.log('MongoDB connecté'))
.catch(err => console.error(err));

// Démarrer le serveur
app.listen(PORT, () => {
    console.log(`Serveur démarré sur le port ${PORT}`);
});
