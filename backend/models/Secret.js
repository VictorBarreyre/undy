const mongoose = require('mongoose');

const SecretSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true,
    },
    content: {
        type: String,
        required: true,
    },
    price: {
        type: Number,
        required: true,
        min: 0, // Le prix doit être supérieur ou égal à zéro
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User', // Référence au modèle User
        required: true,
    },
    purchasedBy: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User', // Liste des utilisateurs ayant acheté ce secret
        }
    ]
}, { timestamps: true });

module.exports = mongoose.model('Secret', SecretSchema);
