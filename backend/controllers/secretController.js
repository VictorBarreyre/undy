const Secret = require('../models/Secret');

// @desc    Créer un secret
// @route   POST /api/secrets
// @access  Private
const createSecret = async (req, res) => {
    const { title, content, price } = req.body;

    if (!title || !content || price == null) {
        return res.status(400).json({ message: 'Tous les champs sont requis.' });
    }

    try {
        const secret = await Secret.create({
            title,
            content,
            price,
            user: req.user.id, // ID de l'utilisateur connecté
        });

        res.status(201).json(secret);
    } catch (error) {
        res.status(500).json({ message: 'Erreur serveur.' });
    }
};

// @desc    Afficher tous les secrets
// @route   GET /api/secrets
// @access  Public
const getAllSecrets = async (req, res) => {
    try {
        const secrets = await Secret.find().populate('user', 'name'); // Inclut le nom de l'utilisateur
        res.status(200).json(secrets);
    } catch (error) {
        res.status(500).json({ message: 'Erreur serveur.' });
    }
};

// @desc    Acheter un secret
// @route   POST /api/secrets/:id/purchase
// @access  Private
const purchaseSecret = async (req, res) => {
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

// @desc    Voir un secret acheté
// @route   GET /api/secrets/:id
// @access  Private
const getSecret = async (req, res) => {
    try {
        const secret = await Secret.findById(req.params.id);

        if (!secret) {
            return res.status(404).json({ message: 'Secret introuvable.' });
        }

        // Vérifier si l'utilisateur a accès au secret
        if (!secret.purchasedBy.includes(req.user.id) && secret.user.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Vous n\'avez pas accès à ce secret.' });
        }

        res.status(200).json(secret);
    } catch (error) {
        res.status(500).json({ message: 'Erreur serveur.' });
    }
};

module.exports = {
    createSecret,
    getAllSecrets,
    purchaseSecret,
    getSecret,
};
