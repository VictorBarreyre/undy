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
    required: true
  },
  // Pour faciliter le front
  senderName: {
    type: String,
    required: true
  },
  // Si besoin d'autres infos sender utiles
  // senderPicture: String,
}, { timestamps: true });

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

// Index TTL pour la suppression automatique
ConversationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('Conversation', ConversationSchema);