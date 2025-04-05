// scrapers/instagramScraper.js
/**
 * Extrait les données d'un post Instagram
 * @param {Browser} browser - Instance Puppeteer du navigateur
 * @param {string} url - URL du post
 * @returns {Promise<Object>} - Données du post
 */
async function scrape(browser, url) {
    try {
      const page = await browser.newPage();
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
      
      // Instagram peut bloquer les bots, donc on essaie de ressembler à un utilisateur réel
      await page.setExtraHTTPHeaders({
        'Accept-Language': 'en-US,en;q=0.9'
      });
      
      // Navigation avec timeout
      await page.goto(url, { 
        waitUntil: 'networkidle2',
        timeout: 30000
      });
  
      // Instagram peut demander une connexion, essayons d'extraire ce qu'on peut
      const metaData = await page.evaluate(() => {
        // Extraire les métadonnées des balises meta
        const getMetaContent = (property) => {
          const meta = document.querySelector(`meta[property="${property}"]`);
          return meta ? meta.getAttribute('content') : null;
        };
        
        const title = getMetaContent('og:title');
        const description = getMetaContent('og:description');
        const image = getMetaContent('og:image');
        const author = getMetaContent('og:title')?.split(' • ')[0];
        
        return {
          title,
          description,
          image,
          author
        };
      });
      
      // Déterminer si c'est un post ou un profil
      const isProfile = url.match(/instagram\.com\/([^\/\?]+)\/?$/i);
      const isReel = url.includes('/reel/');
      const isPost = url.includes('/p/');
  
      // Extraire l'identifiant du post ou de l'utilisateur
      let postId = null;
      let username = null;
      
      if (isPost) {
        const postMatch = url.match(/instagram\.com\/p\/([^\/\?]+)/i);
        postId = postMatch ? postMatch[1] : null;
      } else if (isReel) {
        const reelMatch = url.match(/instagram\.com\/reel\/([^\/\?]+)/i);
        postId = reelMatch ? reelMatch[1] : null;
      } else if (isProfile) {
        username = isProfile[1];
      }
      
      // Formater le résultat
      return {
        url,
        platform: 'instagram',
        title: metaData.title || (isReel ? 'Reels Instagram' : isPost ? 'Post Instagram' : `Profil de ${username || 'utilisateur'}`),
        description: metaData.description || '',
        image: metaData.image,
        siteName: 'Instagram',
        author: metaData.author || username,
        username,
        postId,
        contentType: isReel ? 'reel' : isPost ? 'post' : 'profile'
      };
    } catch (error) {
      console.error(`[Instagram Scraper] Erreur:`, error);
      
      // Fallback en cas d'erreur
      try {
        // Déterminer si c'est un post ou un profil
        const isProfile = url.match(/instagram\.com\/([^\/\?]+)\/?$/i);
        const isReel = url.includes('/reel/');
        const isPost = url.includes('/p/');
  
        // Extraire l'identifiant du post ou de l'utilisateur
        let postId = null;
        let username = null;
        
        if (isPost) {
          const postMatch = url.match(/instagram\.com\/p\/([^\/\?]+)/i);
          postId = postMatch ? postMatch[1] : null;
        } else if (isReel) {
          const reelMatch = url.match(/instagram\.com\/reel\/([^\/\?]+)/i);
          postId = reelMatch ? reelMatch[1] : null;
        } else if (isProfile) {
          username = isProfile[1];
        }
        
        return {
          url,
          platform: 'instagram',
          title: isReel ? 'Reels Instagram' : isPost ? 'Post Instagram' : `Profil de ${username || 'utilisateur'}`,
          description: '',
          image: null,
          siteName: 'Instagram',
          author: username,
          username,
          postId,
          contentType: isReel ? 'reel' : isPost ? 'post' : 'profile'
        };
      } catch (fallbackError) {
        return null;
      }
    }
  }
  
  module.exports = { scrape };