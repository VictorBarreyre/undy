const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const { createProxyMiddleware } = require('http-proxy-middleware');
const userRoutes = require('./routes/userRoutes');
const secretRoutes = require('./routes/secretRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const path = require('path');
const helmet = require('helmet');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Charger les variables d'environnement
dotenv.config();

// Initialiser l'application Express
const app = express();
const PORT = process.env.PORT || 5000;

// Configuration Helmet avec ajustements pour redirect.html
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"], // Permettre les scripts inline pour redirect.html
        styleSrc: ["'self'", "'unsafe-inline'"],  // Permettre les styles inline
        imgSrc: ["'self'", "data:"],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'self'"],
      },
    },
  })
);

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Activer "trust proxy" pour gérer les redirections HTTPS (nécessaire pour Heroku ou tout proxy)
app.set('trust proxy', 1);

// Middleware pour forcer HTTPS
app.use((req, res, next) => {
    if (req.headers['x-forwarded-proto'] !== 'https' && process.env.NODE_ENV === 'production') {
        return res.redirect(`https://${req.hostname}${req.url}`);
    }
    next();
});

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

// Servir les fichiers statiques du dossier public - AJOUT IMPORTANT
app.use(express.static(path.join(__dirname, 'public')));

app.use('/uploads', (req, res, next) => {
    req.protocol = 'https'; // Forcer le protocole HTTPS
    next();
}, express.static(path.join(__dirname, 'uploads')));

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

app.use('/api/users', userRoutes);
app.use('/api/secrets', secretRoutes);
app.use('/api/upload', uploadRoutes);

// Route de vérification du serveur
app.get('/', (req, res) => {
    const baseUrl = process.env.NODE_ENV === 'production'
        ? `https://${req.hostname}`
        : `http://${req.hostname}:${PORT}`;
    res.send(`Server is running. Base URL: ${baseUrl}`);
});

// Route supplémentaire pour rediriger toutes les routes non-API vers la page de redirection
// Cela permet de gérer les cas où l'URL serait légèrement différente
app.get('/redirect*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'redirect.html'));
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