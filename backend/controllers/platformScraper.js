// platformScraper.js
const puppeteer = require('puppeteer');
const cache = require('./linkCache');
const twitterScraper = require('./scrapers/twitterScraper');
const youtubeScraper = require('./scrapers/youtubeScraper');
const instagramScraper = require('./scrapers/instagramScraper');
const tiktokScraper = require('./scrapers/tiktokScraper');
const facebookScraper = require('./scrapers/facebookScraper');
const appleMapscraper = require('./scrapers/appleMapscraper');
const websiteScraper = require('./scrapers/websiteScraper');

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
 * Lance une instance de navigateur Puppeteer
 * @returns {Promise<Browser>} - Instance du navigateur
 */
async function launchBrowser() {
  return puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--disable-gpu'
    ]
  });
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
  
  const browser = await launchBrowser();
  
  try {
    let result = null;
    
    switch (platform) {
      case 'twitter':
        result = await twitterScraper.scrape(browser, url);
        break;
      case 'youtube':
        result = await youtubeScraper.scrape(browser, url);
        break;
      case 'instagram':
        result = await instagramScraper.scrape(browser, url);
        break;
      case 'tiktok':
        result = await tiktokScraper.scrape(browser, url);
        break;
      case 'facebook':
        result = await facebookScraper.scrape(browser, url);
        break;
      case 'apple_maps':
        result = await appleMapscraper.scrape(browser, url);
        break;
      default:
        result = await websiteScraper.scrape(browser, url);
        break;
    }
    
    if (result) {
      // Stocker en cache pour 1 heure
      await cache.set(url, result, 3600);
    }
    
    return result;
  } catch (error) {
    console.error(`[Scraper] Erreur lors du scraping de ${url}:`, error);
    return null;
  } finally {
    await browser.close();
  }
}

module.exports = {
  scrapeUrl,
  detectPlatform
};