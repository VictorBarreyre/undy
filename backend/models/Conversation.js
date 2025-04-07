// models/Conversation.js
const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    required: function() {
      // Le contenu est requis uniquement pour les messages texte
      return this.messageType === 'text' || this.messageType === 'mixed' || !this.messageType;
    },
    default: ""
  },
  // Pour faciliter le front
  senderName: {
    type: String,
    required: true
  }, 
  image: {
    type: String,  // URL de l'image
    required: function() {
      // L'image est requise uniquement pour les messages image
      return this.messageType === 'image' || this.messageType === 'mixed';
    }
  },
  // Nouveaux champs pour les messages audio
  audio: {
    type: String,  // URL de l'audio
    required: function() {
      // L'audio est requis uniquement pour les messages audio
      return this.messageType === 'audio';
    }
  },
  audioDuration: {
    type: String,  // Durée au format "00:00"
    default: "00:00"
  },
  messageType: {
    type: String,
    enum: ['text', 'image', 'mixed', 'audio'], // Ajout de 'audio'
    default: 'text'
  }
  // Si besoin d'autres infos sender utiles
  // senderPicture: String,
}, { timestamps: true });

// Le reste du schéma reste inchangé
const ConversationSchema = new mongoose.Schema({
  secret: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Secret',
    required: true,
  },
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
  messages: [MessageSchema],
  // On lie l'expiration de la conversation à celle du secret
  expiresAt: {
    type: Date,
    required: true,
  },   
  unreadCount: {
    type: Map,  // Pour suivre les messages non lus par participant
    of: Number,
    default: {}
  }
}, { timestamps: true });

ConversationSchema.methods.markAsRead = function(userId) {
  const userIdStr = userId.toString();
  this.unreadCount.set(userIdStr, 0);
  return this.save();
};

// Index TTL pour la suppression automatique
ConversationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('Conversation', ConversationSchema);