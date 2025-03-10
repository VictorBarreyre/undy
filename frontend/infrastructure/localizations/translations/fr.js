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
      "genericError": "Erreur lors de l'inscription"
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
      "errorTitle": "Erreur"
    }
  },
  "filter": {
  "all": "Tous",
  "contacts": "Contacts",
  "aroundMe": "Autour de moi",
  "categories": "Catégories",
  "preferences": "Préférences",
  "contactAccess": {
    "title": "Accès aux contacts",
    "message": "Pour afficher les secrets de vos contacts, nous avons besoin d'accéder à vos contacts.",
    "cancel": "Annuler",
    "authorize": "Autoriser"
  }
},
"home": {
  "latestHushys": "Les derniers hushys 🔥",
  "sourceTexts": {
    "everyone": "De tout le monde",
    "fromContacts": "De vos contacts",
    "fromFollowing": "Des personnes que vous suivez"
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
  "noSecrets": "Aucun secret disponible",
  "tryChangingFilters": "Essayez de modifier vos filtres",
  "checkBackLater": "Revenez plus tard pour découvrir de nouveaux secrets",
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
  "postSecret": "Poster le secret",
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
  "validation": {
    "tooShort": "Trop court pour poster !",
    "priceRequirement": "Le prix doit être supérieur à {{minPrice}}€",
    "selectCategory": "Sélectionnez une catégorie"
  },
  "alerts": {
    "setupRequired": {
      "title": "Configuration nécessaire",
      "message": "Votre secret a été créé. Pour pouvoir le vendre, vous devez configurer votre compte de paiement.",
      "configureNow": "Configurer maintenant"
    },
    "success": {
      "title": "Félicitations ! 🎉",
      "message": "Votre secret a été publié avec succès. Il est maintenant disponible à la vente !",
      "shareNow": "Partager maintenant 🔐"
    },
    "info": "Information",
    "later": "Plus tard"
  },
  "errors": {
    "title": "Erreur",
    "deepLink": "Deep link error:",
    "unableToProcessLink": "Impossible de traiter le lien",
    "unableToShare": "Impossible de partager le secret."
  }
},

"conversations": {
  "title": "Conversations",
  "noConversations": "You haven't unlocked any Hushy yet",
  "unlockToStart": "Unlock a Hushy to start a conversation!",
  "untitled": "Untitled",
  "unknownUser": "Unknown user",
  "profilePicture": "Profile picture",
  "errors": {
    "loading": "Error loading conversations:",
    "deletion": "Error during deletion:"
  }
},
"chat": {
  "defaultUser": "Utilisateur",
  "profilePicture": "Photo de profil",
  "participants": "{{count}} participants",
  "expiresIn": "Expire dans",
  "expired": "Expiré",
  "timeLeft": "{{days}}j {{hours}}h {{minutes}}m",
  "noMessages": "Aucun message",
  "newMessages": "Nouveaux messages",
  "send": "Envoyer",
  "message": "Message",
  "postedBy": "Posté par {{name}}",
  "postedByDefault": "Posté par Utilisateur",
  "selectedImage": "Image sélectionnée",
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
    "imageSelection": "Erreur lors de la sélection d'image:"
  },
  "messageFailed": "Échec",
  "retry": "Renvoyer",
  "sending": "Envoi...",
  "messageImage": "Image du message"
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
    "yourSecrets": "Vos hushy",
    "othersSecrets": "Ceux des autres"
  },
  "stats": {
    "secrets": "Secrets",
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
  "errors": {
    "title": "Erreur",
    "loadingData": "Erreur chargement données:",
    "fullError": "Erreur complète:",
    "unableToChangeProfilePicture": "Impossible de changer la photo de profil"
  }
},

}