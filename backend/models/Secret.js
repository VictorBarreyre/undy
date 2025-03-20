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
    default: () => new Date(+new Date() + 7 * 24 * 60 * 60 * 1000) // 7 jours par défaut
  },
  
  shareLink: {
    type: String,
    unique: true,
    sparse: true // Permet d'avoir des documents sans shareLink
  },
  location: {
    type: {
        type: String,
        enum: ['Point'],
        default: 'Point'
    },
    coordinates: {
        type: [Number],
        validate: {
            validator: function(v) {
                return v.length === 2 && 
                       v[0] >= -180 && v[0] <= 180 && 
                       v[1] >= -90 && v[1] <= 90;
            },
            message: props => `Coordonnées invalides: ${props.value}`
        },
        required: false  // Optionnel si la location n'est pas toujours requise
    }
}
},
{ timestamps: true });

// Nettoyage automatique
SecretSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Ajouter l'index géospatial
SecretSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('Secret', SecretSchema);