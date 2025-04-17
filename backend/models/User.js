const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
    appleId: {
        type: String,
        unique: true,
        sparse: true
    },
    name: {
        type: String,
        required: true,
        trim: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        match: [
            /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
            'Veuillez entrer un email valide',
        ],
    },
    password: {
        type: String,
        required: function() {
            // Le mot de passe est requis seulement si aucune authentification externe n'est utilisée
            return !this.googleId && !this.appleId;
        }
    },
    birthdate: {
        type: Date,
        required: false,
    },
    phone: {
        type: String,
        required: false,
        trim: true,
    },
    profilePicture: {
        type: String,
        maxLength: 5242880,
    },
    notifs: {
        type: Boolean,
        required: false,
        default: true,
    },
    contacts: {
        type: Boolean,
        required: false,
        default: true,
    },
    subscriptions: {
        type: Number,
        required: false,
        default: 0,
    },
    location: {
        type: Boolean,
        required: false,
        default: false // Désactivé par défaut
    },
    country: {
        type: String,
        default: 'FR' // Définir la France comme pays par défaut
      },
    hasSubscriptions: {
        type: Number,
        required: false,
        default: 0,
    },
    // Champs Stripe simplifiés
    stripeAccountId: {
        type: String,
        sparse: true,
    },
    stripeAccountStatus: {
        type: String,
        enum: ['pending', 'active', 'inactive', 'rejected'],
        default: 'pending'
    },
    stripeOnboardingComplete: {
        type: Boolean,
        default: false
    },
    totalEarnings: {
        type: Number,
        default: 0
    },
    stripeExternalAccount: {
        type: String,
        select: true,
        sparse: true
    },
    lastStripeOnboardingUrl: {
        type: String,
        select: false
    },
    // Champs liés à la vérification d'identité
    // Ces champs peuvent être conservés pour la compatibilité, mais ne seront plus utilisés
    // activement puisque la vérification est maintenant faite pendant l'onboarding Stripe Connect
    stripeIdentityVerified: {
        type: Boolean,
        default: false
    },
    stripePayoutsEnabled: {
        type: Boolean,
        default: false
    },
    stripeChargesEnabled: {
        type: Boolean,
        default: false
    },
    // Date de la dernière mise à jour du statut Stripe
    stripeLastUpdated: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true });

// Middleware pour le hachage du mot de passe
UserSchema.pre('save', async function(next) {
    if (!this.isModified('password')) {
        return next();
    }

    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

// Méthode pour comparer les mots de passe
UserSchema.methods.matchPassword = async function(enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

// Méthode pour vérifier si l'utilisateur peut recevoir des paiements
UserSchema.methods.canReceivePayments = function() {
    return this.stripeAccountId && 
           this.stripeAccountStatus === 'active' && 
           this.stripeOnboardingComplete &&
           this.stripeChargesEnabled;
};

// Méthode pour mettre à jour le statut Stripe avec les capacités
UserSchema.methods.updateStripeStatus = async function(stripeAccount) {
    if (!stripeAccount) return this;
    
    this.stripeAccountStatus = stripeAccount.details_submitted ? 'active' : 'pending';
    this.stripeOnboardingComplete = stripeAccount.details_submitted;
    this.stripePayoutsEnabled = stripeAccount.payouts_enabled;
    this.stripeChargesEnabled = stripeAccount.charges_enabled;
    this.stripeIdentityVerified = stripeAccount.payouts_enabled; // Si les paiements sont activés, l'identité a été vérifiée
    this.stripeLastUpdated = new Date();
    
    return this.save();
};

module.exports = mongoose.model('User', UserSchema);