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

/**
 * Récupère une instance de navigateur réutilisable
 * @returns {Promise<Browser>} Instance de navigateur
 */
async function getBrowser() {
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
        '--disable-gpu'
      ]
    });
    
    // Réinitialiser l'instance quand le navigateur se déconnecte
    browserInstance.on('disconnected', () => {
      console.log('[Scraper] Le navigateur s\'est déconnecté');
      browserInstance = null;
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
 * Ajoute une tâche à la file d'attente
 * @param {Function} processor - Fonction de traitement qui accepte un navigateur
 * @returns {Promise<any>} Résultat de la tâche
 */
function queueTask(processor) {
  return new Promise((resolve, reject) => {
    requestQueue.push({ processor, resolve, reject });
    console.log(`[Scraper] Tâche ajoutée à la file d'attente, longueur: ${requestQueue.length}`);
    // Démarrer le traitement si ce n'est pas déjà fait
    processQueue();
  });
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
 * Extrait les données d'une URL en utilisant le scraper approprié
 * @param {string} url - URL à scraper
 * @returns {Promise<Object>} - Données extraites
 */
async function scrapeUrl(url) {
  // Vérifier si les données sont en cache
  const cachedData = await cache.get(url);
  if (cachedData) {
    console.log(`[Scraper] Utilisation du cache pour: ${url}`);
    return cachedData;
  }

  const platform = detectPlatform(url);
  console.log(`[Scraper] Plateforme détectée: ${platform} pour ${url}`);
  
  // Ajouter la tâche à la file d'attente
  return queueTask(async (browser) => {
    try {
      let result = null;
      
      // Utiliser une page individuelle pour chaque requête
      const page = await browser.newPage();
      
      try {
        switch (platform) {
          case 'twitter':
            result = await twitterScraper.scrape(browser, url, page);
            break;
          case 'youtube':
            result = await youtubeScraper.scrape(browser, url, page);
            break;
          case 'instagram':
            result = await instagramScraper.scrape(browser, url, page);
            break;
          case 'tiktok':
            result = await tiktokScraper.scrape(browser, url, page);
            break;
          case 'facebook':
            result = await facebookScraper.scrape(browser, url, page);
            break;
          case 'apple_maps':
            result = await appleMapscraper.scrape(browser, url, page);
            break;
          default:
            result = await websiteScraper.scrape(browser, url, page);
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
      return null;
    }
  });
}

// Fonction de nettoyage pour fermer le navigateur
async function closeBrowser() {
  if (browserInstance) {
    try {
      await browserInstance.close();
      browserInstance = null;
      console.log('[Scraper] Navigateur fermé avec succès');
    } catch (error) {
      console.error('[Scraper] Erreur lors de la fermeture du navigateur:', error);
    }
  }
}

module.exports = {
  scrapeUrl,
  detectPlatform,
  closeBrowser
};