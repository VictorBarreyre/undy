// server.js
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json());
// Configuration CORS
app.use(cors({
  origin: ['http://localhost:8081', 'https://undy-93a12c731bb4.herokuapp.com'], // Ajoute d'autres domaines si nécessaire
  methods: ['GET', 'POST', 'PUT', 'DELETE'], // Précise les méthodes autorisées
  allowedHeaders: ['Content-Type', 'Authorization'] // Précise les en-têtes autorisés
}));
app.get('/', (req, res) => {
    res.send('Why are you here man?');
  });

// Routes
const userRoutes = require('./routes/userRoutes');
app.use('/api/users', userRoutes);

// Connexion à MongoDB
mongoose.connect(process.env.MONGO_URI, {
   
})
.then(() => console.log('MongoDB connecté'))
.catch(err => console.error(err));

// Démarrer le serveur
app.listen(PORT, () => {
    console.log(`Serveur démarré sur le port ${PORT}`);
});
