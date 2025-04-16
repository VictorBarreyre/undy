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
      const user = await User.findById(req.user.id).select('email phoneNumber country stripeAccountId stripeAccountStatus stripeOnboardingComplete');
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
          // Déterminer le pays en fonction du numéro de téléphone ou de la langue de l'utilisateur
          let country = 'FR'; // Valeur par défaut: France
          
          if (user.country) {
            // Si l'utilisateur a déjà un pays défini (ex: après vérification KYC), l'utiliser
            country = user.country;
            console.log(`Utilisation du pays de l'utilisateur: ${country}`);
          } else if (user.phoneNumber) {
            // Format international: +1 pour USA, +33 pour France
            if (user.phoneNumber.startsWith('+1')) {
              country = 'US';
              console.log("Numéro américain détecté, configuration pour les USA");
            } else if (user.phoneNumber.startsWith('+33')) {
              country = 'FR';
              console.log("Numéro français détecté, configuration pour la France");
            } else {
              console.log(`Format de numéro non reconnu: ${user.phoneNumber}, utilisation du pays par défaut: ${country}`);
            }
          } else {
            // Détection basée sur la langue de l'interface
            const preferredLocale = req.headers["accept-language"] || "fr";
            if (preferredLocale.startsWith("en")) {
              country = 'US'; // États-Unis pour anglophones
              console.log("Langue anglaise détectée, configuration suggérée pour les USA");
            } else {
              console.log(`Langue détectée: ${preferredLocale}, configuration suggérée pour la France`);
            }
          }
          
          const account = await stripe.accounts.create({
            type: 'express',
            country: country,
            email: user.email,
            capabilities: {
              card_payments: { requested: true },
              transfers: { requested: true }
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
            },
            tos_acceptance: {
              service_agreement: 'full'
            }
          });
  
          // Si le pays n'était pas déjà défini, le stocker
          if (!user.country) {
            user.country = country;
          }
  
          accountLink = await stripe.accountLinks.create({
            account: account.id,
            refresh_url: refreshUrl,
            return_url: returnUrl,
            type: 'account_onboarding',
            collect: 'eventually_due'
          });
  
          user.stripeAccountId = account.id;
          user.stripeAccountStatus = 'pending';
          user.stripeOnboardingComplete = false;
          user.lastStripeOnboardingUrl = accountLink.url;
  
          await user.save({ session });
  
          console.log('Utilisateur mis à jour avec compte Stripe:', {
            userId: user._id,
            stripeAccountId: user.stripeAccountId,
            country: user.country,
            status: user.stripeAccountStatus
          });
        } else {
          // L'utilisateur a un compte mais pas complètement configuré
          accountLink = await stripe.accountLinks.create({
            account: user.stripeAccountId,
            refresh_url: refreshUrl,
            return_url: returnUrl,
            type: 'account_onboarding',
            collect: 'eventually_due'
          });
  
          user.lastStripeOnboardingUrl = accountLink.url;
          await user.save({ session });
        }
  
        await session.commitTransaction();
        session.endSession();
  
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
        sellerStripeAccountId: user.stripeAccountId,
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
      session.endSession();
  
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
      session.endSession();
      console.error('Erreur détaillée lors de la création du secret:', {
        message: error.message,
        stack: error.stack,
        body: req.body
      });
      res.status(500).json({
        message: 'Erreur serveur lors de la création du secret',
        details: error.message
      });
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
      collect: 'eventually_due'
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

exports.handleStripeReturn = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ success: false, message: 'Utilisateur non trouvé' });
    }

    // Récupérer les informations à jour depuis Stripe
    if (user.stripeAccountId) {
      const stripeAccount = await stripe.accounts.retrieve(user.stripeAccountId);

      // Mise à jour des informations utilisateur basées sur Stripe
      user.stripeAccountStatus = stripeAccount.details_submitted ? 'active' : 'pending';
      user.stripeOnboardingComplete = stripeAccount.details_submitted;
      user.stripePayoutsEnabled = stripeAccount.payouts_enabled;
      user.stripeChargesEnabled = stripeAccount.charges_enabled;
      user.stripeIdentityVerified = stripeAccount.payouts_enabled;

      // Si l'utilisateur a un compte bancaire lié, enregistrer l'info
      if (stripeAccount.external_accounts && stripeAccount.external_accounts.data.length > 0) {
        const lastFour = stripeAccount.external_accounts.data[0].last4;
        const bankName = stripeAccount.external_accounts.data[0].bank_name;
        user.stripeExternalAccount = `${bankName} ****${lastFour}`;
      }

      await user.save();
    }

    return res.status(200).json({
      success: true,
      user: {
        stripeAccountId: user.stripeAccountId,
        stripeAccountStatus: user.stripeAccountStatus,
        stripeOnboardingComplete: user.stripeOnboardingComplete,
        stripeIdentityVerified: user.stripeIdentityVerified,
        stripeExternalAccount: user.stripeExternalAccount
      }
    });
  } catch (error) {
    console.error('Erreur lors du traitement du retour Stripe :', error);
    return res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};


exports.verifyIdentity = async (req, res) => {
    try {
      const { stripeAccountId, skipImageUpload, documentImage, selfieImage, documentType, documentSide } = req.body;
      const userId = req.user.id;
  
      // Vérifier que l'utilisateur demande une vérification pour son propre compte
      const user = await User.findById(userId).select('+stripeAccountId stripeAccountStatus stripeIdentityVerified phoneNumber');
  
      console.log("ID Stripe dans la base [" + user.stripeAccountId + "]");
      console.log("ID Stripe reçu dans la requête [" + stripeAccountId + "]");
      console.log("Les IDs sont égaux:", user.stripeAccountId === stripeAccountId);
  
      if (!user) {
        return res.status(404).json({ success: false, message: 'Utilisateur non trouvé' });
      }
  
      if (user.stripeAccountId) {
        if (user.stripeAccountId !== stripeAccountId) {
          return res.status(403).json({ success: false, message: 'Vous ne pouvez vérifier que votre propre compte' });
        }
      } else {
        // L'utilisateur n'a pas encore de stripeAccountId enregistré,
        // nous allons donc mettre à jour son profil avec l'ID fourni
        user.stripeAccountId = stripeAccountId;
        await user.save();
        console.log("Mise à jour du compte utilisateur avec le stripeAccountId:", stripeAccountId);
      }
  
      // Si l'utilisateur est déjà vérifié, on peut retourner un succès immédiat
      if (user.stripeIdentityVerified) {
        return res.status(200).json({
          success: true,
          message: 'Votre identité est déjà vérifiée',
          isAlreadyVerified: true
        });
      }
  
      // Retrouver le compte Stripe pour vérification
      const stripeAccount = await stripe.accounts.retrieve(user.stripeAccountId);
      if (!stripeAccount) {
        return res.status(404).json({ success: false, message: 'Compte Stripe introuvable' });
      }
  
      // Définir les URLs de retour avec paramètres de continuité
      const baseReturnUrl =
        process.env.NODE_ENV === 'production'
          ? `https://${req.get('host')}/redirect.html?path=`
          : process.env.FRONTEND_URL || 'hushy://stripe-return';
  
      const returnUrl = `${baseReturnUrl}?action=verify_complete&identity=true`;
      const refreshUrl = `${baseReturnUrl}?action=verify_refresh&identity=true`;
  
      // Créer une session de vérification Stripe Identity
      if (skipImageUpload) {
        // Méthode 1: Redirection vers le portail de vérification Stripe
        const verificationOptions = {
          type: 'document',
          metadata: {
            userId: userId.toString(),
            phoneNumber: user.phoneNumber || 'not_provided'
          },
          options: {
            document: {
              allowed_types: ['driving_license', 'id_card', 'passport'],
              require_id_number: true,
              require_live_capture: true,
              require_matching_selfie: true
            }
          },
          return_url: returnUrl,
          refresh_url: refreshUrl
        };
  
        // Créer la session de vérification
        const verificationSession = await stripe.identity.verificationSessions.create(verificationOptions);
  
        // Sauvegarder l'ID de session pour référence ultérieure
        user.stripeVerificationSessionId = verificationSession.id;
        user.stripeVerificationStatus = 'pending';
        await user.save();
  
        console.log("Session de vérification d'identité créée:", {
          sessionId: verificationSession.id,
          status: verificationSession.status
        });
  
        return res.status(200).json({
          success: true,
          sessionId: verificationSession.id,
          verificationUrl: verificationSession.url,
          message: 'Session de vérification créée avec succès'
        });
      } else {
        // Méthode 2: Upload direct des documents (moins recommandée avec les dernières mises à jour Stripe)
        if (!documentImage) {
          return res.status(400).json({ success: false, message: 'Document d\'identité requis' });
        }
  
        // Cette méthode est moins fiable avec les dernières versions de Stripe Identity
        // mais nous pouvons essayer de l'implémenter
  
        // Créer une session de vérification
        const verificationSession = await stripe.identity.verificationSessions.create({
          type: 'document',
          metadata: {
            userId: userId.toString()
          },
          options: {
            document: {
              require_id_number: true,
              require_matching_selfie: !!selfieImage
            }
          }
        });
  
        try {
          // Préparation et upload des documents
          const docImage = documentImage.replace(/^data:image\/\w+;base64,/, '');
          const docBuffer = Buffer.from(docImage, 'base64');
  
          const docFile = await stripe.files.create({
            purpose: 'identity_document',
            file: {
              data: docBuffer,
              name: 'document.jpg',
              type: 'application/octet-stream',
            },
          });
  
          // Upload du selfie si fourni
          let selfieFile;
          if (selfieImage) {
            const selfieImg = selfieImage.replace(/^data:image\/\w+;base64,/, '');
            const selfieBuffer = Buffer.from(selfieImg, 'base64');
  
            selfieFile = await stripe.files.create({
              purpose: 'identity_document',
              file: {
                data: selfieBuffer,
                name: 'selfie.jpg',
                type: 'application/octet-stream',
              },
            });
          }
  
          // Associer les documents à la session
          await stripe.identity.verificationSessions.update(
            verificationSession.id,
            {
              documents: {
                id_document_front: docFile.id,
                selfie: selfieFile ? selfieFile.id : undefined
              }
            }
          );
  
          // Enregistrer les informations de session
          user.stripeVerificationSessionId = verificationSession.id;
          user.stripeVerificationStatus = 'pending';
          await user.save();
  
          return res.status(200).json({
            success: true,
            sessionId: verificationSession.id,
            clientSecret: verificationSession.client_secret,
            message: 'Documents soumis avec succès pour vérification'
          });
        } catch (uploadError) {
          // Si l'upload direct échoue, fallback sur la méthode de redirection
          console.error('Erreur lors de l\'upload des documents:', uploadError);
  
          // Nettoyer la session qui a échoué
          await stripe.identity.verificationSessions.cancel(verificationSession.id);
  
          // Créer une nouvelle session avec redirection
          const newSession = await stripe.identity.verificationSessions.create({
            type: 'document',
            metadata: {
              userId: userId.toString()
            },
            options: {
              document: {
                require_id_number: true,
                require_matching_selfie: true
              }
            },
            return_url: returnUrl,
            refresh_url: refreshUrl
          });
  
          // Mettre à jour les informations utilisateur
          user.stripeVerificationSessionId = newSession.id;
          user.stripeVerificationStatus = 'pending';
          await user.save();
  
          return res.status(200).json({
            success: true,
            sessionId: newSession.id,
            verificationUrl: newSession.url,
            fallbackToRedirect: true,
            message: 'Impossible de traiter les documents directement. Veuillez utiliser le lien de vérification.'
          });
        }
      }
    } catch (error) {
      console.error('Erreur lors de la vérification d\'identité:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Erreur lors de la création de la session de vérification'
      });
    }
  };

  
exports.updateBankAccount = async (req, res) => {
  try {
    const { stripeAccountId } = req.body;

    // Vérifier que l'utilisateur a les droits d'accès à ce compte Stripe
    // Remarque: implémentez cette fonction selon votre logique d'authentification
    const userHasAccess = await checkUserStripeAccountAccess(req.user.id, stripeAccountId);

    if (!userHasAccess) {
      return res.status(403).json({ error: 'Accès non autorisé à ce compte Stripe' });
    }

    // Construire les URLs de redirection selon l'environnement
    const baseReturnUrl =
      process.env.NODE_ENV === 'production'
        ? `https://${req.get('host')}/redirect.html?path=`
        : process.env.FRONTEND_URL || 'hushy://stripe-return';

    const returnUrl = `${baseReturnUrl}?action=bank_update_complete`;
    const refreshUrl = `${baseReturnUrl}?action=bank_update_refresh`;

    // Créer un account link spécifique pour la section bancaire
    const accountLink = await stripe.accountLinks.create({
      account: stripeAccountId,
      refresh_url: refreshUrl,
      return_url: returnUrl,
      type: 'account_onboarding',
      collect: 'eventually_due',
      destination_section: 'payment_schedule' // Dirige vers la section bancaire
    });

    // Retourner l'URL pour redirection
    res.json({ url: accountLink.url });

  } catch (error) {
    console.error('Erreur lors de la création du lien de mise à jour bancaire:', error);
    res.status(500).json({
      error: 'Échec de la création du lien de mise à jour du compte bancaire',
      details: error.message
    });
  }
};


exports.checkIdentityVerificationStatus = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('stripeAccountId stripeIdentityVerified stripeVerificationStatus stripeVerificationSessionId');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur introuvable'
      });
    }
    
    if (!user.stripeAccountId) {
      return res.status(200).json({
        success: true,
        verified: false,
        status: 'unverified',
        message: 'Aucun compte Stripe associé'
      });
    }
    
    // Si nous avons un ID de session, vérifier le statut auprès de Stripe
    if (user.stripeVerificationSessionId) {
      try {
        const session = await stripe.identity.verificationSessions.retrieve(
          user.stripeVerificationSessionId
        );
        
        // Mettre à jour le statut dans la base de données
        user.stripeVerificationStatus = session.status;
        
        if (session.status === 'verified') {
          user.stripeIdentityVerified = true;
        }
        
        await user.save();
        
        return res.status(200).json({
          success: true,
          verified: session.status === 'verified',
          status: session.status,
          lastUpdated: new Date(),
          message: `Statut de vérification: ${session.status}`
        });
      } catch (stripeError) {
        console.error('Erreur lors de la récupération de la session Stripe:', stripeError);
        // En cas d'erreur avec Stripe, on revient aux données locales
      }
    }
    
    // Retourner le statut stocké si on ne peut pas récupérer depuis Stripe
    return res.status(200).json({
      success: true,
      verified: user.stripeIdentityVerified || false,
      status: user.stripeVerificationStatus || 'unverified',
      message: user.stripeIdentityVerified ? 'Identité vérifiée' : 'Vérification d\'identité en attente'
    });
  } catch (error) {
    console.error('Erreur lors de la vérification du statut d\'identité:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la vérification du statut d\'identité'
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
    const { page = 1, limit = 10, language, languages } = req.query;
    const userId = req.user.id;

    // Construire le filtre de base - secrets non achetés par l'utilisateur,
    // non créés par l'utilisateur et non expirés
    const baseFilter = {
      purchasedBy: { $nin: [userId] },
      user: { $ne: userId },
      expiresAt: { $gt: new Date() }
    };

    // Options pour le filtrage par langue
    let languageFilter = {};

    // Cas 1: Une seule langue spécifiée
    if (language) {
      languageFilter = { language };
    }
    // Cas 2: Plusieurs langues spécifiées (séparées par des virgules)
    else if (languages) {
      const languageList = languages.split(',').map(lang => lang.trim());
      languageFilter = { language: { $in: languageList } };
    }

    // Combiner les filtres
    const filter = { ...baseFilter, ...languageFilter };

    // Exécuter la requête avec pagination
    const secrets = await Secret.find(filter)
      .populate('user', 'name profilePicture')
      .select('label content price createdAt expiresAt user purchasedBy location language currency')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 })
      .exec();

    // Compter le nombre total de documents correspondant au filtre
    const total = await Secret.countDocuments(filter);

    // Structure de la réponse
    res.status(200).json({
      secrets,
      totalPages: Math.ceil(total / limit),
      currentPage: Number(page),
      totalItems: total,
      itemsPerPage: Number(limit)
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

    // Récupérer l'ID du compte Connect du vendeur
    if (!secret.sellerStripeAccountId) {
      await session.abortTransaction();
      return res.status(400).json({ message: 'Aucun vendeur associé à ce secret.' });
    }

    // Utiliser la devise du secret
    const currency = secret.currency || '€';
    const priceDetails = calculatePrices(secret.price, currency);

    // Déterminer la devise Stripe
    const stripeCurrency = {
      '€': 'eur',
      '$': 'usd',
      '£': 'gbp',
      '¥': 'jpy'
    }[currency] || 'eur';

    // Créer l'intention de paiement Stripe avec transfert automatique
    const paymentIntent = await stripe.paymentIntents.create({
      amount: priceDetails.buyerTotal, // Montant total en centimes
      currency: stripeCurrency,

      // Configuration pour le transfert automatique
      transfer_data: {
        destination: secret.sellerStripeAccountId,
        amount: priceDetails.sellerAmount // Montant pour le vendeur
      },

      metadata: {
        secretId: secret._id.toString(),
        userId: req.user.id,
        originalPrice: secret.price.toString(),
        buyerTotal: priceDetails.buyerTotal.toString(),
        sellerAmount: priceDetails.sellerAmount.toString(),
        platformFee: priceDetails.platformFee.toString(),
        currency: currency,
        sellerConnectAccountId: secret.sellerStripeAccountId
      }
    });

    // Créer un enregistrement de paiement (reste identique)
    const payment = await Payment.create([{
      secret: secret._id,
      user: req.user.id,
      amount: priceDetails.buyerTotal / 100,
      paymentIntentId: paymentIntent.id,
      status: 'pending',
      currency: currency,
      metadata: {
        originalPrice: secret.price,
        sellerAmount: priceDetails.sellerAmount / 100,
        platformFee: priceDetails.platformFee / 100,
        buyerMargin: 0.15,
        sellerMargin: 0.10,
        sellerConnectAccountId: secret.sellerStripeAccountId
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

    // Vérification des paramètres d'entrée
    if (!paymentIntentId) {
      return res.status(400).json({ message: 'ID de paiement manquant' });
    }

    // Recherche du secret
    const secret = await Secret.findById(secretId);
    if (!secret) {
      return res.status(404).json({ message: 'Secret introuvable.' });
    }

    if (!secret.sellerStripeAccountId) {
      return res.status(400).json({ message: 'Aucun vendeur associé à ce secret.' });
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

    // Vérifier si le transfert Connect a été effectué automatiquement
    if (paymentIntent.transfer_data && paymentIntent.transfer_data.destination) {
      console.log(`Transfert automatique effectué vers: ${paymentIntent.transfer_data.destination}`);
    } else {
      // Si non configuré automatiquement, créer un transfert manuel
      const seller = await User.findById(secret.user);
      if (seller && secret.sellerStripeAccountId) {
        try {
          // Récupérer l'ID de la charge associée au PaymentIntent
          const charges = paymentIntent.charges.data;
          if (charges && charges.length > 0) {
            const transfer = await stripe.transfers.create({
              amount: priceDetails.sellerAmount,
              currency: stripeCurrency,
              destination: secret.sellerStripeAccountId,
              source_transaction: charges[0].id,
              metadata: {
                secretId: secretId,
                paymentIntentId: paymentIntentId
              }
            });
            console.log(`Transfert manuel effectué: ${transfer.id}`);
          } else {
            console.warn('Aucune charge trouvée pour le transfert manuel');
          }
        } catch (transferError) {
          console.error('Erreur lors du transfert:', transferError);
          // Ne pas échouer l'opération complète, enregistrer pour traitement manuel
        }
      } else {
        console.warn(`Vendeur sans compte Stripe Connect: ${secret.user}`);
      }
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
      // Mise à jour du statut du paiement
      payment.status = 'succeeded';
      await payment.save({ session });

      // Vérifier si un transfert Connect doit être effectué
      if (!paymentIntent.transfer_data || !paymentIntent.transfer_data.destination) {
        // Récupérer le secret et le vendeur
        const secret = await Secret.findById(payment.secret);
        if (secret && secret.user) {
          const seller = await User.findById(secret.user);

          if (seller && seller.stripeConnectAccountId) {
            try {
              // Récupérer l'ID de la charge associée au PaymentIntent
              const charges = paymentIntent.charges.data;
              if (charges && charges.length > 0) {
                // Créer un transfert manuel
                const transfer = await stripe.transfers.create({
                  amount: payment.metadata.sellerAmount * 100, // Convertir en centimes
                  currency: payment.currency === '€' ? 'eur' :
                    payment.currency === '$' ? 'usd' :
                      payment.currency === '£' ? 'gbp' : 'eur',
                  destination: seller.stripeConnectAccountId,
                  source_transaction: charges[0].id,
                  metadata: {
                    secretId: payment.secret.toString(),
                    paymentIntentId: paymentIntentId
                  }
                });

                console.log(`Transfert manuel effectué lors de la confirmation: ${transfer.id}`);

                // Mettre à jour le paiement avec l'ID du transfert
                payment.metadata.transferId = transfer.id;
                await payment.save({ session });
              }
            } catch (transferError) {
              console.error('Erreur lors du transfert dans confirmPayment:', transferError);
              // Ne pas échouer l'opération complète
            }
          }
        }
      }

      await session.commitTransaction();
      res.json({
        success: true,
        transferCompleted: payment.metadata.transferId ? true : false
      });
    } else {
      throw new Error('Paiement non réussi');
    }

  } catch (error) {
    await session.abortTransaction();
    console.error('Erreur confirmPayment:', error);
    res.status(500).json({
      message: error.message,
      details: error.stack
    });
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

const populateConversation = (query, includeMessages = true) => {
  query = query
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
    });

  if (includeMessages) {
    query = query
      .populate('messages.sender', '_id name profilePicture')
      .select('participants messages secret expiresAt unreadCount updatedAt');
  } else {
    query = query
      .select('participants secret expiresAt unreadCount updatedAt messages.messageType messages.createdAt');
  }

  return query;
};

// Fonction de gestion d'erreurs standardisée
const handleError = (error, res) => {
  console.error('Erreur détaillée:', error);
  res.status(500).json({ message: 'Erreur serveur.', error: error.message });
};


exports.getSecretConversation = async (req, res) => {
  try {
    const conversation = await populateConversation(
      Conversation.findOne({
        secret: req.params.secretId,
        participants: req.user.id
      })
    );

    if (!conversation) {
      return res.status(404).json({ message: 'Conversation introuvable.' });
    }

    // Log des messages audio pour débogage
    const audioMessages = conversation.messages.filter(msg => msg.messageType === 'audio');
    if (audioMessages.length > 0) {
      console.log("Messages audio dans la conversation:", audioMessages.map(msg => ({
        id: msg._id,
        audio: msg.audio,
        duration: msg.audioDuration || '00:00'
      })));
    }

    res.status(200).json(conversation);
  } catch (error) {
    handleError(error, res);
  }
};


exports.getConversation = async (req, res) => {
  try {
    console.log("Récupération de conversation:", {
      conversationId: req.params.conversationId,
      userId: req.user.id
    });

    const conversation = await populateConversation(
      Conversation.findOne({
        _id: req.params.conversationId,
        participants: req.user.id
      })
    );

    if (!conversation) {
      return res.status(404).json({ message: 'Conversation introuvable.' });
    }

    // Log des informations de la conversation
    console.log("Info conversation:", {
      conversationId: conversation._id,
      nombreMessages: conversation.messages.length
    });

    // Log des messages audio pour débogage
    const audioMessages = conversation.messages.filter(msg => msg.messageType === 'audio');
    if (audioMessages.length > 0) {
      console.log("Messages audio dans la conversation:", audioMessages.map(msg => ({
        id: msg._id,
        audio: msg.audio,
        duration: msg.audioDuration || '00:00'
      })));
    }

    res.status(200).json({
      messages: conversation.messages,
      conversationId: conversation._id
    });
  } catch (error) {
    handleError(error, res);
  }
};


// Mise à jour de la fonction addMessageToConversation dans secretController.js
exports.addMessageToConversation = async (req, res) => {
  try {
    console.log("Données reçues:", JSON.stringify(req.body, null, 2));

    // Extraire les données de la requête
    const {
      content,
      messageType = 'text',
      image = null,
      audio = null,
      audioDuration = null,
      replyTo = null
    } = req.body;

    // Validation selon le type de message
    if ((messageType === 'text' || messageType === 'mixed') && !content?.trim()) {
      return res.status(400).json({ message: 'Le contenu est requis pour les messages texte ou mixtes.' });
    }

    if ((messageType === 'image' || messageType === 'mixed') && !image) {
      return res.status(400).json({ message: 'L\'URL de l\'image est requise pour les messages image ou mixtes.' });
    }

    if (messageType === 'audio' && !audio) {
      return res.status(400).json({ message: 'L\'URL de l\'audio est requise pour les messages audio.' });
    }

    // Construction de l'objet message
    const messageData = {
      sender: req.user.id,
      content: content?.trim() || " ", // Un espace par défaut si vide
      senderName: req.user.name,
      messageType,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Ajout des médias selon le type de message
    if (messageType === 'image' || messageType === 'mixed') {
      messageData.image = image;
    }

    if (messageType === 'audio') {
      messageData.audio = audio;
      messageData.audioDuration = audioDuration || '00:00';

      // Log pour débogage des problèmes audio
      console.log("Ajout de message audio:", {
        audio: messageData.audio,
        duration: messageData.audioDuration
      });
    }

    // Gestion des réponses
    if (replyTo) {
      messageData.replyTo = replyTo;
    }

    // Trouver et mettre à jour la conversation
    const conversation = await Conversation.findOne({
      _id: req.params.conversationId,
      participants: req.user.id
    });

    if (!conversation) {
      return res.status(404).json({ message: 'Conversation introuvable.' });
    }

    // Incrémenter les compteurs de messages non lus pour les autres participants
    conversation.participants.forEach(participantId => {
      const participantIdStr = participantId.toString();
      if (participantIdStr !== req.user.id.toString()) {
        const currentCount = conversation.unreadCount.get(participantIdStr) || 0;
        conversation.unreadCount.set(participantIdStr, currentCount + 1);
      }
    });

    // Ajouter le message et mettre à jour la date de modification
    conversation.messages.push(messageData);
    conversation.updatedAt = new Date();
    await conversation.save();

    // Récupérer le message avec les informations du sender
    const updatedConversation = await Conversation.findById(req.params.conversationId)
      .populate('messages.sender', '_id name profilePicture');

    const lastMessage = updatedConversation.messages[updatedConversation.messages.length - 1];

    // Pour les messages audio, vérifier si l'URL est accessible
    if (messageType === 'audio') {
      console.log("Message audio ajouté avec succès:", {
        id: lastMessage._id,
        audio: lastMessage.audio,
        duration: lastMessage.audioDuration
      });
    }

    res.status(201).json(lastMessage);
  } catch (error) {
    handleError(error, res);
  }
};

exports.getUserConversations = async (req, res) => {
  try {
    // Pour la liste des conversations, nous ne chargeons pas tous les messages
    const conversations = await populateConversation(
      Conversation.find({
        participants: req.user.id
      }).sort({ updatedAt: -1 }),
      false // Ne pas inclure le contenu complet des messages
    );

    // Calculer le nombre de messages non lus pour l'utilisateur
    const userIdStr = req.user.id.toString();
    const conversationsWithUnreadCount = conversations.map(conv => {
      const unreadCount = conv.unreadCount?.get(userIdStr) || 0;

      // Récupérer le dernier message pour l'aperçu
      let lastMessage = null;
      if (conv.messages && conv.messages.length > 0) {
        lastMessage = conv.messages[conv.messages.length - 1];
      }

      return {
        ...conv.toObject(),
        unreadCount,
        lastMessage
      };
    });

    // Log des statistiques pour débogage
    conversationsWithUnreadCount.forEach(conv => {
      console.log('Conversation Details:', {
        conversationId: conv._id,
        unreadCount: conv.unreadCount,
        userIdStr: userIdStr,
        calculatedUnreadCount: conv.unreadCount,
        totalMessages: conv.messages?.length || 0
      });
    });

    res.status(200).json(conversationsWithUnreadCount);
  } catch (error) {
    handleError(error, res);
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

    // Réinitialiser le compteur de messages non lus pour cet utilisateur
    conversation.unreadCount.set(req.user.id.toString(), 0);
    await conversation.save();

    res.status(200).json({
      message: 'Messages marqués comme lus.',
      conversationId: conversation._id
    });
  } catch (error) {
    handleError(error, res);
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

