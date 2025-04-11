// scrapers/twitterScraper.js
/**
 * Extrait les données d'un tweet
 * @param {Browser} browser - Instance Puppeteer du navigateur
 * @param {string} url - URL du tweet
 * @param {Page} [existingPage] - Page Puppeteer existante (optionnelle)
 * @returns {Promise<Object>} - Données du tweet
 */
async function scrape(browser, url, existingPage = null) {
  const page = existingPage || await browser.newPage();
  
  try {
    if (!existingPage) {
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    }
    
    // Définir un timeout pour la navigation
    await page.setDefaultNavigationTimeout(15000);
    
    // Navigation avec timeout réduit
    await page.goto(url, { 
      waitUntil: 'networkidle2',
      timeout: 15000
    });

    // Extraire le nom d'utilisateur depuis l'URL
    const urlUserMatch = url.match(/twitter\.com\/([^\/]+)/i) || url.match(/x\.com\/([^\/]+)/i);
    let urlUsername = null;
    if (urlUserMatch && urlUserMatch[1] && !['i', 'search', 'explore', 'home'].includes(urlUserMatch[1].toLowerCase())) {
      urlUsername = urlUserMatch[1];
    }

    // Extraire l'ID du tweet depuis l'URL
    const tweetIdMatch = url.match(/\/status\/(\d+)/i);
    const tweetId = tweetIdMatch ? tweetIdMatch[1] : null;

    // Essayer d'extraire les données avec un timeout
    const tweetData = await Promise.race([
      page.evaluate(() => {
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
      }),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout extraire données tweet')), 5000)
      )
    ]).catch(error => {
      console.warn(`[Twitter Scraper] Avertissement: ${error.message}`);
      return null;
    });

    // Si on a récupéré des données, on les retourne formatées
    if (tweetData) {
      return {
        url,
        platform: 'twitter',
        title: `Tweet de ${tweetData.authorName || urlUsername || 'utilisateur'}`,
        description: tweetData.text || '',
        image: tweetData.image,
        siteName: 'X',
        author: tweetData.authorName || urlUsername,
        authorHandle: tweetData.authorHandle?.replace('@', '') || urlUsername,
        authorImage: tweetData.authorImage,
        text: tweetData.text,
        likeCount: tweetData.metrics?.likeCount || '0',
        retweetCount: tweetData.metrics?.retweetCount || '0',
        replyCount: tweetData.metrics?.replyCount || '0',
        date: tweetData.date,
        tweetId,
        isVerified: false
      };
    }

    // Extraire les métadonnées si le scraping principal a échoué
    try {
      const metaData = await page.evaluate(() => {
        const getMetaContent = (property) => {
          const meta = document.querySelector(`meta[property="${property}"]`) || 
                      document.querySelector(`meta[name="${property}"]`);
          return meta ? meta.getAttribute('content') : null;
        };
        
        return {
          title: getMetaContent('og:title') || getMetaContent('twitter:title'),
          description: getMetaContent('og:description') || getMetaContent('twitter:description'),
          image: getMetaContent('og:image') || getMetaContent('twitter:image')
        };
      });

      return {
        url,
        platform: 'twitter',
        title: metaData.title || `Tweet de ${urlUsername || 'utilisateur'}`,
        description: metaData.description || '',
        image: metaData.image,
        siteName: 'X',
        author: urlUsername,
        authorHandle: urlUsername,
        tweetId,
        partial: true
      };
    } catch (metaError) {
      console.warn(`[Twitter Scraper] Avertissement extraction méta: ${metaError.message}`);
    }

    // Fallback minimal
    return {
      url,
      platform: 'twitter',
      title: `Tweet de ${urlUsername || 'utilisateur'}`,
      description: '',
      image: null,
      siteName: 'X',
      author: urlUsername,
      authorHandle: urlUsername,
      tweetId,
      fallback: true
    };
  } catch (error) {
    console.error(`[Twitter Scraper] Erreur:`, error);
    
    // Extraire les informations minimales de l'URL
    const urlUserMatch = url.match(/twitter\.com\/([^\/]+)/i) || url.match(/x\.com\/([^\/]+)/i);
    const tweetIdMatch = url.match(/\/status\/(\d+)/i);
    
    let username = null;
    if (urlUserMatch && urlUserMatch[1] && !['i', 'search', 'explore', 'home'].includes(urlUserMatch[1].toLowerCase())) {
      username = urlUserMatch[1];
    }
    
    const tweetId = tweetIdMatch ? tweetIdMatch[1] : null;
    
    return {
      url,
      platform: 'twitter',
      title: `Tweet de ${username || 'utilisateur'}`,
      description: '',
      image: null,
      siteName: 'X',
      author: username,
      authorHandle: username,
      tweetId,
      error: true
    };
  } finally {
    // Ne fermer la page que si nous l'avons créée dans cette fonction
    if (!existingPage && page) {
      await page.close().catch(e => console.error('[Twitter Scraper] Erreur de fermeture de page:', e));
    }
  }
}

module.exports = { scrape };