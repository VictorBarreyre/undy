export default {
  "auth": {
    "login": {
      // Garder les traductions existantes...
      "title": "Connectez-vous ou\ncréez un compte",
      "email": "Email",
      "password": "Mot de passe",
      "loginButton": "Se connecter",
      "noAccount": "Enfait je n'ai pas de compte 🙂",
      "or": "ou",
      "continueWithApple": "Continuer avec Apple",
      "continueWithGoogle": "Continuer avec Google",
      "termsAndPrivacy": "En vous connectant, vous acceptez nos Conditions d'utilisation et Politiques de confidentialité"
    },
    // Ajoutez cette nouvelle section pour l'inscription
    "register": {
      "title": "Inscrivez-vous",
      "name": "Nom",
      "registerButton": "S'inscrire",
      "hasAccount": "J'ai déjà un compte 🙂",
      "termsAndPrivacy": "En vous inscrivant, vous acceptez nos Conditions d'utilisation et Politiques de confidentialité",
      "successTitle": "Inscription réussie",
      "successMessage": "Votre compte a été créé avec succès!",
      "errorTitle": "Erreur d'inscription",
      "genericError": "Erreur lors de l'inscription",
      "genericError": "Erreur lors de l'inscription",
      "serverError": "Une erreur serveur est survenue lors de l'inscription",
      "invalidEmail": "Veuillez entrer une adresse email valide",
      "emailAlreadyExists": "Cette adresse email est déjà enregistrée",
      "invalidData": "Les données d'inscription sont invalides",
      "emailFormat": "Le format de l'email est invalide",
      "weakPassword": "Le mot de passe est trop faible",
      "requiredFields": "Tous les champs obligatoires doivent être remplis",
    },
    "errors": {
      // Garder les traductions existantes...
      "connectionError": "Erreur de connexion",
      "tokenError": "Erreur lors de la génération du token.",
      "appleNotAvailable": "Connexion Apple non disponible sur cet appareil",
      "googlePlayNotAvailable": "Les services Google Play ne sont pas disponibles",
      "googleConnectionError": "Problème de connexion avec Google",
      "serverError": "Échec de connexion au serveur",
      "genericError": "Problème de connexion"
    },
    "alerts": {
      // Garder les traductions existantes...
      "ok": "OK",
      "serviceUnavailable": "Service non disponible",
      "errorTitle": "Erreur",
      "sessionExpired": {
        "title": "Session expirée"
      },
      "permissionDenied": {
        "title": "Permission refusée",
        "message": "Vous devez autoriser l'accès aux contacts pour utiliser cette fonctionnalité."
      },
    },
    "success": {
      "noChangeNeeded": "Aucune modification nécessaire.",
      "profileUpdated": "Profil mis à jour avec succès.",
      "dataCleared": "Données effacées avec succès.",
      "accountDeleted": "Compte supprimé avec succès."
    },
    "permissions": {
      "contactsAccess": {
        "title": "Accès aux contacts",
        "message": "Cette application a besoin d'accéder à vos contacts.",
        "ok": "OK"
      }
    },
    "axiosNotInitialized": "Instance Axios non initialisée",
    "noImageUrlReceived": "URL d'image non reçue du serveur",
    "contactsAccess": "Erreur lors de la mise à jour de l'accès aux contacts:",
    "checkingContacts": "Erreur lors de la vérification des contacts:",
    "persistingUserData": "Erreur lors de la persistance des données utilisateur",
    "loadingPersistedData": "Erreur lors du chargement des données enregistrées",
    "downloadingData": "Erreur téléchargement données:",
    "clearingData": "Erreur effacement données:",
    "deletingAccount": "Erreur suppression compte:",
    "fetchingUserData": "Erreur récupération données utilisateur:",
    "retrievingContacts": "Erreur lors de la récupération des contacts:",
    "retrievingContact": "Erreur lors de la récupération du contact:"

  },
  "filter": {
    "all": "Tous",
    "contacts": "Contacts",
    "aroundMe": "Autour de moi",
    "categories": "Catégories",
    "preferences": "Préférences",
    "contactAccess": {
      "title": "Accès aux contacts",
      "message": "Pour afficher les hushys de vos contacts, nous avons besoin d'accéder à vos contacts.",
      "cancel": "Annuler",
      "authorize": "Autoriser"
    },
    "contactSettings": {
      "title": "Accès aux contacts nécessaire",
      "message": "Vous avez précédemment refusé l'accès aux contacts. Veuillez l'activer manuellement dans les paramètres de votre téléphone.",
      "cancel": "Annuler",
      "openSettings": "Ouvrir les paramètres"
    },
    "contactDenied": {
      "title": "Accès aux contacts nécessaire",
      "message": "L'accès aux contacts est nécessaire pour cette fonctionnalité. Veuillez l'autoriser dans les paramètres.",
      "cancel": "Annuler",
      "openSettings": "Ouvrir les paramètres"
    }
  },
  "home": {
    "latestHushys": "Les derniers hushys 🔥",
    "sourceTexts": {
      "everyone": "De tout le monde",
      "fromContacts": "De vos contacts",
      "fromFollowing": "Des personnes que vous suivez",
      "fromNearby": "Autour de vous"
    },
    "errors": {
      "contactsLoading": "Erreur lors du chargement des contacts:"
    },
    "logs": {
      "selectedFilters": "Filtres sélectionnés :",
      "selectedType": "Type sélectionné :"
    }
  },
  "swipeDeck": {
    "noSecrets": "Aucun hushy disponible",
    "tryChangingFilters": "Essayez de modifier vos filtres",
    "checkBackLater": "Revenez plus tard pour découvrir de nouveaux hushys",
    "noContactsUsingApp": "Aucun de vos contacts n'utilise encore hushy",
    "noSecretsNearby": "Aucun hushy disponible autour de vous",
    "errors": {
      "initialLoading": "Erreur de chargement initial:",
      "purchase": "Erreur lors de l'achat:",
      "payment": "Erreur de paiement:"
    }
  },
  "addSecret": {
    "addHushy": "Ajouter un hushy",
    "postedBy": "Posté par",
    "noDescriptionAvailable": "Aucune description disponible.",
    "whatIsNew": "Quoi de neuf ?",
    "category": "Catégorie",
    "chooseCategory": "Choisissez la catégorie",
    "price": "Son prix",
    "min": "min",
    "duration": "Durée",
    "chooseDuration": "Choisir une durée",
    "duration24h": "24 heures",
    "duration7d": "7 jours",
    "duration30d": "30 jours",
    "youWillReceive": "Vous recevrez {{amount}}€",
    "postSecret": "Poster le hushy",
    "categories": [
      "Confession",
      "Amour",
      "Travail",
      "Famille",
      "Argent",
      "Amitié",
      "Trahison",
      "Regret",
      "Réussite",
      "Rêve",
      "Honte",
      "Évènement",
      "Secret de famille",
      "Infidélité",
      "Culpabilité"
    ],
    "locationSharing": {
      "title": "Partager ma position avec ce hushy",
      "enabled": "Votre position sera incluse",
      "disabled": "Votre position ne sera pas partagée",
      "accessibility": "Partager la localisation"
    },
    "validation": {
      "tooShort": "Trop court pour poster !",
      "priceRequirement": "Le prix doit être supérieur à {{minPrice}}€",
      "selectCategory": "Sélectionnez une catégorie",
      "invalidCoordinates": "Coordonnées géographiques invalides"
    },
    "alerts": {
      "setupRequired": {
        "title": "Configuration nécessaire",
        "message": "Votre hushy a été créé. Pour pouvoir le vendre, vous devez configurer votre compte de paiement.",
        "configureNow": "Configurer maintenant",
        "stripePersistent": "La configuration bancaire est toujours requise"
      },
      "success": {
        "title": "Félicitations ! 🎉",
        "message": "Votre hushy a été publié avec succès. Il est maintenant disponible à la vente !",
        "shareNow": "Partager maintenant 🔐"
      },
      "noStripeAccount": {
        "title": "Pas de compte bancaire",
        "message": "Vous n'avez pas encore de compte bancaire configuré pour recevoir des paiements.",
        "create": "Créer un compte"
      },
      "pendingData": {
        "title": "Données en attente",
        "message": "Vous avez un hushy inachevé. Souhaitez-vous continuer avec ces données?",
        "continue": "Continuer",
        "discard": "Ignorer"
      },
      "info": "Information",
      "later": "Plus tard"
    },
    "errors": {
      "title": "Erreur",
      "deepLink": "Deep link error:",
      "unableToProcessLink": "Impossible de traiter le lien",
      "unableToShare": "Impossible de partager le hushy."
    }
  },

  "conversations": {
    "title": "Conversations",
    "noConversations": "Vous n'avez pas encore déverrouillé de hushy",
    "unlockToStart": "Déverrouillez un hushy pour commencer une conversation !",
    "untitled": "Sans titre",
    "unknownUser": "Utilisateur inconnu",
    "profilePicture": "Photo de profil",
    "errors": {
      "loading": "Erreur chargement conversations:",
      "deletion": "Erreur lors de la suppression:"
    }
  },
  "chat": {
    "defaultUser": "Utilisateur",
    "profilePicture": "Photo de profil",
    "participants": "{{count}} participants",
    "expiresIn": "Expire dans",
    "expired": "Expiré",
    "timeLeft": "{{days}}j {{hours}}h {{minutes}}m",
    "noMessagesYet": "Pas encore de messages",
    "sayHelloToStart": "Envoyez un message pour démarrer la conversation",
    "newMessages": "Nouveaux messages",
    "send": "Envoyer",
    "message": "Message",
    "postedBy": "Posté par {{name}}",
    "postedByDefault": "Posté par Utilisateur",
    "selectedImage": "Image sélectionnée",
    "share": "Partager",
    "shared": "Partagé",
    "you": "Vous",
    "replyingTo": "Répondre à",
    "reply": "Répondre",
    "cancel": "Annuler",
    "image": "Image",
    "defaultUser": "Utilisateur",
    // Pour le menu contextuel des messages
    "messageOptions": {
      "reply": "Répondre",
      "copy": "Copier", // Nouvelle entrée
      "cancel": "Annuler"
    },
    "audio": {
      "permissionRequired": "Permission requise",
      "microphoneAccess": "L'application a besoin d'accéder au microphone pour enregistrer des messages vocaux.",
      "cancel": "Annuler",
      "settings": "Paramètres",
      "recordingError": "Erreur lors du démarrage de l'enregistrement",
      "cannotStartRecording": "Impossible de démarrer l'enregistrement audio.",
      "playbackError": "Erreur lors de la lecture",
      "cannotPlayRecording": "Impossible de lire l'enregistrement audio.",
      "uploadError": "Erreur lors de l'upload audio",
      "messageDeleted": "Message supprimé",
      "contentModeration": "Votre message a été supprimé car il a été identifié comme contenu inapproprié suite à une analyse complète."
    },
    "moderation": {
      "title": "Contenu inapproprié",
      "message": "Votre message ne peut pas être envoyé car il contient du contenu inapproprié.",
      "retry": "Réessayer",
      "cancel": "Annuler"
    },
    "alerts": {
      "error": "Erreur",
      "sendError": "Une erreur s'est produite lors de l'envoi du message. Veuillez réessayer."
    },
    "locationSharing": {
      "title": "Partager ma localisation"
    },
    "documentOptions": {
      "takePhoto": "Prendre une photo",
      "chooseFromGallery": "Choisir depuis la galerie",
      "cancel": "Annuler"
    },
    "participantsList": "Participants de la conversation",
    "errors": {
      "resizing": "Erreur lors du redimensionnement:",
      "saveScrollPosition": "Erreur lors de la sauvegarde de la position:",
      "loadScrollPosition": "Erreur lors du chargement de la position:",
      "restoreScrollPosition": "Erreur lors de la restauration de la position:",
      "reloadConversation": "Erreur lors du rechargement de la conversation:",
      "missingCreatedAt": "Message sans createdAt:",
      "missingConversationId": "ID de conversation manquant",
      "missingUserInfo": "Informations utilisateur manquantes",
      "unsupportedImageFormat": "Format d'image non supporté",
      "imageUpload": "Erreur lors de l'upload de l'image:",
      "imageUploadFailed": "Échec de l'upload de l'image",
      "sendMessage": "Erreur lors de l'envoi du message:",
      "imageSelection": "Erreur lors de la sélection d'image:",
      "shareError": "Erreur lors du partage",
      "missingSecretData": "Données du hushy manquantes",
      "missingSecretData": "Données du hushy manquantes",
      "unsupportedImageFormat": "Format d'image non pris en charge",
      "imageUpload": "Erreur lors de l'upload de l'image",
      "imageUploadFailed": "L'upload de l'image a échoué",
      "sendMessage": "Erreur lors de l'envoi du message",
      "imageSelection": "Erreur lors de la sélection de l'image",
      "shareError": "Erreur lors du partage"
    },
    "messageFailed": "Échec",
    "retry": "Renvoyer",
    "sending": "Envoi...",
    "messageImage": "Image du message",

  },

  "dateTime": {
    "today": "Aujourd'hui",
    "yesterday": "Hier",
    "at": "à",
    "expired": "Expiré",
    "expiresIn": "Expire dans",
    "justNow": "À l'instant",
    "minutesAgo": "Il y a {{count}} minute",
    "minutesAgo_plural": "Il y a {{count}} minutes",
    "hoursAgo": "Il y a {{count}} heure",
    "hoursAgo_plural": "Il y a {{count}} heures",
    "daysAgo": "Il y a {{count}} jour",
    "daysAgo_plural": "Il y a {{count}} jours"
  },

  "profile": {
    "title": "Mon Profil",
    "loading": "Chargement...",
    "emptyList": "Wow mais c'est désert ici",
    "tabs": {
      "yourSecrets": "Vos hushys",
      "othersSecrets": "Ceux des autres"
    },
    "stats": {
      "secrets": "hushys",
      "followers": "Abonnés",
      "following": "Abonnements"
    },
    "seeMore": "Voir plus",
    "seeLess": "Voir moins",
    "defaultName": "Utilisateur",
    "profilePictureAlt": "Photo de profil de {{name}}",
    "dummyText": "Le Lorem Ipsum est simplement du faux texte employé dans la composition et la mise en page avant impression. Le Lorem Ipsum est le faux texte standard de l'imprimerie depuis les années 1500, quand un imprimeur anonyme assembla ensemble des morceaux de texte pour réaliser un livre spécimen de polices de texte. Il n'a pas fait que survivre cinq siècles, mais s'est aussi adapté à la bureautique informatique, sans que son contenu n'en soit modifié",
    "imagePicker": {
      "canceled": "Upload annulé par l'utilisateur",
      "noImageSelected": "Aucune image sélectionnée"
    },
    "cropImage": {
      "title": "Ajuster votre photo",
      "instructions": "Déplacez et redimensionnez votre photo",
      "preview": "Aperçu de l'image"
    },
    "errors": {
      "title": "Erreur",
      "loadingData": "Erreur lors du chargement des données",
      "fullError": "Erreur complète:",
      "unableToChangeProfilePicture": "Impossible de changer votre photo de profil",
      "networkError": "Impossible de se connecter au serveur. Vérifiez votre connexion internet ou votre compte Apple.",
      "timeoutError": "La requête a pris trop de temps. Essayez avec une image plus petite ou vérifiez votre connexion.",
      "deviceError": "Une erreur s'est produite avec la fonction de recadrage. Nous allons essayer sans recadrage.",
      "imageProcessingFailed": "Le traitement de l'image a échoué"
    }
  },

  "settings": {
    "title": "Vos paramètres",
    "generalSection": "Général",
    "dataSection": "Données",
    "logout": "Déconnexion",
    "enabled": "Activé",
    "enabledFeminin": "Activée",
    "enabledFemininePlural": "Activées",
    "disabled": "Désactivé",
    "disabledFeminin": "Désactivée",
    "disabledFemininePlural": "Désactivées",
    "notSpecified": "Non renseigné",
    "notConfigured": "Non configuré",
    "userDataLog": "Données utilisateur :",
    "selectedFieldLog": "Champ sélectionné :",
    "inputValueLog": "Valeur d'entrée :",
    "dataToUpdateLog": "Données à mettre à jour avant envoi :",
    "dataReceivedLog": "Données reçues :",
    "success": "Succès",
    "dataCopiedToClipboard": "Les données ont été copiées dans votre presse-papier",
    "ok": "OK",
    "dataDownloadSuccess": "Données téléchargées avec succès",
    "confirmation": "Confirmation",
    "clearDataConfirmation": "Êtes-vous sûr de vouloir effacer vos données ?",
    "cancel": "Annuler",
    "clear": "Effacer",
    "dataClearedSuccess": "Vos données ont été effacées",
    "deleteAccountConfirmation": "Êtes-vous sûr de vouloir supprimer votre compte ? Cette action est irréversible.",
    "delete": "Supprimer",
    "accountDeletedSuccess": "Votre compte a été supprimé",
    "resetStripeAccount": "Réinitialiser le compte bancaire",
    "resetStripeConfirmation": "Êtes-vous sûr de vouloir réinitialiser votre compte bancaire ? Vous devrez refaire le processus d'onboarding.",
    "reset": "Réinitialiser",
    "stripeResetSuccess": "Votre compte bancaire a été réinitialisé. Vous allez être redirigé vers l'onboarding.",
    "mySubscriptions": "Mes abonnements",
    "noSubscriptionsYet": "Vous n'avez pas encore d'abonnements. Découvrez nos offres pour enrichir votre expérience.",
    "viewSubscriptions": "Voir les abonnements",
    "editField": "Modifier votre {{field}}",
    "editFieldPlaceholder": "Modifier votre {{field}}",
    "information": "information",
    "save": "Enregistrer",
    "fields": {
      "name": "Nom",
      "email": "Adresse e-mail",
      "password": "Mot de passe",
      "phone": "Numéro de téléphone",
      "birthdate": "Date de naissance",
      "income": "Vos revenus",
      "bank": "Compte bancaire",
      "notifications": "Mes notifications",
      "contacts": "Mes contacts",
      "subscriptions": "Mes abonnements",
      "location": "Ma position"
    },
    "account": {
      "downloadData": "Télécharger les données",
      "clearData": "Effacer les données",
      "deleteAccount": "Supprimer mon compte"
    },
    "errors": {
      "title": "Erreur",
      "toggleNotificationsError": "Erreur toggleNotifications:",
      "notificationUpdateError": "Un problème est survenu lors de la mise à jour des préférences de notification",
      "toggleContactsError": "Erreur toggleContacts:",
      "contactsUpdateError": "Impossible de mettre à jour les préférences de contacts",
      "genericError": "Un problème est survenu",
      "genericLog": "Erreur:",
      "dataDownloadError": "Une erreur est survenue lors du téléchargement des données",
      "stripeResetErrorLog": "Erreur de réinitialisation du compte bancaire:",
      "stripeResetError": "Erreur lors de la réinitialisation du compte bancaire",
      "logoutErrorLog": "Erreur de déconnexion:",
      "logoutError": "Une erreur est survenue lors de la déconnexion",
      "toggleLocationError": "Erreur lors de l'activation/désactivation de la localisation:",
      "locationUpdateError": "Impossible de mettre à jour les préférences de localisation",

    }
  },

  "sharedSecret": {
    "title": "Découvrez le hushy 🔐",
    "subtitle": "et accédez à la conversation !",
    "loading": "Undy...",
    "errors": {
      "title": "Erreur",
      "fetchError": "Erreur:",
      "unableToLoad": "Impossible de charger le hushy.",
      "purchaseError": "Erreur lors de l'achat:",
      "paymentError": "Erreur de paiement:"
    }
  },

  "cardHome": {
    "postedFrom": "à",
    "unknownLocation": "Lieu inconnu",
    "locationError": "Localisation non disponible",
    "postedBy": "Posté par {{name}}",
    "expiresIn": "Expire dans",
    "noData": "Aucune donnée disponible",
    "notAvailable": "N/A",
    "anonymous": "Anonyme",
    "noDescriptionAvailable": "Aucune description disponible.",
    "labelUnavailable": "Label indisponible",
    "profilePicture": "Photo de profil de {{name}}",
    "logs": {
      "secretRevealed": "hushy révélé !"
    },
    "errors": {
      "title": "Erreur",
      "unableToShare": "Impossible de partager le hushy."
    }
  },

  "contacts": {
    "title": "Contacts",
    "loading": "Chargement des contacts...",
    "searchPlaceholder": "Rechercher un contact",
    "noContactsFound": "Aucun contact trouvé",
    "errors": {
      "loading": "Erreur lors du chargement des contacts:"
    }
  },

  "deepLink": {
    "alerts": {
      "success": {
        "title": "Succès",
        "message": "Votre compte bancaire a été configuré avec succès !",
        "accountCreated": "Votre compte bancaire a été créé avec succès!",

      },
      "error": {
        "title": "Erreur",
        "stillNeedsConfig": "La configuration bancaire est toujours nécessaire.",
        "postingFailed": "Échec de la publication automatique du hushy.",
      },
      "configInProgress": {
        "title": "Configuration en cours"
      },
      "ok": "OK",
      "returnToPost": "Retourner à la publication",
    },
    "errors": {
      "title": "Erreur",
      "deepLinkError": "Deep link error:",
      "unableToProcessLink": "Impossible de traiter le lien"
    }
  },

  "earnings": {
    "title": "Détails des revenus",
    "noEarningsYet": "Vous n'avez pas encore généré de revenus. Commencez à vendre vos hushys pour gagner de l'argent.",
    "publishSecret": "Publier un hushy",
    "loadingTransactions": "Chargement des transactions...",
    "transfer": "Transfert",
    "sale": "Vente",
    "succeeded": "Réussi",
    "pending": "En attente",
    "totalEarned": "Total gagné",
    "available": "Disponible",
    "availableEarnings": "Revenus disponibles",
    "noAvailableFunds": "Aucun fonds disponible",
    "retrieveFunds": "Récupérer les fonds",
    "logs": {
      "allData": "tout les data ",
      "totalMoney": "tout le fric ",
      "transferSuccess": "Virement effectué avec succès !"
    },
    "errors": {
      "generic": "Erreur:",
      "paymentSheetInit": "Erreur lors de l'initialisation du formulaire de paiement :",
      "paymentSheetPresent": "Erreur lors de la présentation du formulaire de paiement :",
      "transferFunds": "Erreur lors du virement des fonds :"
    }
  },

  "inviteContacts": {
    "title": "Inviter des contacts",
    "noContactsUsingApp": "Aucun de vos contacts n'utilise encore hushy. Invitez-les à rejoindre l'application !",
    "cancel": "Annuler",
    "inviteWithCount": "Inviter ({{count}})",
    "invitationMessage": "Hey ! Je t'invite à rejoindre hushy, une super app pour partager des hushys ! Télécharge-la maintenant : https://hushy.app",
    "invitationTitle": "Invitation à hushy",
    "errors": {
      "title": "Erreur",
      "invitationError": "Erreur lors de l'invitation:",
      "unableToSendInvitations": "Impossible d'envoyer les invitations"
    }
  },

  "location": {
    "shareLocation": {
      "title": "Partager ma position avec ce hushy",
      "enabled": "Votre position sera incluse",
      "disabled": "Votre position ne sera pas partagée"
    },
    "errors": {
      "title": "Erreur de localisation"
    },
    "alerts": {
      "welcome": {
        "title": "Accès à la localisation",
        "message": "hushy peut utiliser votre position pour vous montrer les hushys à proximité. Voulez-vous activer cette fonctionnalité ?",
        "yes": "Oui, activer",
        "no": "Non, merci"
      },
      "shareLocation": {
        "title": "Partager votre position",
        "message": "Souhaitez-vous partager votre position avec ce hushy ? Cela permettra aux utilisateurs à proximité de le découvrir plus facilement.",
        "yes": "Partager",
        "no": "Ne pas partager"
      }
    },
    "errors": {
      "title": "Erreur de localisation",
      "permissionDenied": "Vous devez autoriser l'accès à la localisation pour utiliser cette fonctionnalité.",
      "gettingPosition": "Impossible d'obtenir votre position actuelle.",
      "permissionError": "Erreur de permission de localisation:",
      "locationError": "Erreur de localisation:",
      "gettingPosition": "Erreur lors de l'obtention de la position:",
      "fetchingNearbySecrets": "Erreur lors de la récupération des hushys à proximité:",
      "permissionCheckError": "Erreur lors de la vérification des permissions de localisation:",
      "accessUpdateError": "Erreur lors de la mise à jour de l'accès à la localisation:"
    },
    "logs": {
      "permissionDenied": "Permission de localisation refusée"
    }
  },

  "paymentSheet": {
    "loading": "Chargement...",
    "unlockForPrice": "Déverrouiller pour {{price}} €",
    "logs": {
      "applePaySupported": "Apple Pay supporté:",
      "applePayDetails": "Détails Apple Pay:",
      "applePayUnavailable": "canMakePayments non disponible ou non iOS",
      "applePayNotConfigured": "Apple Pay non configuré car non supporté ou non iOS",
      "initializationStart": "Début initialisation PaymentSheet",
      "paymentSheetConfig": "Configuration PaymentSheet:",
      "initializationSuccess": "PaymentSheet initialisé avec succès",
      "paymentProcessStart": "Début du processus de paiement",
      "creatingPaymentIntent": "Création de l'intention de paiement pour le hushy {{secretId}}",
      "apiResponseReceived": "Réponse reçue de l'API",
      "clientSecretReceived": "Client hushy reçu, ID du paiement: {{paymentId}}",
      "presentingPaymentSheet": "Présentation de la feuille de paiement",
      "paymentCanceled": "Paiement annulé par l'utilisateur",
      "paymentSuccess": "Paiement réussi"
    },
    "errors": {
      "applePayDetailsError": "Erreur lors de la vérification des détails Apple Pay:",
      "applePayCheckError": "Erreur lors de la vérification d'Apple Pay:",
      "initPaymentSheetError": "Erreur initPaymentSheet:",
      "initializationError": "Erreur dans initializePaymentSheet:",
      "invalidSecretData": "Données du hushy invalides",
      "paymentCreationError": "Erreur lors de la création du paiement",
      "presentationError": "Erreur de présentation:",
      "handlePaymentError": "Erreur dans handlePayment:",
      "paymentErrorTitle": "Erreur de paiement",
      "paymentErrorMessage": "Une erreur est survenue lors du paiement"
    }
  },

  "secretCard": {
    "expiresIn": "Expire dans",
    "pricePaid": "Prix payé : {{price}} €",
    "basePrice": "Prix de base : {{price}} €",
    "yourEarnings": "Vos gains : {{earnings}} €",
    "price": "Prix : {{price}} €",
    "timeAgo": {
      "today": "Aujourd'hui",
      "yesterday": "Hier",
      "days": "Il y a {{count}} jour",
      "days_plural": "Il y a {{count}} jours",
      "weeks": "Il y a {{count}} semaine",
      "weeks_plural": "Il y a {{count}} semaines",
      "months": "Il y a {{count}} mois",
      "years": "Il y a {{count}} an",
      "years_plural": "Il y a {{count}} ans"
    }
  },
  "stripeVerification": {
    "logs": {
      "userCancelled": "Sélection d'image annulée par l'utilisateur"
    },
    "verificationInProgress": {
      "title": "Vérification en cours",
      "processingDescription": "Votre vérification d'identité est en cours de traitement par bancaire. Ce processus peut prendre quelques minutes à plusieurs heures.",
      "requiresInputDescription": "Votre vérification requiert des informations supplémentaires. Veuillez continuer le processus en cliquant sur le bouton ci-dessous.",
      "statusProcessing": "En cours de traitement",
      "statusRequiresInput": "Action requise",
      "refreshStatus": "Actualiser le statut",
      "continueVerification": "Continuer la vérification",
      "notificationInfo": "Vous recevrez une notification dès que votre vérification sera terminée."
    },
    "accountConfigured": {
      "title": "Compte configuré",
      "description": "Votre compte est configuré pour recevoir des paiements.",
      "descriptionIdentityPending": "Votre compte est presque prêt. Pour pouvoir transférer l'argent sur votre compte en banque, veuillez vérifier votre identité.",
      "resetAccount": "Réinitialiser le compte",
      "manageAccount": "Gérer le compte",
      "verifyIdentity": "Vérifier mon identité",
      "updateBankAccount": "Modifier mon compte bancaire",
      "bankAccount": "Compte bancaire"
    },
    "errors": {
      "title": "Erreur",
      "generic": "Une erreur est survenue",
      "selectDocument": "Veuillez sélectionner un document",
      "uploadError": "Erreur de téléchargement :",
      "uploadFailed": "Une erreur est survenue lors du téléchargement",
      "verificationFailed": "La vérification d'identité a échoué",
      "missingDocuments": "Veuillez fournir tous les documents requis",
      "preparationFailed": "Échec de la préparation de la vérification",
      "verificationError": "Erreur lors de la vérification d'identité",
      "cannotOpenBrowser": "Impossible d'ouvrir le navigateur pour la vérification",
      "checkStatus": "Impossible de vérifier le statut actuel"
    },
    "noAccount": {
      "title": "Compte Stripe non configuré",
      "description": "Vous n'avez pas encore de compte. Un compte sera automatiquement créé lorsque vous publierez votre premier Hushy. Vous pourrez alors configurer vos informations de paiement.",
      "understand": "J'ai compris"
    },
    "identityVerification": {
      "title": "Vérification d'identité",
      "selectCountry": "Pays de résidence",
      "selectCountryPlaceholder": "Sélectionnez votre pays",
      "description": "Pour recevoir vos paiements, nous devons vérifier votre identité conformément aux réglementations.",
      "documentTitle": "Document d'identité",
      "documentDescription": "Veuillez fournir un document d'identité (carte d'identité, passeport ou permis de conduire).",
      "selfieTitle": "Photo de vous",
      "selfieDescription": "Prenez une photo de vous pour confirmer votre identité.",
      "reviewTitle": "Vérification d'identité",
      "reviewDescription": "Veuillez vérifier les documents avant de les soumettre.",
      "documentSelected": "Document sélectionné : {{name}}",
      "selfieSelected": "Photo de vous sélectionnée",
      "processingTitle": "Vérification en cours",
      "processingDescription": "Votre vérification d'identité est en cours de traitement. Cela peut prendre quelques instants.",
      "pending": "Votre vérification est en cours de traitement. Veuillez vérifier le statut ultérieurement.",
      "chooseDocument": "Choisir un document",
      "changeDocument": "Changer de document",
      "takeSelfie": "Prendre une photo de vous",
      "selectDocument": "Choisir un document",
      "restart": "Recommencer",
      "submit": "Soumettre",
      "submitting": "Envoi en cours...",
      "uploading": "Téléchargement en cours...",
      "checkStatus": "Vérifier le statut",
      "verifyOnline": "Vérifier en ligne",
      "uploadDocuments": "Téléverser des documents"
    },
    "documentOptions": {
      "takePhoto": "Prendre une photo",
      "chooseFromGallery": "Choisir dans la galerie",
      "cancel": "Annuler"
    },
    "selfieOptions": {
      "takePhoto": "Prendre une photo",
      "chooseFromGallery": "Choisir dans la galerie",
      "cancel": "Annuler"
    },
    "success": {
      "title": "Succès",
      "documentSubmitted": "Votre document d'identité a été soumis avec succès.",
      "identityVerified": "Votre identité a été vérifiée avec succès."
    },
    "deleteConfirm": {
      "title": "Supprimer ce hushy ?",
      "message": "Cette action ne peut pas être annulée.",
      "cancel": "Annuler",
      "confirm": "Supprimer"
    },
    "deleteSuccess": {
      "title": "Succès",
      "message": "hushy supprimé avec succès",
      "ok": "OK"
    },
    "deleteError": {
      "title": "Erreur",
      "message": "Impossible de supprimer ce hushy",
      "ok": "OK"
    },
    "delete": "Supprimer",
    "verification": {
      "title": "Vérification d'identité",
      "message": "Vous allez être redirigé vers bancaire pour vérifier votre identité. Souhaitez-vous continuer ?",
      "cancel": "Annuler",
      "continue": "Continuer",
      "ok": "OK",
      "inProgress": {
        "title": "Vérification en cours",
        "message": "Votre vérification d'identité est en cours de traitement. Nous vous informerons lorsqu'elle sera terminée."
      },
      "submitted": {
        "title": "Vérification soumise",
        "message": "Votre vérification a été soumise avec succès. Le traitement peut prendre quelques minutes à quelques heures."
      }
    },
    "statusMessages": {
      "title": "Statut de vérification",
      "verified": "Votre identité a été vérifiée avec succès. Vous pouvez maintenant recevoir des paiements.",
      "processing": "Votre vérification est en cours de traitement. Cela peut prendre quelques minutes à quelques heures.",
      "requiresInput": "Des informations supplémentaires sont nécessaires pour compléter votre vérification. Veuillez suivre les instructions fournies.",
      "default": "Statut actuel : {{status}}. Contactez le support si vous avez besoin d'aide."
    }
  },
  "notifications": {
    "alerts": {
      "simulatorWarning": "Les notifications ne fonctionnent pas sur simulateur",
      "disabled": {
        "title": "Notifications désactivées",
        "message": "Voulez-vous activer les notifications dans les paramètres ?",
        "no": "Non",
        "openSettings": "Ouvrir les paramètres"
      }
    },
    "test": {
      "title": "Notifications activées",
      "body": "Vous recevrez désormais des notifications de l'application"
    },
    "errors": {
      "permissionCheck": "Erreur de vérification des permissions:",
      "tokenRetrieval": "Erreur lors de l'obtention du token:",
      "sending": "Erreur lors de l'envoi de la notification:",
      "activation": "Erreur d'activation:"
    },
    "logs": {
      "devModePermission": "Mode développement: autorisation simulateur",
      "existingStatus": "Status existant:",
      "newStatus": "Nouveau status:",
      "testSent": "Notification test envoyée:"
    }
  },

  "cardData": {
    "errors": {
      "fullError": "Erreur complète:",
      "axiosInitError": "Erreur d'initialisation axios:",
      "axiosNotInitialized": "Instance Axios non initialisée",
      "secretCreation": "Erreur création hushy:",
      "secretCreationGeneric": "Erreur lors de la création du hushy",
      "stripeRefresh": "Erreur rafraîchissement bancaire:",
      "stripeRefreshGeneric": "Erreur lors du rafraîchissement de la configuration bancaire",
      "stripeReturn": "Erreur de retour bancaire:",
      "stripeReset": "Erreur réinitialisation compte bancaire:",
      "stripeResetGeneric": "Erreur lors de la réinitialisation du compte bancaire",
      "stripeDelete": "Erreur suppression compte bancaire:",
      "stripeDeleteFundsAvailable": "Impossible de supprimer le compte. Des fonds sont encore disponibles.",
      "stripeDeleteGeneric": "Erreur lors de la suppression du compte bancaire",
      "invalidDataFromApi": "Données invalides reçues depuis l'API",
      "fetchingSecrets": "Erreur lors de la récupération des hushys :",
      "fetchingUserSecrets": "Erreur récupération hushys et comptage:",
      "missingSecretOrPaymentId": "Secret ID et Payment ID sont requis",
      "noConversationIdReceived": "Aucun ID de conversation reçu",
      "purchaseErrorDetails": "Détails de l'erreur:",
      "fetchingPurchasedSecrets": "Erreur lors de la récupération des hushys achetés:",
      "sendingMessage": "Erreur lors de l'envoi du message:",
      "fetchingMessages": "Erreur lors de la récupération des messages:",
      "fetchingConversations": "Erreur lors de la récupération des conversations:",
      "shareLinkUnavailable": "Lien de partage non disponible",
      "sharing": "Erreur lors du partage:",
      "imageUpload": "Erreur lors de l'upload de l'image:",
      "refreshingUnreadCounts": "Erreur lors du rafraîchissement des compteurs non lus:",
      "markingAsRead": "Erreur lors du marquage comme lu",
      "refreshingCounters": "Erreur lors du rafraîchissement des compteurs:"
    },
    "logs": {
      "secretCreationResponse": "Réponse création hushy:",
      "stripeRefreshResponse": "Réponse rafraîchissement Stripe:",
      "attemptingPurchase": "Tentative d'achat du hushy:",
      "messagesReceived": "Messages reçus:",
      "userDataNull": "getUserConversations: userData is null, returning empty array",
      "userDataNullSkippingUpdate": "refreshUnreadCounts: userData is null, skipping update",
      "updatingCounters": "Mise à jour des compteurs (avec cache local):",
      "searchingSecret": "Recherche du hushy avec ID:",
      "responseReceived": "Réponse reçue:",
      "soughtSecret": "hushy recherché:"
    },
    "stripe": {
      "configComplete": "Compte bancaire complètement configuré",
      "configInProgress": "Configuration du compte bancaire en cours",
      "noAccount": "Aucun compte bancaire associé",
      "unknownStatus": "Statut inconnu",
      "configSuccessful": "Compte bancaire configuré avec succès",
      "resetSuccess": "Compte bancaire réinitialisé avec succès",
      "deleteSuccess": "Compte bancaire supprimé avec succès"
    },
    "share": {
      "messageIOS": "🔐 Découvre mon hushy sur hushy !\n\n{{link}}",
      "messageAndroid": "🔐 Découvre mon hushy sur hushy !\n\n{{link}}\n\nTélécharge l'app: https://play.google.com/store/apps/details?id=com.hushy",
      "title": "Partager un hushy",
      "subject": "Un hushy à partager sur hushy",
      "confidentialSecret": "hushy confidentiel 🔐",
      "dialogTitle": "Partager ce hushy confidentiel"
    }
  },
  "permissions": {
    "contactsNeededTitle": "Accès aux contacts requis",
    "contactsNeededMessage": "Cette application a besoin d'accéder à vos contacts pour afficher leur contenu.",
    "contactsSettingsMessage": "Veuillez activer l'accès aux contacts dans les paramètres de votre appareil pour utiliser cette fonctionnalité.",
    "locationNeededTitle": "Accès à la position requis",
    "locationNeededMessage": "Cette application a besoin d'accéder à votre position pour afficher du contenu près de vous.",
    "locationSettingsMessage": "Veuillez activer l'accès à la position dans les paramètres de votre appareil pour utiliser cette fonctionnalité.",
    "notificationsNeededTitle": "Accès aux notifications requis",
    "notificationsNeededMessage": "Cette application a besoin de vous envoyer des notifications. Veuillez les activer dans les paramètres de votre appareil.",
    "cancel": "Annuler",
    "openSettings": "Ouvrir les Paramètres",
    "allow": "Autoriser",
    "ok": "OK",
    "errorTitle": "Erreur de permission",
    "contactsLoadError": "Erreur lors du chargement des contacts.",
    "locationError": "Erreur de localisation.",
    "notificationsAccessTitle": "Accès aux notifications requis",
    "notificationsAccessMessage": "Cette application a besoin d'envoyer des notifications. Veuillez les activer dans les paramètres de votre appareil.",
    "contactsAccessTitle": "Accès aux contacts requis",
    "contactsAccessMessage": "Cette application a besoin d'accéder à vos contacts pour afficher du contenu les concernant.",
    "locationAccessTitle": "Accès à la position requis",
    "locationAccessMessage": "Cette application a besoin d'accéder à votre position pour afficher du contenu près de vous."
  },

  "stripe": {
    "errorTitle": "Erreur bancaire",
    "unexpectedResponse": "Réponse inattendue du serveur",
    "redirectError": "Erreur lors de la redirection vers le formulaire bancaire",
    "bankUpdateSuccess": {
      "title": "Compte bancaire mis à jour",
      "message": "Votre compte bancaire a été mis à jour avec succès!"
    }
  }


}