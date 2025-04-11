const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
    try {
        if (!req.headers.authorization || !req.headers.authorization.startsWith('Bearer ')) {
            console.error('Token manquant ou mal formé');
            return res.status(401).json({
                message: 'Token manquant ou mal formé',
                shouldRefresh: true // Ajouter ce flag
            });
        }

        const token = req.headers.authorization.split(' ')[1];
        console.log('Token reçu dans middleware:', token);

        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            console.log('Token décodé:', decoded);

            const user = await User.findById(decoded.id).select('-password');
            if (!user) {
                console.error('Utilisateur non trouvé pour le token décodé');
                return res.status(401).json({ message: 'Utilisateur non trouvé' });
            }

            req.user = user;
            next();
        } catch (error) {
            if (error.name === 'TokenExpiredError') {
                console.error('Token expiré:', error.message);
                return res.status(401).json({
                    message: 'Token expiré',
                    error: 'TOKEN_EXPIRED',
                    shouldRefresh: true // Important pour l'intercepteur axios
                });
            }
            console.error('Erreur de vérification du token:', error.message);
            throw error;
        }
    } catch (error) {
        console.error('Erreur dans le middleware protect:', error);
        return res.status(401).json({
            message: 'Token invalide',
            error: error.message,
            shouldRefresh: true
        });
    }
};

module.exports = protect;
