const Secret = require('../models/Secret');
const User = require('../models/User'); // Assurez-vous que le chemin est correct
const mongoose = require('mongoose');
const Conversation = require('../models/Conversation')
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Payment = require('../models/Payment');


exports.createSecret = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { label, content, price, expiresIn = 7 } = req.body;

        // Validation des champs requis
        if (!label || !content || price == null) {
            return res.status(400).json({ message: 'Tous les champs sont requis.' });
        }

        // Trouver l'utilisateur avec les champs Stripe
        const user = await User.findById(req.user.id).select('email stripeAccountId stripeAccountStatus stripeOnboardingComplete');
        if (!user) {
            return res.status(404).json({ message: "Utilisateur introuvable." });
        }

        // Définir dynamiquement les URLs de retour
        const baseReturnUrl = process.env.FRONTEND_URL || 'hushy://profile';
        const refreshUrl = `${baseReturnUrl}/stripe/refresh`;
        const returnUrl = `${baseReturnUrl}/stripe/return`;

        // Si l'utilisateur n'a pas de compte Stripe, en créer un
        if (!user.stripeAccountId) {
            try {
                // Créer le compte Stripe Connect
                const account = await stripe.accounts.create({
                    type: 'express',
                    country: 'FR',
                    email: user.email,
                    capabilities: {
                        card_payments: { requested: true },
                        transfers: { requested: true },
                    },
                    business_type: 'individual',
                    business_profile: {
                        mcc: '5734', // Code pour services digitaux
                        url: 'https://hushy.app'
                    }
                });

                // Créer le lien d'onboarding
                const accountLink = await stripe.accountLinks.create({
                    account: account.id,
                    refresh_url: refreshUrl,
                    return_url: returnUrl,
                    type: 'account_onboarding',
                });

                // Mettre à jour l'utilisateur avec les informations Stripe
                user.stripeAccountId = account.id;
                user.stripeAccountStatus = 'pending';
                user.stripeOnboardingComplete = false;
                user.lastStripeOnboardingUrl = accountLink.url;
                await user.save({ session });

                // Créer le secret
                const expiresAt = new Date(Date.now() + expiresIn * 24 * 60 * 60 * 1000);
                const secret = await Secret.create([{
                    label,
                    content,
                    price,
                    user: req.user.id,
                    expiresAt,
                    status: 'pending' // Le secret est en attente de la configuration Stripe
                }], { session });

                await session.commitTransaction();

                // Retourner les informations nécessaires au frontend
                return res.status(201).json({
                    message: 'Secret créé. Configuration du compte de paiement requise.',
                    secret: secret[0],
                    stripeOnboardingUrl: accountLink.url,
                    stripeStatus: 'pending'
                });
            } catch (error) {
                await session.abortTransaction();
                console.error('Erreur création compte Stripe:', error);
                return res.status(500).json({
                    message: 'Erreur lors de la création du compte de paiement',
                    error: error.message
                });
            }
        }

        // Vérifier si l'onboarding est complet pour les utilisateurs ayant déjà un compte Stripe
        if (!user.stripeOnboardingComplete || user.stripeAccountStatus !== 'active') {
            const accountLink = await stripe.accountLinks.create({
                account: user.stripeAccountId,
                refresh_url: refreshUrl,
                return_url: returnUrl,
                type: 'account_onboarding',
            });

            // Créer le secret en statut pending
            const expiresAt = new Date(Date.now() + expiresIn * 24 * 60 * 60 * 1000);
            const secret = await Secret.create([{
                label,
                content,
                price,
                user: req.user.id,
                expiresAt,
                status: 'pending'
            }], { session });

            await session.commitTransaction();

            return res.status(201).json({
                message: 'Secret créé. Veuillez compléter la configuration de votre compte.',
                secret: secret[0],
                stripeOnboardingUrl: accountLink.url,
                stripeStatus: user.stripeAccountStatus
            });
        }

        // Si tout est configuré, créer le secret normalement
        const expiresAt = new Date(Date.now() + expiresIn * 24 * 60 * 60 * 1000);
        const secret = await Secret.create([{
            label,
            content,
            price,
            user: req.user.id,
            expiresAt,
            status: 'active'
        }], { session });

        await session.commitTransaction();

        res.status(201).json({
            message: 'Secret créé avec succès',
            secret: secret[0],
            stripeStatus: 'active'
        });

    } catch (error) {
        await session.abortTransaction();
        console.error('Erreur création secret:', error);
        res.status(500).json({
            message: 'Erreur serveur.',
            error: error.message
        });
    } finally {
        session.endSession();
    }
};


// Ajouter une route pour gérer le rafraîchissement de l'onboarding si nécessaire
exports.refreshStripeOnboarding = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('+lastStripeOnboardingUrl stripeAccountId stripeAccountStatus');

        if (!user.stripeAccountId) {
            return res.status(400).json({
                status: 'no_account',
                message: 'Aucun compte Stripe associé',
                needsRegistration: true
            });
        }

        // Vérifier le statut du compte Stripe
        const account = await stripe.accounts.retrieve(user.stripeAccountId);

        // Détails du statut du compte
        const accountStatus = {
            charges_enabled: account.charges_enabled,
            payouts_enabled: account.payouts_enabled,
            details_submitted: account.details_submitted
        };

        // Si le compte est complètement configuré
        if (account.charges_enabled && account.payouts_enabled) {
            user.stripeAccountStatus = 'active';
            user.stripeOnboardingComplete = true;
            await user.save();

            return res.status(200).json({
                status: 'active',
                message: 'Compte Stripe complètement configuré',
                accountStatus
            });
        }

        // Créer un nouveau lien d'onboarding
        const accountLink = await stripe.accountLinks.create({
            account: user.stripeAccountId,
            refresh_url: `${baseReturnUrl}/stripe/refresh`,
            return_url: `${baseReturnUrl}/stripe/return`,
            type: 'account_onboarding',
        });

        // Mettre à jour l'URL d'onboarding
        user.lastStripeOnboardingUrl = accountLink.url;
        user.stripeAccountStatus = 'pending';
        await user.save();

        return res.status(201).json({
            status: 'pending',
            message: 'Configuration du compte Stripe en cours',
            url: accountLink.url,
            accountStatus
        });

    } catch (error) {
        console.error('Erreur refresh onboarding:', error);
        res.status(500).json({
            status: 'error',
            message: error.message,
            stripeStatus: 'error'
        });
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


exports.getUnpurchasedSecrets = async (req, res) => {
    try {
        const { page = 1, limit = 10 } = req.query;
        const userId = req.user.id;

        const secrets = await Secret.find({
            purchasedBy: { $nin: [userId] }, // Ne pas inclure les secrets déjà achetés
            user: { $ne: userId }, // Ne pas inclure les secrets créés par l'utilisateur
            expiresAt: { $gt: new Date() } // Ne pas inclure les secrets expirés
        })
            .populate('user', 'name profilePicture')
            .select('label content price createdAt expiresAt user purchasedBy')
            .limit(limit * 1)
            .skip((page - 1) * limit)
            .sort({ createdAt: -1 }) // Les plus récents d'abord
            .exec();

        const total = await Secret.countDocuments({
            purchasedBy: { $nin: [userId] },
            user: { $ne: userId },
            expiresAt: { $gt: new Date() }
        });

        res.status(200).json({
            secrets,
            totalPages: Math.ceil(total / limit),
            currentPage: page
        });
    } catch (error) {
        console.error('Erreur détaillée:', error);
        res.status(500).json({
            message: 'Erreur lors de la récupération des secrets.',
            error: error.message
        });
    }
};

const calculatePrices = (originalPrice) => {
    const buyerMargin = 0.15; // 15% de marge pour l'acheteur
    const sellerMargin = 0.10; // 10% de marge pour le vendeur

    const buyerTotal = originalPrice * (1 + buyerMargin);
    const sellerAmount = originalPrice * (1 - sellerMargin);
    const platformFee = buyerTotal - sellerAmount;

    return {
        buyerTotal: Math.round(buyerTotal * 100), // En centimes pour Stripe
        sellerAmount: Math.round(sellerAmount * 100),
        platformFee: Math.round(platformFee * 100),
        originalPrice: Math.round(originalPrice * 100)
    };
};

exports.createPaymentIntent = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const secret = await Secret.findById(req.params.id);
        if (!secret) {
            return res.status(404).json({ message: 'Secret introuvable.' });
        }

        const priceDetails = calculatePrices(secret.price);

        // Créer l'intention de paiement Stripe avec le montant total pour l'acheteur
        const paymentIntent = await stripe.paymentIntents.create({
            amount: priceDetails.buyerTotal, // Déjà en centimes
            currency: 'eur',
            metadata: {
                secretId: secret._id.toString(),
                userId: req.user.id,
                originalPrice: secret.price.toString(),
                buyerTotal: priceDetails.buyerTotal.toString(),
                sellerAmount: priceDetails.sellerAmount.toString(),
                platformFee: priceDetails.platformFee.toString()
            }
        });

        // Créer un enregistrement de paiement
        const payment = await Payment.create([{
            secret: secret._id,
            user: req.user.id,
            amount: priceDetails.buyerTotal / 100, // Convertir en euros pour la DB
            paymentIntentId: paymentIntent.id,
            status: 'pending',
            metadata: {
                originalPrice: secret.price,
                sellerAmount: priceDetails.sellerAmount / 100,
                platformFee: priceDetails.platformFee / 100,
                buyerMargin: 0.15,
                sellerMargin: 0.10
            }
        }], { session });

        await session.commitTransaction();

        res.json({
            clientSecret: paymentIntent.client_secret,
            paymentId: paymentIntent.id,
            buyerTotal: priceDetails.buyerTotal / 100
        });

    } catch (error) {
        await session.abortTransaction();
        console.error('Erreur createPaymentIntent:', error);
        res.status(500).json({ message: error.message });
    } finally {
        session.endSession();
    }
};


exports.purchaseSecret = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { paymentIntentId } = req.body;
        const secretId = req.params.id;
        const userId = req.user.id;

        // Logs détaillés d'entrée
        console.log('Purchase Secret Request:', {
            secretId,
            paymentIntentId,
            userId
        });

        // Vérification des paramètres d'entrée
        if (!paymentIntentId) {
            return res.status(400).json({ message: 'ID de paiement manquant' });
        }

        // Recherche du secret
        const secret = await Secret.findById(secretId);
        if (!secret) {
            return res.status(404).json({ message: 'Secret introuvable.' });
        }

        // Vérification si le secret est déjà acheté
        if (secret.purchasedBy.includes(userId)) {
            let conversation = await Conversation.findOne({
                secret: secretId,
                participants: { $elemMatch: { $eq: userId } }
            });

            if (!conversation) {
                conversation = await Conversation.create([{
                    secret: secretId,
                    participants: [secret.user, userId],
                    expiresAt: secret.expiresAt,
                    messages: []
                }], { session });
                conversation = conversation[0];
            }

            await session.commitTransaction();
            return res.status(200).json({
                message: 'Conversation récupérée/créée avec succès.',
                conversationId: conversation._id
            });
        }

        // Calcul des prix avec marges
        const priceDetails = calculatePrices(secret.price);

        // Vérification du statut du paiement Stripe
        const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

        console.log('Statut PaymentIntent Stripe:', {
            status: paymentIntent.status,
            amount: paymentIntent.amount,
            expectedAmount: priceDetails.buyerTotal,
            originalPrice: secret.price,
            calculatedBuyerTotal: priceDetails.buyerTotal / 100
        });

        // Vérifications de sécurité supplémentaires
        if (
            paymentIntent.status !== 'succeeded' ||
            paymentIntent.amount !== priceDetails.buyerTotal ||
            paymentIntent.metadata.secretId !== secretId ||
            paymentIntent.metadata.userId !== userId
        ) {
            await session.abortTransaction();
            return res.status(400).json({
                message: 'Paiement invalide',
                details: {
                    stripeStatus: paymentIntent.status,
                    amountCheck: paymentIntent.amount === priceDetails.buyerTotal,
                    secretIdCheck: paymentIntent.metadata.secretId === secretId,
                    userIdCheck: paymentIntent.metadata.userId === userId
                }
            });
        }

        // Enregistrement du paiement avec les détails des marges
        const payment = await Payment.findOneAndUpdate(
            { paymentIntentId },
            {
                secret: secretId,
                user: userId,
                amount: priceDetails.buyerTotal / 100,
                status: 'succeeded',
                metadata: {
                    originalPrice: secret.price,
                    sellerAmount: priceDetails.sellerAmount / 100,
                    platformFee: priceDetails.platformFee / 100,
                    buyerMargin: 0.15,
                    sellerMargin: 0.10
                }
            },
            {
                upsert: true,
                new: true,
                session
            }
        );

        // Marquer le secret comme acheté
        secret.purchasedBy.push(userId);
        await secret.save({ session });

        // Gestion de la conversation
        let conversation = await Conversation.findOne({
            secret: secretId
        }).session(session);

        if (!conversation) {
            conversation = await Conversation.create([{
                secret: secretId,
                participants: [secret.user, userId],
                expiresAt: secret.expiresAt,
                messages: []
            }], { session });
            conversation = conversation[0];
        } else if (!conversation.participants.includes(userId)) {
            conversation.participants.push(userId);
            await conversation.save({ session });
        }

        await session.commitTransaction();

        console.log('Achat du secret réussi', {
            conversationId: conversation._id,
            secretId,
            paymentId: payment._id,
            finalAmount: priceDetails.buyerTotal / 100
        });

        res.status(200).json({
            message: 'Secret acheté avec succès.',
            conversationId: conversation._id,
            conversation
        });

    } catch (error) {
        await session.abortTransaction();
        console.error('Erreur détaillée lors de l\'achat:', {
            errorMessage: error.message,
            stack: error.stack,
            secretId: req.params.id,
            userId: req.user?.id
        });
        res.status(500).json({
            message: 'Erreur serveur.',
            error: error.message
        });
    } finally {
        session.endSession();
    }
};

exports.confirmPayment = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { paymentIntentId } = req.body;
        const payment = await Payment.findOne({ paymentIntentId });

        if (!payment) {
            return res.status(404).json({ message: 'Paiement introuvable.' });
        }

        // Vérifier le statut du paiement avec Stripe
        const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

        if (paymentIntent.status === 'succeeded') {
            payment.status = 'succeeded';
            await payment.save({ session });

            await session.commitTransaction();
            res.json({ success: true });
        } else {
            throw new Error('Paiement non réussi');
        }

    } catch (error) {
        await session.abortTransaction();
        res.status(500).json({ message: error.message });
    } finally {
        session.endSession();
    }
};

exports.getPurchasedSecrets = async (req, res) => {
    try {
        const purchasedSecrets = await Secret.find({
            purchasedBy: { $in: [req.user.id] }
        })
            .populate('user', 'name profilePicture') // Pour avoir les infos de l'auteur
            .sort({ createdAt: -1 }); // Pour avoir les plus récents d'abord

        res.status(200).json(purchasedSecrets);
    } catch (error) {
        console.error('Erreur lors de la récupération des secrets achetés:', error);
        res.status(500).json({
            message: 'Erreur lors de la récupération des secrets achetés',
            error: error.message
        });
    }
};


exports.getSecretConversation = async (req, res) => {
    try {
        const conversation = await Conversation.findOne({
            secret: req.params.secretId,
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
            _id: req.params.conversationId,
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

        console.log("Conversation messages:", conversation.messages); // Log des messages de la conversation

        res.status(200).json({
            messages: conversation.messages,
            conversationId: conversation._id
        });
    } catch (error) {
        console.error('Erreur lors de la récupération des messages de la conversation:', error); // Log d'erreur
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

exports.deleteConversation = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const conversation = await Conversation.findOne({
            _id: req.params.conversationId,
            participants: req.user.id
        }).session(session);

        if (!conversation) {
            return res.status(404).json({ message: 'Conversation introuvable.' });
        }

        // Récupérer le secret associé à la conversation
        const secret = await Secret.findById(conversation.secret).session(session);

        if (!secret) {
            return res.status(404).json({ message: 'Secret introuvable.' });
        }

        // Correction ici : Utiliser $pull pour retirer spécifiquement l'utilisateur
        secret.purchasedBy = secret.purchasedBy.filter(
            userId => userId.toString() !== req.user.id.toString()
        );

        // Sauvegarder avec une modification directe
        await Secret.findByIdAndUpdate(secret._id, {
            $pull: { purchasedBy: req.user.id }
        }, { session });

        // Retirer l'utilisateur des participants
        conversation.participants = conversation.participants.filter(
            participantId => participantId.toString() !== req.user.id.toString()
        );

        // Si plus de participants, supprimer la conversation
        if (conversation.participants.length === 0) {
            await Conversation.findByIdAndDelete(req.params.conversationId).session(session);
            await session.commitTransaction();
            return res.status(200).json({
                message: 'Conversation supprimée car plus de participants.',
                secretUnpurchased: true
            });
        }

        // Sinon, sauvegarder la conversation mise à jour
        await conversation.save({ session });

        await session.commitTransaction();

        res.status(200).json({
            message: 'Conversation quittée avec succès.',
            secretUnpurchased: true
        });

    } catch (error) {
        await session.abortTransaction();
        console.error('Erreur lors de la sortie de la conversation:', error);
        res.status(500).json({ message: 'Erreur serveur.', error: error.message });
    } finally {
        session.endSession();
    }
};