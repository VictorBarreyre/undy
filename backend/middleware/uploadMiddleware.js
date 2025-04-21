// middleware/uploadMiddleware.js
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
      // Pour les images
      cb(null, true);
    } else if (file.mimetype.startsWith('video/')) {
      // Pour les vidéos
      cb(null, true);
    } else if (file.mimetype.startsWith('audio/')) {
      // Pour l'audio
      cb(null, true);
    } else {
      // Rejeter les autres types
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

// Configuration spécifique pour l'audio
const audioUploadMiddleware = multer({
  storage: storage,
  limits: {
    fileSize: 25 * 1024 * 1024 // 25MB max pour l'audio
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('audio/')) {
      cb(null, true);
    } else {
      cb(new Error('Seuls les fichiers audio sont autorisés'), false);
    }
  }
});

// Configuration spécifique pour les vidéos
const videoUploadMiddleware = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB max pour les vidéos
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('Seuls les fichiers vidéo sont autorisés'), false);
    }
  }
});

// Middleware pour gérer les images en Base64
const handleBase64Upload = (req, res, next) => {
  // Si la requête contient une image en Base64
  if (req.body && req.body.image && typeof req.body.image === 'string' && req.body.image.startsWith('data:image/')) {
    // On laisse passer, car ce n'est pas traité par multer
    next();
  } else if (req.body && req.body.image) {
    // Si c'est un autre format d'image, on le traite avec multer
    imageUploadMiddleware.single('image')(req, res, next);
  } else {
    // Pas d'image, on passe au middleware suivant
    next();
  }
};

// Middleware pour gérer l'audio en Base64
const handleBase64AudioUpload = (req, res, next) => {
  // Si la requête contient un audio en Base64
  if (req.body && req.body.audio && typeof req.body.audio === 'string' && req.body.audio.startsWith('data:audio/')) {
    // On laisse passer, car ce n'est pas traité par multer
    next();
  } else if (req.body && req.body.audio) {
    // Si c'est un autre format d'audio, on le traite avec multer
    audioUploadMiddleware.single('audio')(req, res, next);
  } else {
    // Pas d'audio, on passe au middleware suivant
    next();
  }
};

// Middleware pour gérer les vidéos en Base64
const handleBase64VideoUpload = (req, res, next) => {
  // Si la requête contient une vidéo en Base64
  if (req.body && req.body.video && typeof req.body.video === 'string' && req.body.video.startsWith('data:video/')) {
    // On laisse passer, car ce n'est pas traité par multer
    next();
  } else if (req.body && req.body.video) {
    // Si c'est un autre format de vidéo, on le traite avec multer
    videoUploadMiddleware.single('video')(req, res, next);
  } else {
    // Pas de vidéo, on passe au middleware suivant
    next();
  }
};

// Middleware de gestion d'erreur pour Multer
const handleMulterError = (error, req, res, next) => {
  if (error) {
    console.error('Multer error:', error);
    if (error instanceof multer.MulterError) {
      return res.status(400).json({
        message: 'Erreur lors du téléchargement',
        error: error.message
      });
    }
    return res.status(500).json({
      message: 'Erreur serveur lors du téléchargement',
      error: error.message
    });
  }
  next();
};

// Nettoyer les fichiers temporaires après utilisation
const cleanupTempFiles = (req, res, next) => {
  // Si un fichier a été uploadé via multer
  if (req.file && req.file.path) {
    // Supprimer le fichier après le traitement de la requête
    res.on('finish', () => {
      fs.unlink(req.file.path, (err) => {
        if (err) console.error('Erreur lors de la suppression du fichier temporaire:', err);
      });
    });
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