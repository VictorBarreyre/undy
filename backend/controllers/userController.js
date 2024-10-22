// controllers/userController.js
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// Générer un token JWT
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: '30d',
    });
};

// Inscription d'un utilisateur
exports.registerUser = async (req, res) => {
    const { name, email, password } = req.body;

    console.log(req.body); // Ajout du log pour vérifier les données

    if (!name || !email || !password) {
        return res.status(400).json({ message: 'Tous les champs sont requis.' });
    }

    try {
        // Vérifier si l'utilisateur existe déjà
        const userExists = await User.findOne({ email });
        if (userExists) {
            return res.status(400).json({ message: 'Utilisateur déjà enregistré' });
        }

        // Créer un nouvel utilisateur
        const user = await User.create({
            name,
            email,
            password, // Le mot de passe sera haché automatiquement par le modèle
        });

        res.status(201).json({
            _id: user._id,
            name: user.name,
            email: user.email,
            token: generateToken(user._id),
        });
    } catch (error) {
        res.status(500).json({ message: 'Erreur lors de l\'inscription' });
    }
};



exports.loginUser = async (req, res) => {
    const { email, password } = req.body;

    console.log('Données reçues :', req.body); // Vérifier les données reçues

    if (!email || !password) {
        return res.status(400).json({ message: 'Tous les champs sont requis.' });
    }

    try {
        // Vérifier si l'utilisateur existe
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(400).json({ message: 'Utilisateur non trouvé.' });
        }

        console.log('Utilisateur trouvé :', user);

        // Comparer les mots de passe
        const isMatch = await user.matchPassword(password);
        console.log('Le mot de passe est-il correct ?', isMatch);

        if (user && isMatch) {
            res.json({
                _id: user._id,
                name: user.name,
                email: user.email,
                token: generateToken(user._id),
            });
        } else {
            res.status(400).json({ message: 'Email ou mot de passe incorrect' });
        }
    } catch (error) {
        console.error('Erreur lors de la connexion :', error);
        res.status(500).json({ message: 'Erreur lors de la connexion' });
    }
};



// controllers/userController.js
exports.getUserProfile = async (req, res) => {
    try {
        const user = req.user; // L'utilisateur authentifié est attaché à la requête par le middleware "protect"
        res.json({
            _id: user._id,
            name: user.name,
            email: user.email,
        });
    } catch (error) {
        res.status(500).json({ message: 'Erreur lors de la récupération du profil utilisateur' });
    }
};

