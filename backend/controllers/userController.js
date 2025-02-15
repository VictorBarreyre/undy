const User = require('../models/User');
const RefreshToken = require('../models/RefreshToken');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const path = require('path'); // Ajoutez cette ligne en haut du fichier
const fs = require('fs');

// Fonction pour générer les tokens
const generateTokens = (userId) => {
    const accessToken = jwt.sign({ id: userId }, process.env.JWT_SECRET, {
        expiresIn: '1h', // Access token expire après 1 heure
    });

    const refreshToken = jwt.sign({ id: userId }, process.env.REFRESH_TOKEN_SECRET, {
        expiresIn: '7d', // Refresh token expire après 7 jours
    });

    return { accessToken, refreshToken };
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

        const { accessToken, refreshToken } = generateTokens(user._id);

        res.status(201).json({
            _id: user._id,
            name: user.name,
            email: user.email,
            profilePicture: user.profilePicture,
            token: accessToken,          // Envoyer l'access token
            refreshToken: refreshToken
        });
    } catch (error) {
        console.error('Erreur lors de l\'inscription :', error);
        res.status(500).json({ message: 'Erreur lors de l\'inscription' });
    }
};

exports.refreshToken = async (req, res) => {
    try {
        const { refreshToken } = req.body;

        if (!refreshToken) {
            return res.status(400).json({ message: 'Refresh token manquant' });
        }

        // Vérifier le refresh token
        let decoded;
        try {
            decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
        } catch (err) {
            return res.status(401).json({ message: 'Refresh token invalide ou expiré' });
        }
        
        // Vérifier si le token existe en base et n'est pas expiré
        const storedToken = await RefreshToken.findOne({ 
            userId: decoded.id,
            token: refreshToken,
            expiresAt: { $gt: new Date() }
        });

        if (!storedToken) {
            // Supprimer les tokens expirés
            await RefreshToken.deleteMany({ 
                userId: decoded.id,
                expiresAt: { $lte: new Date() }
            });
            return res.status(401).json({ message: 'Refresh token invalide ou expiré' });
        }

        // Générer un nouveau access token
        const accessToken = jwt.sign(
            { id: decoded.id },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        // Générer un nouveau refresh token
        const newRefreshToken = jwt.sign(
            { id: decoded.id },
            process.env.REFRESH_TOKEN_SECRET,
            { expiresIn: '7d' }
        );

        // Mettre à jour le refresh token en base
        await RefreshToken.findByIdAndUpdate(storedToken._id, {
            token: newRefreshToken,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        });

        res.json({ 
            accessToken,
            refreshToken: newRefreshToken,

            message: 'Tokens rafraîchis avec succès'

        });
    } catch (error) {
        console.error('Erreur refresh token:', error);
        res.status(401).json({ message: 'Erreur lors du refresh token' });
    }
};

exports.loginUser = async (req, res) => {
    let { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: 'Tous les champs sont requis.' });
    }

    try {
        email = email.trim().toLowerCase();
        const user = await User.findOne({ email });

        if (!user || !(await user.matchPassword(password))) {
            return res.status(400).json({ message: 'Email ou mot de passe incorrect' });
        }

        // Générer les tokens
        const { accessToken, refreshToken } = generateTokens(user._id);

        // Sauvegarder le refresh token
        await RefreshToken.create({
            userId: user._id,
            token: refreshToken,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 jours
        });

        res.json({
            _id: user._id,
            name: user.name,
            email: user.email,
            token: accessToken,
            refreshToken: refreshToken
        });
    } catch (error) {
        console.error('Erreur lors de la connexion :', error);
        res.status(500).json({ message: 'Erreur lors de la connexion' });
    }
};

exports.googleLogin = async (req, res) => {
    try {
        const { token } = req.body;
        
        // Vérifier le token Google
        const ticket = await googleClient.verifyIdToken({
            idToken: token,
            audience: GOOGLE_CLIENT_ID,
        });
        
        const payload = ticket.getPayload();
        const { email, name, picture } = payload;

        // Rechercher ou créer l'utilisateur
        let user = await User.findOne({ email });
        
        if (!user) {
            user = await User.create({
                email,
                name,
                profilePicture: picture,
                // Autres champs par défaut
            });
        }

        // Générer les tokens
        const accessToken = generateAccessToken(user);
        const refreshToken = generateRefreshToken(user);

        res.json({
            token: accessToken,
            refreshToken,
            user: {
                id: user._id,
                email: user.email,
                name: user.name,
            }
        });
    } catch (error) {
        res.status(400).json({ message: 'Échec de la connexion Google' });
    }
};

exports.getUserProfile = async (req, res) => {
    try {
        const user = req.user;
        const baseUrl = `${req.protocol}://${req.get('host')}`;

        // Si l'utilisateur a un compte Stripe actif, récupérer les infos supplémentaires
        let stripeData = {};
        if (user.stripeAccountId && user.stripeAccountStatus === 'active') {
            try {
                const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
                
                // Récupérer le compte Stripe
                const account = await stripe.accounts.retrieve(user.stripeAccountId);
                
                // Récupérer le solde
                const balance = await stripe.balance.retrieve({
                    stripeAccount: user.stripeAccountId
                });

                // Calculer le total des revenus (disponible + en attente)
                const available = balance.available.reduce((sum, bal) => sum + bal.amount, 0);
                const pending = balance.pending.reduce((sum, bal) => sum + bal.amount, 0);
                const totalEarnings = (available + pending) / 100; // Conversion en euros

                // Récupérer l'IBAN (si disponible)
                let externalAccount = null;
                if (account.external_accounts && account.external_accounts.data.length > 0) {
                    const bankAccount = account.external_accounts.data[0];
                    externalAccount = `****${bankAccount.last4}`;
                }

                stripeData = {
                    totalEarnings,
                    stripeExternalAccount: externalAccount
                };

                // Mettre à jour l'utilisateur avec les nouvelles données
                await User.findByIdAndUpdate(user._id, {
                    totalEarnings,
                    stripeExternalAccount: externalAccount
                });
            } catch (stripeError) {
                console.error('Erreur lors de la récupération des données Stripe:', stripeError);
            }
        }

        res.json({
            _id: user._id,
            name: user.name,
            email: user.email,
            profilePicture: user.profilePicture ? `${baseUrl}${user.profilePicture}` : null,
            birthdate: user.birthdate,
            totalEarnings: user.totalEarnings, // Ajoutez cette ligne
            phone: user.phone,
            notifs: user.notifs,
            contacts: user.contacts,
            subscriptions: user.subscriptions,
            stripeAccountId: user.stripeAccountId,
            stripeAccountStatus: user.stripeAccountStatus,
            stripeOnboardingComplete: user.stripeOnboardingComplete,
            ...stripeData // Ajoute totalEarnings et stripeExternalAccount si disponibles
        });
    } catch (error) {
        console.error('Erreur lors de la récupération du profil utilisateur:', error);
        res.status(500).json({ message: 'Erreur lors de la récupération du profil utilisateur' });
    }
};

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

exports.getUserTransactions = async (req, res) => {
    try {
        const user = req.user;
        
        if (!user.stripeAccountId) {
            return res.status(400).json({ message: 'Compte Stripe non configuré' });
        }
        
        const transactions = await stripe.balanceTransactions.list({
            stripeAccount: user.stripeAccountId,
        });
        
        // Transformer les données
        const formattedTransactions = transactions.data.map(transaction => ({
            id: transaction.id,
            grossAmount: transaction.amount ? transaction.amount / 100 : 0, // Vérification de amount
            fees: transaction.fee ? transaction.fee / 100 : 0, // Vérification de fee
            netAmount: transaction.net ? transaction.net / 100 : 0, // Vérification de net
            date: transaction.created 
                ? new Date(transaction.created * 1000).toLocaleDateString('fr-FR') 
                : 'Date non disponible',
            status: transaction.status || 'Statut inconnu',
            type: transaction.type || 'Type inconnu'
        }));
        
        res.json(formattedTransactions);
    } catch (error) {
        console.error('Erreur lors de la récupération des transactions :', error);
        res.status(500).json({ message: 'Erreur lors de la récupération des transactions', errorDetails: error.message });
    }
};

exports.createTransferIntent = async (req, res) => {
    try {
        const user = req.user;
        const { amount } = req.body;

        if (!user.stripeAccountId) {
            return res.status(400).json({ message: 'Compte Stripe non configuré' });
        }

        const transferIntent = await stripe.transfers.create({
            amount: Math.round(amount * 100), // Montant en centimes
            currency: 'eur',
            destination: user.stripeAccountId,
        });

        res.json({ clientSecret: transferIntent.client_secret });
    } catch (error) {
        console.error('Erreur lors de la création de l\'intention de virement :', error);
        res.status(500).json({ message: 'Erreur lors de la création de l\'intention de virement' });
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

            // Générer un nouveau token après la mise à jour
            const { accessToken } = generateTokens(updatedUser._id);

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
                token: accessToken, // Utiliser le nouvel access token
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
        if (!req.file) {
            return res.status(400).json({ message: 'Aucun fichier envoyé.' });
        }

        const user = req.user;
        
        // Vérifier la taille du fichier
        if (req.file.size > 5 * 1024 * 1024) { // 5MB
            return res.status(400).json({ message: 'Le fichier est trop volumineux.' });
        }

        // Convertir en base64 avec le type MIME
        const base64Image = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;

        // Mettre à jour l'utilisateur
        user.profilePicture = base64Image;
        await user.save();

        res.status(200).json({
            message: 'Photo de profil mise à jour avec succès.',
            profilePicture: base64Image, // S'assurer que c'est l'URL complète
            // Ajouter d'autres données utilisateur si nécessaire
            user: {
                ...user.toObject(),
                profilePicture: base64Image
            }
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