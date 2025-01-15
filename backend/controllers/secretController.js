const Secret = require('../models/Secret');
const mongoose = require('mongoose');


exports.createSecret = async (req, res) => {
    const { label, content, price } = req.body;

    if (!label || !content || price == null) {
        return res.status(400).json({ message: 'Tous les champs sont requis.' });
    }

    try {
        const secret = await Secret.create({
            label,
            content,
            price,
            user: req.user.id, // ID de l'utilisateur connecté
        });

        // Récupérer l'utilisateur associé
        const user = await User.findById(req.user.id).select('profilePicture');

        // Inclure la photo de profil de l'utilisateur dans la réponse
        const secretWithUserPhoto = {
            ...secret.toObject(),
            user: {
                _id: user._id,
                profilePicture: user.profilePicture,
            },
        };

        res.status(201).json(secretWithUserPhoto);
    } catch (error) {
        res.status(500).json({ message: 'Erreur serveur.' });
    }
};


exports.getAllSecrets = async (req, res) => {
    try {
        const { page = 1, limit = 10 } = req.query; // Paramètres de pagination
        const secrets = await Secret.find()
            .populate('user', 'name')
            .limit(limit * 1)
            .skip((page - 1) * limit)
            .exec();
        res.status(200).json(secrets);
    } catch (error) {
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
            .find({ user: req.user._id })
            .select('label content price createdAt')
            .lean();
        
        return res.status(200).json({
            secrets: secrets,
            count: secrets.length
        });
    } catch (error) {
        console.error('Erreur getUserSecretsWithCount:', error);
        return res.status(500).json({ message: 'Erreur serveur.', secrets: [], count: 0 });
    }
};



