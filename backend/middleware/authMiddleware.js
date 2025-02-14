const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
    try {
        if (!req.headers.authorization?.startsWith('Bearer')) {
            return res.status(401).json({ 
                message: 'Token manquant',
                shouldRefresh: true // Ajouter ce flag
            });
        }

        const token = req.headers.authorization.split(' ')[1];
        console.log('Token reçu dans middleware:', token);

        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const user = await User.findById(decoded.id).select('-password');

            if (!user) {
                return res.status(401).json({ message: 'Utilisateur non trouvé' });
            }

            req.user = user;
            next();
        } catch (error) {
            if (error.name === 'TokenExpiredError') {
                return res.status(401).json({
                    message: 'Token expiré',
                    error: 'TOKEN_EXPIRED',
                    shouldRefresh: true // Important pour l'intercepteur axios
                });
            }
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