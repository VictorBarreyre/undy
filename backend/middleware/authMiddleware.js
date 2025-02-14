const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
    try {
        if (!req.headers.authorization?.startsWith('Bearer')) {
            return res.status(401).json({ message: 'Token manquant' });
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
                // Vérifier si un refresh token est présent
                const refreshToken = req.headers['x-refresh-token'];
                if (!refreshToken) {
                    return res.status(401).json({
                        message: 'Token expiré et pas de refresh token',
                        error: 'TOKEN_EXPIRED'
                    });
                }

                try {
                    // Vérifier le refresh token
                    const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
                    const user = await User.findById(decoded.id).select('-password');

                    if (!user) {
                        return res.status(401).json({ message: 'Utilisateur non trouvé' });
                    }

                    // Générer un nouveau token
                    const newAccessToken = jwt.sign(
                        { id: user._id },
                        process.env.JWT_SECRET,
                        { expiresIn: '1h' }
                    );

                    // Ajouter le nouveau token à la réponse
                    res.setHeader('Authorization', `Bearer ${newAccessToken}`);
                    req.user = user;
                    next();
                } catch (refreshError) {
                    return res.status(401).json({
                        message: 'Refresh token invalide',
                        error: 'REFRESH_TOKEN_INVALID'
                    });
                }
            } else {
                throw error;
            }
        }
    } catch (error) {
        console.error('Erreur dans le middleware protect:', error);
        return res.status(401).json({
            message: 'Token invalide',
            error: error.message
        });
    }
};

module.exports = protect;