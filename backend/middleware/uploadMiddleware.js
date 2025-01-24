const multer = require('multer');
const path = require('path');

// Configuration de Multer
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, '../../uploads')); // Répertoire où les fichiers seront stockés
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`); // Nom unique pour chaque fichier
    },
});

// Filtrer uniquement les images
const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
        cb(null, true); // Accepter uniquement les fichiers d'image
    } else {
        cb(new Error('Seules les images sont autorisées'), false);
    }
};

const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: 1024 * 1024 * 5 }, // Limite de 5 Mo pour chaque fichier
});

module.exports = upload;
