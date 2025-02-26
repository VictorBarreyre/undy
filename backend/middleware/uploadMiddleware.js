// middleware/uploadMiddleware.js
const multer = require('multer');

// Configuration du storage
const storage = multer.memoryStorage();

// Configuration de Multer pour les fichiers physiques
const uploadMiddleware = multer({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024 // Augmenter à 10MB
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Seules les images sont autorisées'), false);
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
        uploadMiddleware.single('image')(req, res, next);
    } else {
        // Pas d'image, on passe au middleware suivant
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

module.exports = {
    uploadMiddleware,
    handleBase64Upload,
    handleMulterError
};