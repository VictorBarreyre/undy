// middleware/uploadMiddleware.js
const multer = require('multer');

// Configuration du storage
const storage = multer.memoryStorage();

// Configuration de Multer
const uploadMiddleware = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Seules les images sont autorisées'), false);
        }
    }
});

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
    handleMulterError
};