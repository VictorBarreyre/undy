const User = require('../models/User')

/**
 * Vérifie si l'utilisateur a les droits d'accès au compte Stripe spécifié
 * @param {string} userId - ID de l'utilisateur
 * @param {string} stripeAccountId - ID du compte Stripe à vérifier
 * @returns {Promise<boolean>} - true si l'utilisateur a accès, false sinon
 */

const checkUserStripeAccountAccess = async (userId, stripeAccountId) => {
 try {
   // Récupérer l'utilisateur avec son ID Stripe
   const user = await User.findById(userId).select('stripeAccountId');
   
   // Vérifier si l'utilisateur existe et si l'ID du compte Stripe correspond
   if (!user) {
     return false;
   }
   
   return user.stripeAccountId === stripeAccountId;
 } catch (error) {
   console.error('Erreur lors de la vérification des droits d\'accès au compte Stripe:', error);
   return false;
 }
};

module.exports = {
 checkUserStripeAccountAccess
};