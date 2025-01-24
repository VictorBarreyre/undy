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
        lowercase: true, // Force les emails en minuscules
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
        required: false, // Champ optionnel pour la date de naissance
    },
    phone: {
        type: String,
        required: false, // Champ optionnel pour le numéro de téléphone
        trim: true,
    },
    profilePicture: {
        type: String, // Stocke l'URL de la photo de profil
        required: false, // Champ optionnel
        default: "/uploads/default.png",  // URL par défaut si aucune photo n'est fournie
    },
    notifs: {
        type: Boolean,
        required: false, // Champ optionnel pour les notifications
        default: true, // Par défaut, les notifications sont activées
    },
    contacts: {
        type: Boolean,
        required: false, // Champ optionnel pour les contacts
        default: true, // Par défaut, les contacts sont activés
    },
    subscriptions: {
        type: Number,
        required: false, // Champ optionnel pour les abonnements
        default: 0, // Par défaut, aucun abonnement
    },
}, { timestamps: true });

// Avant de sauvegarder, hacher le mot de passe
UserSchema.pre('save', async function(next) {
    if (!this.isModified('password')) {
        return next();
    }

    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

// Méthode pour comparer les mots de passe lors de la connexion
UserSchema.methods.matchPassword = async function(enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', UserSchema);
