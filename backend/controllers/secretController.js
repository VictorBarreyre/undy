const Secret = require('../models/Secret');
const User = require('../models/User'); // Assurez-vous que le chemin est correct
const mongoose = require('mongoose');
const Conversation = require ('../models/Conversation')


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
        const { page = 1, limit = 10 } = req.query;
        const secrets = await Secret.find()
            .populate('user', 'name profilePicture')
            .select('label content price createdAt expiresAt user purchasedBy') // ajout de expiresAt
            .limit(limit * 1)
            .skip((page - 1) * limit)
            .exec();
        res.status(200).json(secrets);
    } catch (error) {
        console.error('Erreur détaillée:', error);
        res.status(500).json({ message: 'Erreur serveur.', error: error.message });
    }
};

exports.purchaseSecret = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const secret = await Secret.findById(req.params.id);

        if (!secret) {
            return res.status(404).json({ message: 'Secret introuvable.' });
        }

        // Vérifier si l'utilisateur a déjà acheté le secret
        if (secret.purchasedBy.includes(req.user.id)) {
            // Si déjà acheté, on récupère juste la conversation existante
            const conversation = await Conversation.findOne({ secret: secret._id });
            return res.status(200).json({ 
                message: 'Secret déjà acheté.',
                conversationId: conversation._id 
            });
        }

        // Ajouter la logique de paiement ici (ex : Stripe)
        // ...

        // Ajouter l'utilisateur à la liste des acheteurs
        secret.purchasedBy.push(req.user.id);
        await secret.save({ session });

        // Vérifier si une conversation existe déjà pour ce secret
        let conversation = await Conversation.findOne({ secret: secret._id });

        if (!conversation) {
            // Créer une nouvelle conversation si elle n'existe pas
            conversation = await Conversation.create([{
                secret: secret._id,
                participants: [secret.user, req.user.id], // Créateur + acheteur
                expiresAt: secret.expiresAt
            }], { session });
            conversation = conversation[0]; // car create retourne un tableau
        } else {
            // Ajouter le nouvel acheteur aux participants
            conversation.participants.push(req.user.id);
            await conversation.save({ session });
        }

        await session.commitTransaction();

        res.status(200).json({
            message: 'Secret acheté avec succès.',
            conversationId: conversation._id
        });
    } catch (error) {
        await session.abortTransaction();
        console.error('Erreur lors de l\'achat:', error);
        res.status(500).json({ message: 'Erreur serveur.', error: error.message });
    } finally {
        session.endSession();
    }
};

exports.getSecretConversation = async (req, res) => {
    try {
        const conversation = await Conversation.findOne({ 
            _id: req.params.secretId,
            participants: req.user.id 
        })
        .populate('participants', 'name profilePicture')
        .populate('messages.sender', 'name profilePicture')
        .select('participants messages secret expiresAt')
        .populate({
            path: 'secret',
            populate: {
                path: 'user',
                select: 'name profilePicture'
            },
            select: 'label content user'
        });

        console.log("Conversation trouvée:", JSON.stringify(conversation, null, 2)); // Debug

        if (!conversation) {
            return res.status(404).json({ message: 'Conversation introuvable.' });
        }

        res.status(200).json(conversation);
    } catch (error) {
        console.error('Erreur détaillée:', error);
        res.status(500).json({ message: 'Erreur serveur.', error: error.message });
    }
};

exports.getConversation = async (req, res) => {
    try {
        const conversation = await Conversation.findOne({ 
            _id: req.params.conversationId, // Use _id instead of conversationId
            participants: req.user.id 
        })
        .populate({
            path: 'messages.sender',
            select: 'name profilePicture'
        })
        .populate({
            path: 'secret',
            populate: {
                path: 'user',
                select: 'name profilePicture'
            }
        });

        if (!conversation) {
            return res.status(404).json({ message: 'Conversation introuvable.' });
        }

        console.log("Conversation messages:", conversation.messages);

        res.status(200).json({
            messages: conversation.messages,
            conversationId: conversation._id
        });
    } catch (error) {
        console.error('Erreur détaillée:', error);
        res.status(500).json({ message: 'Erreur serveur.', error: error.message });
    }
};


exports.addMessageToConversation = async (req, res) => {
    try {
        const { content } = req.body;
        const conversation = await Conversation.findOne({
            _id: req.params.conversationId,
            participants: req.user.id
        });

        if (!conversation) {
            return res.status(404).json({ message: 'Conversation introuvable.' });
        }

        conversation.messages.push({
            sender: req.user.id,
            content
        });

        await conversation.save();
        res.status(201).json(conversation.messages[conversation.messages.length - 1]);
    } catch (error) {
        res.status(500).json({ message: 'Erreur serveur.', error: error.message });
    }
};

exports.getUserConversations = async (req, res) => {
    try {
        const conversations = await Conversation.find({
            participants: req.user.id
        })
        .populate('participants', 'name profilePicture')
        .populate({
            path: 'secret',
            select: 'label content user', // Assurez-vous d'inclure user dans select
            model: 'Secret',
            populate: {
                path: 'user', // Faites référence au champ user du modèle Secret
                model: 'User',
                select: 'name profilePicture'
            }
        })
        .sort({ updatedAt: -1 });

        console.log('Conversations avec données complètes:', JSON.stringify(conversations, null, 2));

        res.status(200).json(conversations);
    } catch (error) {
        console.error('Erreur détaillée:', error);
        res.status(500).json({ message: 'Erreur serveur.', error: error.message });
    }
};

exports.getUserSecretsWithCount = async (req, res) => {
    try {
        const secrets = await Secret
            .find({ user: req.user.id }) // changement de _id à id
            .select('label content price createdAt expiresAt') // ajout de expiresAt
            .lean();
        
        return res.status(200).json({
            secrets,
            count: secrets.length
        });
    } catch (error) {
        console.error('Erreur détaillée:', error);
        return res.status(500).json({ message: 'Erreur serveur.', error: error.message });
    }
};
