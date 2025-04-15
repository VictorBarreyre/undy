// webhooks/stripeWebhooks.js
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const User = require('../models/User');

// Handler pour les événements identity.verification_session.updated
const handleVerificationSessionUpdated = async (session) => {
  console.log('Mise à jour de session de vérification d\'identité:', {
    sessionId: session.id,
    status: session.status
  });
  
  const user = await User.findOne({ stripeVerificationSessionId: session.id });
  
  if (user) {
    user.stripeVerificationStatus = session.status;
    user.stripeIdentityVerified = session.status === 'verified';
    
    if (session.status === 'verified') {
      user.stripeIdentityVerificationDate = new Date();
      
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
};

// Mapping des événements à leurs gestionnaires
const eventHandlers = {
  'identity.verification_session.updated': (event) => handleVerificationSessionUpdated(event.data.object),
  // Ajoutez d'autres gestionnaires ici
};

// Fonction principale
const handleStripeWebhook = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  
  try {
    const event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
    
    console.log(`Événement Stripe reçu: ${event.type}`);
    
    // Si nous avons un gestionnaire pour cet événement, l'exécuter
    if (eventHandlers[event.type]) {
      await eventHandlers[event.type](event);
    } else {
      console.log(`Type d'événement non traité: ${event.type}`);
    }
    
    res.json({ received: true });
  } catch (err) {
    console.error('Erreur webhook:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
};

module.exports = {
  handleStripeWebhook,
  handleHealthCheck: (req, res) => {
    console.log('Test de santé du webhook Stripe');
    res.status(200).send('Stripe webhook endpoint is ready to receive events');
  }
};