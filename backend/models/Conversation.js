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
  // Champs pour les messages audio
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
  // NOUVEAUX CHAMPS POUR LES VIDÉOS
  video: {
    type: String,  // URL de la vidéo
    required: function() {
      // La vidéo est requise uniquement pour les messages vidéo
      return this.messageType === 'video';
    }
  },
  videoUrl: {
    type: String,  // Alias pour compatibilité front-end
    get: function() {
      return this.video;
    },
    set: function(value) {
      this.video = value;
    }
  },
  thumbnailUrl: {
    type: String,  // URL de la miniature de la vidéo (optionnel)
    default: null
  },
  duration: {
    type: Number,  // Durée en secondes pour les vidéos
    default: 0
  },
  videoDuration: {
    type: String,  // Durée au format "00:00" pour compatibilité
    get: function() {
      if (this.duration) {
        const minutes = Math.floor(this.duration / 60);
        const seconds = Math.floor(this.duration % 60);
        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
      }
      return "00:00";
    }
  },
  messageType: {
    type: String,
    enum: ['text', 'image', 'mixed', 'audio', 'video'], // AJOUT de 'video'
    default: 'text'
  }
  // Si besoin d'autres infos sender utiles
  // senderPicture: String,
}, { 
  timestamps: true,
  toJSON: { getters: true },
  toObject: { getters: true }
});

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