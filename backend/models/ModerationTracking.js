// models/ModerationTracking.js
const mongoose = require('mongoose');

const ModerationTrackingSchema = new mongoose.Schema({
  // ID du workflow Sightengine
  workflowId: {
    type: String,
    required: true,
    unique: true
  },
  
  // ID public Cloudinary
  cloudinaryId: {
    type: String,
    required: true
  },
  
  // ID unique pour le suivi interne
  moderationId: {
    type: String,
    required: true
  },
  
  // Type de média (image, video, audio)
  mediaType: {
    type: String,
    enum: ['image', 'video', 'audio'],
    default: 'video'
  },
  
  // URL du média
  url: {
    type: String,
    required: true
  },
  
  // Statut de la modération
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'error'],
    default: 'pending'
  },
  
  // ID de l'utilisateur qui a uploadé le média
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // ID du message associé (si applicable)
  messageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Conversation.messages'
  },
  
  // ID de la conversation associée (si applicable)
  conversationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Conversation'
  },
  
  // Résultat complet de la modération
  result: {
    type: Object,
    default: null
  },
  
  // Horodatages
  createdAt: {
    type: Date,
    default: Date.now
  },
  
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Middleware pour mettre à jour automatiquement updatedAt
ModerationTrackingSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Index pour accélérer les recherches
ModerationTrackingSchema.index({ workflowId: 1 });
ModerationTrackingSchema.index({ cloudinaryId: 1 });
ModerationTrackingSchema.index({ userId: 1 });
ModerationTrackingSchema.index({ status: 1 });

module.exports = mongoose.model('ModerationTracking', ModerationTrackingSchema);