// scrapers/youtubeScraper.js
/**
 * Extrait les données d'une vidéo YouTube
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
    
    // Extraire l'ID de la vidéo de l'URL
    const videoIdMatch = url.match(/[?&]v=([^&]+)/i) || url.match(/youtu\.be\/([^?&]+)/i);
    const videoId = videoIdMatch ? videoIdMatch[1] : null;
    
    // Si nous n'avons pas d'ID vidéo, retourner un résultat minimal
    if (!videoId) {
      return {
        url,
        platform: 'youtube',
        title: 'Vidéo YouTube',
        description: '',
        image: null,
        siteName: 'YouTube',
        author: '',
        error: 'ID vidéo non trouvé'
      };
    }
    
    // Définir un timeout pour la navigation
    await page.setDefaultNavigationTimeout(15000);
    
    // Navigation avec timeout réduit
    await page.goto(url, { 
      waitUntil: 'networkidle2',
      timeout: 15000
    });

    // Extraire les données avec un timeout de 5 secondes
    const videoData = await Promise.race([
      page.evaluate(() => {
        try {
          // Titre de la vidéo
          const titleElement = document.querySelector('#title h1') || 
                              document.querySelector('meta[property="og:title"]') || 
                              document.querySelector('meta[name="title"]');
          const title = titleElement ? 
                        (titleElement.textContent ? titleElement.textContent.trim() : titleElement.getAttribute('content')) 
                        : '';
          
          // Chaîne
          const channelElement = document.querySelector('#channel-name a') || 
                                document.querySelector('#owner-name a');
          const channelName = channelElement ? channelElement.textContent.trim() : '';
          const channelUrl = channelElement ? channelElement.href : '';
          
          // Vérifier si la chaîne est vérifiée
          const verifiedBadge = document.querySelector('#channel-name .badge') || 
                              document.querySelector('#owner-name .badge');
          const isVerified = verifiedBadge !== null;
          
          // Nombre de vues
          const viewCountElement = document.querySelector('.view-count') || 
                                  document.querySelector('#info .metadata-stats span');
          const viewCount = viewCountElement ? viewCountElement.textContent.trim() : '';
          
          // Date de publication
          const dateElement = document.querySelector('#info-strings yt-formatted-string') || 
                            document.querySelector('#info .metadata span');
          const dateString = dateElement ? dateElement.textContent.trim() : '';
          
          // Récupérer la miniature de la vidéo
          const thumbnailUrl = document.querySelector('link[rel="image_src"]')?.href || 
                              document.querySelector('meta[property="og:image"]')?.content;
          
          // Récupérer la description
          const descriptionElement = document.querySelector('#description-inline-expander') || 
                                    document.querySelector('meta[property="og:description"]') || 
                                    document.querySelector('meta[name="description"]');
          const description = descriptionElement ? 
                            (descriptionElement.textContent ? descriptionElement.textContent.trim() : descriptionElement.getAttribute('content')) 
                            : '';
          
          // Récupérer les likes
          const likeButton = document.querySelector('#top-level-buttons-computed button');
          const likeCount = likeButton ? likeButton.textContent.trim() : '';
          
          return {
            title,
            channelName,
            channelUrl,
            isVerified,
            viewCount,
            dateString,
            thumbnailUrl,
            description,
            likeCount
          };
        } catch (error) {
          console.error('Erreur lors de l\'extraction de la vidéo:', error);
          return null;
        }
      }),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout extraire données vidéo')), 5000)
      )
    ]).catch(error => {
      console.warn(`[YouTube Scraper] Avertissement: ${error.message}`);
      return null;
    });

    // Créer un résultat avec les données disponibles
    return {
      url,
      platform: 'youtube',
      title: videoData?.title || 'Vidéo YouTube',
      description: videoData?.description || '',
      image: videoData?.thumbnailUrl || `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
      siteName: 'YouTube',
      author: videoData?.channelName || '',
      channelUrl: videoData?.channelUrl || '',
      isVerified: videoData?.isVerified || false,
      videoId,
      viewCount: videoData?.viewCount || '',
      likeCount: videoData?.likeCount || '',
      publishDate: videoData?.dateString || '',
      duration: '',
      fallback: !videoData
    };
  } catch (error) {
    console.error(`[YouTube Scraper] Erreur:`, error);
    
    // Extraire l'ID de la vidéo pour un résultat minimal
    const videoIdMatch = url.match(/[?&]v=([^&]+)/i) || url.match(/youtu\.be\/([^?&]+)/i);
    const videoId = videoIdMatch ? videoIdMatch[1] : null;
    
    return {
      url,
      platform: 'youtube',
      title: 'Vidéo YouTube',
      description: '',
      image: videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : null,
      siteName: 'YouTube',
      author: '',
      videoId,
      error: true
    };
  } finally {
    // Ne fermer la page que si nous l'avons créée dans cette fonction
    if (!existingPage && page) {
      await page.close().catch(e => console.error('[YouTube Scraper] Erreur de fermeture de page:', e));
    }
  }
}

module.exports = { scrape };