const multer = require('multer');

const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB
    },
    fileFilter: (req, file, cb) => {
        // Vérifier le type MIME
        if (!file.mimetype.startsWith('image/')) {
            return cb(new Error('Seules les images sont autorisées.'), false);
        }

        // Autoriser le fichier
        cb(null, true);
    }
}).single('profilePicture');


module.exports = upload;