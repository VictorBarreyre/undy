export default {
  "auth": {
    "login": {
      // Keep existing translations...
      "title": "Login or create an account",
      "email": "Email",
      "password": "Password",
      "loginButton": "Login",
      "noAccount": "I don't have an account yet 🙂",
      "or": "or",
      "continueWithApple": "Continue with Apple",
      "continueWithGoogle": "Continue with Google",
      "termsAndPrivacy": "By logging in, you agree to our Terms of Use and Privacy Policy"
    },
    // Add this new section for registration
    "register": {
      "title": "Sign up",
      "name": "Name",
      "registerButton": "Sign up",
      "hasAccount": "I already have an account 🙂",
      "termsAndPrivacy": "By signing up, you agree to our Terms of Use and Privacy Policy",
      "successTitle": "Registration successful",
      "successMessage": "Your account has been created successfully!",
      "errorTitle": "Registration error",
      "genericError": "Error during registration"
    },
    "errors": {
      // Keep existing translations...
      "connectionError": "Connection Error",
      "tokenError": "Error generating token.",
      "appleNotAvailable": "Apple Sign In is not available on this device",
      "googlePlayNotAvailable": "Google Play Services are not available",
      "googleConnectionError": "Problem connecting with Google",
      "serverError": "Server connection failed",
      "genericError": "Connection problem"
    },
    "alerts": {
      // Keep existing translations...
      "ok": "OK",
      "serviceUnavailable": "Service Unavailable",
      "errorTitle": "Error"
    }
  },
  "filter": {
    "all": "All",
    "contacts": "Contacts",
    "aroundMe": "Around me",
    "categories": "Categories",
    "preferences": "Preferences",
    "contactAccess": {
      "title": "Contact access",
      "message": "To view your contacts' secrets, we need access to your contacts.",
      "cancel": "Cancel",
      "authorize": "Authorize"
    }
  },

  "home": {
  "latestHushys": "Latest hushys 🔥",
  "sourceTexts": {
    "everyone": "From everyone",
    "fromContacts": "From your contacts",
    "fromFollowing": "From people you follow"
  },
  "errors": {
    "contactsLoading": "Error loading contacts:"
  },
  "logs": {
    "selectedFilters": "Selected filters:",
    "selectedType": "Selected type:"
  }
},

"swipeDeck": {
  "noSecrets": "No secrets available",
  "tryChangingFilters": "Try changing your filters",
  "checkBackLater": "Check back later to discover new secrets",
  "errors": {
    "initialLoading": "Initial loading error:",
    "purchase": "Error during purchase:",
    "payment": "Payment error:"
  }
},
"addSecret": {
  "addHushy": "Add a hushy",
  "postedBy": "Posted by",
  "noDescriptionAvailable": "No description available.",
  "whatIsNew": "What's new?",
  "category": "Category",
  "chooseCategory": "Choose category",
  "price": "Price",
  "min": "min",
  "duration": "Duration",
  "chooseDuration": "Choose duration",
  "duration24h": "24 hours",
  "duration7d": "7 days",
  "duration30d": "30 days",
  "youWillReceive": "You will receive {{amount}}€",
  "postSecret": "Post secret",
  "categories": [
    "Confession",
    "Love",
    "Work",
    "Family",
    "Money",
    "Friendship",
    "Betrayal",
    "Regret",
    "Success",
    "Dream",
    "Shame",
    "Event",
    "Family secret",
    "Infidelity",
    "Guilt"
  ],
  "validation": {
    "tooShort": "Too short to post!",
    "priceRequirement": "Price must be higher than {{minPrice}}€",
    "selectCategory": "Select a category"
  },
  "alerts": {
    "setupRequired": {
      "title": "Setup required",
      "message": "Your secret has been created. To be able to sell it, you need to set up your payment account.",
      "configureNow": "Configure now"
    },
    "success": {
      "title": "Congratulations! 🎉",
      "message": "Your secret has been successfully published. It is now available for sale!",
      "shareNow": "Share now 🔐"
    },
    "info": "Information",
    "later": "Later"
  },
  "errors": {
    "title": "Error",
    "deepLink": "Deep link error:",
    "unableToProcessLink": "Unable to process the link",
    "unableToShare": "Unable to share the secret."
  }
},

"conversations": {
  "title": "Conversations",
  "noConversations": "Vous n'avez pas encore déverrouillé de Hushy",
  "unlockToStart": "Déverrouillez un Hushy pour commencer une conversation !",
  "untitled": "Sans titre",
  "unknownUser": "Utilisateur inconnu",
  "profilePicture": "Photo de profil",
  "errors": {
    "loading": "Erreur chargement conversations:",
    "deletion": "Erreur lors de la suppression:"
  }
},

"chat": {
  "defaultUser": "User",
  "profilePicture": "Profile picture",
  "participants": "{{count}} participants",
  "expiresIn": "Expires in",
  "expired": "Expired",
  "timeLeft": "{{days}}d {{hours}}h {{minutes}}m",
  "noMessages": "No messages",
  "newMessages": "New messages",
  "send": "Send",
  "message": "Message",
  "postedBy": "Posted by {{name}}",
  "postedByDefault": "Posted by User",
  "selectedImage": "Selected image",
  "errors": {
    "resizing": "Error resizing image:",
    "saveScrollPosition": "Error saving scroll position:",
    "loadScrollPosition": "Error loading scroll position:",
    "restoreScrollPosition": "Error restoring scroll position:",
    "reloadConversation": "Error reloading conversation:",
    "missingCreatedAt": "Message without createdAt:",
    "missingConversationId": "Missing conversation ID",
    "missingUserInfo": "Missing user information",
    "unsupportedImageFormat": "Unsupported image format",
    "imageUpload": "Error uploading image:",
    "imageUploadFailed": "Image upload failed",
    "sendMessage": "Error sending message:",
    "imageSelection": "Error selecting image:"
  },
  "messageFailed": "Failed",
  "retry": "Retry",
  "sending": "Sending...",
  "messageImage": "Message image"
},

"dateTime": {
  "today": "Today",
  "yesterday": "Yesterday",
  "at": "at",
  "expired": "Expired",
  "expiresIn": "Expires in",
  "justNow": "Just now",
  "minutesAgo": "{{count}} minute ago",
  "minutesAgo_plural": "{{count}} minutes ago",
  "hoursAgo": "{{count}} hour ago",
  "hoursAgo_plural": "{{count}} hours ago",
  "daysAgo": "{{count}} day ago",
  "daysAgo_plural": "{{count}} days ago"
},

"profile": {
  "title": "My Profile",
  "loading": "Loading...",
  "emptyList": "Wow, it's empty here",
  "tabs": {
    "yourSecrets": "Your hushys",
    "othersSecrets": "Others' hushys"
  },
  "stats": {
    "secrets": "Secrets",
    "followers": "Followers",
    "following": "Following"
  },
  "seeMore": "See more",
  "seeLess": "See less",
  "defaultName": "User",
  "profilePictureAlt": "{{name}}'s profile picture",
  "dummyText": "Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book. It has survived not only five centuries, but also the leap into electronic typesetting, remaining essentially unchanged",
  "imagePicker": {
    "canceled": "Upload canceled by user",
    "noImageSelected": "No image selected"
  },
  "errors": {
    "title": "Error",
    "loadingData": "Error loading data:",
    "fullError": "Complete error:",
    "unableToChangeProfilePicture": "Unable to change profile picture"
  }
}

}