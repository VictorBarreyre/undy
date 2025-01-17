const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// Générer un token JWT
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: '30d',
    });
};

exports.registerUser = async (req, res) => {
    let { name, email, password, profilePicture } = req.body; // Inclure profilePicture

    console.log(req.body); // Vérifier les données reçues

    if (!name || !email || !password) {
        return res.status(400).json({ message: 'Tous les champs obligatoires doivent être remplis.' });
    }

    try {
        // Normaliser l'email
        email = email.trim().toLowerCase();

        // Vérifier si l'utilisateur existe déjà
        const userExists = await User.findOne({ email });
        if (userExists) {
            return res.status(400).json({ message: 'Utilisateur déjà enregistré' });
        }

        // Créer un nouvel utilisateur
        const user = await User.create({
            name,
            email,
            password,
            profilePicture: profilePicture || undefined, // Utiliser la valeur par défaut si aucune photo n'est fournie
        });

        res.status(201).json({
            _id: user._id,
            name: user.name,
            email: user.email,
            profilePicture: user.profilePicture,
            token: generateToken(user._id),
        });
    } catch (error) {
        console.error('Erreur lors de l\'inscription :', error);
        res.status(500).json({ message: 'Erreur lors de l\'inscription' });
    }
};

exports.loginUser = async (req, res) => {
    let { email, password } = req.body;

    console.log('Données reçues :', req.body); // Vérifier les données reçues

    if (!email || !password) {
        return res.status(400).json({ message: 'Tous les champs sont requis.' });
    }

    try {
        // Normaliser l'email en minuscules
        email = email.trim().toLowerCase();

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

exports.getUserProfile = async (req, res) => {
    try {
        const user = req.user; // L'utilisateur authentifié est attaché à la requête par le middleware "protect"
        const baseUrl = `${req.protocol}://${req.get('host')}`; // URL de base du serveur
        res.json({
            _id: user._id,
            name: user.name,
            email: user.email,
            profilePicture: user.profilePicture
                ? `${baseUrl}${user.profilePicture}`
                : null, // Ajoute l'URL de base si la photo existe
        });
    } catch (error) {
        console.error('Erreur lors de la récupération du profil utilisateur :', error);
        res.status(500).json({ message: 'Erreur lors de la récupération du profil utilisateur' });
    }
};

exports.updateUserProfile = async (req, res) => {
    try {
        // Récupérer l'utilisateur connecté
        const user = req.user;

        // Mettre à jour les informations de profil
        if (user) {
            user.name = req.body.name || user.name;
            user.email = req.body.email ? req.body.email.trim().toLowerCase() : user.email;
            user.profilePicture = req.body.profilePicture || user.profilePicture; // Met à jour la photo de profil si fournie

            // Sauvegarder les modifications dans la base de données
            const updatedUser = await user.save();

            res.json({
                _id: updatedUser._id,
                name: updatedUser.name,
                email: updatedUser.email,
                profilePicture: updatedUser.profilePicture, // Inclure la photo de profil dans la réponse
                token: generateToken(updatedUser._id), // Renouveler le token si besoin
            });
        } else {
            res.status(404).json({ message: 'Utilisateur non trouvé' });
        }
    } catch (error) {
        console.error('Erreur lors de la mise à jour du profil :', error);
        res.status(500).json({ message: 'Erreur lors de la mise à jour du profil' });
    }
};

exports.uploadProfilePicture = async (req, res) => {
    try {
        const user = req.user; // Récupérer l'utilisateur connecté (grâce au middleware "protect")

        if (!req.file) {
            return res.status(400).json({ message: 'Aucun fichier envoyé.' });
        }

        // Mettre à jour la photo de profil
        user.profilePicture = `/uploads/${req.file.filename}`;
        await user.save();

        res.status(200).json({
            message: 'Photo de profil mise à jour avec succès.',
            profilePicture: user.profilePicture,
        });
    } catch (error) {
        console.error('Erreur lors de la mise à jour de la photo de profil :', error);
        res.status(500).json({ message: 'Erreur lors de la mise à jour de la photo de profil.' });
    }
};
