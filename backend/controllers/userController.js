const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const path = require('path'); // Ajoutez cette ligne en haut du fichier
const fs = require('fs');



// Générer un token JWT
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: '30d',
    });
};

exports.registerUser = async (req, res) => {
    let { name, email, password, profilePicture, birthdate, phone, notifs, contacts, subscriptions } = req.body;

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

        const user = await User.create({
            name,
            email,
            password,
            profilePicture: profilePicture || undefined,
            birthdate,
            phone,
            notifs,
            contacts,
            subscriptions,
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
            profilePicture: user.profilePicture ? `${baseUrl}${user.profilePicture}` : null,
            birthdate: user.birthdate,
            phone: user.phone,
            notifs: user.notifs,
            contacts: user.contacts,
            subscriptions: user.subscriptions,
        });
    } catch (error) {
        console.error('Erreur lors de la récupération du profil utilisateur :', error);
        res.status(500).json({ message: 'Erreur lors de la récupération du profil utilisateur' });
    }
};

exports.getUserById = async (req, res) => {
    try {
        const userId = req.params.id;
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ error: 'Utilisateur non trouvé' });
        }
        const userData = {
            id: user._id,
            name: user.name,
            email: user.email,
            profilePicture: user.profilePicture,
            // Autres propriétés utilisateur
        };
        res.status(200).json(userData);
    } catch (error) {
        console.error('Erreur lors de la récupération des données de l\'utilisateur :', error);
        res.status(500).json({ error: 'Erreur interne du serveur' });
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
            user.profilePicture = req.body.profilePicture || user.profilePicture;
            user.birthdate = req.body.birthdate || user.birthdate;
            user.phone = req.body.phone || user.phone;
            user.notifs = req.body.notifs !== undefined ? req.body.notifs : user.notifs;
            user.contacts = req.body.contacts !== undefined ? req.body.contacts : user.contacts;
            user.subscriptions = req.body.subscriptions !== undefined ? req.body.subscriptions : user.subscriptions;

            const updatedUser = await user.save();

            res.json({
                _id: updatedUser._id,
                name: updatedUser.name,
                email: updatedUser.email,
                profilePicture: updatedUser.profilePicture,
                birthdate: updatedUser.birthdate,
                phone: updatedUser.phone,
                notifs: updatedUser.notifs,
                contacts: updatedUser.contacts,
                subscriptions: updatedUser.subscriptions,
                token: generateToken(updatedUser._id),
            });
        } else {
            res.status(404).json({ message: 'Utilisateur non trouvé' });
        }
    } catch (error) {
        console.error('Erreur lors de la mise à jour du profil :', error);
        res.status(500).json({ message: 'Erreur lors de la mise à jour du profil' });
    }
};

const UPLOAD_PATH = path.join(__dirname, '..', 'uploads');

exports.uploadProfilePicture = async (req, res) => {
    try {
        console.log('Début upload profile picture');
        console.log('Fichier reçu:', req.file);
        
        const user = req.user;

        if (!req.file) {
            console.log('Pas de fichier');
            return res.status(400).json({ message: 'Aucun fichier envoyé.' });
        }

        if (!req.file.buffer) {
            console.log('Pas de buffer');
            return res.status(400).json({ message: 'Erreur lors de la lecture du fichier.' });
        }

        // Convertir l'image en base64
        const base64Image = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
        
        // Sauvegarder dans la base de données
        user.profilePicture = base64Image;
        await user.save();

        res.status(200).json({
            message: 'Photo de profil mise à jour avec succès.',
            profilePicture: base64Image
        });

    } catch (error) {
        console.error('Erreur détaillée:', error);
        res.status(500).json({ 
            message: 'Erreur lors de la mise à jour de la photo de profil.',
            error: error.message 
        });
    }
};


exports.downloadUserData = async (req, res) => {
    try {
        const userId = req.user.id;
        // Récupérer les données de l'utilisateur depuis la base de données
        const userData = await User.findById(userId)
            .select('-password'); // Exclure le mot de passe des données

        if (!userData) {
            return res.status(404).json({ message: "Utilisateur non trouvé" });
        }

        // Convertir les données en format JSON
        const dataStr = JSON.stringify(userData, null, 2);

        // Configuration de la réponse
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', 'attachment; filename=user_data.json');

        // Envoyer les données
        res.send(dataStr);

    } catch (error) {
        console.error('Erreur dans downloadUserData:', error);
        res.status(500).json({ message: "Erreur lors du téléchargement des données" });
    }
};


exports.clearUserData = async (req, res) => {
    try {
        const userId = req.user.id;
        
        // Trouver l'utilisateur et réinitialiser les données non essentielles
        const updatedUser = await User.findByIdAndUpdate(
            userId,
            {
                $set: {
                    // Réinitialiser les champs que vous voulez effacer
                    phoneNumber: '',
                    birthdate: null,
                    income: null,
                    bank: '',
                    notifs: false,
                    contacts: false,
                    abonnements: [],
                    // Ne pas réinitialiser email et password
                }
            },
            { new: true }
        );

        if (!updatedUser) {
            return res.status(404).json({ message: "Utilisateur non trouvé" });
        }

        res.json({ message: "Données utilisateur effacées avec succès" });
    } catch (error) {
        console.error('Erreur dans clearUserData:', error);
        res.status(500).json({ message: "Erreur lors de l'effacement des données" });
    }
};

// Nouvelle fonction pour supprimer le compte de l'utilisateur
exports.deleteUserAccount = async (req, res) => {
    try {
        const user = req.user; // L'utilisateur authentifié est attaché à la requête par le middleware "protect"

        // Supprimer le compte de l'utilisateur
        await User.findByIdAndDelete(user._id);

        // Supprimer les données de l'utilisateur
        const dataPath = path.join(__dirname, '..', 'data', `${user._id}.json`);
        if (fs.existsSync(dataPath)) {
            fs.unlinkSync(dataPath);
        }

        res.json({ message: 'Compte de l\'utilisateur supprimé avec succès.' });
    } catch (error) {
        console.error('Erreur lors de la suppression du compte de l\'utilisateur :', error);
        res.status(500).json({ message: 'Erreur lors de la suppression du compte de l\'utilisateur' });
    }
};