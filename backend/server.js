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

// Configuration des options CORS
const corsOptions = {
    origin: [
        'http://localhost:8081', 
        'https://undy-5948c5547ec9.herokuapp.com'
    ],
    methods: 'GET,POST,PUT,DELETE,OPTIONS',
    allowedHeaders: 'Origin, X-Requested-With, Content-Type, Accept, Authorization',
    credentials: true
};

// Appliquer CORS avec les options configurées
app.use(cors(corsOptions));

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
.catch(err => console.error('Erreur de connexion MongoDB:', err));

// Démarrer le serveur
app.listen(PORT, () => {
    console.log(`Serveur démarré sur le port ${PORT}`);
});
