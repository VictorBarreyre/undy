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
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);



// Fonction pour générer les tokens
const generateTokens = (userId) => {
    const accessToken = jwt.sign({ id: userId }, process.env.JWT_SECRET, {
        expiresIn: '24h', // Augmenter à 24 heures
    });

    const refreshToken = jwt.sign({ id: userId }, process.env.REFRESH_TOKEN_SECRET, {
        expiresIn: '30d', // 30 jours pour le refresh token
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
                const nameToUse = 
                (fullName && fullName.givenName && fullName.familyName) ? `${fullName.givenName} ${fullName.familyName}` :
                (fullName && fullName.givenName) ? fullName.givenName :
                'Apple User';
                
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
        
        // Vérifier si le token existe dans la base de données
        const tokenDoc = await RefreshToken.findOne({ token: refreshToken });
        
        if (!tokenDoc) {
            return res.status(401).json({ message: 'Refresh token invalide' });
        }
        
        // Vérifier si le token n'est pas expiré
        if (new Date() > new Date(tokenDoc.expiresAt)) {
            await RefreshToken.deleteOne({ _id: tokenDoc._id });
            return res.status(401).json({ message: 'Refresh token expiré' });
        }
        
        // Vérifier et décoder le token
        try {
            const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
            
            // Générer de nouveaux tokens
            const { accessToken, refreshToken: newRefreshToken } = generateTokens(decoded.id);
            
            // Supprimer l'ancien refresh token
            await RefreshToken.deleteOne({ _id: tokenDoc._id });
            
            // Créer le nouveau
            await RefreshToken.create({
                userId: decoded.id,
                token: newRefreshToken,
                expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
            });
            
            // IMPORTANT: Utiliser les bons noms de propriétés
            return res.json({ 
                accessToken, 
                refreshToken: newRefreshToken // Pas "newRefreshToken"
            });
            
        } catch (error) {
            console.error('Erreur de vérification du refresh token:', error);
            return res.status(401).json({ message: 'Refresh token invalide ou expiré' });
        }
    } catch (error) {
        console.error('Erreur lors du rafraîchissement du token:', error);
        res.status(500).json({ message: 'Erreur interne du serveur' });
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

// Fonction pour synchroniser en masse les données manquantes depuis Stripe
exports.syncMissingDataFromStripe = async (req, res) => {
    try {
      // Chercher les utilisateurs avec un compte Stripe et dont l'identité est vérifiée
      const users = await User.find({
        stripeAccountId: { $exists: true, $ne: null },
        stripeIdentityVerified: true,
        $or: [
          { phone: { $exists: false } },
          { birthdate: { $exists: false } }
          // On pourrait ajouter d'autres critères si nécessaire
        ]
      });
      
      let updatedCount = 0;
      let updatedFields = {
        phone: 0,
        name: 0,
        birthdate: 0
      };
      
      for (const user of users) {
        try {
          const stripeAccount = await stripe.accounts.retrieve(user.stripeAccountId);
          let updated = false;
          
          // Vérifier si on a des données individual (nécessaires pour la plupart des informations)
          if (stripeAccount.individual) {
            // Mise à jour du téléphone si disponible
            if (!user.phone && stripeAccount.individual.phone) {
              user.phone = stripeAccount.individual.phone;
              updatedFields.phone++;
              updated = true;
            }
            
            // Mise à jour du nom complet si disponible et semble plus complet
            const stripeName = `${stripeAccount.individual.first_name || ''} ${stripeAccount.individual.last_name || ''}`.trim();
            if (stripeName && (!user.name || user.name.length < stripeName.length)) {
              user.name = stripeName;
              updatedFields.name++;
              updated = true;
            }
            
            // Mise à jour de la date de naissance si disponible
            if (!user.birthdate && stripeAccount.individual.dob) {
              const { day, month, year } = stripeAccount.individual.dob;
              if (day && month && year) {
                user.birthdate = new Date(year, month - 1, day); // Les mois en JS commencent à 0
                updatedFields.birthdate++;
                updated = true;
              }
            }
          }
          
          // Sauvegarde si des modifications ont été apportées
          if (updated) {
            await user.save();
            updatedCount++;
          }
        } catch (stripeError) {
          console.error(`Erreur lors de la récupération des données Stripe pour l'utilisateur ${user._id}: ${stripeError.message}`);
          // Continuer avec l'utilisateur suivant
        }
      }
      
      return res.status(200).json({
        success: true,
        message: `${updatedCount} utilisateurs mis à jour avec les données de Stripe`,
        details: updatedFields
      });
    } catch (error) {
      console.error(`Erreur lors de la synchronisation des données: ${error.message}`);
      return res.status(500).json({
        success: false,
        message: 'Erreur serveur lors de la synchronisation des données'
      });
    }
  };
  
  // Fonction utilitaire pour synchroniser un utilisateur spécifique
  exports.syncUserDataFromStripe = async (userId) => {
    try {
      const user = await User.findById(userId);
      
      if (!user || !user.stripeAccountId) {
        return { success: false, message: 'Utilisateur sans compte Stripe' };
      }
      
      const stripeAccount = await stripe.accounts.retrieve(user.stripeAccountId);
      let updated = false;
      let updatedFields = [];
      
      // On ne synchronise les données sensibles que si l'identité est vérifiée
      // On peut aussi synchroniser d'autres données moins sensibles même sans vérification
      const shouldSyncSensitiveData = user.stripeIdentityVerified || 
                                     (stripeAccount.payouts_enabled && 
                                      stripeAccount.charges_enabled);
      
      // Mise à jour du téléphone si manquant
      if (!user.phone && stripeAccount.individual && stripeAccount.individual.phone) {
        user.phone = stripeAccount.individual.phone;
        updatedFields.push('téléphone');
        updated = true;
      }
      
      // Si l'identité est vérifiée, synchroniser davantage de données
      if (shouldSyncSensitiveData && stripeAccount.individual) {
        // Mise à jour du nom complet si disponible et semble plus complet
        const stripeName = `${stripeAccount.individual.first_name || ''} ${stripeAccount.individual.last_name || ''}`.trim();
        if (stripeName && (!user.name || user.name.length < stripeName.length)) {
          user.name = stripeName;
          updatedFields.push('nom');
          updated = true;
        }
        
        // Mise à jour de la date de naissance si disponible
        if (!user.birthdate && stripeAccount.individual.dob) {
          const { day, month, year } = stripeAccount.individual.dob;
          if (day && month && year) {
            user.birthdate = new Date(year, month - 1, day);
            updatedFields.push('date de naissance');
            updated = true;
          }
        }
        
        // Mise à jour du pays si disponible
        if ((!user.country || user.country === 'FR') && stripeAccount.individual.address && stripeAccount.individual.address.country) {
          user.country = stripeAccount.individual.address.country;
          updatedFields.push('pays');
          updated = true;
        }
      }
      
      if (updated) {
        await user.save();
        return { 
          success: true, 
          message: `Données utilisateur mises à jour depuis Stripe: ${updatedFields.join(', ')}` 
        };
      } else {
        return { success: true, message: 'Aucune donnée mise à jour' };
      }
    } catch (error) {
      console.error(`Erreur lors de la synchronisation: ${error.message}`);
      return { success: false, error: error.message };
    }
  };
  
  exports.getUserProfile = async (req, res) => {
    try {
        const user = req.user;
        const baseUrl = `${req.protocol}://${req.get('host')}`;
        
        // Vérifier les paramètres de requête
        const includePhoneNumber = req.query.includePhoneNumber === 'true';
        const forceSync = req.query.forceSync === 'true';
        
        // Si l'utilisateur a un compte Stripe, tenter de synchroniser les données
        let userUpdated = false;
        let stripeData = {};
        
        if (user.stripeAccountId) {
            try {
                // Récupérer le compte Stripe
                const account = await stripe.accounts.retrieve(user.stripeAccountId);
                
                // Préparer un objet pour les mises à jour potentielles
                let updateData = {};
                
                // Récupérer le téléphone à partir de business_profile.support_phone en priorité
                const stripePhone = account.business_profile?.support_phone || 
                                   account.individual?.phone || 
                                   account.phone;
                
                // Synchroniser les données de l'utilisateur avec Stripe
                // Téléphone
                if (stripePhone) {
                    // Mettre à jour si forceSync est activé OU si le téléphone est différent
                    if (forceSync || !user.phone || user.phone !== stripePhone) {
                        updateData.phone = stripePhone;
                    }
                }
                
                // Nom complet
                const stripeName = `${account.individual?.first_name || ''} ${account.individual?.last_name || ''}`.trim();
                if (stripeName && stripeName.length > 0) {
                    // Mettre à jour si forceSync est activé OU si le nom est différent
                    if (forceSync || !user.name || user.name !== stripeName) {
                        updateData.name = stripeName;
                    }
                }
                
                // Date de naissance
                if (account.individual?.dob && account.individual.dob.day && account.individual.dob.month && account.individual.dob.year) {
                    const { day, month, year } = account.individual.dob;
                    const stripeBirthdate = new Date(year, month - 1, day); // Les mois en JS commencent à 0
                    
                    // Convertir les deux dates au format YYYY-MM-DD pour une comparaison fiable
                    const stripeDateStr = stripeBirthdate.toISOString().split('T')[0];
                    const userDateStr = user.birthdate ? user.birthdate.toISOString().split('T')[0] : '';
                    
                    // Mettre à jour si forceSync est activé OU si la date est différente
                    if (forceSync || !user.birthdate || userDateStr !== stripeDateStr) {
                        updateData.birthdate = stripeBirthdate;
                    }
                }
                
                // Pays (à partir de plusieurs sources possibles)
                const stripeCountry = account.individual?.address?.country || account.country || null;
                if (stripeCountry) {
                    // Mettre à jour si forceSync est activé OU si le pays est différent
                    if (forceSync || !user.country || user.country !== stripeCountry) {
                        updateData.country = stripeCountry;
                    }
                }
                
                // Effectuer la mise à jour si nécessaire
                if (Object.keys(updateData).length > 0) {
                    await User.findByIdAndUpdate(user._id, updateData);
                    userUpdated = true;
                    
                    // Mettre à jour l'objet user pour la réponse
                    Object.assign(user, updateData);
                }
                
                // Récupérer les données financières si le compte est actif
                if (user.stripeAccountStatus === 'active') {
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
                    
                    // Mettre à jour l'utilisateur avec les nouvelles données financières
                    await User.findByIdAndUpdate(user._id, {
                        totalEarnings,
                        stripeExternalAccount: externalAccount
                    });
                }
                
                // Ajouter le numéro de téléphone à stripeData si demandé
                if (includePhoneNumber && user.phone) {
                    stripeData.phoneNumber = user.phone;
                }
                
            } catch (stripeError) {
                console.error('Erreur lors de la récupération des données Stripe:', stripeError);
            }
        }
        
        // Si l'utilisateur a été mis à jour, récupérer les données fraîches
        const userData = userUpdated ? await User.findById(user._id) : user;
        
        res.json({
            _id: userData._id,
            name: userData.name,
            email: userData.email,
            profilePicture: userData.profilePicture || null,
            birthdate: userData.birthdate,
            totalEarnings: userData.totalEarnings,
            phone: includePhoneNumber ? userData.phone : undefined,
            notifs: userData.notifs,
            contacts: userData.contacts,
            subscriptions: userData.subscriptions,
            hasSubscriptions: userData.hasSubscriptions,
            stripeAccountId: userData.stripeAccountId,
            stripeAccountStatus: userData.stripeAccountStatus,
            stripeOnboardingComplete: userData.stripeOnboardingComplete,
            stripeIdentityVerified: userData.stripeIdentityVerified,
            stripeIdentityVerificationStatus: userData.stripeIdentityVerificationStatus,
            ...stripeData // Ajoute totalEarnings et stripeExternalAccount si disponibles
        });
    } catch (error) {
        console.error('Erreur lors de la récupération du profil utilisateur:', error);
        res.status(500).json({ message: 'Erreur lors de la récupération du profil utilisateur' });
    }
};

exports.getBankAccountDetails = async (req, res) => {
    try {
        const user = req.user;

        if (!user.stripeAccountId) {
            return res.status(400).json({ message: 'Compte Stripe non configuré' });
        }

        // Récupérer le compte Stripe
        const account = await stripe.accounts.retrieve(user.stripeAccountId);

        // Récupérer les comptes externes (comptes bancaires)
        const externalAccounts = await stripe.accounts.listExternalAccounts(
            user.stripeAccountId,
            { object: 'bank_account' }
        );

        if (externalAccounts.data.length === 0) {
            return res.status(404).json({ message: 'Aucun compte bancaire trouvé' });
        }

        const bankAccount = externalAccounts.data[0];

        res.json({
            bankName: bankAccount.bank_name,
            accountNumber: `****${bankAccount.last4}`,
            routingNumber: bankAccount.routing_number,
            country: bankAccount.country,
            currency: bankAccount.currency
        });
    } catch (error) {
        console.error('Erreur lors de la récupération des détails du compte bancaire :', error);
        res.status(500).json({ message: 'Erreur lors de la récupération des détails du compte bancaire' });
    }
};



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

exports.updateLanguage = async (req, res) => {
    try {
      const userId = req.user._id;
      const { language } = req.body;
      
      // Vérifier que la langue est valide
      if (!['fr', 'en'].includes(language)) {
        return res.status(400).json({
          success: false,
          message: 'Langue non supportée. Les langues disponibles sont: fr, en'
        });
      }
      
      // Mettre à jour la langue de l'utilisateur
      const updatedUser = await User.findByIdAndUpdate(
        userId,
        { language },
        { new: true }
      );
      
      if (!updatedUser) {
        return res.status(404).json({
          success: false,
          message: 'Utilisateur non trouvé'
        });
      }
      
      return res.status(200).json({
        success: true,
        message: 'Langue mise à jour avec succès',
        language: updatedUser.language
      });
    } catch (error) {
      console.error('Erreur lors de la mise à jour de la langue:', error);
      return res.status(500).json({
        success: false,
        message: 'Erreur serveur',
        error: error.message
      });
    }
  };
  