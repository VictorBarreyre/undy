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
    // Rendre tout l'objet location optionnel
    _id: false, // Pas besoin d'ID pour ce sous-document
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point',
    },
    coordinates: {
      type: [Number],
      validate: {
        validator: function(v) {
          // Si les coordonnées sont fournies, elles doivent être valides
          if (!v || v.length === 0) return true; // Coordonnées optionnelles
          return v.length === 2 && 
                 v[0] >= -180 && v[0] <= 180 && // longitude
                 v[1] >= -90 && v[1] <= 90;     // latitude
        },
        message: props => `Coordonnées invalides: ${props.value}`
      }
    }
  },
  language: {
    type: String,
    required: true,
    default: 'fr' // ou la langue par défaut de votre application
  }
}, { timestamps: true });

// Middleware de pré-validation personnalisé pour gérer les règles de validation complexes
SecretSchema.pre('validate', function(next) {
  // Supprimer complètement l'objet location s'il n'a pas de coordonnées
  if (this.location && (!this.location.coordinates || this.location.coordinates.length === 0)) {
    this.location = undefined;
  }
  
  // Si location existe mais que les coordonnées sont invalides, déclencher une erreur
  if (this.location && this.location.coordinates && this.location.coordinates.length !== 2) {
    this.invalidate('location.coordinates', 'Les coordonnées doivent être un tableau de deux éléments [longitude, latitude]');
  }
  
  next();
});

// Nettoyage automatique
SecretSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Ajouter l'index géospatial seulement si location existe
SecretSchema.index({ 'location': '2dsphere' }, { sparse: true });

module.exports = mongoose.model('Secret', SecretSchema);