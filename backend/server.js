const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const userRoutes = require('./routes/userRoutes');
const secretRoutes = require('./routes/secretRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const moderationRoutes = require('./routes/moderationRoutes'); 
const notificationRoutes = require('./routes/notificationsRoutes');
const path = require('path');
const helmet = require('helmet');
const User = require('./models/User');
const webhookRoutes = require('./routes/webHookRoutes');
const { cleanupExpiredTokens } = require('./controllers/userController');
const videoModerationPolling = require('./services/videoModerationPolling');
const cron = require('node-cron');

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
        imgSrc: ["'self'", "data:", "https:", "http:"], // Permettre les images externes
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'self'"],
      },
    },
  })
);

// Activer "trust proxy" pour gérer les redirections HTTPS (nécessaire pour Heroku)
app.set('trust proxy', 1);

// Middleware pour forcer HTTPS en production
app.use((req, res, next) => {
    if (req.headers['x-forwarded-proto'] !== 'https' && process.env.NODE_ENV === 'production') {
        return res.redirect(`https://${req.hostname}${req.url}`);
    }
    next();
});

// Configuration CORS
const corsOptions = {
    origin: process.env.NODE_ENV === 'production' 
        ? process.env.FRONTEND_URL || true // Utiliser l'URL du frontend ou autoriser toutes les origines
        : true, // Autoriser toutes les origines en développement
    methods: 'GET,POST,PUT,DELETE,OPTIONS',
    allowedHeaders: 'Origin, X-Requested-With, Content-Type, Accept, Authorization',
    credentials: true,
    preflightContinue: false,
    optionsSuccessStatus: 204
};
app.use(cors(corsOptions));

// Middleware pour journaliser les requêtes
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} - IP: ${req.ip}`);
    next();
});

// IMPORTANT: Configurer les parsers AVANT les routes
// Augmenter les limites pour les uploads de vidéos
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true }));

// Route webhook (doit être après les parsers)
app.use('/webhooks', webhookRoutes);

// Servir les fichiers statiques
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

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
    res.json({
        status: 'running',
        baseUrl: baseUrl,
        environment: process.env.NODE_ENV || 'development',
        timestamp: new Date().toISOString()
    });
});

// Route pour la page de redirection
app.get('/redirect.html', (req, res) => {
    console.log('Requête reçue pour redirect.html avec paramètres:', req.query);
    res.sendFile(path.join(__dirname, 'public', 'redirect.html'));
});

// Gestion des erreurs 404
app.use((req, res, next) => {
    res.status(404).json({ 
        error: 'Route non trouvée',
        path: req.path,
        method: req.method 
    });
});

// Gestion globale des erreurs
app.use((err, req, res, next) => {
    console.error('Erreur:', err.stack);
    res.status(err.status || 500).json({
        error: process.env.NODE_ENV === 'production' 
            ? 'Une erreur est survenue' 
            : err.message,
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
});

// Variables pour stocker les tâches planifiées
let cronJob = null;
let cleanupInterval = null;

// Connexion à MongoDB
mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => {
    console.log('✅ MongoDB connecté');
    
    // Nettoyer les tokens expirés au démarrage
    cleanupExpiredTokens()
        .then(() => console.log('✅ [Token Cleanup] Nettoyage initial des tokens effectué'))
        .catch(err => console.error('❌ [Token Cleanup] Erreur lors du nettoyage initial:', err));
    
    // Configurer le nettoyage périodique des tokens expirés (toutes les 24h)
    cleanupInterval = setInterval(async () => {
        try {
            await cleanupExpiredTokens();
            console.log('✅ [Token Cleanup] Nettoyage périodique des tokens effectué');
        } catch (error) {
            console.error('❌ [Token Cleanup] Erreur lors du nettoyage périodique:', error);
        }
    }, 24 * 60 * 60 * 1000); // 24 heures
    
    // Démarrer le polling de modération vidéo avec cron (toutes les 5 minutes)
    cronJob = cron.schedule('*/5 * * * *', async () => {
        try {
            await videoModerationPolling.checkPendingVideos();
            console.log('✅ [Video Moderation] Vérification des vidéos en attente effectuée');
        } catch (error) {
            console.error('❌ [Video Moderation] Erreur lors de la vérification:', error);
        }
    });
    
    console.log('✅ [Cron] Tâche de modération vidéo planifiée (toutes les 5 minutes)');
})
.catch(err => {
    console.error('❌ Erreur de connexion MongoDB:', err);
    process.exit(1); // Arrêter le serveur si MongoDB ne peut pas se connecter
});

// Démarrer le serveur
const server = app.listen(PORT, () => {
    console.log(`✅ Serveur démarré sur le port ${PORT}`);
    console.log(`📍 Environnement: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔄 Nettoyage automatique des tokens: activé (toutes les 24h)`);
    console.log(`🎥 Polling de modération vidéo: activé (toutes les 5 minutes)`);
    
    if (process.env.NODE_ENV === 'production') {
        console.log('🔒 HTTPS forcé: activé');
    }
});

// Fonction de nettoyage gracieux
const gracefulShutdown = (signal) => {
    console.log(`\n⚠️  ${signal} reçu, fermeture gracieuse du serveur...`);
    
    // Arrêter d'accepter de nouvelles connexions
    server.close(() => {
        console.log('🔌 Serveur HTTP fermé');
        
        // Arrêter les tâches planifiées
        if (cronJob) {
            cronJob.stop();
            console.log('⏹️  Tâche cron arrêtée');
        }
        
        if (cleanupInterval) {
            clearInterval(cleanupInterval);
            console.log('⏹️  Nettoyage périodique des tokens arrêté');
        }
        
        // Arrêter le polling si une méthode stop existe
        if (videoModerationPolling && typeof videoModerationPolling.stop === 'function') {
            videoModerationPolling.stop();
            console.log('⏹️  Polling vidéo arrêté');
        }
        
        // Fermer la connexion MongoDB
        mongoose.connection.close(false, () => {
            console.log('🔌 Connexion MongoDB fermée');
            console.log('👋 Arrêt complet du serveur');
            process.exit(0);
        });
    });
    
    // Forcer la fermeture après 30 secondes si le graceful shutdown prend trop de temps
    setTimeout(() => {
        console.error('❌ Fermeture forcée après timeout de 30 secondes');
        process.exit(1);
    }, 30000);
};

// Gestion propre de l'arrêt du serveur
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Gestion des erreurs non capturées
process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
    // En production, vous pourriez vouloir notifier un service de monitoring
});

process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
    // Fermeture gracieuse après une erreur critique
    gracefulShutdown('UNCAUGHT_EXCEPTION');
});

module.exports = app; // Utile pour les tests