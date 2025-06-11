// middleware/uploadMiddleware.js - Version corrigée
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// S'assurer que le dossier d'upload existe
const uploadDir = path.join(__dirname, '../uploads/temp');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configuration du storage pour les fichiers temporaires
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = file.mimetype.split('/')[1];
    cb(null, `${file.fieldname}-${uniqueSuffix}.${extension}`);
  }
});

// Configuration de Multer pour les différents types de médias
const uploadMiddleware = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB max
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else if (file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else if (file.mimetype.startsWith('audio/')) {
      cb(null, true);
    } else {
      cb(new Error('Type de fichier non supporté'), false);
    }
  }
});

// Configuration spécifique pour les images
const imageUploadMiddleware = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB max pour les images
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Seules les images sont autorisées'), false);
    }
  }
});

// Configuration spécifique pour l'audio - CORRECTION: Types MIME plus permissifs
const audioUploadMiddleware = multer({
  storage: storage,
  limits: {
    fileSize: 25 * 1024 * 1024 // 25MB max pour l'audio
  },
  fileFilter: (req, file, cb) => {
    console.log('🎵 Audio fileFilter - mimetype:', file.mimetype);
    console.log('🎵 Audio fileFilter - originalname:', file.originalname);
    
    // Types MIME acceptés pour l'audio
    const acceptedAudioTypes = [
      'audio/aac',
      'audio/mp4',
      'audio/mpeg',
      'audio/mp3',
      'audio/wav',
      'audio/x-wav',
      'audio/webm',
      'audio/ogg',
      'application/octet-stream' // Parfois React Native envoie ce type
    ];
    
    // Vérifier le type MIME ou l'extension
    const isAudioMime = file.mimetype.startsWith('audio/') || acceptedAudioTypes.includes(file.mimetype);
    const hasAudioExtension = /\.(aac|mp3|wav|mp4|m4a|ogg|webm)$/i.test(file.originalname);
    
    if (isAudioMime || hasAudioExtension) {
      console.log('✅ Fichier audio accepté');
      cb(null, true);
    } else {
      console.log('❌ Fichier audio rejeté:', file.mimetype);
      cb(new Error('Seuls les fichiers audio sont autorisés'), false);
    }
  }
});

// Configuration spécifique pour les vidéos
const videoUploadMiddleware = multer({
  storage: storage,
  limits: {
    fileSize: 100 * 1024 * 1024 // Augmenter à 100MB pour les vidéos
  },
  fileFilter: (req, file, cb) => {
    console.log('🎥 Video fileFilter - mimetype:', file.mimetype);
    console.log('🎥 Video fileFilter - originalname:', file.originalname);
    
    // Types MIME acceptés pour les vidéos
    const acceptedVideoTypes = [
      'video/mp4',
      'video/quicktime', // Pour les vidéos iPhone (.mov)
      'video/x-msvideo',
      'video/x-ms-wmv',
      'video/mpeg',
      'video/webm',
      'application/octet-stream' // Parfois React Native envoie ce type
    ];
    
    const isVideoMime = file.mimetype.startsWith('video/') || acceptedVideoTypes.includes(file.mimetype);
    const hasVideoExtension = /\.(mp4|mov|avi|wmv|mpg|mpeg|webm|m4v)$/i.test(file.originalname);
    
    if (isVideoMime || hasVideoExtension) {
      console.log('✅ Fichier vidéo accepté');
      cb(null, true);
    } else {
      console.log('❌ Fichier vidéo rejeté:', file.mimetype);
      cb(new Error('Seuls les fichiers vidéo sont autorisés'), false);
    }
  }
});

// Middleware pour gérer les images en Base64
const handleBase64Upload = (req, res, next) => {
  if (req.body && req.body.image && typeof req.body.image === 'string' && req.body.image.startsWith('data:image/')) {
    next();
  } else if (req.body && req.body.image) {
    imageUploadMiddleware.single('image')(req, res, next);
  } else {
    next();
  }
};

// Dans uploadMiddleware.js - Middleware simplifié pour base64
const handleBase64AudioUpload = (req, res, next) => {
  console.log('🎵 handleBase64AudioUpload - début');
  console.log('Content-Type:', req.headers['content-type']);
  console.log('Body keys:', Object.keys(req.body || {}));
  
  // Si c'est du JSON avec audio base64
  if (req.headers['content-type']?.includes('application/json') && 
      req.body && 
      req.body.audio && 
      typeof req.body.audio === 'string' && 
      req.body.audio.startsWith('data:audio/')) {
    console.log('📊 Détecté: Audio en base64');
    console.log('📊 Taille du base64:', req.body.audio.length);
    next();
  } 
  // Si c'est du FormData (fallback)
  else if (req.headers['content-type']?.includes('multipart/form-data')) {
    console.log('📁 Détecté: FormData - utilisation de multer');
    return audioUploadMiddleware.single('audio')(req, res, (err) => {
      if (err) {
        console.error('❌ Erreur multer audio:', err);
        return res.status(400).json({
          message: 'Erreur lors du traitement du fichier audio',
          error: err.message
        });
      }
      console.log('✅ Multer audio - traitement réussi');
      next();
    });
  }
  // Pas d'audio
  else {
    console.log('⚠️ Pas d\'audio détecté');
    return res.status(400).json({
      message: 'Aucun fichier audio fourni',
      details: {
        contentType: req.headers['content-type'],
        hasBody: !!req.body,
        bodyKeys: Object.keys(req.body || {})
      }
    });
  }
};


// Middleware pour gérer les vidéos en Base64
const handleBase64VideoUpload = (req, res, next) => {
  console.log('🎥 handleBase64VideoUpload - début');
  console.log('Content-Type:', req.headers['content-type']);
  console.log('Body keys:', Object.keys(req.body || {}));
  
  // Si c'est du JSON avec vidéo base64
  if (req.headers['content-type']?.includes('application/json') && 
      req.body && 
      req.body.video && 
      typeof req.body.video === 'string' && 
      req.body.video.startsWith('data:video/')) {
    console.log('📊 Détecté: Vidéo en base64');
    console.log('📊 Taille du base64:', req.body.video.length);
    next();
  } 
  // Si c'est du FormData
  else if (req.headers['content-type']?.includes('multipart/form-data')) {
    console.log('📁 Détecté: FormData - utilisation de multer');
    return videoUploadMiddleware.single('video')(req, res, (err) => {
      if (err) {
        console.error('❌ Erreur multer vidéo:', err);
        return res.status(400).json({
          message: 'Erreur lors du traitement du fichier vidéo',
          error: err.message
        });
      }
      console.log('✅ Multer vidéo - traitement réussi');
      if (req.file) {
        console.log('📁 Fichier vidéo reçu:', {
          originalname: req.file.originalname,
          mimetype: req.file.mimetype,
          size: req.file.size
        });
      }
      next();
    });
  }
  // Pas de vidéo
  else {
    console.log('⚠️ Pas de vidéo détectée');
    console.log('Debug - req.body:', JSON.stringify(req.body).substring(0, 200));
    return res.status(400).json({
      message: 'Aucun fichier vidéo fourni',
      details: {
        contentType: req.headers['content-type'],
        hasBody: !!req.body,
        bodyKeys: Object.keys(req.body || {}),
        hasVideo: !!req.body?.video,
        videoType: req.body?.video ? typeof req.body.video : 'undefined'
      }
    });
  }
};
// Middleware de gestion d'erreur pour Multer - AMÉLIORÉ
const handleMulterError = (error, req, res, next) => {
  if (error) {
    console.error('❌ Multer error:', error);
    console.error('Error type:', error.constructor.name);
    
    if (error instanceof multer.MulterError) {
      let message = 'Erreur lors du téléchargement';
      
      switch (error.code) {
        case 'LIMIT_FILE_SIZE':
          message = 'Fichier trop volumineux';
          break;
        case 'LIMIT_FILE_COUNT':
          message = 'Trop de fichiers';
          break;
        case 'LIMIT_UNEXPECTED_FILE':
          message = 'Champ de fichier inattendu';
          break;
        default:
          message = error.message;
      }
      
      return res.status(400).json({
        message,
        error: error.message,
        code: error.code
      });
    }
    
    // Autres erreurs
    return res.status(500).json({
      message: 'Erreur serveur lors du téléchargement',
      error: error.message
    });
  }
  next();
};

// Nettoyer les fichiers temporaires après utilisation - AMÉLIORÉ
const cleanupTempFiles = (req, res, next) => {
  if (req.file && req.file.path) {
    console.log('🗑️ Programmation suppression fichier temp:', req.file.path);
    
    // Supprimer le fichier après le traitement de la requête
    const originalSend = res.send;
    const originalJson = res.json;
    
    const cleanup = () => {
      fs.unlink(req.file.path, (err) => {
        if (err) {
          console.error('⚠️ Erreur lors de la suppression du fichier temporaire:', err);
        } else {
          console.log('✅ Fichier temporaire supprimé:', req.file.path);
        }
      });
    };
    
    // Override des méthodes de réponse pour déclencher le nettoyage
    res.send = function(...args) {
      cleanup();
      return originalSend.apply(this, args);
    };
    
    res.json = function(...args) {
      cleanup();
      return originalJson.apply(this, args);
    };
    
    // Fallback avec event listener
    res.on('finish', cleanup);
    res.on('close', cleanup);
  }
  next();
};

module.exports = {
  uploadMiddleware,
  imageUploadMiddleware,
  audioUploadMiddleware,
  videoUploadMiddleware,
  handleBase64Upload,
  handleBase64AudioUpload,
  handleBase64VideoUpload,
  handleMulterError,
  cleanupTempFiles
};