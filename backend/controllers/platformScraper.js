// platformScraper.js
const cache = require('./linkCache');
const twitterScraper = require('./scrappers/twitterScraper');
const youtubeScraper = require('./scrappers/youtubeScraper');
const instagramScraper = require('./scrappers/instagramScraper');
const tiktokScraper = require('./scrappers/tiktokScraper');
const facebookScraper = require('./scrappers/facebookScraper');
const appleMapscraper = require('./scrappers/appleMapscraper');
const websiteScraper = require('./scrappers/websiteScraper');
const puppeteer = require('puppeteer-core');
const chromium = require('@sparticuz/chromium');

// Instance de navigateur partagée
let browserInstance = null;
// File d'attente pour les requêtes
const requestQueue = [];
// Indicateur de traitement en cours
let isProcessing = false;
// Compteur pour recycler le navigateur
let requestCount = 0;
// Nombre maximum de requêtes avant recyclage
const MAX_REQUESTS_BEFORE_RECYCLE = 10;
// Taille maximale de la file d'attente
const MAX_QUEUE_SIZE = 5;
// Timeout pour le scraping (15 secondes)
const SCRAPE_TIMEOUT = 15000;

/**
 * Récupère une instance de navigateur réutilisable avec recyclage
 * @returns {Promise<Browser>} Instance de navigateur
 */
async function getBrowser() {
  // Si le compteur dépasse le maximum, fermer le navigateur
  if (browserInstance && requestCount >= MAX_REQUESTS_BEFORE_RECYCLE) {
    console.log(`[Scraper] Recyclage du navigateur après ${MAX_REQUESTS_BEFORE_RECYCLE} requêtes`);
    await browserInstance.close();
    browserInstance = null;
    requestCount = 0;
  }

  if (!browserInstance) {
    console.log('[Scraper] Création d\'une nouvelle instance de navigateur');
    browserInstance = await puppeteer.launch({
      headless: true,
      executablePath: await chromium.executablePath(),
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--single-process', // Utiliser un seul processus
        '--disable-extensions',
        '--disable-features=site-per-process',
        '--js-flags="--max-old-space-size=400"' // Limiter la mémoire JS
      ]
    });
    
    // Réinitialiser l'instance quand le navigateur se déconnecte
    browserInstance.on('disconnected', () => {
      console.log('[Scraper] Le navigateur s\'est déconnecté');
      browserInstance = null;
      requestCount = 0;
    });
  }
  return browserInstance;
}

/**
 * Traite la file d'attente des tâches
 */
async function processQueue() {
  if (isProcessing || requestQueue.length === 0) return;
  
  isProcessing = true;
  const task = requestQueue.shift();
  
  try {
    console.log(`[Scraper] Traitement d'une tâche, ${requestQueue.length} tâches restantes`);
    const browser = await getBrowser();
    const result = await task.processor(browser);
    task.resolve(result);
    // Incrémenter le compteur de requêtes
    requestCount++;
  } catch (error) {
    console.error('[Scraper] Erreur lors du traitement de la tâche:', error);
    task.reject(error);
  } finally {
    isProcessing = false;
    // Traiter la tâche suivante
    processQueue();
  }
}

/**
 * Ajoute une tâche à la file d'attente avec limitation
 * @param {Function} processor - Fonction de traitement qui accepte un navigateur
 * @returns {Promise<any>} Résultat de la tâche
 */
function queueTask(processor) {
  return new Promise((resolve, reject) => {
    // Rejeter si la file d'attente est pleine
    if (requestQueue.length >= MAX_QUEUE_SIZE) {
      console.log(`[Scraper] File d'attente pleine (${requestQueue.length}/${MAX_QUEUE_SIZE}), requête rejetée`);
      return reject(new Error('Le service est occupé, veuillez réessayer plus tard'));
    }
    
    requestQueue.push({ processor, resolve, reject });
    console.log(`[Scraper] Tâche ajoutée à la file d'attente, longueur: ${requestQueue.length}/${MAX_QUEUE_SIZE}`);
    // Démarrer le traitement si ce n'est pas déjà fait
    processQueue();
  });
}

/**
 * Applique un timeout à une opération de scraping
 * @param {Function} scraperFn - Fonction de scraping
 * @param {Object} browser - Instance de navigateur
 * @param {string} url - URL à scraper
 * @param {Object} page - Instance de page
 * @param {number} timeout - Délai de timeout
 * @returns {Promise<Object>} Résultat du scraping
 */
async function scrapeWithTimeout(scraperFn, browser, url, page, timeout = SCRAPE_TIMEOUT) {
  return Promise.race([
    scraperFn(browser, url, page),
    new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Délai de scraping dépassé')), timeout)
    )
  ]);
}

/**
 * Détecte la plateforme d'une URL
 * @param {string} url - URL à analyser
 * @returns {string} - Type de plateforme
 */
function detectPlatform(url) {
  if (!url) return 'website';
  
  const lowerUrl = url.toLowerCase();
  
  if (lowerUrl.includes('twitter.com') || lowerUrl.includes('x.com')) {
    return 'twitter';
  } else if (lowerUrl.includes('youtube.com') || lowerUrl.includes('youtu.be')) {
    return 'youtube';
  } else if (lowerUrl.includes('instagram.com')) {
    return 'instagram';
  } else if (lowerUrl.includes('tiktok.com')) {
    return 'tiktok';
  } else if (lowerUrl.includes('facebook.com') || lowerUrl.includes('fb.com')) {
    return 'facebook';
  } else if (lowerUrl.includes('maps.apple.com')) {
    return 'apple_maps';
  } else {
    return 'website';
  }
}

/**
 * Crée un hash simple pour une URL (pour vérifier si déjà traitée)
 * @param {string} url - URL à transformer
 * @returns {string} - Hash de l'URL
 */
function simpleUrlHash(url) {
  return url.split('').reduce(
    (hash, char) => ((hash << 5) - hash) + char.charCodeAt(0), 0
  ).toString(36);
}

// Ensemble des URLs en cours de traitement
const processingUrls = new Set();

/**
 * Extrait les données d'une URL en utilisant le scraper approprié
 * @param {string} url - URL à scraper
 * @param {boolean} bypassCache - Ignorer le cache (facultatif)
 * @returns {Promise<Object>} - Données extraites
 */
async function scrapeUrl(url, bypassCache = false) {
  // URL normalisée pour le cache et la déduplication
  const urlHash = simpleUrlHash(url);
  
  // Vérifier si cette URL est déjà en cours de traitement
  if (processingUrls.has(urlHash)) {
    console.log(`[Scraper] L'URL ${url} est déjà en cours de traitement, attente...`);
    // Attendre un peu et retourner un résultat temporaire
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          url,
          platform: detectPlatform(url),
          title: 'Chargement en cours...',
          description: 'Les informations sont en cours de chargement, veuillez patienter.',
          image: null,
          status: 'processing'
        });
      }, 500);
    });
  }
  
  // Vérifier si les données sont en cache (si on ne bypass pas)
  if (!bypassCache) {
    const cachedData = await cache.get(url);
    if (cachedData) {
      console.log(`[Scraper] Utilisation du cache pour: ${url}`);
      return cachedData;
    }
  }

  const platform = detectPlatform(url);
  console.log(`[Scraper] Plateforme détectée: ${platform} pour ${url}`);
  
  // Marquer cette URL comme étant en cours de traitement
  processingUrls.add(urlHash);
  
  // Ajouter la tâche à la file d'attente
  try {
    return await queueTask(async (browser) => {
      try {
        let result = null;
        
        // Utiliser une page individuelle pour chaque requête
        const page = await browser.newPage();
        page.setDefaultNavigationTimeout(SCRAPE_TIMEOUT);
        
        try {
          switch (platform) {
            case 'twitter':
              result = await scrapeWithTimeout(twitterScraper.scrape, browser, url, page);
              break;
            case 'youtube':
              result = await scrapeWithTimeout(youtubeScraper.scrape, browser, url, page);
              break;
            case 'instagram':
              result = await scrapeWithTimeout(instagramScraper.scrape, browser, url, page);
              break;
            case 'tiktok':
              result = await scrapeWithTimeout(tiktokScraper.scrape, browser, url, page);
              break;
            case 'facebook':
              result = await scrapeWithTimeout(facebookScraper.scrape, browser, url, page);
              break;
            case 'apple_maps':
              result = await scrapeWithTimeout(appleMapscraper.scrape, browser, url, page);
              break;
            default:
              result = await scrapeWithTimeout(websiteScraper.scrape, browser, url, page);
              break;
          }
        } finally {
          // Fermer la page, mais garder le navigateur
          await page.close();
        }
        
        if (result) {
          // Stocker en cache pour 1 heure
          await cache.set(url, result, 3600);
        }
        
        return result;
      } catch (error) {
        console.error(`[Scraper] Erreur lors du scraping de ${url}:`, error);
        // Créer un résultat minimal en cas d'erreur
        return {
          url,
          platform,
          title: url,
          description: 'Échec du chargement des informations',
          image: null,
          siteName: platform === 'website' ? new URL(url).hostname : platform,
          error: error.message
        };
      } finally {
        // Supprimer de la liste des URLs en traitement
        processingUrls.delete(urlHash);
      }
    });
  } catch (error) {
    // En cas d'erreur de file d'attente, supprimer de la liste des URLs en traitement
    processingUrls.delete(urlHash);
    throw error;
  }
}

// Fonction de nettoyage pour fermer le navigateur
async function closeBrowser() {
  if (browserInstance) {
    try {
      await browserInstance.close();
      browserInstance = null;
      requestCount = 0;
      console.log('[Scraper] Navigateur fermé avec succès');
    } catch (error) {
      console.error('[Scraper] Erreur lors de la fermeture du navigateur:', error);
    }
  }
}

// Fermer le navigateur quand le processus se termine
process.on('SIGTERM', async () => {
  console.log('[Scraper] Signal SIGTERM reçu, nettoyage...');
  await closeBrowser();
});

process.on('SIGINT', async () => {
  console.log('[Scraper] Signal SIGINT reçu, nettoyage...');
  await closeBrowser();
});

module.exports = {
  scrapeUrl,
  detectPlatform,
  closeBrowser
};