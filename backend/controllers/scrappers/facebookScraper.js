// scrapers/facebookScraper.js
/**
 * Extrait les données d'un post Facebook
 * @param {Browser} browser - Instance Puppeteer du navigateur
 * @param {string} url - URL du post
 * @param {Page} [existingPage] - Page Puppeteer existante (optionnelle)
 * @returns {Promise<Object>} - Données du post
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

    // Essayer d'extraire les métadonnées avec un timeout
    const metaData = await Promise.race([
      page.evaluate(() => {
        // Extraire les métadonnées des balises meta
        const getMetaContent = (property) => {
          const meta = document.querySelector(`meta[property="${property}"]`) || 
                      document.querySelector(`meta[name="${property}"]`);
          return meta ? meta.getAttribute('content') : null;
        };
        
        const title = getMetaContent('og:title') || getMetaContent('twitter:title');
        const description = getMetaContent('og:description') || getMetaContent('twitter:description');
        const image = getMetaContent('og:image') || getMetaContent('twitter:image');
        const siteName = getMetaContent('og:site_name');
        
        return {
          title,
          description,
          image,
          siteName
        };
      }),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout extraire métadonnées')), 5000)
      )
    ]).catch(error => {
      console.warn(`[Facebook Scraper] Avertissement: ${error.message}`);
      return {};
    });
    
    // Déterminer le type de contenu
    const isPost = url.includes('/posts/') || url.includes('story_fbid=');
    const isPage = !isPost && !url.includes('profile.php');
    const isProfile = url.includes('profile.php');

    // Extraire l'identifiant ou le nom
    let postId = null;
    let username = null;
    
    if (isPost) {
      const postMatch = url.match(/\/posts\/(\d+)/i) || url.match(/story_fbid=(\d+)/i);
      postId = postMatch ? postMatch[1] : null;
    }
    
    const usernameMatch = url.match(/facebook\.com\/([^\/\?]+)/i) || url.match(/fb\.com\/([^\/\?]+)/i);
    if (usernameMatch && usernameMatch[1] !== 'profile.php') {
      username = usernameMatch[1];
    }
    
    // Formater le résultat
    return {
      url,
      platform: 'facebook',
      title: metaData.title || (isPost ? 'Publication Facebook' : isPage ? `Page ${username || 'Facebook'}` : 'Profil Facebook'),
      description: metaData.description || '',
      image: metaData.image,
      siteName: metaData.siteName || 'Facebook',
      author: username,
      username,
      postId,
      contentType: isPost ? 'post' : isPage ? 'page' : 'profile'
    };
  } catch (error) {
    console.error(`[Facebook Scraper] Erreur:`, error);
    
    // Fallback en cas d'erreur
    try {
      const isPost = url.includes('/posts/') || url.includes('story_fbid=');
      const isPage = !isPost && !url.includes('profile.php');
      const isProfile = url.includes('profile.php');

      let postId = null;
      let username = null;
      
      if (isPost) {
        const postMatch = url.match(/\/posts\/(\d+)/i) || url.match(/story_fbid=(\d+)/i);
        postId = postMatch ? postMatch[1] : null;
      }
      
      const usernameMatch = url.match(/facebook\.com\/([^\/\?]+)/i) || url.match(/fb\.com\/([^\/\?]+)/i);
      if (usernameMatch && usernameMatch[1] !== 'profile.php') {
        username = usernameMatch[1];
      }
      
      return {
        url,
        platform: 'facebook',
        title: isPost ? 'Publication Facebook' : isPage ? `Page ${username || 'Facebook'}` : 'Profil Facebook',
        description: '',
        image: null,
        siteName: 'Facebook',
        author: username,
        username,
        postId,
        contentType: isPost ? 'post' : isPage ? 'page' : 'profile',
        error: true
      };
    } catch (fallbackError) {
      return {
        url,
        platform: 'facebook',
        title: 'Contenu Facebook',
        description: '',
        image: null,
        siteName: 'Facebook',
        error: true
      };
    }
  } finally {
    // Ne fermer la page que si nous l'avons créée dans cette fonction
    if (!existingPage && page) {
      await page.close().catch(e => console.error('[Facebook Scraper] Erreur de fermeture de page:', e));
    }
  }
}

module.exports = { scrape };