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
      
      // Récupérer le rapport détaillé si disponible
      if (session.last_verification_report) {
        try {
          const report = await stripe.identity.verificationReports.retrieve(session.last_verification_report);
          
          if (report.document && report.document.issuing_country) {
            const documentCountry = report.document.issuing_country;
            console.log(`Pays du document détecté: ${documentCountry}`);
            
            // Mettre à jour le pays de l'utilisateur
            user.country = documentCountry;
            console.log(`Pays de l'utilisateur mis à jour: ${documentCountry}`);
          }
        } catch (reportError) {
          console.error('Erreur lors de la récupération du rapport de vérification:', reportError);
        }
      }
      
      // Mettre à jour les capacités du compte Stripe
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

// Handler pour les événements identity.verification_session.verified
const handleVerificationSessionVerified = async (session) => {
  console.log('Vérification d\'identité terminée avec succès:', {
    sessionId: session.id
  });
  
  const user = await User.findOne({ stripeVerificationSessionId: session.id });
  
  if (user) {
    try {
      // Récupérer le rapport détaillé pour obtenir le pays du document
      if (session.last_verification_report) {
        const report = await stripe.identity.verificationReports.retrieve(session.last_verification_report);
        
        if (report.document && report.document.issuing_country) {
          const documentCountry = report.document.issuing_country;
          console.log(`Pays du document vérifié: ${documentCountry}`);
          
          // Mettre à jour le pays de l'utilisateur
          user.country = documentCountry;
          
          // Synchroniser le pays avec les méta-données du compte Stripe
          if (user.stripeAccountId) {
            try {
              await stripe.accounts.update(user.stripeAccountId, {
                metadata: {
                  verified_country: documentCountry
                }
              });
              console.log(`Pays enregistré dans les métadonnées du compte Stripe: ${documentCountry}`);
            } catch (stripeError) {
              console.log("Erreur non critique lors de la mise à jour des métadonnées:", stripeError.message);
            }
          }
        }
      }
      
      // Marquer l'utilisateur comme vérifié
      user.stripeIdentityVerified = true;
      user.stripeVerificationStatus = 'verified';
      user.stripeIdentityVerificationDate = new Date();
      await user.save();
      
      console.log(`Utilisateur ${user._id} vérifié avec succès, pays du document: ${user.country || 'non détecté'}`);
    } catch (error) {
      console.error("Erreur lors du traitement de la vérification:", error);
    }
  } else {
    console.error(`Aucun utilisateur trouvé pour la session de vérification ${session.id}`);
  }
};

// Handler pour les événements identity.verification_session.requires_input
const handleVerificationSessionRequiresInput = async (session) => {
  console.log('Vérification d\'identité nécessite une action:', {
    sessionId: session.id,
    lastError: session.last_error
  });
  
  const user = await User.findOne({ stripeVerificationSessionId: session.id });
  
  if (user) {
    user.stripeVerificationStatus = 'requires_input';
    await user.save();
    
    console.log(`Statut de vérification mis à jour pour l'utilisateur ${user._id}: requires_input`);
    
    if (session.last_error) {
      console.log(`Erreur de vérification pour l'utilisateur ${user._id}:`, session.last_error);
    }
  }
};

// Mapping des événements à leurs gestionnaires
const eventHandlers = {
  'identity.verification_session.updated': (event) => handleVerificationSessionUpdated(event.data.object),
  'identity.verification_session.verified': (event) => handleVerificationSessionVerified(event.data.object),
  'identity.verification_session.requires_input': (event) => handleVerificationSessionRequiresInput(event.data.object),
  // Vous pouvez ajouter d'autres gestionnaires ici
};

// Fonction principale
const handleStripeWebhook = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  
  try {
    const event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET_TEST
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