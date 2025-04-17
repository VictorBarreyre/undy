// clean-test-accounts.js
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    console.log('MongoDB connecté');
    
    try {
      // Compter les utilisateurs avant le nettoyage
      const countBefore = await User.countDocuments({
        email: { $ne: "victor@14my.fr" },
        stripeAccountId: { $exists: true }
      });
      
      console.log(`${countBefore} utilisateurs avec des comptes Stripe de test trouvés`);
      
      // Nettoyer toutes les références aux comptes de test sauf pour victor@14my.fr
      const result = await User.updateMany(
        { email: { $ne: "victor@14my.fr" }, stripeAccountId: { $exists: true } },
        { $unset: {
            stripeAccountId: "",
            stripeAccountStatus: "",
            stripeOnboardingComplete: "",
            stripeIdentityVerified: "",
            stripeVerificationSessionId: "",
            stripeVerificationStatus: "",
            lastStripeOnboardingUrl: "",
            stripeExternalAccount: ""
          }
        }
      );
      
      console.log(`${result.modifiedCount} utilisateurs nettoyés avec succès`);
    } catch (error) {
      console.error('Erreur lors du nettoyage des comptes:', error);
    } finally {
      mongoose.disconnect();
      console.log('Déconnecté de MongoDB');
    }
  })
  .catch(err => {
    console.error('Erreur de connexion MongoDB:', err);
  });