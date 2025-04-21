// controllers/moderationController.js

const fetch = require('node-fetch');

// Configuration de l'API Google Perspective
const PERSPECTIVE_API_CONFIG = {
  apiKey: process.env.PERSPECTIVE_API_KEY || 'votre-clé-api',
  endpoint: 'https://commentanalyzer.googleapis.com/v1alpha1/comments:analyze',
};

// Configuration des seuils de modération
const MODERATION_CONFIG = {
  threshold: 0.7,                // Seuil par défaut
  categoryThresholds: {
    'TOXICITY': 0.7,             // Contenu toxique général
    'SEVERE_TOXICITY': 0.5,      // Contenu très toxique
    'IDENTITY_ATTACK': 0.6,      // Attaques basées sur l'identité
    'INSULT': 0.7,               // Insultes
    'PROFANITY': 0.8,            // Grossièretés
    'THREAT': 0.6,               // Menaces
    'SEXUALLY_EXPLICIT': 0.7,    // Contenu sexuellement explicite
  },
  logViolations: true,           // Journaliser les violations
};

/**
 * Vérifier si un score dépasse le seuil pour une catégorie
 * @param {string} category - Catégorie à vérifier
 * @param {number} score - Score de modération
 * @returns {boolean} - True si le score dépasse le seuil
 */
const isAboveThreshold = (category, score) => {
  const threshold = MODERATION_CONFIG.categoryThresholds[category] || MODERATION_CONFIG.threshold;
  return score > threshold;
};

/**
 * Vérifier le contenu avec l'API Google Perspective
 * @param {string} content - Contenu à vérifier
 * @returns {Promise<Object>} - Résultat de modération
 */
const checkContentWithPerspective = async (content) => {
  try {
    // Construction du corps de la requête
    const requestBody = {
      comment: { text: content },
      languages: ['fr', 'en'],  // Support du français et de l'anglais
      requestedAttributes: {
        TOXICITY: {},
        SEVERE_TOXICITY: {},
        IDENTITY_ATTACK: {},
        INSULT: {},
        PROFANITY: {},
        THREAT: {},
        SEXUALLY_EXPLICIT: {}
      }
    };
    
    // Construction de l'URL avec la clé API
    const url = `${PERSPECTIVE_API_CONFIG.endpoint}?key=${PERSPECTIVE_API_CONFIG.apiKey}`;
    
    // Appel à l'API Perspective
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Perspective API request failed: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    
    // Vérifier les scores pour chaque attribut
    if (data.attributeScores) {
      // Trouver les catégories dépassant leur seuil
      const flaggedCategories = [];
      
      for (const category in data.attributeScores) {
        const score = data.attributeScores[category].summaryScore.value;
        
        if (isAboveThreshold(category, score)) {
          flaggedCategories.push({
            name: category,
            score: score
          });
        }
      }
      
      // Si au moins une catégorie est signalée
      if (flaggedCategories.length > 0) {
        // Trouver la catégorie avec le score le plus élevé relativement à son seuil
        let highestCategory = flaggedCategories[0].name;
        let highestRelativeScore = flaggedCategories[0].score / 
          (MODERATION_CONFIG.categoryThresholds[flaggedCategories[0].name] || MODERATION_CONFIG.threshold);
        
        for (const flaggedCat of flaggedCategories) {
          const relativeScore = flaggedCat.score / 
            (MODERATION_CONFIG.categoryThresholds[flaggedCat.name] || MODERATION_CONFIG.threshold);
          
          if (relativeScore > highestRelativeScore) {
            highestCategory = flaggedCat.name;
            highestRelativeScore = relativeScore;
          }
        }
        
        // Mapper la catégorie Perspective à un nom plus lisible
        const mappedReason = mapPerspectiveCategory(highestCategory);
        
        const result = {
          isFlagged: true,
          reason: mappedReason,
          originalCategory: highestCategory,
          details: {
            flaggedCategories,
            allScores: data.attributeScores
          }
        };
        
        if (MODERATION_CONFIG.logViolations) {
          console.log('[MODERATION] Violation détectée:', result);
        }
        
        return result;
      }
    }
    
    // Contenu approprié
    return {
      isFlagged: false,
      reason: null,
      details: {
        allScores: data.attributeScores
      }
    };
  } catch (error) {
    console.error('[MODERATION] Erreur lors de la vérification Perspective:', error);
    throw error;
  }
};

/**
 * Mapper les catégories Perspective vers des raisons plus lisibles
 * @param {string} category - Catégorie Perspective
 * @returns {string} - Raison lisible
 */
const mapPerspectiveCategory = (category) => {
  const mapping = {
    'TOXICITY': 'harassment',
    'SEVERE_TOXICITY': 'harassment',
    'IDENTITY_ATTACK': 'hate',
    'INSULT': 'harassment',
    'PROFANITY': 'offensive_language',
    'THREAT': 'violence',
    'SEXUALLY_EXPLICIT': 'sexual'
  };
  
  return mapping[category] || 'inappropriate_content';
};

/**
 * Liste de mots à filtrer localement
 */
const OFFENSIVE_WORDS = [
  // Insultes et mots vulgaires en français
  "putain", "merde", "connard", "salope", "enculé", "pédé",
  // Termes haineux ou discriminatoires
  "nègre", "youpin", "bougnoule", "pute", "tapette",
  // Insultes en anglais (pour les utilisateurs internationaux)
  "fuck", "shit", "asshole", "bitch", "cunt", "faggot", "nigger",
];

/**
 * Vérifier localement si le contenu contient des mots offensants
 * @param {string} content - Texte à vérifier
 * @returns {Object} Résultat de la vérification
 */
const checkContentLocally = (content) => {
  if (!content || typeof content !== 'string') {
    return { isFlagged: false, reason: null };
  }

  const lowerContent = content.toLowerCase();
  
  // Recherche des mots offensants
  const foundWords = OFFENSIVE_WORDS.filter(word => 
    lowerContent.includes(word.toLowerCase())
  );

  if (foundWords.length > 0) {
    const result = {
      isFlagged: true,
      reason: 'offensive_language',
      details: {
        flaggedWords: foundWords,
      }
    };
    
    if (MODERATION_CONFIG.logViolations) {
      console.log('[MODERATION] Violation détectée localement:', result);
    }
    
    return result;
  }

  return { isFlagged: false, reason: null };
};

/**
 * Contrôleur pour la modération de contenu
 * @param {Object} req - Requête Express
 * @param {Object} res - Réponse Express
 */
exports.moderateContent = async (req, res) => {
  try {
    const { content } = req.body;
    
    if (!content) {
      return res.status(400).json({
        success: false,
        message: 'Le contenu à modérer est requis'
      });
    }
    
    // Vérification locale d'abord (rapide)
    const localResult = checkContentLocally(content);
    
    if (localResult.isFlagged) {
      return res.status(200).json(localResult);
    }
    
    // Si la vérification locale passe, utiliser l'API Perspective
    try {
      const apiResult = await checkContentWithPerspective(content);
      
      // Journaliser les statistiques de modération pour analyse
      if (MODERATION_CONFIG.logViolations) {
        console.log(`[MODERATION STATS] Content: "${content.substring(0, 50)}${content.length > 50 ? '...' : ''}" | Flagged: ${apiResult.isFlagged} | Reason: ${apiResult.reason || 'None'}`);
      }
      
      res.status(200).json(apiResult);
    } catch (error) {
      // En cas d'erreur avec l'API, revenir au résultat local
      console.error('[MODERATION] Erreur API, utilisation du résultat local:', error.message);
      res.status(200).json(localResult);
    }
  } catch (error) {
    console.error('[MODERATION] Erreur de modération:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la modération du contenu',
      error: error.message
    });
  }
};

/**
 * Middleware de modération pour les messages avant leur stockage
 * @param {Object} req - Requête Express
 * @param {Object} res - Réponse Express
 * @param {Function} next - Fonction next d'Express
 */
exports.moderationMiddleware = async (req, res, next) => {
  try {
    // Extraire le contenu du message selon la route
    let content = '';
    
    if (req.originalUrl.includes('/messages') && req.body) {
      // Pour les routes de messages
      content = req.body.content || req.body.text || '';
    } else if (req.body && req.body.label) {
      // Pour les routes de création de secret
      content = `${req.body.label} ${req.body.content}`;
    }
    
    if (!content) {
      return next(); // Pas de contenu à modérer
    }
    
    // Vérification locale d'abord
    const localResult = checkContentLocally(content);
    
    if (localResult.isFlagged) {
      return res.status(403).json({
        success: false,
        message: 'Contenu inapproprié détecté',
        details: localResult
      });
    }
    
    // Vérification via API Perspective
    try {
      const apiResult = await checkContentWithPerspective(content);
      
      if (apiResult.isFlagged) {
        return res.status(403).json({
          success: false,
          message: 'Contenu inapproprié détecté',
          details: apiResult
        });
      }
      
      // Le contenu est approprié, continuer
      next();
    } catch (error) {
      // En cas d'erreur avec l'API, on se fie au filtrage local
      console.error('[MODERATION MIDDLEWARE] Erreur API:', error.message);
      if (localResult.isFlagged) {
        return res.status(403).json({
          success: false,
          message: 'Contenu inapproprié détecté',
          details: localResult
        });
      } else {
        // Si le filtrage local passe, on laisse passer pour éviter de bloquer les communications
        next();
      }
    }
  } catch (error) {
    console.error('[MODERATION MIDDLEWARE] Erreur:', error);
    
    // En cas d'erreur dans le middleware, on peut soit bloquer, soit laisser passer
    // Ici on laisse passer pour éviter de bloquer les communications en cas de problème technique
    next();
  }
};