const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const { createProxyMiddleware } = require('http-proxy-middleware');
const userRoutes = require('./routes/userRoutes');
const secretRoutes = require('./routes/secretRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const linkPreviewRoutes = require('./routes/linkPreviewRoutes');
const path = require('path');
const helmet = require('helmet');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const User = require('./models/User'); // Assurez-vous d'ajouter cette importation

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

// IMPORTANT: Route webhook Stripe AVANT les middlewares de parsing body
// pour conserver le corps brut de la requête
app.post('/webhooks/stripe', express.raw({type: 'application/json'}), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body, 
      sig, 
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Erreur de signature du webhook:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Traiter l'événement selon son type
  try {
    if (event.type === 'identity.verification_session.updated') {
      const session = event.data.object;
      console.log('Mise à jour de session de vérification d\'identité:', {
        sessionId: session.id,
        status: session.status
      });
      
      // Rechercher l'utilisateur associé à cette session
      const user = await User.findOne({ stripeVerificationSessionId: session.id });
      
      if (user) {
        // Mettre à jour le statut de vérification
        user.stripeVerificationStatus = session.status;
        user.stripeIdentityVerified = session.status === 'verified';
        
        if (session.status === 'verified') {
          user.stripeIdentityVerificationDate = new Date();
          
          // Si le compte est vérifié, mettre à jour les capacités du compte Stripe Connect
          if (user.stripeAccountId) {
            try {
              await stripe.accounts.update(user.stripeAccountId, {
                capabilities: {
                  card_payments: { requested: true },
                  transfers: { requested: true }
                }
              });
              user.stripePaymentsVerified = true;
            } catch (stripeError) {
              console.error('Erreur lors de la mise à jour des capacités Stripe:', stripeError);
            }
          }
        }
        await user.save();
        console.log(`Statut de vérification mis à jour pour l'utilisateur ${user._id}: ${session.status}`);
      } else {
        console.error(`Aucun utilisateur trouvé pour la session de vérification ${session.id}`);
      }
    } else {
      console.log(`Type d'événement non traité: ${event.type}`);
    }

    // Renvoyer une réponse de succès
    res.json({received: true});
  } catch (error) {
    console.error('Erreur lors du traitement du webhook:', error);
    res.status(500).send('Une erreur est survenue lors du traitement du webhook');
  }
});

// Maintenant les middlewares de parsing body pour le reste de l'application
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
app.use('/api/link-preview', linkPreviewRoutes);


// Route de vérification du serveur
app.get('/', (req, res) => {
    const baseUrl = process.env.NODE_ENV === 'production'
        ? `https://${req.hostname}`
        : `http://${req.hostname}:${PORT}`;
    res.send(`Server is running. Base URL: ${baseUrl}`);
});

// Route supplémentaire pour rediriger toutes les routes non-API vers la page de redirection
app.get('/redirect.html', (req, res) => {
    console.log('Requête reçue pour redirect.html avec paramètres:', req.query);
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