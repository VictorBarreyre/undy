// scrapers/websiteScraper.js
/**
 * Extrait les données d'un site web générique
 * @param {Browser} browser - Instance Puppeteer du navigateur
 * @param {string} url - URL du site
 * @returns {Promise<Object>} - Données du site
 */
async function scrape(browser, url) {
    try {
      const page = await browser.newPage();
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
      
      // Navigation avec timeout
      await page.goto(url, { 
        waitUntil: 'networkidle2',
        timeout: 30000
      });
  
      // Extraire les métadonnées complètes
      const websiteData = await page.evaluate(() => {
        // Fonction pour extraire le contenu des balises meta
        const getMetaContent = (selectors) => {
          for (const selector of selectors) {
            const meta = document.querySelector(selector);
            if (meta && meta.getAttribute('content')) {
              return meta.getAttribute('content');
            }
          }
          return null;
        };
        
        // Extraire le titre
        const title = 
          document.querySelector('title')?.textContent.trim() || 
          getMetaContent(['meta[property="og:title"]', 'meta[name="twitter:title"]']);
        
        // Extraire la description
        const description = 
          getMetaContent(['meta[name="description"]', 'meta[property="og:description"]', 'meta[name="twitter:description"]']) ||
          document.querySelector('p')?.textContent.substring(0, 200);
        
        // Extraire l'image principale
        const image = 
          getMetaContent(['meta[property="og:image"]', 'meta[name="twitter:image"]']) ||
          document.querySelector('img[src^="http"]')?.src;
        
        // Extraire le nom du site
        const siteName = 
          getMetaContent(['meta[property="og:site_name"]']) ||
          document.querySelector('title')?.textContent.split(' -')[0]?.trim() ||
          document.querySelector('title')?.textContent.split(' |')[0]?.trim();
        
        // Extraire l'auteur
        const author = 
          getMetaContent(['meta[name="author"]', 'meta[property="article:author"]']) ||
          document.querySelector('.author, [rel="author"]')?.textContent.trim();
        
        // Extraire l'icône
        const favicon = 
          document.querySelector('link[rel="icon"], link[rel="shortcut icon"]')?.href ||
          new URL('/favicon.ico', window.location.origin).href;
        
        return {
          title,
          description,
          image,
          siteName,
          author,
          favicon
        };
      });
  
      // Récupérer le domaine
      const domain = new URL(url).hostname.replace('www.', '');
      
      // Formater le résultat
      return {
        url,
        platform: 'website',
        title: websiteData.title || domain,
        description: websiteData.description || '',
        image: websiteData.image,
        siteName: websiteData.siteName || domain,
        author: websiteData.author,
        favicon: websiteData.favicon || `https://${domain}/favicon.ico`,
        domain
      };
    } catch (error) {
      console.error(`[Website Scraper] Erreur:`, error);
      
      // Fallback simple
      try {
        const domain = new URL(url).hostname.replace('www.', '');
        
        return {
          url,
          platform: 'website',
          title: domain,
          description: '',
          image: null,
          siteName: domain,
          author: null,
          favicon: `https://${domain}/favicon.ico`,
          domain
        };
      } catch (fallbackError) {
        return null;
      }
    }
  }
  
  module.exports = { scrape };