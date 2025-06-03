// models/RefreshToken.js
const mongoose = require('mongoose');

const refreshTokenSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    token: {
        type: String,
        required: true,
        unique: true // Ajouter unique pour éviter les doublons
    },
    expiresAt: {
        type: Date,
        required: true,
        default: function() {
            // Retourner la date d'expiration (30 jours dans le futur)
            return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        },
        index: { expireAfterSeconds: 0 } // MongoDB supprimera automatiquement les documents après expiresAt
    }
});

// Index composé pour améliorer les performances de recherche
refreshTokenSchema.index({ userId: 1, token: 1 });

// Méthode pour vérifier si le token est expiré
refreshTokenSchema.methods.isExpired = function() {
    return Date.now() > this.expiresAt;
};

// Méthode statique pour nettoyer les tokens expirés
refreshTokenSchema.statics.cleanupExpired = async function() {
    return await this.deleteMany({
        expiresAt: { $lt: new Date() }
    });
};

module.exports = mongoose.model('RefreshToken', refreshTokenSchema);