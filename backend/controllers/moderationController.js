// controllers/moderationController.js

const fetch = require('node-fetch');

// Configuration de l'API OpenAI
const OPENAI_API_CONFIG = {
  apiKey: process.env.OPENAI_API_KEY || 'votre-clé-api',
  endpoint: 'https://api.openai.com/v1/moderations',
};

// Configuration des seuils de modération
const MODERATION_CONFIG = {
  threshold: 0.7,                // Seuil par défaut
  categoryThresholds: {
    'sexual/minors': 0.5,        // Très strict pour ce type de contenu
    'self-harm': 0.6,            // Strict pour automutilation
    'hate': 0.7,                 // Standard pour discours haineux
    'harassment': 0.7,           // Standard pour harcèlement
    'sexual': 0.8,               // Moins strict pour contenu adulte général
    'violence': 0.8,             // Moins strict pour la violence
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
 * Vérifier le contenu avec l'API OpenAI
 * @param {string} content - Contenu à vérifier
 * @returns {Promise<Object>} - Résultat de modération
 */
const checkContentWithOpenAI = async (content) => {
  try {
    // Appel à l'API OpenAI
    const response = await fetch(OPENAI_API_CONFIG.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_CONFIG.apiKey}`,
      },
      body: JSON.stringify({ input: content }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI API request failed: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    
    // Vérifier si le contenu a été signalé
    if (data.results && data.results[0].flagged) {
      const categories = data.results[0].categories;
      const categoryScores = data.results[0].category_scores;
      
      // Trouver les catégories dépassant leur seuil spécifique
      const flaggedCategories = [];
      
      for (const category in categoryScores) {
        if (isAboveThreshold(category, categoryScores[category])) {
          flaggedCategories.push({
            name: category,
            score: categoryScores[category]
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
        
        const result = {
          isFlagged: true,
          reason: highestCategory,
          details: {
            flaggedCategories,
            allCategories: categories,
            allCategoryScores: categoryScores,
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
      details: data.results && data.results[0] ? {
        allCategories: data.results[0].categories,
        allCategoryScores: data.results[0].category_scores
      } : null
    };
  } catch (error) {
    console.error('[MODERATION] Erreur lors de la vérification OpenAI:', error);
    throw error;
  }
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
    
    // Si la vérification locale passe, utiliser l'API OpenAI
    const apiResult = await checkContentWithOpenAI(content);
    
    // Journaliser les statistiques de modération pour analyse
    if (MODERATION_CONFIG.logViolations) {
      console.log(`[MODERATION STATS] Content: "${content.substring(0, 50)}${content.length > 50 ? '...' : ''}" | Flagged: ${apiResult.isFlagged} | Reason: ${apiResult.reason || 'None'}`);
    }
    
    res.status(200).json(apiResult);
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
    
    // Vérification via API OpenAI
    const apiResult = await checkContentWithOpenAI(content);
    
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
    console.error('[MODERATION MIDDLEWARE] Erreur:', error);
    
    // En cas d'erreur, on peut soit bloquer, soit laisser passer
    // Ici on laisse passer pour éviter de bloquer les communications en cas de problème technique
    next();
  }
};