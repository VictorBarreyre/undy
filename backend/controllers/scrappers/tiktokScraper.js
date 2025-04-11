// scrapers/tiktokScraper.js
/**
 * Extrait les données d'une vidéo TikTok
 * @param {Browser} browser - Instance Puppeteer du navigateur
 * @param {string} url - URL de la vidéo
 * @param {Page} [existingPage] - Page Puppeteer existante (optionnelle)
 * @returns {Promise<Object>} - Données de la vidéo
 */
async function scrape(browser, url, existingPage = null) {
  const page = existingPage || await browser.newPage();
  
  try {
    if (!existingPage) {
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    }
    
    // Déterminer si c'est une vidéo ou un profil avant même de charger la page
    const isVideo = url.includes('/video/') || url.includes('/t/');
    const isProfile = url.includes('@') && !isVideo;

    // Extraire l'identifiant de la vidéo ou de l'utilisateur depuis l'URL
    let videoId = null;
    let username = null;
    
    if (isVideo) {
      const videoMatch = url.match(/tiktok\.com\/@[^\/]+\/video\/(\d+)/i) || 
                         url.match(/tiktok\.com\/t\/([^\/\?]+)/i);
      videoId = videoMatch ? videoMatch[1] : null;
    }
    
    const usernameMatch = url.match(/tiktok\.com\/@([^\/\?]+)/i);
    username = usernameMatch ? usernameMatch[1] : null;
    
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
        const author = getMetaContent('og:title')?.split('-')[0]?.trim();
        const canonical = getMetaContent('og:url') || document.querySelector('link[rel="canonical"]')?.href;
        
        return {
          title,
          description,
          image,
          author,
          canonical
        };
      }),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout extraire métadonnées')), 5000)
      )
    ]).catch(error => {
      console.warn(`[TikTok Scraper] Avertissement: ${error.message}`);
      return {};
    });

    // Si on a une URL canonique qui contient un ID de vidéo et qu'on n'en avait pas avant
    if (!videoId && metaData.canonical) {
      const canonicalVideoMatch = metaData.canonical.match(/tiktok\.com\/@[^\/]+\/video\/(\d+)/i) || 
                                 metaData.canonical.match(/tiktok\.com\/t\/([^\/\?]+)/i);
      if (canonicalVideoMatch) {
        videoId = canonicalVideoMatch[1];
      }
    }
    
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
        contentType: isVideo ? 'video' : 'profile',
        error: true
      };
    } catch (fallbackError) {
      return {
        url,
        platform: 'tiktok',
        title: 'Contenu TikTok',
        description: '',
        image: null,
        siteName: 'TikTok',
        error: true
      };
    }
  } finally {
    // Ne fermer la page que si nous l'avons créée dans cette fonction
    if (!existingPage && page) {
      await page.close().catch(e => console.error('[TikTok Scraper] Erreur de fermeture de page:', e));
    }
  }
}

module.exports = { scrape };