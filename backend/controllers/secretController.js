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

        console.log('Création de secret pour utilisateur:', {
            userId: req.user.id,
            stripeAccountId: user.stripeAccountId,
            stripeAccountStatus: user.stripeAccountStatus
        });

        // Définir dynamiquement les URLs de retour
        const baseReturnUrl = process.env.FRONTEND_URL || 'hushy://profile';
        const refreshUrl = `${baseReturnUrl}/stripe/refresh`;
        const returnUrl = `${baseReturnUrl}/stripe/return`;

        // Si l'utilisateur n'a pas de compte Stripe, en créer un
        if (!user.stripeAccountId) {
            try {
                console.log('Création nouveau compte Stripe');
                
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
                        mcc: '5734',
                        url: 'https://hushy.app'
                    }
                });

                const accountLink = await stripe.accountLinks.create({
                    account: account.id,
                    refresh_url: refreshUrl,
                    return_url: returnUrl,
                    type: 'account_onboarding',
                });

                console.log('Compte Stripe créé:', {
                    accountId: account.id,
                    accountLinkUrl: accountLink.url
                });

                // Mettre à jour l'utilisateur
                user.stripeAccountId = account.id;
                user.stripeAccountStatus = 'pending';
                user.stripeOnboardingComplete = false;
                user.lastStripeOnboardingUrl = accountLink.url;
                await user.save({ session });

                // Créer le secret en attente
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
                    message: 'Secret créé. Configuration du compte de paiement requise.',
                    secret: secret[0],
                    stripeOnboardingUrl: accountLink.url,
                    stripeStatus: 'pending',
                    requiresStripeSetup: true
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

        // Vérifier si l'onboarding est complet
        if (!user.stripeOnboardingComplete || user.stripeAccountStatus !== 'active') {
            console.log('Configuration Stripe incomplète, création nouveau lien');
            
            const accountLink = await stripe.accountLinks.create({
                account: user.stripeAccountId,
                refresh_url: refreshUrl,
                return_url: returnUrl,
                type: 'account_onboarding',
            });

            // Créer le secret en attente
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
                stripeStatus: 'pending',
                requiresStripeSetup: true
            });
        }

        // Création normale du secret (compte Stripe déjà configuré)
        console.log('Création de secret avec compte Stripe actif');
        
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

        return res.status(201).json({
            message: 'Secret créé avec succès',
            secret: secret[0],
            stripeStatus: 'active',
            requiresStripeSetup: false
        });

    } catch (error) {
        await session.abortTransaction();
        console.error('Erreur création secret:', error);
        return res.status(500).json({
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
        const user = await User.findById(req.user.id);

        if (!user.stripeAccountId) {
            return res.status(400).json({
                status: 'no_account',
                message: 'Aucun compte Stripe associé',
                needsRegistration: true
            });
        }

        const account = await stripe.accounts.retrieve(user.stripeAccountId);
        
        // Log pour debug
        console.log('Stripe Account Status:', {
            charges_enabled: account.charges_enabled,
            payouts_enabled: account.payouts_enabled,
            details_submitted: account.details_submitted
        });

        const redirectBaseUrl = process.env.FRONTEND_URL;
        const returnUrl = `${redirectBaseUrl}/redirect-to-app.html?status=success`;
        const refreshUrl = `${redirectBaseUrl}/redirect-to-app.html?status=pending`;

        // Vérification complète du statut du compte
        if (account.charges_enabled && account.payouts_enabled && account.details_submitted) {
            // Mise à jour du statut utilisateur
            user.stripeAccountStatus = 'active';
            user.stripeOnboardingComplete = true;
            await user.save();

            // Mise à jour de tous les secrets en attente
            await Secret.updateMany(
                { user: req.user.id, status: 'pending' },
                { status: 'active' }
            );

            return res.status(200).json({
                success: true,
                verified: true,
                status: 'active',
                message: 'Compte Stripe complètement configuré',
                returnUrl: 'hushy://stripe-return?status=success'
            });
        }

        // Si le compte n'est pas complètement configuré, créer un nouveau lien
        const accountLink = await stripe.accountLinks.create({
            account: user.stripeAccountId,
            refresh_url: refreshUrl,
            return_url: returnUrl,
            type: 'account_onboarding',
        });

        // Mise à jour du statut utilisateur
        user.lastStripeOnboardingUrl = accountLink.url;
        user.stripeAccountStatus = 'pending';
        await user.save();

        return res.status(200).json({
            success: true,
            verified: false,
            status: 'pending',
            message: 'Configuration du compte Stripe en cours',
            stripeOnboardingUrl: accountLink.url,
            stripeStatus: 'pending'
        });

    } catch (error) {
        console.error('Erreur refresh onboarding:', error);
        return res.status(500).json({
            success: false,
            status: 'error',
            message: error.message
        });
    }
};

exports.checkStripeStatus = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user.stripeAccountId) {
            return res.status(400).json({
                status: 'no_account',
                verified: false
            });
        }

        const account = await stripe.accounts.retrieve(user.stripeAccountId);
        
        if (account.charges_enabled && account.payouts_enabled && account.details_submitted) {
            // Mettre à jour le statut utilisateur si nécessaire
            if (!user.stripeOnboardingComplete) {
                user.stripeOnboardingComplete = true;
                user.stripeAccountStatus = 'active';
                await user.save();

                // Mettre à jour tous les secrets en attente
                await Secret.updateMany(
                    { user: req.user.id, status: 'pending' },
                    { status: 'active' }
                );
            }

            return res.status(200).json({
                status: 'active',
                verified: true,
                success: true
            });
        }

        return res.status(200).json({
            status: 'pending',
            verified: false
        });
    } catch (error) {
        console.error('Erreur vérification status:', error);
        return res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
};

exports.resetStripeStatus = async (req, res) => {
   
    try {
        const user = await User.findById(req.user.id);
        
        if (!user) {
            return res.status(404).json({ message: 'Utilisateur non trouvé' });
        }

        // Réinitialiser le statut utilisateur
        user.stripeAccountStatus = 'pending';
        user.stripeOnboardingComplete = false;
        user.lastStripeOnboardingUrl = null;
        await user.save();

        // Réinitialiser les secrets
        await Secret.updateMany(
            { user: req.user.id },
            { status: 'pending' }
        );

        // Désactiver les capacités sur Stripe
        if (user.stripeAccountId) {
            await stripe.accounts.update(user.stripeAccountId, {
                capabilities: {
                    card_payments: { requested: false },
                    transfers: { requested: false }
                }
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Statut Stripe réinitialisé'
        });
    } catch (error) {
        console.error('Erreur reset status:', error);
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};




exports.deleteStripeAccount = async (req, res) => {

    console.log('Requête de suppression de compte Stripe reçue');
    console.log('Utilisateur:', req.user);
    try {
        const user = await User.findById(req.user.id);
        
        if (!user.stripeAccountId) {
            return res.status(400).json({ 
                message: 'Aucun compte Stripe existant' 
            });
        }

        // Vérifier s'il y a des soldes ou des transactions en attente
        const balance = await stripe.balance.retrieve({
            stripeAccount: user.stripeAccountId
        });

        if (balance.available.length > 0 || balance.pending.length > 0) {
            return res.status(400).json({
                message: 'Impossible de supprimer le compte. Des fonds sont encore disponibles.',
                availableBalance: balance.available,
                pendingBalance: balance.pending
            });
        }

        // Supprimer le compte Stripe
        await stripe.accounts.del(user.stripeAccountId);

        // Mettre à jour le modèle utilisateur
        user.stripeAccountId = undefined;
        user.stripeAccountStatus = null;
        user.stripeOnboardingComplete = false;
        await user.save();

        res.status(200).json({
            message: 'Compte Stripe supprimé avec succès',
            status: 'deleted'
        });

    } catch (error) {
        console.error('Erreur suppression compte Stripe:', error);
        res.status(500).json({ 
            message: 'Erreur lors de la suppression du compte Stripe',
            error: error.message 
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


const calculateStripeFees = async (basePrice, sellerId) => {
    // Récupérer le compte Stripe du vendeur
    const seller = await User.findById(sellerId).select('stripeAccountId');
    if (!seller || !seller.stripeAccountId) {
        throw new Error('Compte vendeur non trouvé ou non configuré pour Stripe');
    }

    // 1. Calculer les frais de plateforme sur le prix du vendeur (10%)
    const platformFeeOnSellerPrice = basePrice * 0.10;
    
    // 2. Calculer le montant net pour le vendeur après la première commission
    const sellerNetAmount = basePrice - platformFeeOnSellerPrice;
    
    // 3. Calculer la commission supplémentaire sur le montant net (15%)
    const additionalPlatformFee = sellerNetAmount * 0.15;
    
    // 4. Calculer le prix total pour l'acheteur
    const totalAmountForBuyer = basePrice + additionalPlatformFee;
    
    // Convertir en centimes pour Stripe
    const amountInCents = Math.round(totalAmountForBuyer * 100);
    const totalPlatformFeeInCents = Math.round(
        (platformFeeOnSellerPrice + additionalPlatformFee) * 100
    );

    return {
        amount: amountInCents, // Montant total payé par l'acheteur
        application_fee_amount: totalPlatformFeeInCents, // Total des frais de plateforme
        seller_amount: Math.round(sellerNetAmount * 100), // Montant net pour le vendeur
        seller_stripe_account: seller.stripeAccountId
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

        // Calculer les frais
        const { 
            amount, 
            application_fee_amount, 
            seller_amount, 
            buyer_fees,
            seller_stripe_account 
        } = await calculateStripeFees(secret.price, secret.user);

        // Créer l'intention de paiement Stripe
        const paymentIntent = await stripe.paymentIntents.create({
            amount,
            currency: 'eur',
            application_fee_amount,
            transfer_group: `secret_${secret._id}`,
            transfer_data: {
                destination: seller_stripe_account
            },
            automatic_payment_methods: {
                enabled: true,
            },
            metadata: {
                secretId: secret._id.toString(),
                buyerId: req.user.id,
                originalPrice: secret.price.toString(),
                sellerAmount: seller_amount / 100,
                platformFee: application_fee_amount / 100
            },
        });

        // Créer l'enregistrement de paiement
        const payment = await Payment.create([{
            secret: secret._id,
            user: req.user.id,
            amount: amount / 100, // Montant total payé
            paymentIntentId: paymentIntent.id,
            status: 'pending',
            metadata: {
                originalPrice: secret.price,
                sellerAmount: seller_amount / 100,
                platformFee: application_fee_amount / 100,
                totalAmountCharged: amount / 100,
                buyerMargin: buyer_fees / 100
            }
        }], { session });

        await session.commitTransaction();

        res.json({
            clientSecret: paymentIntent.client_secret,
            paymentId: paymentIntent.id,
            amount: amount / 100,
            sellerAmount: seller_amount / 100,
            platformFee: application_fee_amount / 100,
            buyerFees: buyer_fees / 100
        });

    } catch (error) {
        await session.abortTransaction();
        console.error('Erreur createPaymentIntent:', error);
        res.status(500).json({ message: error.message });
    } finally {
        session.endSession();
    }
};

// Modifier purchaseSecret pour s'adapter aux nouveaux frais
exports.purchaseSecret = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { paymentIntentId } = req.body;
        const secretId = req.params.id;
        const userId = req.user.id;

        console.log('Purchase Secret Request:', { secretId, paymentIntentId, userId });

        if (!paymentIntentId) {
            return res.status(400).json({ message: 'ID de paiement manquant' });
        }

        const secret = await Secret.findById(secretId);
        if (!secret) {
            return res.status(404).json({ message: 'Secret introuvable.' });
        }

        // Vérifier si déjà acheté
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

        // Vérifier le paiement Stripe
        const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

        console.log('Détails du PaymentIntent Stripe:', {
            id: paymentIntent.id,
            status: paymentIntent.status,
            amount: paymentIntent.amount,
            seller: paymentIntent.transfer_data.destination,
            platformFees: paymentIntent.application_fee_amount
        });

        if (
            paymentIntent.status !== 'succeeded' ||
            paymentIntent.metadata.secretId !== secretId ||
            paymentIntent.metadata.buyerId !== userId
        ) {
            await session.abortTransaction();
            return res.status(400).json({ message: 'Paiement invalide' });
        }

        // Mettre à jour le payment dans la DB
        const payment = await Payment.findOneAndUpdate(
            { paymentIntentId },
            { status: 'succeeded' },
            { session, new: true }
        );

        console.log('Paiement mis à jour en base:', {
            paymentId: payment._id,
            status: payment.status,
            amount: payment.amount,
            platformFees: payment.metadata.platformFee,
            sellerEarnings: payment.metadata.sellerAmount
        });

        // Marquer le secret comme acheté
        secret.purchasedBy.push(userId);
        await secret.save({ session });

        // Créer ou mettre à jour la conversation
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
        }

        await session.commitTransaction();

        res.status(200).json({
            message: 'Secret acheté avec succès.',
            conversationId: conversation._id,
            conversation
        });

    } catch (error) {
        await session.abortTransaction();
        console.error('Erreur achat:', error);
        res.status(500).json({ message: 'Erreur serveur.', error: error.message });
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