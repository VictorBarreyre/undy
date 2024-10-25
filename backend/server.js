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

// Configuration CORS pour autoriser l'accès à l'API depuis le frontend
const corsOptions = {
    origin: ['http://localhost:8081', 'https://undy-93a12c731bb4.herokuapp.com'],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
};

// Activer CORS avec les options
app.use(cors(corsOptions));

// Middleware pour répondre aux requêtes préflight (OPTIONS) avec CORS
app.options('*', cors(corsOptions));

// Import des routes
const userRoutes = require('./routes/userRoutes');
app.use('api/users', userRoutes);

// Route pour vérifier que le serveur est actif
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
