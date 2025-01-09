const Secret = require('../models/Secret');


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

        res.status(201).json(secret);
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


exports.getSecret = async (req, res) => {
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

exports.getSecretsCountByUser = async (req, res) => {
    try {
        // Étape 1 : Récupérer tous les secrets créés par cet utilisateur
        const secrets = await Secret.find({ user: req.user.id });

        // Étape 2 : Calculer le nombre en mémoire
        const count = secrets.length;

        // Étape 3 : Retourner le résultat
        res.status(200).json({ count });
    } catch (error) {
        console.error('Erreur lors du comptage des secrets:', error);
        res.status(500).json({ message: 'Erreur serveur.' });
    }
};

