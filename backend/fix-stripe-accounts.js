// Utilisez directement votre instance d'application existante
require('dotenv').config();
const mongoose = require('mongoose');
const express = require('express');
const app = express();

// Obtenez vos modèles et la configuration depuis votre application
const User = require('./models/User');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Laissez mongoose se connecter via votre configuration d'application
mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    console.log('MongoDB connecté');
    
    // Récupérer les comptes Stripe
    const accounts = await stripe.accounts.list({ limit: 100 });
    console.log(`${accounts.data.length} comptes Stripe trouvés`);
    
    // Créer un mapping par email
    const accountsByEmail = {};
    accounts.data.forEach(acc => {
      if (acc.email) accountsByEmail[acc.email.toLowerCase()] = acc.id;
    });
    
    // Mettre à jour les utilisateurs
    const users = await User.find({ stripeAccountId: { $exists: true } });
    console.log(`${users.length} utilisateurs avec stripeAccountId trouvés`);
    
    let updatedCount = 0;
    for (const user of users) {
      if (user.email && accountsByEmail[user.email.toLowerCase()]) {
        const correctId = accountsByEmail[user.email.toLowerCase()];
        if (user.stripeAccountId !== correctId) {
          console.log(`Mise à jour pour ${user.email}: ${user.stripeAccountId} → ${correctId}`);
          await User.findByIdAndUpdate(user._id, { stripeAccountId: correctId });
          updatedCount++;
        }
      } else {
        console.log(`Pas de compte Stripe trouvé pour ${user.email}`);
      }
    }
    
    console.log(`${updatedCount} utilisateurs mis à jour`);
    process.exit(0);
  })
  .catch(err => {
    console.error('Erreur:', err);
    process.exit(1);
  });