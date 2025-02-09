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
    createdAt: {
        type: Date,
        default: Date.now,
        expires: 7 * 24 * 60 * 60 // Le document expire après 7 jours
    }
});

module.exports = mongoose.model('RefreshToken', refreshTokenSchema);