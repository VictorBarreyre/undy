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
        const { label, content, price, expiresIn = 7, location, language, currency = '€' } = req.body;

        // Validation des champs requis
        if (!label || !content || price == null) {
            return res.status(400).json({
                message: 'Tous les champs sont requis.',
                missingFields: {
                    label: !label,
                    content: !content,
                    price: price == null
                }
            });
        }

        const supportedCurrencies = ['€', '$', '£', '¥'];
        if (!supportedCurrencies.includes(currency)) {
            return res.status(400).json({
                message: 'Devise non supportée',
                supportedCurrencies
            });
        }

        // Trouver l'utilisateur avec les champs Stripe
        const user = await User.findById(req.user.id).select('email stripeAccountId stripeAccountStatus stripeOnboardingComplete');
        if (!user) {
            return res.status(404).json({ message: "Utilisateur introuvable." });
        }

        const baseReturnUrl =
            process.env.NODE_ENV === 'production'
                ? `https://${req.get('host')}/redirect.html?path=`
                : process.env.FRONTEND_URL || 'hushy://stripe-return';

        const refreshUrl = `${baseReturnUrl}?action=refresh&secretPending=true`;
        const returnUrl = `${baseReturnUrl}?action=complete&secretPending=true`;

        // ÉTAPE 1: Vérifier si l'utilisateur a un compte Stripe actif
        if (!user.stripeAccountId || !user.stripeOnboardingComplete || user.stripeAccountStatus !== 'active') {
            let accountLink;
            
            // Créer un compte Stripe si l'utilisateur n'en a pas
            if (!user.stripeAccountId) {
                const account = await stripe.accounts.create({
                    type: 'express',
                    country: 'FR',
                    email: user.email,
                    capabilities: {
                        card_payments: { requested: true },
                        transfers: { requested: true },
                        identity_verification: { requested: true }
                    },
                    settings: {
                        payouts: {
                          schedule: {
                            interval: 'manual'
                          }
                        }
                      },
                    business_type: 'individual',
                    business_profile: {
                        mcc: '5734', // Code pour services digitaux
                        url: 'https://hushy.app'
                    }
                });

                accountLink = await stripe.accountLinks.create({
                    account: account.id,
                    refresh_url: refreshUrl,
                    return_url: returnUrl,
                    type: 'account_onboarding',
                });

                user.stripeAccountId = account.id;
                user.stripeAccountStatus = 'pending';
                user.stripeOnboardingComplete = false;
                user.lastStripeOnboardingUrl = accountLink.url;
                await user.save({ session });
            } else {
                // L'utilisateur a un compte mais pas complètement configuré
                accountLink = await stripe.accountLinks.create({
                    account: user.stripeAccountId,
                    refresh_url: refreshUrl,
                    return_url: returnUrl,
                    type: 'account_onboarding',
                });
                
                user.lastStripeOnboardingUrl = accountLink.url;
                await user.save({ session });
            }

            await session.commitTransaction();
            
            // Retourner une réponse indiquant que Stripe doit être configuré d'abord
            return res.status(202).json({
                requiresStripeSetup: true,
                message: 'Configuration du compte Stripe requise avant de créer un secret',
                stripeOnboardingUrl: accountLink.url,
                stripeStatus: {
                    requiresStripeSetup: true,
                    accountLink
                }
            });
        }

        // ÉTAPE 2: L'utilisateur a un compte Stripe actif, créer le secret
        // Configuration de base du secret
        const secretData = {
            label,
            content,
            price,
            currency, 
            user: req.user.id,
            expiresAt: new Date(Date.now() + expiresIn * 24 * 60 * 60 * 1000),
            status: 'active',
            language: language || 'fr'
        };

        // Gestion détaillée de la localisation
        if (location && location.type === 'Point' && location.coordinates) {
            const [lng, lat] = location.coordinates;

            // Validation géographique stricte
            if (
                Array.isArray(location.coordinates) &&
                location.coordinates.length === 2 &&
                typeof lng === 'number' &&
                typeof lat === 'number' &&
                lng >= -180 && lng <= 180 &&
                lat >= -90 && lat <= 90
            ) {
                secretData.location = {
                    type: 'Point',
                    coordinates: [lng, lat]
                };
                console.log('Location validée:', secretData.location);
            } else {
                console.warn('Coordonnées géographiques invalides:', location.coordinates);
            }
        }

        // Créer le secret directement comme actif
        const secret = await Secret.create([secretData], { session });
        
        // Ajouter le lien de partage
        const shareLink = `hushy://secret/${secret[0]._id}`;
        await Secret.findByIdAndUpdate(secret[0]._id, { shareLink }, { session });

        await session.commitTransaction();

        // Retourner une réponse de succès avec le secret créé
        return res.status(201).json({
            message: 'Secret créé avec succès',
            secret: {
                ...secret[0]._doc,
                shareLink
            },
            requiresStripeSetup: false
        });

    } catch (error) {
        await session.abortTransaction();
        console.error('Erreur détaillée lors de la création du secret:', {
            message: error.message,
            stack: error.stack,
            body: req.body
        });
        res.status(500).json({
            message: 'Erreur serveur lors de la création du secret',
            details: error.message
        });
    } finally {
        session.endSession();
    }
};

exports.refreshStripeOnboarding = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('+lastStripeOnboardingUrl stripeAccountId stripeAccountStatus');

        if (!user.stripeAccountId) {
            return res.status(202).json({
                status: 'no_account',
                message: 'Aucun compte Stripe associé',
                needsRegistration: true
            });
        }

        // Définir les URLs de retour avec paramètres de continuité
        const baseReturnUrl =
            process.env.NODE_ENV === 'production'
                ? `https://${req.get('host')}/redirect.html?path=` // Notez le "?path=" à la fin
                : process.env.FRONTEND_URL || 'hushy://stripe-return'; // Dev direct vers l'app

                const refreshUrl = `${baseReturnUrl}?action=refresh&secretPending=true`;
                const returnUrl = `${baseReturnUrl}?action=complete&secretPending=true`;

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
            refresh_url: refreshUrl,
            return_url: returnUrl,
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

exports.getNearbySecrets = async (req, res) => {
    try {
        const { latitude, longitude, radius = 5 } = req.query;
        const userId = req.user.id;

        if (!latitude || !longitude) {
            return res.status(400).json({ message: 'Coordonnées manquantes ou invalides' });
        }

        // Convertir en nombres
        const lat = parseFloat(latitude);
        const lng = parseFloat(longitude);
        const rad = parseFloat(radius);

        // Vérifier la validité des nombres
        if (isNaN(lat) || isNaN(lng) || isNaN(rad)) {
            return res.status(400).json({ message: 'Coordonnées ou rayon invalides' });
        }

        // Conversion km en mètres pour MongoDB
        const maxDistance = rad * 1000;

        // Requête avec géolocalisation
        const secrets = await Secret.find({
            location: {
                $near: {
                    $geometry: {
                        type: "Point",
                        coordinates: [lng, lat] // MongoDB utilise [longitude, latitude]
                    },
                    $maxDistance: maxDistance
                }
            },
            purchasedBy: { $nin: [userId] }, // Ne pas inclure les secrets déjà achetés
            user: { $ne: userId },           // Ne pas inclure les secrets créés par l'utilisateur
            expiresAt: { $gt: new Date() }   // Ne pas inclure les secrets expirés
        })
            .populate('user', 'name profilePicture phone')
            .select('label content price createdAt expiresAt user purchasedBy location shareLink')
            .limit(50)
            .sort({ createdAt: -1 });

        return res.status(200).json({
            secrets,
            totalPages: 1,
            currentPage: 1
        });
    } catch (error) {
        console.error('Erreur lors de la récupération des secrets à proximité:', error);
        return res.status(500).json({
            message: 'Erreur lors de la récupération des secrets à proximité',
            error: error.message
        });
    }
};


exports.getUnpurchasedSecrets = async (req, res) => {
    try {
        const { page = 1, limit = 10, language } = req.query;
        const userId = req.user.id;

        // Construire le filtre de base
        const filter = {
            purchasedBy: { $nin: [userId] },
            user: { $ne: userId },
            expiresAt: { $gt: new Date() }
        };

        // Ajouter le filtre de langue si spécifié
        if (language) {
            filter.language = language;
        }

        const secrets = await Secret.find(filter)
            .populate('user', 'name profilePicture')
            .select('label content price createdAt expiresAt user purchasedBy location language')
            .limit(limit * 1)
            .skip((page - 1) * limit)
            .sort({ createdAt: -1 })
            .exec();

        const total = await Secret.countDocuments(filter);

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


const EXCHANGE_RATES = {
    '€': 1.0,    // Base: Euro
    '$': 0.92,   // 1 USD = 0.92 EUR (exemple)
    '£': 1.17,   // 1 GBP = 1.17 EUR (exemple)
    '¥': 0.0061  // 1 JPY = 0.0061 EUR (exemple)
};

// Fonction pour convertir vers et depuis l'Euro (devise de base pour les calculs)
const convertCurrency = (amount, fromCurrency, toCurrency = '€') => {
    if (fromCurrency === toCurrency) return amount;
    
    // Convertir d'abord en Euro (devise de base)
    const amountInEuro = fromCurrency === '€' ? amount : amount * EXCHANGE_RATES[fromCurrency];
    
    // Si la devise cible est l'Euro, retourner directement
    if (toCurrency === '€') return amountInEuro;
    
    // Sinon, convertir de l'Euro vers la devise cible
    return amountInEuro / EXCHANGE_RATES[toCurrency];
};


const calculatePrices = (originalPrice, currency = '€') => {
    const buyerMargin = 0.15; // 15% de marge pour l'acheteur
    const sellerMargin = 0.10; // 10% de marge pour le vendeur

    // Convertir en Euro pour les calculs
    const priceInEuro = convertCurrency(originalPrice, currency);

    const buyerTotal = priceInEuro * (1 + buyerMargin);
    const sellerAmount = priceInEuro * (1 - sellerMargin);
    const platformFee = buyerTotal - sellerAmount;

    return {
        buyerTotal: Math.round(buyerTotal * 100), // En centimes pour Stripe
        sellerAmount: Math.round(sellerAmount * 100),
        platformFee: Math.round(platformFee * 100),
        originalPrice: Math.round(originalPrice * 100),
        currency: currency // Inclure la devise dans les détails
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
     // Utiliser la devise du secret
     const currency = secret.currency || '€';
     const priceDetails = calculatePrices(secret.price, currency);

     // Déterminer la devise Stripe (convertir les symboles en codes ISO)
     const stripeCurrency = {
         '€': 'eur',
         '$': 'usd',
         '£': 'gbp',
         '¥': 'jpy'
     }[currency] || 'eur';

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
                platformFee: priceDetails.platformFee.toString(),
                currency: currency 

            }
        });

        // Créer un enregistrement de paiement
        const payment = await Payment.create([{
            secret: secret._id,
            user: req.user.id,
            amount: priceDetails.buyerTotal / 100, // Convertir en euros pour la DB
            paymentIntentId: paymentIntent.id,
            status: 'pending',
            currency: currency, 
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
            buyerTotal: priceDetails.buyerTotal / 100,
            currency: currency 
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
        const currency = secret.currency || '€';
        const priceDetails = calculatePrices(secret.price, currency);

        // Déterminer la devise Stripe
        const stripeCurrency = {
            '€': 'eur',
            '$': 'usd',
            '£': 'gbp',
            '¥': 'jpy'
        }[currency] || 'eur';

        // Vérification du statut du paiement Stripe
        const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

        console.log('Statut PaymentIntent Stripe:', {
            status: paymentIntent.status,
            amount: paymentIntent.amount,
            expectedAmount: priceDetails.buyerTotal,
            originalPrice: secret.price,
            calculatedBuyerTotal: priceDetails.buyerTotal / 100,
            currency: paymentIntent.currency,
            expectedCurrency: stripeCurrency
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
                    currencyCheck: paymentIntent.currency === stripeCurrency,
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

        conversation = await Conversation.findById(conversation._id)
            .populate('participants', 'name profilePicture')
            .populate('messages.sender', 'name profilePicture')
            .populate({
                path: 'secret',
                populate: {
                    path: 'user',
                    select: 'name profilePicture'
                },
                select: 'label content user'
            })
            .session(session);

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
        console.log("Paramètres de la requête:", {
            conversationId: req.params.conversationId,
            userId: req.user.id
        });

        const conversation = await Conversation.findOne({
            _id: req.params.conversationId,
            participants: req.user.id
        })
            .populate({
                path: 'messages.sender',
                select: '_id name',
                model: 'User'
            })
            .populate({
                path: 'secret',
                populate: {
                    path: 'user',
                    select: 'name'
                }
            });

        if (!conversation) {
            return res.status(404).json({ message: 'Conversation introuvable.' });
        }

        // Log des infos de base
        console.log("Info conversation:", {
            conversationId: conversation._id,
            nombreMessages: conversation.messages.length
        });

        // Log détaillé des messages
        console.log("Messages:",
            conversation.messages.map(msg => ({
                messageId: msg._id,
                content: msg.content,
                sender: {
                    id: msg.sender._id,
                    name: msg.sender.name
                },
                createdAt: msg.createdAt
            }))
        );

        res.status(200).json({
            messages: conversation.messages,
            conversationId: conversation._id
        });
    } catch (error) {
        console.error('Erreur détaillée:', error);
        res.status(500).json({ message: 'Erreur serveur.', error: error.message });
    }
};


// Mise à jour de la fonction addMessageToConversation dans secretController.js

exports.addMessageToConversation = async (req, res) => {
    try {
        console.log("Données reçues:", JSON.stringify(req.body, null, 2));

        // Extraire les données de la requête
        const { content, messageType = 'text', image = null } = req.body;

        // Validation adaptée pour tous les types de messages
        if ((messageType === 'text' || messageType === 'mixed') && !content?.trim()) {
            return res.status(400).json({ message: 'Le contenu est requis pour les messages texte ou mixtes.' });
        }

        if ((messageType === 'image' || messageType === 'mixed') && !image) {
            return res.status(400).json({ message: 'L\'URL de l\'image est requise pour les messages image ou mixtes.' });
        }

        // Construire l'objet message
        const messageData = {
            sender: req.user.id,
            content: content?.trim() || " ", // Un espace par défaut (requis par le modèle)
            senderName: req.user.name,
            messageType: messageType // Conserver explicitement le type de message
        };

        // Ajouter l'image si présente (pour les types 'image' ou 'mixed')
        if (messageType === 'image' || messageType === 'mixed') {
            // Si l'image est un objet FormData, extraire l'URL de l'image
            if (typeof image === 'object' && image._parts && image._parts.length > 0) {
                // Récupérer l'URL de l'image depuis FormData
                // Normalement on utiliserait un service de stockage comme S3 ici
                messageData.image = "placeholder_image_url";
            } else {
                // Sinon, utiliser la valeur directement (URL ou base64)
                messageData.image = image;
            }
        }

        console.log("Message formaté:", messageData);

        // Trouver et mettre à jour la conversation
        const conversation = await Conversation.findOne({
            _id: req.params.conversationId,
            participants: req.user.id
        });

        if (!conversation) {
            return res.status(404).json({ message: 'Conversation introuvable.' });
        }

        // Incrémenter les compteurs de messages non lus
        conversation.participants.forEach(participantId => {
            const participantIdStr = participantId.toString();
            if (participantIdStr !== req.user.id.toString()) {
                const currentCount = conversation.unreadCount.get(participantIdStr) || 0;
                conversation.unreadCount.set(participantIdStr, currentCount + 1);
            }
        });

        // Ajouter le message
        conversation.messages.push(messageData);
        await conversation.save();

        // Récupérer le message avec les infos de l'expéditeur
        const updatedConversation = await Conversation.findById(req.params.conversationId)
            .populate('messages.sender', '_id name profilePicture');

        const lastMessage = updatedConversation.messages[updatedConversation.messages.length - 1];

        res.status(201).json(lastMessage);
    } catch (error) {
        console.error('Erreur lors de l\'ajout du message:', error);
        res.status(500).json({ message: 'Erreur serveur.', error: error.message });
    }
};


exports.uploadImage = async (req, res) => {
    try {
        const { image } = req.body; // L'image en base64 ou un URL temporaire

        if (!image) {
            return res.status(400).json({ message: 'Aucune image fournie' });
        }

        // Dans une implémentation réelle, vous stockeriez l'image dans un service cloud comme S3
        // Pour cette démonstration, nous renvoyons simplement l'image telle quelle

        // 1. Exemple simple retournant l'image reçue (pour tests uniquement)
        const imageUrl = image;

        // 2. Alternative : pour une implémentation plus complète, vous pourriez :
        // - Valider le type/format de l'image
        // - La redimensionner si nécessaire
        // - La télécharger vers un service de stockage
        // - Retourner l'URL permanente

        res.status(200).json({
            url: imageUrl,
            message: 'Image téléchargée avec succès'
        });
    } catch (error) {
        console.error('Erreur lors du téléchargement de l\'image:', error);
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
                select: 'label content user',
                model: 'Secret',
                populate: {
                    path: 'user',
                    model: 'User',
                    select: 'name profilePicture'
                }
            })
            .sort({ updatedAt: -1 });

        // Log détaillé du nombre de messages non lus
        const conversationsWithUnreadCount = conversations.map(conv => {
            const userIdStr = req.user.id.toString();
            const unreadCount = conv.unreadCount?.get(userIdStr) || 0;

            console.log('Conversation Details:', {
                conversationId: conv._id,
                unreadCountMap: conv.unreadCount,
                userIdStr: userIdStr,
                calculatedUnreadCount: unreadCount,
                totalMessages: conv.messages.length
            });

            return {
                ...conv.toObject(),
                unreadCount
            };
        });

        res.status(200).json(conversationsWithUnreadCount);
    } catch (error) {
        console.error('Erreur détaillée:', error);
        res.status(500).json({ message: 'Erreur serveur.', error: error.message });
    }
};


exports.markConversationAsRead = async (req, res) => {
    try {
        const conversation = await Conversation.findOne({
            _id: req.params.conversationId,
            participants: req.user.id
        });

        if (!conversation) {
            return res.status(404).json({ message: 'Conversation introuvable.' });
        }

        // Réinitialiser le nombre de messages non lus pour cet utilisateur
        conversation.unreadCount.set(req.user.id.toString(), 0);
        await conversation.save();

        res.status(200).json({ message: 'Messages marqués comme lus.' });
    } catch (error) {
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

exports.getSharedSecret = async (req, res) => {
    try {
        const { secretId } = req.params;
        const userId = req.user.id;

        console.log("ID du secret recherché:", secretId);
        console.log("ID de l'utilisateur:", userId);

        // Chercher le secret et peupler les infos de l'utilisateur
        const secret = await Secret.findById(secretId)
            .populate('user', 'name profilePicture')
            .select('label content price createdAt expiresAt user purchasedBy shareLink');

        if (!secret) {
            return res.status(404).json({ message: 'Secret introuvable.' });
        }

        // Vérifier si le secret a expiré
        if (secret.expiresAt && new Date(secret.expiresAt) < new Date()) {
            return res.status(400).json({ message: 'Ce secret a expiré.' });
        }

        // Vérifier si l'utilisateur a déjà acheté ce secret
        const hasUserPurchased = secret.purchasedBy.includes(userId);

        if (hasUserPurchased) {
            // Si le secret est déjà acheté, obtenir l'ID de la conversation
            const conversation = await Conversation.findOne({
                secret: secretId,
                participants: userId
            }).select('_id');

            return res.status(200).json({
                secret,
                hasUserPurchased: true,
                conversation
            });
        }

        // Si le secret n'est pas acheté, retourner les infos de base
        return res.status(200).json({
            secret,
            hasUserPurchased: false
        });

    } catch (error) {
        console.error('Erreur lors de la récupération du secret partagé:', error);
        res.status(500).json({
            message: 'Erreur serveur.',
            error: error.message
        });
    }
};

exports.deleteSecret = async (req, res) => {
    try {
      const secretId = req.params.id;
      const userId = req.user.id;
      
      // Vérifier que le secret existe
      const secret = await Secret.findById(secretId);
      if (!secret) {
        return res.status(404).json({ message: 'Secret introuvable.' });
      }
      
      // Vérifier que l'utilisateur est le propriétaire du secret
      if (secret.user.toString() !== userId) {
        return res.status(403).json({ message: 'Vous n\'êtes pas autorisé à supprimer ce secret.' });
      }
      
      // Vérifier si le secret a été acheté par quelqu'un
      if (secret.purchasedBy && secret.purchasedBy.length > 0) {
        return res.status(400).json({ 
          message: 'Ce secret a déjà été acheté et ne peut pas être supprimé.' 
        });
      }
      
      // Supprimer le secret
      await Secret.findByIdAndDelete(secretId);
      
      // Répondre avec succès
      res.status(200).json({ 
        success: true, 
        message: 'Secret supprimé avec succès.' 
      });
      
    } catch (error) {
      console.error('Erreur lors de la suppression du secret:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Erreur lors de la suppression du secret.' 
      });
    }
  };

  exports.verifyIdentity = async (req, res) => {
    try {
        const { documentImage, selfieImage, documentType, documentSide, stripeAccountId } = req.body;

        if (!documentImage) {
            return res.status(400).json({
                success: false,
                message: 'L\'image du document est requise'
            });
        }

        // Vérifier que l'utilisateur a un compte Stripe existant
        const user = await User.findById(req.user.id);
        const userStripeAccountId = stripeAccountId || user.stripeAccountId;
        
        if (!userStripeAccountId) {
            return res.status(400).json({
                success: false,
                message: 'Aucun compte Stripe associé à cet utilisateur'
            });
        }

        // Créer un objet pour stocker les fichiers uploadés
        const uploadedFiles = [];

        // Décoder et télécharger l'image du document sur Stripe
        let documentImageBuffer;
        try {
            // Extraire la partie base64 de l'URL data
            const base64Data = documentImage.split(',')[1];
            documentImageBuffer = Buffer.from(base64Data, 'base64');
        } catch (error) {
            return res.status(400).json({
                success: false,
                message: 'Format d\'image de document invalide'
            });
        }

        // Télécharger le document sur Stripe
        const documentFile = await stripe.files.create({
            purpose: 'identity_document',
            file: {
                data: documentImageBuffer,
                name: `identity_doc_${Date.now()}.jpg`,
                type: 'application/octet-stream'
            }
        });
        
        uploadedFiles.push(documentFile.id);

        // Options pour la session de vérification
        const verificationOptions = {
            type: 'document',
            metadata: {
                userId: req.user.id,
                documentType: documentType || 'identity_document',
                documentSide: documentSide || 'front',
                documentFileId: documentFile.id
            }
        };

        // Si une selfie a été fournie, la télécharger aussi
        let selfieFile = null;
        if (selfieImage) {
            let selfieImageBuffer;
            try {
                const base64Data = selfieImage.split(',')[1];
                selfieImageBuffer = Buffer.from(base64Data, 'base64');
            } catch (error) {
                // Nettoyer les fichiers déjà téléchargés en cas d'erreur
                for (const fileId of uploadedFiles) {
                    try {
                        await stripe.files.del(fileId);
                    } catch (deleteError) {
                        console.error('Erreur lors de la suppression du fichier:', deleteError);
                    }
                }
                
                return res.status(400).json({
                    success: false,
                    message: 'Format d\'image selfie invalide'
                });
            }

            // Télécharger la selfie sur Stripe
            selfieFile = await stripe.files.create({
                purpose: 'identity_document',
                file: {
                    data: selfieImageBuffer,
                    name: `identity_selfie_${Date.now()}.jpg`,
                    type: 'application/octet-stream'
                }
            });
            
            uploadedFiles.push(selfieFile.id);
            verificationOptions.metadata.selfieFileId = selfieFile.id;
        }

        // Créer la session de vérification avec les deux documents
        const verificationSession = await stripe.identity.verificationSessions.create({
            type: 'document',
            options: {
                document: {
                    allowed_types: ['passport', 'id_card', 'driving_license'],
                    require_matching_selfie: !!selfieImage, // Activer la correspondance selfie si une selfie a été fournie
                    require_live_capture: false,  // Désactiver la capture en direct car nous avons déjà les images
                    require_id_number: false      // Ne pas demander le numéro d'ID
                }
            },
            metadata: verificationOptions.metadata
        });

        // Attacher les documents téléchargés à la session de vérification
        // Note: Cette partie utilise l'API non documentée de Stripe pour attacher des documents préexistants
        // Il est préférable de contacter Stripe pour confirmer la méthode officielle
        const verificationUpdateData = {
            uploaded_document: {
                front: documentFile.id
            }
        };

        // Ajouter la selfie si elle existe
        if (selfieFile) {
            verificationUpdateData.uploaded_selfie = selfieFile.id;
        }

        try {
            await stripe.identity.verificationSessions.update(
                verificationSession.id,
                verificationUpdateData
            );
        } catch (error) {
            console.error('Erreur lors de l\'attachement des documents à la session:', error);
            // Même en cas d'erreur ici, on continue car le client_secret peut toujours être utilisé
            // pour la vérification côté client
        }

        // Mettre à jour l'utilisateur
        user.stripeVerificationSessionId = verificationSession.id;
        user.stripeIdentityDocumentId = documentFile.id;
        user.stripeVerificationStatus = 'processing';
        user.stripeIdentityVerificationDate = new Date();
        await user.save();

        return res.status(200).json({
            success: true,
            message: 'Documents téléchargés et session de vérification créée',
            clientSecret: verificationSession.client_secret,
            sessionId: verificationSession.id
        });
        
    } catch (error) {
        console.error('Erreur détaillée de vérification d\'identité:', error);
        return res.status(500).json({
            success: false,
            message: 'Erreur lors du processus de vérification',
            error: error.message
        });
    }
};

// Fonction améliorée pour vérifier le statut d'une session de vérification
exports.checkIdentityVerificationStatus = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        
        if (!user.stripeVerificationSessionId) {
            return res.status(400).json({
                success: false,
                message: 'Aucune session de vérification en cours'
            });
        }

        // Récupérer le statut de la session de vérification
        const verificationSession = await stripe.identity.verificationSessions.retrieve(
            user.stripeVerificationSessionId
        );

        console.log('Statut de vérification:', verificationSession.status, verificationSession);

        // Mettre à jour le statut dans la base de données
        user.stripeVerificationStatus = verificationSession.status;
        user.stripeIdentityVerified = verificationSession.status === 'verified';
        
        if (verificationSession.status === 'verified') {
            user.stripeIdentityVerificationDate = new Date();
            
            // Si l'utilisateur n'est pas déjà vérifié pour les paiements,
            // vous pourriez mettre à jour son statut de capacité Stripe ici
            if (user.stripeAccountId && !user.stripePaymentsVerified) {
                try {
                    // Mettre à jour les capacités du compte pour activer les paiements
                    await stripe.accounts.update(user.stripeAccountId, {
                        capabilities: {
                            card_payments: { requested: true },
                            transfers: { requested: true }
                        }
                    });
                    
                    user.stripePaymentsVerified = true;
                } catch (stripeError) {
                    console.error('Erreur lors de la mise à jour des capacités Stripe:', stripeError);
                    // Ne pas bloquer le processus si cette mise à jour échoue
                }
            }
        }

        await user.save();

        return res.status(200).json({
            success: true,
            status: verificationSession.status,
            verified: verificationSession.status === 'verified',
            lastUpdated: user.stripeIdentityVerificationDate,
            details: {
                verified_outputs: verificationSession.verified_outputs || null,
                requirements: verificationSession.requirements || null
            }
        });
        
    } catch (error) {
        console.error('Erreur détaillée de vérification du statut:', error);
        return res.status(500).json({
            success: false,
            message: 'Impossible de vérifier le statut',
            error: error.message
        });
    }
};