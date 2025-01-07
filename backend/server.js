const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const { createProxyMiddleware } = require('http-proxy-middleware');
const userRoutes = require('./routes/userRoutes');
const secretRoutes = require('./routes/secretRoutes');
const path = require('path');


// Charger les variables d'environnement
dotenv.config();

// Initialiser l'application Express
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware pour analyser les requêtes JSON
app.use(express.json());

// Configuration CORS pour autoriser les origines en développement
const corsOptions = {
    origin: '*', // Autorise toutes les origines
    methods: 'GET,POST,PUT,DELETE,OPTIONS',
    allowedHeaders: 'Origin, X-Requested-With, Content-Type, Accept, Authorization',
    credentials: true,
    preflightContinue: false,
    optionsSuccessStatus: 204
};
app.use(cors(corsOptions));

// Middleware pour journaliser les requêtes
app.use((req, res, next) => {
    console.log(`Requête reçue de ${req.ip} : ${req.method} ${req.path}`);
    next();
});

// **Configuration du Proxy en développement**
// Ce middleware redirige les requêtes locales vers l'API sur Heroku
if (process.env.NODE_ENV === 'development') {
    app.use(
        '/api',
        createProxyMiddleware({
            target: 'https://undy-5948c5547ec9.herokuapp.com', // URL de production sur Heroku
            changeOrigin: true,
        })
    );
}

// Servir les fichiers statiques du dossier "uploads"
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));


app.use('/api/users', userRoutes);
app.use('/api/secrets', secretRoutes);


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
