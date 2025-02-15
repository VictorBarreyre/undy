const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
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
        required: true,
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
    // Nouveaux champs pour Stripe
    stripeAccountId: {
        type: String,
        sparse: true, // Permet d'avoir des valeurs null tout en gardant l'unicité
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
        type: String,  // Pour stocker l'IBAN masqué
        select: true,
        sparse: true
    },
    lastStripeOnboardingUrl: {
        type: String, // Pour stocker temporairement l'URL d'onboarding
        select: false // Ne pas inclure par défaut dans les requêtes
    },
    stripeIdentityVerified: {
        type: Boolean,
        default: false
    },
    stripeIdentityDocumentId: {
        type: String,
        default: null
    }
}, { timestamps: true });

// Middleware existant pour le mot de passe
UserSchema.pre('save', async function(next) {
    if (!this.isModified('password')) {
        return next();
    }

    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

// Méthode existante pour comparer les mots de passe
UserSchema.methods.matchPassword = async function(enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

// Nouvelle méthode pour vérifier si l'utilisateur peut recevoir des paiements
UserSchema.methods.canReceivePayments = function() {
    return this.stripeAccountId && this.stripeAccountStatus === 'active' && this.stripeOnboardingComplete;
};

// Méthode pour mettre à jour le statut Stripe
UserSchema.methods.updateStripeStatus = async function(status) {
    this.stripeAccountStatus = status;
    if (status === 'active') {
        this.stripeOnboardingComplete = true;
    }
    return this.save();
};

module.exports = mongoose.model('User', UserSchema);