// models/VideoModeration.js
const mongoose = require('mongoose');

const videoModerationSchema = new mongoose.Schema({
  // Identifiants
  publicId: { 
    type: String, 
    required: true, 
    index: true 
  },
  workflowId: { 
    type: String, 
    required: true, 
    unique: true,
    sparse: true // Permet les valeurs null
  },
  
  // URL et métadonnées
  url: { 
    type: String, 
    required: true 
  },
  duration: Number,
  format: String,
  size: Number,
  
  // Relations
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User',
    index: true
  },
  messageId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Message' 
  },
  conversationId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Conversation' 
  },
  
  // Statut de modération
  status: { 
    type: String, 
    enum: ['pending', 'approved', 'rejected', 'error', 'failed_to_submit'],
    default: 'pending',
    index: true
  },
  
  // Résultats de modération
  reason: String, // Raison du rejet si applicable
  moderationDetails: {
    flaggedCategories: [{
      name: String,
      score: Number
    }],
    frames: [{
      timestamp: Number,
      categories: [String]
    }]
  },
  
  // Timestamps
  uploadedAt: { 
    type: Date, 
    default: Date.now,
    index: true
  },
  moderatedAt: Date,
  
  // Erreurs
  error: String,
  retryCount: { 
    type: Number, 
    default: 0 
  },
  lastRetryAt: Date
}, {
  timestamps: true // Ajoute createdAt et updatedAt automatiquement
});

// Index composé pour les requêtes fréquentes
videoModerationSchema.index({ status: 1, uploadedAt: -1 });
videoModerationSchema.index({ userId: 1, status: 1 });

// Méthodes d'instance
videoModerationSchema.methods.isExpired = function() {
  // Considérer comme expiré après 24h sans résultat
  const expirationTime = 24 * 60 * 60 * 1000; // 24 heures
  return this.status === 'pending' && 
         (Date.now() - this.uploadedAt > expirationTime);
};

// Méthodes statiques
videoModerationSchema.statics.findPendingVideos = function() {
  return this.find({ 
    status: 'pending',
    workflowId: { $exists: true, $ne: null }
  }).sort({ uploadedAt: 1 });
};

videoModerationSchema.statics.findExpiredVideos = function() {
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  return this.find({
    status: 'pending',
    uploadedAt: { $lt: twentyFourHoursAgo }
  });
};

// Middleware pre-save
videoModerationSchema.pre('save', function(next) {
  if (this.isModified('status')) {
    if (this.status === 'approved' || this.status === 'rejected') {
      this.moderatedAt = new Date();
    }
  }
  next();
});

module.exports = mongoose.model('VideoModeration', videoModerationSchema);