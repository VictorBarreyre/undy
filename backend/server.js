const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const { createProxyMiddleware } = require('http-proxy-middleware');
const userRoutes = require('./routes/userRoutes');
const secretRoutes = require('./routes/secretRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const moderationRoutes = require('./routes/moderationRoutes'); 
const notificationRoutes = require('./routes/notificationsRoutes');
const path = require('path');
const helmet = require('helmet');
const User = require('./models/User');
// RETIRER express-fileupload car on utilise multer
// const fileUpload = require('express-fileupload');
const webhookRoutes = require('./routes/webHookRoutes');
const { cleanupExpiredTokens } = require('./controllers/userController');

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

app.use('/webhooks', webhookRoutes);

// IMPORTANT: Augmenter les limites pour les uploads de vidéos
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true }));

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

// Servir les fichiers statiques du dossier public
app.use(express.static(path.join(__dirname, 'public')));

app.use('/uploads', (req, res, next) => {
    req.protocol = 'https'; // Forcer le protocole HTTPS
    next();
}, express.static(path.join(__dirname, 'uploads')));

// RETIRER express-fileupload - on utilise multer dans les routes
// app.use(fileUpload({
//   limits: { fileSize: 50 * 1024 * 1024 },
//   useTempFiles: true,
//   tempFileDir: '/tmp/'
// }));

// **Configuration du Proxy en développement**
if (process.env.NODE_ENV === 'development') {
    app.use(
        '/api',
        createProxyMiddleware({
            target: 'https://undy-5948c5547ec9.herokuapp.com',
            changeOrigin: true,
        })
    );
}

// Routes API
app.use('/api/users', userRoutes);
app.use('/api/secrets', secretRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/moderation', moderationRoutes); 
app.use('/api/notifications', notificationRoutes);

// Route de vérification du serveur
app.get('/', (req, res) => {
    const baseUrl = process.env.NODE_ENV === 'production'
        ? `https://${req.hostname}`
        : `http://${req.hostname}:${PORT}`;
    res.send(`Server is running. Base URL: ${baseUrl}`);
});

// Route pour la page de redirection
app.get('/redirect.html', (req, res) => {
    console.log('Requête reçue pour redirect.html avec paramètres:', req.query);
    res.sendFile(path.join(__dirname, 'public', 'redirect.html'));
});

// Connexion à MongoDB
mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => {
    console.log('MongoDB connecté');
    
    // Nettoyer les tokens expirés au démarrage
    cleanupExpiredTokens()
        .then(() => console.log('[Token Cleanup] Nettoyage initial des tokens effectué'))
        .catch(err => console.error('[Token Cleanup] Erreur lors du nettoyage initial:', err));
    
    // Configurer le nettoyage périodique des tokens expirés
    const cleanupInterval = setInterval(async () => {
        try {
            await cleanupExpiredTokens();
            console.log('[Token Cleanup] Nettoyage périodique des tokens effectué');
        } catch (error) {
            console.error('[Token Cleanup] Erreur lors du nettoyage périodique:', error);
        }
    }, 24 * 60 * 60 * 1000); // 24 heures
    
    // Nettoyer l'intervalle si le processus se termine
    process.on('SIGTERM', () => {
        clearInterval(cleanupInterval);
        console.log('[Token Cleanup] Arrêt du nettoyage périodique');
    });
})
.catch(err => console.error('Erreur de connexion MongoDB:', err));

// Démarrer le serveur
app.listen(PORT, () => {
    console.log(`Serveur démarré sur le port ${PORT}`);
    console.log(`Environnement: ${process.env.NODE_ENV || 'development'}`);
    console.log(`Nettoyage automatique des tokens: activé (toutes les 24h)`);
});

// Gestion propre de l'arrêt du serveur
process.on('SIGTERM', () => {
    console.log('SIGTERM reçu, fermeture du serveur...');
    mongoose.connection.close(() => {
        console.log('Connexion MongoDB fermée');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('SIGINT reçu, fermeture du serveur...');
    mongoose.connection.close(() => {
        console.log('Connexion MongoDB fermée');
        process.exit(0);
    });
});