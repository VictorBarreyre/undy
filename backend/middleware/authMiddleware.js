// middleware/authMiddleware.js
const jwt = require('jsonwebtoken');
const User = require('../models/User'); // Assurez-vous d'importer le modèle User

const protect = async (req, res, next) => {
    try {
        // Vérifier si le header Authorization existe et commence par Bearer
        if (!req.headers.authorization?.startsWith('Bearer')) {
            return res.status(401).json({ message: 'Token manquant' });
        }

        // Extraire le token
        const token = req.headers.authorization.split(' ')[1];
        console.log('Token reçu dans middleware:', token);

        // Vérifier le token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        console.log('Token décodé:', decoded);

        // Trouver l'utilisateur
        const user = await User.findById(decoded.id).select('-password');
        if (!user) {
            return res.status(401).json({ message: 'Utilisateur non trouvé' });
        }

        // Attacher l'utilisateur à la requête
        req.user = user;
        next();
    } catch (error) {
        console.error('Erreur dans le middleware protect:', error);
        return res.status(401).json({ 
            message: 'Token invalide',
            error: error.message 
        });
    }
};

module.exports = protect;