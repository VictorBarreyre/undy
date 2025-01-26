const mongoose = require('mongoose');

const SecretSchema = new mongoose.Schema({
    label: {
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
      min: 0,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    purchasedBy: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    }],
    expiresAt: {
      type: Date,
      required: true,
      default: () => new Date(+new Date() + 7*24*60*60*1000) // 7 jours par défaut
    }
   }, { timestamps: true });
   
   // Nettoyage automatique
   SecretSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

   module.exports = mongoose.model('Secret', SecretSchema);
