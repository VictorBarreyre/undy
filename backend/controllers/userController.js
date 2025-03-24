const User = require('../models/User');
const RefreshToken = require('../models/RefreshToken');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const path = require('path'); // Ajoutez cette ligne en haut du fichier
const fs = require('fs');
const appleSignin = require('apple-signin-auth');
const { OAuth2Client } = require('google-auth-library');
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const axios = require('axios');



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

exports.appleLogin = async (req, res) => {
    console.log('---------- APPLE LOGIN START ----------');
    console.log('Request received:', {
        headers: req.headers,
        method: req.method,
        path: req.path
    });
    
    try {
        console.log('Request body:', req.body);
        const { identityToken, authorizationCode, fullName } = req.body;
        
        console.log('Extracted data:', {
            hasIdentityToken: !!identityToken,
            hasAuthCode: !!authorizationCode,
            fullName
        });

        // Validate input
        if (!identityToken) {
            console.log('ERROR: Missing Apple token');
            return res.status(400).json({ 
                success: false,
                code: 'MISSING_TOKEN',
                message: 'Missing Apple token' 
            });
        }

        // Configure Apple verification
        const appleVerifyOptions = {
            clientId: process.env.APPLE_SERVICE_ID,
            teamId: process.env.APPLE_TEAM_ID,
        };
        
        // Check for missing configuration
        if (!process.env.APPLE_SERVICE_ID || !process.env.APPLE_TEAM_ID) {
            console.error('ERROR: Missing Apple configuration');
            return res.status(500).json({
                success: false,
                code: 'CONFIGURATION_ERROR',
                message: 'Server configuration error'
            });
        }
        
        console.log('Verification options:', {
            clientId: process.env.APPLE_SERVICE_ID ? '[CONFIGURED]' : '[MISSING]',
            teamId: process.env.APPLE_TEAM_ID ? '[CONFIGURED]' : '[MISSING]'
        });

        try {
            console.log('Attempting to verify Apple token');
            // Verify Apple identity token
            const appleUser = await appleSignin.verifyIdToken(identityToken, appleVerifyOptions);
            
            if (!appleUser) {
                throw new Error('Token verification returned empty result');
            }
            
            console.log('Verification successful, data obtained:', {
                sub: appleUser.sub,
                hasEmail: !!appleUser.email
            });

            // Extract email and Apple ID
            const { sub: appleId, email } = appleUser;

            // Search for existing user
            console.log('Searching for existing user with:', {
                email,
                appleId
            });
            
            let user = await User.findOne({
                $or: [
                    { email },
                    { 'appleId': appleId }
                ]
            });
            
            console.log('User found:', user ? 'Yes' : 'No');

            // If user doesn't exist, create new account
            if (!user) {
                console.log('Creating new user');
                
                // Generate a secure random password
                const hashedPassword = await bcrypt.hash(appleId + Date.now().toString(), 10);
                
                // Use fallback values if data is missing
                const emailToUse = email || `${appleId}@apple.user.temp`;
                const nameToUse = fullName?.givenName || 'Apple User';
                
                const newUser = {
                    email: emailToUse,
                    name: nameToUse,
                    appleId: appleId,
                    password: hashedPassword
                };
                
                console.log('New user data:', {
                    email: newUser.email,
                    name: newUser.name,
                    hasAppleId: !!newUser.appleId
                });
                
                try {
                    user = await User.create(newUser);
                    console.log('New user created with ID:', user._id);
                } catch (createError) {
                    console.error('User creation error:', createError);
                    
                    // Check for duplicate email error
                    if (createError.code === 11000) {
                        return res.status(409).json({
                            success: false,
                            code: 'DUPLICATE_EMAIL',
                            message: 'Email already in use'
                        });
                    }
                    
                    throw createError;
                }
            } else {
                console.log('Existing user found:', {
                    id: user._id,
                    email: user.email,
                    hasAppleId: !!user.appleId
                });
                
                // Update Apple ID if needed
                if (!user.appleId) {
                    console.log('Updating Apple ID for existing user');
                    user.appleId = appleId;
                    await user.save();
                }
            }

            // Generate authentication tokens
            console.log('Generating authentication tokens');
            const { accessToken, refreshToken } = generateTokens(user._id);

            // Save refresh token
            console.log('Saving refresh token');
            try {
                await RefreshToken.create({
                    userId: user._id,
                    token: refreshToken,
                    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
                });
            } catch (tokenError) {
                console.error('Error saving refresh token:', tokenError);
                // Continue anyway, not critical
            }

            console.log('Sending response to client');
            res.json({
                success: true,
                _id: user._id,
                name: user.name,
                email: user.email,
                token: accessToken,
                refreshToken: refreshToken
            });
            console.log('---------- APPLE LOGIN END (SUCCESS) ----------');

        } catch (verifyError) {
            console.error('APPLE VERIFICATION ERROR DETAILS:', verifyError);
            console.error('Message:', verifyError.message);
            console.error('Stack:', verifyError.stack);
            console.log('---------- APPLE LOGIN END (VERIFICATION ERROR) ----------');
            
            // Check for specific verification errors
            if (verifyError.message.includes('jwt expired')) {
                return res.status(401).json({ 
                    success: false,
                    code: 'TOKEN_EXPIRED',
                    message: 'Apple token expired',
                    details: 'Please try signing in again'
                });
            }
            
            return res.status(400).json({ 
                success: false,
                code: 'VERIFICATION_FAILED',
                message: 'Apple verification failed',
                details: verifyError.message
            });
        }

    } catch (error) {
        console.error('GENERAL APPLE LOGIN ERROR:', error);
        
        if (error.name === 'AppleSignInError') {
            return res.status(400).json({ 
                success: false,
                code: 'APPLE_AUTH_FAILED',
                message: 'Apple authentication failed',
                shouldRetry: true
            });
        }
        
        if (error.code === 'ERR_NETWORK') {
            return res.status(500).json({ 
                success: false,
                code: 'NETWORK_ERROR',
                message: 'Network connection problem',
                shouldRetry: true
            });
        }
        
        res.status(500).json({ 
            success: false,
            code: 'UNKNOWN_ERROR',
            message: 'Internal error during Apple login',
            shouldRetry: false
        });
        
        console.log('---------- APPLE LOGIN END (ERROR) ----------');
    }
};


exports.handleAppleNotifications = async (req, res) => {
    try {
        const notification = req.body;
        console.log('Notification Apple reçue:', notification);
        
        // Traiter selon le type de notification
        if (notification.type === 'email-disabled') {
            // Gérer l'email désactivé
        } else if (notification.type === 'account-delete') {
            // Gérer la suppression de compte
        }
        
        res.status(200).send();
    } catch (error) {
        console.error('Erreur lors du traitement de la notification Apple:', error);
        res.status(500).send();
    }
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
        
        // Vérifier s'il s'agit d'une erreur de validation MongoDB
        if (error.name === 'ValidationError') {
            const validationErrors = {};
            
            // Extraire les champs spécifiques en erreur
            for (const field in error.errors) {
                validationErrors[field] = error.errors[field].message;
            }
            
            // S'il y a une erreur d'email spécifique
            if (validationErrors.email) {
                return res.status(400).json({ 
                    message: 'Adresse email invalide',
                    field: 'email',
                    details: validationErrors.email
                });
            }
            
            // Erreur de validation générique
            return res.status(400).json({
                message: 'Données d\'inscription invalides',
                validationErrors
            });
        }
        
        // Erreur spécifique liée au format de l'email
        if (error.message && error.message.includes('email')) {
            return res.status(400).json({
                message: 'Format d\'email invalide',
                field: 'email'
            });
        }
        
        // Erreur serveur générique avec plus de détails
        res.status(500).json({ 
            message: 'Erreur lors de l\'inscription', 
            details: error.message 
        });
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
    console.log('---------- GOOGLE LOGIN START ----------');
    console.log('Request received');
    console.log('Request body:', req.body);

    try {
        const { token, tokenType, userData } = req.body;
        
        console.log('Token received:', token ? 'Present' : 'Absent');
        console.log('Token type:', tokenType);
        console.log('User data:', userData);

        if (!token) {
            return res.status(400).json({ 
                success: false,
                code: 'MISSING_TOKEN',
                message: 'Missing Google token',
                details: 'No token was sent'
            });
        }

        let email, name, picture, googleId;
        
        if (tokenType === 'access_token') {
            try {
                // Use the access token to verify with Google
                console.log('Verifying access token with Google API');
                const response = await axios.get('https://www.googleapis.com/oauth2/v3/userinfo', {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                });
                
                // Extract user information
                email = response.data.email;
                name = response.data.name;
                picture = response.data.picture;
                googleId = response.data.sub || userData?.id;
                
                console.log('Google info retrieved via access token:', { 
                    hasEmail: !!email, 
                    hasName: !!name 
                });
                
                if (!email) {
                    throw new Error('Could not retrieve email');
                }
            } catch (error) {
                console.error('Google verification error:', error);
                
                // Categorize errors
                if (error.response && error.response.status === 401) {
                    return res.status(401).json({ 
                        success: false,
                        code: 'GOOGLE_AUTH_FAILED',
                        message: 'Google authentication failed',
                        shouldRetry: true
                    });
                }
                
                if (error.code === 'ERR_NETWORK') {
                    return res.status(500).json({ 
                        success: false,
                        code: 'NETWORK_ERROR',
                        message: 'Network connection problem',
                        shouldRetry: true
                    });
                }
                
                return res.status(500).json({ 
                    success: false,
                    code: 'VERIFICATION_ERROR',
                    message: 'Google verification error',
                    details: error.message,
                    shouldRetry: false
                });
            }
        } else {
            return res.status(400).json({
                success: false,
                code: 'INVALID_TOKEN_TYPE',
                message: 'Invalid token type',
                details: 'This server only accepts access_token type'
            });
        }

        // Search for user by email
        console.log('Searching for user by email:', email);
        let user = await User.findOne({ email });
        
        if (!user) {
            console.log('User not found, creating new account');
            // Generate a secure random password for Google users
            const randomPassword = await bcrypt.hash(googleId + Date.now().toString(), 10);
            
            // Create new user
            try {
                user = await User.create({
                    email,
                    name,
                    googleId,
                    profilePicture: picture,
                    password: randomPassword
                });
                console.log('New Google user created with ID:', user._id);
            } catch (createError) {
                console.error('User creation error:', createError);
                
                // Check for duplicate email error
                if (createError.code === 11000) {
                    return res.status(409).json({
                        success: false,
                        code: 'DUPLICATE_EMAIL',
                        message: 'Email already in use',
                        details: 'This email is already registered with a different method'
                    });
                }
                
                throw createError;
            }
        } else {
            console.log('Existing user found with ID:', user._id);
            // Update Google ID if not already set
            if ('googleId' in user.schema.paths && !user.googleId) {
                user.googleId = googleId;
                await user.save();
                console.log('Updated Google ID for existing user');
            }
        }

        // Generate authentication tokens for your application
        console.log('Generating authentication tokens');
        const { accessToken, refreshToken } = generateTokens(user._id);
        
        // Save the refresh token
        try {
            await RefreshToken.create({
                userId: user._id,
                token: refreshToken,
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
            });
            console.log('Refresh token saved');
        } catch (tokenError) {
            console.error('Error saving refresh token:', tokenError);
            // Continue anyway, not critical
        }

        // Return the response
        console.log('Sending successful response');
        res.json({
            success: true,
            _id: user._id,
            name: user.name,
            email: user.email,
            profilePicture: user.profilePicture,
            token: accessToken,
            refreshToken: refreshToken
        });
        
        console.log('---------- GOOGLE LOGIN END (SUCCESS) ----------');
    } catch (error) {
        console.error('General Google login error:', error);
        
        const errorResponse = { 
            success: false,
            message: 'Internal error during Google login',
            details: error.message 
        };
        
        // Add stack trace in development environment
        if (process.env.NODE_ENV === 'development') {
            errorResponse.stack = error.stack;
        }
        
        res.status(500).json(errorResponse);
        console.log('---------- GOOGLE LOGIN END (ERROR) ----------');
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
            profilePicture: user.profilePicture || null,
            birthdate: user.birthdate,
            totalEarnings: user.totalEarnings, // Ajoutez cette ligne
            phone: user.phone,
            notifs: user.notifs,
            contacts: user.contacts,
            subscriptions: user.subscriptions,
            hasSubscriptions:user.hasSubscriptions,
            stripeAccountId: user.stripeAccountId,
            stripeAccountStatus: user.stripeAccountStatus,
            stripeOnboardingComplete: user.stripeOnboardingComplete,
            stripeIdentityVerified: user.stripeIdentityVerified,
            stripeIdentityVerificationStatus: user.stripeIdentityVerificationStatus,
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

        // Récupérer le solde actuel
        const balance = await stripe.balance.retrieve({
            stripeAccount: user.stripeAccountId,
        });

        // Calculer les totaux du solde
        const available = balance.available.reduce((sum, bal) => sum + bal.amount, 0) / 100;
        const pending = balance.pending.reduce((sum, bal) => sum + bal.amount, 0) / 100;

        // Récupérer les transactions
        const transactions = await stripe.balanceTransactions.list({
            stripeAccount: user.stripeAccountId,
        });

        // Transformer les transactions
        const formattedTransactions = transactions.data.map(transaction => ({
            id: transaction.id,
            grossAmount: transaction.amount ? transaction.amount / 100 : 0,
            fees: transaction.fee ? transaction.fee / 100 : 0,
            netAmount: transaction.net ? transaction.net / 100 : 0,
            date: transaction.created 
                ? new Date(transaction.created * 1000).toLocaleDateString('fr-FR')
                : 'Date non disponible',
                status: transaction.status === 'available' ? 'succeeded' : transaction.status,
                type: transaction.type === 'payout' ? 'transfer' : transaction.type,
            description: transaction.description
        }));

        console.log(formattedTransactions)

        // Calculer les totaux des transactions
        const totals = formattedTransactions.reduce((acc, transaction) => {
            // Calculer le total des ventes (revenus bruts)
            if (transaction.type === 'charge') {
                acc.totalSales += transaction.grossAmount;
            }
            
            // Calculer les revenus transférés
            if (transaction.type === 'transfer') {
                acc.transferredAmount += transaction.netAmount;
            }
            
            return acc;
        }, { 
            totalSales: 0,
            transferredAmount: 0
        });

        // Renvoyer toutes les informations
        res.json({
            balance: {
                available,
                pending,
                total: available + pending
            },
            transactions: formattedTransactions,
            stats: {
                totalSales: totals.totalSales, // Total des ventes
                transferredAmount: totals.transferredAmount, // Montant transféré
                availableBalance: available, // Solde disponible pour transfert
                pendingBalance: pending // Solde en attente
            }
        });

    } catch (error) {
        console.error('Erreur lors de la récupération des transactions :', error);
        res.status(500).json({ 
            message: 'Erreur lors de la récupération des transactions', 
            errorDetails: error.message 
        });
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
        const user = await User.findById(userId)
                             .select('name email profilePicture bio stripeAccountId stripeAccountStatus totalEarnings subscriptions');
        
        if (!user) {
            return res.status(404).json({ error: 'Utilisateur non trouvé' });
        }

        // Compte les abonnés
        const subscribersCount = await User.countDocuments({ 
            'subscriptions.creator': userId 
        });

        // Compte les abonnements différemment
        const subscriptionsCount = user.subscriptions ? user.subscriptions.length : 0;

        const userData = {
            _id: user._id,
            name: user.name,
            email: user.email,
            profilePicture: user.profilePicture,
            bio: user.bio || "",
            stripeAccountStatus: user.stripeAccountStatus,
            totalEarnings: user.totalEarnings || 0,
            stats: {
                subscribers: subscribersCount,
                subscriptions: subscriptionsCount
            },
            isSubscriptionAvailable: user.stripeAccountStatus === 'active',
            subscriptionPrice: 9.99
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
            if (req.body.contacts !== undefined) {
                user.contacts = !!req.body.contacts; // Forcer en booléen
              }
             user.subscriptions = req.body.subscriptions !== undefined ? req.body.subscriptions : user.subscriptions;
            if (req.body.location !== undefined) {
                user.location = !!req.body.location; // Forcer en booléen
              }
        

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
                location: updatedUser.location, 
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


// Dans userController.js
exports.checkContactsInApp = async (req, res) => {
    try {
      const { phoneNumbers } = req.body;
      
      if (!phoneNumbers || !Array.isArray(phoneNumbers)) {
        return res.status(400).json({ message: 'Liste de numéros invalide' });
      }
      
      // Rechercher les utilisateurs avec ces numéros de téléphone
      const usersWithPhones = await User.find({
        phone: { $in: phoneNumbers }
      }).select('phone');
      
      // Extraire uniquement les numéros
      const usersPhoneNumbers = usersWithPhones.map(user => 
        user.phone.replace(/\D/g, '')
      );
      
      res.json({ usersPhoneNumbers });
    } catch (error) {
      console.error('Erreur lors de la vérification des contacts:', error);
      res.status(500).json({ message: 'Erreur serveur' });
    }
  };


// Dans votre contrôleur utilisateur
exports.verifyStripeIdentity = async (req, res) => {
    try {
        const user = req.user;
        const file = req.file;

        if (!file) {
            return res.status(400).json({ success: false, message: 'Aucun fichier uploadé' });
        }

        // Vérifier que l'utilisateur a un compte Stripe
        if (!user.stripeAccountId) {
            return res.status(400).json({ success: false, message: 'Compte Stripe non configuré' });
        }

        const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

        try {
            // Créer un document de vérification Stripe
            const verificationDocument = await stripe.files.create({
                purpose: 'identity_document',
                file: {
                    data: file.buffer,
                    name: file.originalname,
                    type: file.mimetype
                }
            }, {
                stripeAccount: user.stripeAccountId
            });

            // Mettre à jour l'utilisateur
            user.stripeIdentityVerified = false;
            user.stripeIdentityDocumentId = verificationDocument.id;
            await user.save();

            // Répondre avec succès
            return res.status(200).json({ 
                success: true, 
                message: 'Document soumis avec succès. Vérification en cours.' 
            });

        } catch (stripeError) {
            console.error('Erreur Stripe:', stripeError);
            return res.status(500).json({ 
                success: false, 
                message: 'Erreur lors de la soumission du document' 
            });
        }
    } catch (error) {
        console.error('Erreur de vérification d\'identité:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Erreur interne du serveur' 
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