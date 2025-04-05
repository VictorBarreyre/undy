// scrapers/twitterScraper.js
/**
 * Extrait les données d'un tweet
 * @param {Browser} browser - Instance Puppeteer du navigateur
 * @param {string} url - URL du tweet
 * @returns {Promise<Object>} - Données du tweet
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
  
      // Attendre que le tweet charge
      await page.waitForSelector('article[data-testid="tweet"]', { timeout: 5000 }).catch(() => {});
  
      // Extraire les données
      const tweetData = await page.evaluate(() => {
        try {
          // Trouver l'élément principal du tweet
          const tweetArticle = document.querySelector('article[data-testid="tweet"]');
          if (!tweetArticle) return null;
  
          // Extraire les informations de l'utilisateur
          const userInfoElement = tweetArticle.querySelector('div[data-testid="User-Name"]');
          const authorName = userInfoElement ? userInfoElement.querySelector('span:not([dir="ltr"])').textContent.trim() : null;
          const authorHandle = userInfoElement ? userInfoElement.querySelector('span[dir="ltr"]').textContent.trim() : null;
          
          // Extraire l'avatar
          const avatarElement = tweetArticle.querySelector('img[data-testid="Profile-image"]');
          const authorImage = avatarElement ? avatarElement.src : null;
          
          // Extraire le texte du tweet
          const tweetTextElement = tweetArticle.querySelector('div[data-testid="tweetText"]');
          const tweetText = tweetTextElement ? tweetTextElement.textContent.trim() : '';
          
          // Extraire l'image du tweet si disponible
          const tweetImageElement = tweetArticle.querySelector('img[data-testid="tweetPhoto"]');
          const tweetImage = tweetImageElement ? tweetImageElement.src : null;
          
          // Extraire les métriques du tweet
          const metrics = {};
          const metricElements = tweetArticle.querySelectorAll('[data-testid="reply"], [data-testid="retweet"], [data-testid="like"]');
          metricElements.forEach(element => {
            const testId = element.getAttribute('data-testid');
            const countElement = element.querySelector('span');
            const count = countElement ? countElement.textContent.trim() : '0';
            
            switch (testId) {
              case 'reply':
                metrics.replyCount = count;
                break;
              case 'retweet':
                metrics.retweetCount = count;
                break;
              case 'like':
                metrics.likeCount = count;
                break;
            }
          });
          
          // Extraire la date
          const timeElement = tweetArticle.querySelector('time');
          const date = timeElement ? timeElement.getAttribute('datetime') : new Date().toISOString();
          
          return {
            authorName,
            authorHandle,
            authorImage,
            text: tweetText,
            image: tweetImage,
            metrics,
            date
          };
        } catch (error) {
          console.error('Erreur lors de l\'extraction du tweet:', error);
          return null;
        }
      });
  
      if (!tweetData) {
        return null;
      }
  
      // Formater le résultat
      return {
        url,
        platform: 'twitter',
        title: `Tweet de ${tweetData.authorName || 'utilisateur'}`,
        description: tweetData.text || '',
        image: tweetData.image,
        siteName: 'X',
        author: tweetData.authorName,
        authorHandle: tweetData.authorHandle?.replace('@', ''),
        authorImage: tweetData.authorImage,
        text: tweetData.text,
        likeCount: tweetData.metrics.likeCount || '0',
        retweetCount: tweetData.metrics.retweetCount || '0',
        replyCount: tweetData.metrics.replyCount || '0',
        date: tweetData.date,
        isVerified: false
      };
    } catch (error) {
      console.error(`[Twitter Scraper] Erreur:`, error);
      return null;
    }
  }
  
  module.exports = { scrape };