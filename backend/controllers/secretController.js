const Secret = require('../models/Secret');
const User = require('../models/User'); // Assurez-vous que le chemin est correct
const mongoose = require('mongoose');


exports.createSecret = async (req, res) => {
    const { label, content, price, expiresIn = 7 } = req.body; // expiresIn en jours
 
    if (!label || !content || price == null) {
        return res.status(400).json({ message: 'Tous les champs sont requis.' });
    }
 
    try {
        const expiresAt = new Date(Date.now() + expiresIn * 24 * 60 * 60 * 1000);
        
        const secret = await Secret.create({
            label,
            content,
            price,
            user: req.user.id,
            expiresAt
        });
 
        const user = await User.findById(req.user.id).select('profilePicture');
        if (!user) return res.status(404).json({ message: "Utilisateur introuvable." });
 
        const secretWithUserPhoto = {
            ...secret.toObject(),
            user: {
                _id: user._id,
                profilePicture: user.profilePicture || '/uploads/default-profile.png',
            },
        };
 
        res.status(201).json(secretWithUserPhoto);
    } catch (error) {
        res.status(500).json({ message: 'Erreur serveur.', details: error.message });
    }
 };



exports.getAllSecrets = async (req, res) => {
    try {
        const { page = 1, limit = 10 } = req.query; // Paramètres de pagination
        const secrets = await Secret.find()
            .populate('user', 'name profilePicture') // Inclure `name` et `profilePicture`
            .limit(limit * 1)
            .skip((page - 1) * limit)
            .exec();
        res.status(200).json(secrets);
    } catch (error) {
        console.error('Erreur lors de la récupération des secrets:', error);
        res.status(500).json({ message: 'Erreur serveur.' });
    }
};

exports.purchaseSecret = async (req, res) => {
    try {
        const secret = await Secret.findById(req.params.id);

        if (!secret) {
            return res.status(404).json({ message: 'Secret introuvable.' });
        }

        // Vérifier si l'utilisateur a déjà acheté le secret
        if (secret.purchasedBy.includes(req.user.id)) {
            return res.status(400).json({ message: 'Vous avez déjà acheté ce secret.' });
        }

        // Ajouter la logique de paiement ici (ex : Stripe)

        // Ajouter l'utilisateur à la liste des acheteurs
        secret.purchasedBy.push(req.user.id);
        await secret.save();

        res.status(200).json({ message: 'Secret acheté avec succès.' });
    } catch (error) {
        res.status(500).json({ message: 'Erreur serveur.' });
    }
};

exports.getUserSecretsWithCount = async (req, res) => {
    try {
        const secrets = await Secret
            .find({ user: req.user.id })
            .select('label content price createdAt')
            .lean();
        
        return res.status(200).json({
            secrets,
            count: secrets.length
        });
    } catch (error) {
        console.error('Erreur getUserSecretsWithCount:', error);
        return res.status(500).json({ message: 'Erreur serveur.', secrets: [], count: 0 });
    }
};


