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
      "genericError": "Error during registration",
      "serverError": "A server error occurred during registration",
      "invalidEmail": "Please enter a valid email address",
      "emailAlreadyExists": "This email address is already registered",
      "invalidData": "The registration data is invalid",
      "emailFormat": "The email format is invalid",
      "weakPassword": "The password is too weak",
      "requiredFields": "All required fields must be filled",
    },
    "success": {
      "noChangeNeeded": "No changes needed.",
      "profileUpdated": "Profile successfully updated.",
      "dataCleared": "Data successfully cleared.",
      "accountDeleted": "Account successfully deleted."
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
      "errorTitle": "Error",
      "sessionExpired": {
        "title": "Session Expired"
      },

      "permissions": {
        "contactsAccess": {
          "title": "Contact Access",
          "message": "This app needs to access your contacts.",
          "ok": "OK"
        }
      },
      "permissionDenied": {
        "title": "Permission Denied",
        "message": "You must allow access to contacts to use this feature."
      },
    },
    "axiosNotInitialized": "Axios instance not initialized",
    "noImageUrlReceived": "No image URL received from server",
    "contactsAccess": "Error updating contacts access:",
    "checkingContacts": "Error checking contacts:",
    "persistingUserData": "Error persisting user data",
    "loadingPersistedData": "Error loading persisted user data",
    "downloadingData": "Error downloading data:",
    "clearingData": "Error clearing data:",
    "deletingAccount": "Error deleting account:",
    "fetchingUserData": "Error fetching user data:",
    "retrievingContacts": "Error retrieving contacts:",
    "retrievingContact": "Error retrieving contact:"
  },
  "filter": {
    "all": "All",
    "contacts": "Contacts",
    "aroundMe": "Around me",
    "categories": "Categories",
    "preferences": "Preferences",
    "contactAccess": {
      "title": "Contact Access",
      "message": "To view hushys from your contacts, we need access to your contacts.",
      "cancel": "Cancel",
      "authorize": "Authorize"
    },
    "contactSettings": {
      "title": "Contact Access Required",
      "message": "You have previously denied access to contacts. Please enable it manually in your phone's settings.",
      "cancel": "Cancel",
      "openSettings": "Open Settings"
    },
    "contactDenied": {
      "title": "Contact Access Required",
      "message": "Contact access is necessary for this feature. Please allow it in settings.",
      "cancel": "Cancel",
      "openSettings": "Open Settings"
    }
  },

  "home": {
    "latestHushys": "Latest hushys 🔥",
    "sourceTexts": {
      "everyone": "From everyone",
      "fromContacts": "From your contacts",
      "fromFollowing": "From people you follow",
      "fromNearby": "From nearby"
    },
    "errors": {
      "contactsLoading": "Error loading contacts:"
    },
    "logs": {
      "selectedFilters": "Selected filters:",
      "selectedType": "Selected type:"
    },

  },

  "location": {
    "shareLocation": {
      "title": "Share location with this hushy",
      "enabled": "Your location will be included",
      "disabled": "Your location will not be shared"
    },
    "errors": {
      "title": "Location Error",
      "permissionDenied": "You must allow location access to use this feature.",
      "gettingPosition": "Unable to retrieve your current location."
    },
    "alerts": {
      "welcome": {
        "title": "Location Access",
        "message": "hushy can use your location to show you nearby hushys. Would you like to enable this feature?",
        "yes": "Yes, enable",
        "no": "No, thanks"
      },
      "shareLocation": {
        "title": "Share Your Location",
        "message": "Would you like to share your location with this hushy? This will allow users nearby to discover it more easily.",
        "yes": "Share",
        "no": "Don't share"
      }
    },
    "errors": {
      "permissionError": "Location permission error:",
      "locationError": "Location error:",
      "gettingPosition": "Error getting position:",
      "fetchingNearbySecrets": "Error fetching nearby hushys:",
      "permissionCheckError": "Error checking location permissions:",
      "accessUpdateError": "Error updating location access:"
    },
    "logs": {
      "permissionDenied": "Location permission denied"
    }
  },
  "swipeDeck": {
    "noSecrets": "No hushys available",
    "tryChangingFilters": "Try changing your filters",
    "checkBackLater": "Check back later to discover new hushys",
    "noContactsUsingApp": "None of your contacts are using hushy yet",
    "noSecretsNearby": "No hushys available nearby",
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
    "postSecret": "Post hushy",
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
      "Family hushy",
      "Infidelity",
      "Guilt"
    ],
    "validation": {
      "tooShort": "Too short to post!",
      "priceRequirement": "Price must be higher than {{minPrice}}€",
      "selectCategory": "Select a category",
      "invalidCoordinates": "Invalid geographic coordinates"
    },
    "locationSharing": {
      "title": "Share location with this hushy",
      "enabled": "Your location will be included",
      "disabled": "Your location will not be shared",
      "accessibility": "Share location"
    },
    "alerts": {
      "noStripeAccount": {
        "title": "No bank Account",
        "message": "You don't have a bank account set up to receive payments yet.",
        "create": "Create an account",
        "stripePersistent": "bank configuration is still required"
      },
      "pendingData": {
        "title": "Pending Data",
        "message": "You have an unfinished hushy. Would you like to continue with this data?",
        "continue": "Continue",
        "discard": "Discard"
      },
      "setupRequired": {
        "title": "Setup required",
        "message": "Your hushy has been created. To be able to sell it, you need to set up your payment account.",
        "configureNow": "Configure now"
      },
      "success": {
        "title": "Congratulations! 🎉",
        "message": "Your hushy has been successfully published. It is now available for sale!",
        "shareNow": "Share now 🔐"
      },
      "info": "Information",
      "later": "Later"
    },
    "errors": {
      "title": "Error",
      "deepLink": "Deep link error:",
      "unableToProcessLink": "Unable to process the link",
      "unableToShare": "Unable to share the hushy."
    }
  },


  "conversations": {
    "title": "Conversations",
    "noConversations": "You haven't unlocked any hushy yet",
    "unlockToStart": "Unlock a hushy to start a conversation!",
    "untitled": "Untitled",
    "unknownUser": "Unknown user",
    "profilePicture": "Profile picture",
    "errors": {
      "loading": "Error loading conversations:",
      "deletion": "Error during deletion:"
    }
  },

  "chat": {
    "defaultUser": "User",
    "profilePicture": "Profile picture",
    "participants": "{{count}} participants",
    "expiresIn": "Expires in",
    "expired": "Expired",
    "timeLeft": "{{days}}d {{hours}}h {{minutes}}m",
    "noMessagesYet": "No messages yet",
    "sayHelloToStart": "Send a message to start the conversation",
    "newMessages": "New messages",
    "send": "Send",
    "message": "Message",
    "postedBy": "Posted by {{name}}",
    "postedByDefault": "Posted by User",
    "selectedImage": "Selected image",
    "share": "Share",
    "shared": "Shared",
    "you": "You",
    "replyingTo": "Answer to",
    "participantsList": "Conversation Participants",
    "locationSharing": {
      "title": "Share location"
    },

    "audio": {
      "permissionRequired": "Permission Required",
      "microphoneAccess": "The app needs access to your microphone to record voice messages.",
      "cancel": "Cancel",
      "settings": "Settings",
      "recordingError": "Error starting recording",
      "cannotStartRecording": "Cannot start audio recording.",
      "playbackError": "Playback error",
      "cannotPlayRecording": "Cannot play audio recording.",
      "uploadError": "Audio upload error",
      "messageDeleted": "Message deleted",
      "contentModeration": "Your message has been deleted because it was identified as inappropriate content after a complete analysis."
    },
    "moderation": {
      "title": "Inappropriate Content",
      "message": "Your message cannot be sent because it contains inappropriate content.",
      "retry": "Retry",
      "cancel": "Cancel"
    },
    "reply": "Reply",
    "cancel": "Cancel",
    "image": "Image",
    "defaultUser": "User",
    // Pour le menu contextuel des messages
    "messageOptions": {
      "reply": "Reply",
      "copy": "Copy", // Nouvelle entrée
      "cancel": "Cancel"
    },
    "documentOptions": {
      "takePhoto": "Take a photo",
      "chooseFromGallery": "Choose from gallery",
      "cancel": "Cancel"
    },
    "alerts": {
      "error": "Error",
      "sendError": "An error occurred while sending the message. Please try again."
    },
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
      "imageSelection": "Error selecting image:",
      "shareError": "Error while sharing",
      "missingSecretData": "Missing hushy data"
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
      "secrets": "hushys",
      "followers": "Followers",
      "following": "Following"
    },
    "seeMore": "See more",
    "seeLess": "See less",
    "defaultName": "User",
    "profilePictureAlt": "{{name}}'s profile picture",
    "imagePicker": {
      "canceled": "Image selection canceled",
      "noImageSelected": "No image was selected"
    },
    "cropImage": {
      "title": "Adjust your photo",
      "instructions": "Move and resize your photo",
      "preview": "Image preview"
    },
    "errors": {
      "title": "Error",
      "loadingData": "Error loading data",
      "fullError": "Full error:",
      "unableToChangeProfilePicture": "Unable to change your profile picture",
      "networkError": "Unable to connect to the server. Check your internet connection or your Apple account.",
      "timeoutError": "The request took too long. Try with a smaller image or check your connection.",
      "deviceError": "An error occurred with the cropping function. We will try without cropping.",
      "imageProcessingFailed": "Image processing failed"
    }
  },
  "settings": {
    "title": "Your Settings",
    "generalSection": "General",
    "dataSection": "Data",
    "logout": "Logout",
    "enabled": "Enabled",
    "enabledFeminin": "Enabled",
    "enabledFemininePlural": "Enabled",
    "disabled": "Disabled",
    "disabledFeminin": "Disabled",
    "disabledFemininePlural": "Disabled",
    "notSpecified": "Not specified",
    "notConfigured": "Not configured",
    "userDataLog": "User data:",
    "selectedFieldLog": "Selected field:",
    "inputValueLog": "Input value:",
    "dataToUpdateLog": "Data to update before sending:",
    "dataReceivedLog": "Data received:",
    "success": "Success",
    "dataCopiedToClipboard": "The data has been copied to your clipboard",
    "ok": "OK",
    "dataDownloadSuccess": "Data downloaded successfully",
    "confirmation": "Confirmation",
    "clearDataConfirmation": "Are you sure you want to clear your data?",
    "cancel": "Cancel",
    "clear": "Clear",
    "dataClearedSuccess": "Your data has been cleared",
    "deleteAccountConfirmation": "Are you sure you want to delete your account? This action is irreversible.",
    "delete": "Delete",
    "accountDeletedSuccess": "Your account has been deleted",
    "resetStripeAccount": "Reset bank Account",
    "resetStripeConfirmation": "Are you sure you want to reset your bank account? You will need to redo the onboarding process.",
    "reset": "Reset",
    "stripeResetSuccess": "Your bank account has been reset. You will be redirected to onboarding.",
    "mySubscriptions": "My Subscriptions",
    "noSubscriptionsYet": "You don't have any subscriptions yet. Discover our offers to enhance your experience.",
    "viewSubscriptions": "View Subscriptions",
    "editField": "Edit your {{field}}",
    "editFieldPlaceholder": "Edit your {{field}}",
    "information": "information",
    "save": "Save",
    "fields": {
      "name": "Name",
      "email": "Email address",
      "password": "Password",
      "phone": "Phone number",
      "birthdate": "Birth date",
      "income": "Your earnings",
      "bank": "Bank account",
      "notifications": "My notifications",
      "contacts": "My contacts",
      "subscriptions": "My subscriptions",
      "location": "My location"
    },
    "account": {
      "downloadData": "Download data",
      "clearData": "Clear data",
      "deleteAccount": "Delete my account"
    },
    "errors": {
      "title": "Error",
      "toggleNotificationsError": "Error toggleNotifications:",
      "notificationUpdateError": "An error occurred while updating notification preferences",
      "toggleContactsError": "Error toggleContacts:",
      "contactsUpdateError": "Unable to update contact preferences",
      "genericError": "An error occurred",
      "genericLog": "Error:",
      "dataDownloadError": "An error occurred while downloading data",
      "stripeResetErrorLog": "Error resetting bank account:",
      "stripeResetError": "Error resetting bank account",
      "logoutErrorLog": "Logout error:",
      "logoutError": "An error occurred during logout",
      "toggleLocationError": "Error toggling location settings:",
      "locationUpdateError": "Unable to update location preferences"
    }
  },
  "sharedSecret": {
    "title": "Discover the hushy 🔐",
    "subtitle": "and access the conversation!",
    "loading": "Undy...",
    "errors": {
      "title": "Error",
      "fetchError": "Error:",
      "unableToLoad": "Unable to load the hushy.",
      "purchaseError": "Error during purchase:",
      "paymentError": "Payment error:"
    }
  },

  "cardHome": {
    "postedFrom": "at",
    "unknownLocation": "Unknown location",
    "locationError": "Location not available",
    "postedBy": "Posted by {{name}}",
    "expiresIn": "Expires in",
    "noData": "No data available",
    "notAvailable": "N/A",
    "anonymous": "Anonymous",
    "noDescriptionAvailable": "No description available.",
    "labelUnavailable": "Label unavailable",
    "profilePicture": "{{name}}'s profile picture",
    "logs": {
      "secretRevealed": "hushy revealed!"
    },
    "errors": {
      "title": "Error",
      "unableToShare": "Unable to share the hushy."
    }
  },

  "contacts": {
    "title": "Contacts",
    "loading": "Loading contacts...",
    "searchPlaceholder": "Search for a contact",
    "noContactsFound": "No contacts found",
    "errors": {
      "loading": "Error loading contacts:"
    }
  },

  "deepLink": {
    "alerts": {
      "success": {
        "title": "Success",
        "message": "Your bank account has been successfully configured!",
        "accountCreated": "Your bank account has been successfully created!",
      },
      "configInProgress": {
        "title": "Configuration in progress"
      },
      "ok": "OK",
      "errors": {
        "title": "Error",
        "deepLinkError": "Deep link error:",
        "unableToProcessLink": "Unable to process the link",
        "stillNeedsConfig": "bank configuration is still needed.",
        "postingFailed": "Failed to automatically post the hushy.",
      },
      "returnToPost": "Return to posting",
    },
  },

  "earnings": {
    "title": "Earnings Details",
    "noEarningsYet": "You haven't generated any earnings yet. Start selling your hushys to earn money.",
    "publishSecret": "Publish a hushy",
    "loadingTransactions": "Loading transactions...",
    "transfer": "Transfer",
    "sale": "Sale",
    "succeeded": "Succeeded",
    "pending": "Pending",
    "totalEarned": "Total earned",
    "available": "Available",
    "availableEarnings": "Available earnings",
    "noAvailableFunds": "No funds available",
    "retrieveFunds": "Retrieve funds",
    "logs": {
      "allData": "all data ",
      "totalMoney": "all money ",
      "transferSuccess": "Transfer completed successfully!"
    },
    "errors": {
      "generic": "Error:",
      "paymentSheetInit": "Error initializing payment sheet:",
      "paymentSheetPresent": "Error presenting payment sheet:",
      "transferFunds": "Error transferring funds:"
    },
    "error": "Error",
    "confirmTransfer": "Confirm Transfer",
    "confirmTransferMessage": "Do you want to transfer {{amount}}€ to your bank account?",
    "cancel": "Cancel",
    "confirm": "Confirm",
    "success": "Success",
    "transferSuccessMessage": "Transfer of {{amount}}€ completed successfully. Expected arrival on {{arrivalDate}}.",
    "ok": "OK",
    "errors": {
      "generic": "Error:",
      "paymentSheetInit": "Error initializing payment sheet:",
      "paymentSheetPresent": "Error presenting payment sheet:",
      "transferFunds": "Error transferring funds:",
      "insufficientFunds": "Insufficient funds",
      "noBankAccount": "No bank account configured"
    }
  },

  "inviteContacts": {
    "title": "Invite Contacts",
    "noContactsUsingApp": "None of your contacts are using hushy yet. Invite them to join the app!",
    "cancel": "Cancel",
    "inviteWithCount": "Invite ({{count}})",
    "invitationMessage": "Hey! I'm inviting you to join hushy, an awesome app for sharing hushys! Download it now: https://hushy.app",
    "invitationTitle": "Invitation to hushy",
    "errors": {
      "title": "Error",
      "invitationError": "Error during invitation:",
      "unableToSendInvitations": "Unable to send invitations"
    }
  },

  "paymentSheet": {
    "loading": "Loading...",
    "unlockForPrice": "Unlock for {{price}} €",
    "logs": {
      "applePaySupported": "Apple Pay supported:",
      "applePayDetails": "Apple Pay details:",
      "applePayUnavailable": "canMakePayments not available or not iOS",
      "applePayNotConfigured": "Apple Pay not configured because not supported or not iOS",
      "initializationStart": "Starting PaymentSheet initialization",
      "paymentSheetConfig": "PaymentSheet configuration:",
      "initializationSuccess": "PaymentSheet successfully initialized",
      "paymentProcessStart": "Starting payment process",
      "creatingPaymentIntent": "Creating payment intent for hushy {{secretId}}",
      "apiResponseReceived": "API response received",
      "clientSecretReceived": "Client hushy received, payment ID: {{paymentId}}",
      "presentingPaymentSheet": "Presenting payment sheet",
      "paymentCanceled": "Payment canceled by user",
      "paymentSuccess": "Payment successful"
    },
    "errors": {
      "applePayDetailsError": "Error checking Apple Pay details:",
      "applePayCheckError": "Error checking Apple Pay:",
      "initPaymentSheetError": "Error initializing PaymentSheet:",
      "initializationError": "Error in initializePaymentSheet:",
      "invalidSecretData": "Invalid hushy data",
      "paymentCreationError": "Error creating payment",
      "presentationError": "Presentation error:",
      "handlePaymentError": "Error in handlePayment:",
      "paymentErrorTitle": "Payment Error",
      "paymentErrorMessage": "An error occurred during payment"
    }
  },

  "secretCard": {
    "expiresIn": "Expires in",
    "pricePaid": "Price paid: {{price}} €",
    "basePrice": "Base price: {{price}} €",
    "yourEarnings": "Your earnings: {{earnings}} €",
    "price": "Price: {{price}} €",
    "timeAgo": {
      "today": "Today",
      "yesterday": "Yesterday",
      "days": "{{count}} day ago",
      "days_plural": "{{count}} days ago",
      "weeks": "{{count}} week ago",
      "weeks_plural": "{{count}} weeks ago",
      "months": "{{count}} month ago",
      "months_plural": "{{count}} months ago",
      "years": "{{count}} year ago",
      "years_plural": "{{count}} years ago"
    }
  },

  "stripeVerification": {
    "logs": {
      "userCancelled": "Image selection cancelled by user"
    },

    "verificationInProgress": {
      "title": "Verification in Progress",
      "processingDescription": "Your identity verification is being processed by bank. This process may take a few minutes to several hours.",
      "requiresInputDescription": "Your verification requires additional information. Please continue the process by clicking the button below.",
      "statusProcessing": "Processing",
      "statusRequiresInput": "Action required",
      "refreshStatus": "Refresh status",
      "continueVerification": "Continue verification",
      "notificationInfo": "You'll receive a notification as soon as your verification is complete."
    },

    "accountConfigured": {
      "title": "Account Configured",
      "description": "Your account is configured to receive payments.",
      "descriptionIdentityPending": "Your account is almost ready. To transfer money to your bank account, please verify your identity.",
      "resetAccount": "Reset account",
      "manageAccount": "Manage account",
      "verifyIdentity": "Verify my identity",
      "updateBankAccount": "Update my bank account",
      "bankAccount": "Bank account"
    },
    "errors": {
      "title": "Error",
      "generic": "An error occurred",
      "selectDocument": "Please select a document",
      "uploadError": "Upload error:",
      "uploadFailed": "An error occurred during upload",
      "verificationFailed": "Identity verification failed",
      "missingDocuments": "Please provide all required documents",
      "preparationFailed": "Verification preparation failed",
      "verificationError": "Error during identity verification",
      "cannotOpenBrowser": "Cannot open browser for verification",
      "checkStatus": "Unable to check current status"
    },
    "noAccount": {
      "title": "bank Account Not Set Up",
      "description": "You don't have an account yet. An account will be automatically created when you publish your first Hushy. You can then set up your payment information.",
      "understand": "I understand"
    },
    "identityVerification": {
      "title": "Identity Verification",
      "selectCountry": "Country of residence",
      "selectCountryPlaceholder": "Select your country",
      "description": "To receive your payments, we need to verify your identity in accordance with regulations.",
      "documentTitle": "Identity Document",
      "documentDescription": "Please provide an identity document (ID card, passport, or driver's license).",
      "selfieTitle": "Photo of Yourself",
      "selfieDescription": "Take a photo of yourself to confirm your identity.",
      "reviewTitle": "Identity Verification",
      "reviewDescription": "Please review the documents before submitting.",
      "documentSelected": "Document selected: {{name}}",
      "selfieSelected": "Photo of yourself selected",
      "processingTitle": "Verification in Progress",
      "processingDescription": "Your identity verification is being processed. This may take a few moments.",
      "pending": "Your verification is being processed. Please check the status later.",
      "chooseDocument": "Choose a document",
      "changeDocument": "Change document",
      "takeSelfie": "Take a selfie",
      "selectDocument": "Select a document",
      "restart": "Start over",
      "submit": "Submit",
      "submitting": "Submitting...",
      "uploading": "Uploading...",
      "checkStatus": "Check status",
      "verifyOnline": "Verify online",
      "uploadDocuments": "Upload documents"
    },
    "documentOptions": {
      "takePhoto": "Take a photo",
      "chooseFromGallery": "Choose from gallery",
      "cancel": "Cancel"
    },
    "selfieOptions": {
      "takePhoto": "Take a photo",
      "chooseFromGallery": "Choose from gallery",
      "cancel": "Cancel"
    },
    "success": {
      "title": "Success",
      "documentSubmitted": "Your identity document has been successfully submitted.",
      "identityVerified": "Your identity has been successfully verified."
    },
    "deleteConfirm": {
      "title": "Delete this hushy?",
      "message": "This action cannot be undone.",
      "cancel": "Cancel",
      "confirm": "Delete"
    },
    "deleteSuccess": {
      "title": "Success",
      "message": "hushy deleted successfully",
      "ok": "OK"
    },
    "deleteError": {
      "title": "Error",
      "message": "Could not delete this hushy",
      "ok": "OK"
    },
    "delete": "Delete",
    "verification": {
      "title": "Identity Verification",
      "message": "You will be redirected to bank to verify your identity. Would you like to continue?",
      "cancel": "Cancel",
      "continue": "Continue",
      "ok": "OK",
      "inProgress": {
        "title": "Verification in Progress",
        "message": "Your identity verification is being processed. We will notify you when it's complete."
      },
      "submitted": {
        "title": "Verification Submitted",
        "message": "Your verification has been successfully submitted. Processing may take a few minutes to a few hours."
      }
    },
    "statusMessages": {
      "title": "Verification Status",
      "verified": "Your identity has been successfully verified. You can now receive payments.",
      "processing": "Your verification is being processed. This may take a few minutes to a few hours.",
      "requiresInput": "Additional information is needed to complete your verification. Please follow the provided instructions.",
      "default": "Current status: {{status}}. Contact support if you need assistance."
    }
  },
  "notifications": {
    "alerts": {
      "simulatorWarning": "Notifications don't work on simulator",
      "disabled": {
        "title": "Notifications disabled",
        "message": "Do you want to enable notifications in settings?",
        "no": "No",
        "openSettings": "Open settings"
      }
    },
    "test": {
      "title": "Notifications enabled",
      "body": "You will now receive notifications from the app"
    },
    "message": {
      "title": "Message from {{sender}}",
      "body": "{{text}}"
    },
    "purchase": {
      "title": "Secret sold!",
      "body": "{{buyer}} purchased your secret for {{price}}"
    },
    "nearby": {
      "title": "Nearby secrets",
      "body": "There are {{count}} secrets within {{distance}} meters of you"
    },
    "stripeSetup": {
      "title": "Banking setup incomplete",
      "body": "Don't forget to complete your banking setup to receive payments"
    },
    "event": {
      "title": "Limited time event",
      "body": "{{event}} ends in {{days}} days"
    },
    "stats": {
      "title": "Stats update",
      "body": "You have {{secrets}} secrets and {{purchases}} purchases"
    },
    "welcomeBack": {
      "title": "Welcome back!",
      "body": "We missed you! It's been {{days}} days since your last visit"
    },
    "audio": {
      "title": "Audio message",
      "body": "Someone sent you an audio message"
    },
    "image": {
      "title": "Image shared",
      "body": "Someone shared an image with you"
    },
    "mixed": {
      "title": "Multimedia message",
      "body": "Someone sent you a multimedia message"
    },
    "errors": {
      "permissionCheck": "Error checking permissions:",
      "tokenRetrieval": "Error retrieving token:",
      "sending": "Error sending notification:",
      "activation": "Activation error:",
      "messageNotification": "Error sending message notification",
      "purchaseNotification": "Error sending purchase notification",
      "nearbyNotification": "Error sending nearby notification",
      "stripeReminderNotification": "Error sending banking reminder",
      "eventNotification": "Error sending event notification",
      "statsNotification": "Error sending stats notification",
      "welcomeBackNotification": "Error sending welcome back notification",
      "tokenRegistration": "Error registering token",
      "axiosNotInitialized": "HTTP client is not initialized"
    },
    "logs": {
      "devModePermission": "Development mode: simulator permission granted",
      "existingStatus": "Existing status:",
      "newStatus": "New status:",
      "testSent": "Test notification sent:",
      "tokenRegistered": "Device token registered successfully"
    }
  },
  "cardData": {
    "errors": {
      "axiosInitError": "Axios initialization error:",
      "axiosNotInitialized": "Axios instance not initialized",
      "secretCreation": "hushy creation error:",
      "secretCreationGeneric": "Error creating hushy",
      "stripeRefresh": "bank refresh error:",
      "stripeRefreshGeneric": "Error refreshing bank configuration",
      "stripeReturn": "bank return error:",
      "stripeReset": "bank account reset error:",
      "stripeResetGeneric": "Error resetting bank account",
      "stripeDelete": "bank account deletion error:",
      "stripeDeleteFundsAvailable": "Unable to delete account. Funds are still available.",
      "stripeDeleteGeneric": "Error deleting bank account",
      "invalidDataFromApi": "Invalid data received from API",
      "fetchingSecrets": "Error fetching hushys:",
      "fetchingUserSecrets": "Error fetching user hushys and count:",
      "missingSecretOrPaymentId": "hushy ID and Payment ID are required",
      "noConversationIdReceived": "No conversation ID received",
      "purchaseErrorDetails": "Error details:",
      "fetchingPurchasedSecrets": "Error fetching purchased hushys:",
      "sendingMessage": "Error sending message:",
      "fetchingMessages": "Error fetching messages:",
      "fetchingConversations": "Error fetching conversations:",
      "shareLinkUnavailable": "Share link unavailable",
      "sharing": "Error sharing:",
      "imageUpload": "Error uploading image:",
      "refreshingUnreadCounts": "Error refreshing unread counts:",
      "markingAsRead": "Error marking as read",
      "refreshingCounters": "Error refreshing counters:",
      "fullError": "Full error:"
    },
    "logs": {
      "secretCreationResponse": "hushy creation response:",
      "stripeRefreshResponse": "bank refresh response:",
      "attemptingPurchase": "Attempting to purchase hushy:",
      "messagesReceived": "Messages received:",
      "userDataNull": "getUserConversations: userData is null, returning empty array",
      "userDataNullSkippingUpdate": "refreshUnreadCounts: userData is null, skipping update",
      "updatingCounters": "Updating counters (with local cache):",
      "searchingSecret": "Searching for hushy with ID:",
      "responseReceived": "Response received:",
      "soughtSecret": "Sought hushy:"
    },
    "stripe": {
      "configComplete": "bank account fully configured",
      "configInProgress": "bank account configuration in progress",
      "noAccount": "No bank account associated",
      "unknownStatus": "Unknown status",
      "configSuccessful": "bank account successfully configured",
      "resetSuccess": "bank account successfully reset",
      "deleteSuccess": "bank account successfully deleted"
    },
    "share": {
      "messageIOS": "🔐 Discover my hushy on hushy!\n\n{{link}}",
      "messageAndroid": "🔐 Discover my hushy on hushy!\n\n{{link}}\n\nDownload the app: https://play.google.com/store/apps/details?id=com.hushy",
      "title": "Share a hushy",
      "subject": "A hushy to share on hushy",
      "confidentialSecret": "Confidential hushy 🔐",
      "dialogTitle": "Share this confidential hushy"
    }
  },
  "permissions": {
    "contactsNeededTitle": "Contacts Access Required",
    "contactsNeededMessage": "This app needs access to your contacts to show content from them.",
    "contactsSettingsMessage": "Please enable contacts access in your device settings to use this feature.",
    "locationNeededTitle": "Location Access Required",
    "locationNeededMessage": "This app needs access to your location to show content near you.",
    "locationSettingsMessage": "Please enable location access in your device settings to use this feature.",
    "notificationsNeededTitle": "Notifications Access Required",
    "notificationsNeededMessage": "This app needs to send you notifications. Please enable them in your device settings.",
    "cancel": "Cancel",
    "openSettings": "Open Settings",
    "allow": "Allow",
    "ok": "OK",
    "errorTitle": "Permission Error",
    "notificationsAccessTitle": "Notifications Access Required",
    "notificationsAccessMessage": "This app needs to send you notifications. Please enable them in your device settings.",
    "contactsAccessTitle": "Contacts Access Required",
    "contactsAccessMessage": "This app needs to access your contacts to display content related to them.",
    "locationAccessTitle": "Location Access Required",
    "locationAccessMessage": "This app needs to access your location to display content near you."
  },
  "stripe": {
    "errorTitle": "Banking Error",
    "unexpectedResponse": "Unexpected server response",
    "redirectError": "Error redirecting to the banking form",
    "bankUpdateSuccess": {
      "title": "Bank Account Updated",
      "message": "Your bank account has been successfully updated!"
    }
  }

}