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
        required: true
    },
    expiresAt: {
        type: Date,
        default: Date.now,
        expires: 30 * 24 * 60 * 60 * 1000 // Le document expire après 7 jours
    }
});

module.exports = mongoose.model('RefreshToken', refreshTokenSchema);refreshToken