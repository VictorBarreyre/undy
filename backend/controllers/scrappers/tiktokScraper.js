// scrapers/tiktokScraper.js
/**
 * Extrait les données d'une vidéo TikTok
 * @param {Browser} browser - Instance Puppeteer du navigateur
 * @param {string} url - URL de la vidéo
 * @returns {Promise<Object>} - Données de la vidéo
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
  
      // TikTok a beaucoup de protection anti-bot, essayons d'extraire des métadonnées basiques
      const metaData = await page.evaluate(() => {
        // Extraire les métadonnées des balises meta
        const getMetaContent = (property) => {
          const meta = document.querySelector(`meta[property="${property}"]`) || 
                      document.querySelector(`meta[name="${property}"]`);
          return meta ? meta.getAttribute('content') : null;
        };
        
        const title = getMetaContent('og:title') || getMetaContent('twitter:title');
        const description = getMetaContent('og:description') || getMetaContent('twitter:description');
        const image = getMetaContent('og:image') || getMetaContent('twitter:image');
        const author = getMetaContent('og:title')?.split('-')[0]?.trim();
        
        return {
          title,
          description,
          image,
          author
        };
      });
      
      // Déterminer si c'est une vidéo ou un profil
      const isVideo = url.includes('/video/') || url.includes('/t/');
      const isProfile = url.includes('@') && !isVideo;
  
      // Extraire l'identifiant de la vidéo ou de l'utilisateur
      let videoId = null;
      let username = null;
      
      if (isVideo) {
        const videoMatch = url.match(/tiktok\.com\/@[^\/]+\/video\/(\d+)/i) || 
                           url.match(/tiktok\.com\/t\/([^\/\?]+)/i);
        videoId = videoMatch ? videoMatch[1] : null;
      }
      
      const usernameMatch = url.match(/tiktok\.com\/@([^\/\?]+)/i);
      username = usernameMatch ? usernameMatch[1] : null;
      
      // Formater le résultat
      return {
        url,
        platform: 'tiktok',
        title: metaData.title || (isVideo ? 'Vidéo TikTok' : `Profil de ${username || 'utilisateur'}`),
        description: metaData.description || '',
        image: metaData.image,
        siteName: 'TikTok',
        author: metaData.author || username,
        username,
        videoId,
        contentType: isVideo ? 'video' : 'profile'
      };
    } catch (error) {
      console.error(`[TikTok Scraper] Erreur:`, error);
      
      // Fallback en cas d'erreur
      try {
        // Extraire l'ID de la vidéo et le nom d'utilisateur de l'URL
        const usernameMatch = url.match(/tiktok\.com\/@([^\/\?]+)/i);
        const videoMatch = url.match(/tiktok\.com\/@[^\/]+\/video\/(\d+)/i) || 
                          url.match(/tiktok\.com\/t\/([^\/\?]+)/i);
        
        const username = usernameMatch ? usernameMatch[1] : null;
        const videoId = videoMatch ? videoMatch[1] : null;
        
        const isVideo = videoId !== null;
        
        return {
          url,
          platform: 'tiktok',
          title: isVideo ? 'Vidéo TikTok' : `Profil de ${username || 'utilisateur'}`,
          description: '',
          image: null,
          siteName: 'TikTok',
          author: username,
          username,
          videoId,
          contentType: isVideo ? 'video' : 'profile'
        };
      } catch (fallbackError) {
        return null;
      }
    }
  }
  
  module.exports = { scrape };