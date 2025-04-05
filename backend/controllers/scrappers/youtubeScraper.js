// scrapers/youtubeScraper.js
/**
 * Extrait les données d'une vidéo YouTube
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
  
      // Attendre que la vidéo charge
      await page.waitForSelector('#title h1', { timeout: 5000 }).catch(() => {});
  
      // Extraire les données
      const videoData = await page.evaluate(() => {
        try {
          // Titre de la vidéo
          const titleElement = document.querySelector('#title h1');
          const title = titleElement ? titleElement.textContent.trim() : '';
          
          // Chaîne
          const channelElement = document.querySelector('#channel-name a');
          const channelName = channelElement ? channelElement.textContent.trim() : '';
          const channelUrl = channelElement ? channelElement.href : '';
          
          // Vérifier si la chaîne est vérifiée
          const verifiedBadge = document.querySelector('#channel-name .badge');
          const isVerified = verifiedBadge !== null;
          
          // Nombre de vues
          const viewCountElement = document.querySelector('.view-count');
          const viewCount = viewCountElement ? viewCountElement.textContent.trim() : '';
          
          // Date de publication
          const dateElement = document.querySelector('#info-strings yt-formatted-string');
          const dateString = dateElement ? dateElement.textContent.trim() : '';
          
          // Récupérer la miniature de la vidéo
          const thumbnailUrl = document.querySelector('link[rel="image_src"]')?.href;
  
          // Récupérer la description
          const descriptionElement = document.querySelector('#description-inline-expander');
          const description = descriptionElement ? descriptionElement.textContent.trim() : '';
          
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
      });
  
      if (!videoData) {
        // Essayer d'extraire l'ID de la vidéo de l'URL
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
          viewCount: '',
          likeCount: '',
          publishDate: '',
          duration: ''
        };
      }
  
      // Extraire l'ID de la vidéo
      const videoIdMatch = url.match(/[?&]v=([^&]+)/i) || url.match(/youtu\.be\/([^?&]+)/i);
      const videoId = videoIdMatch ? videoIdMatch[1] : null;
  
      // Formater le résultat
      return {
        url,
        platform: 'youtube',
        title: videoData.title,
        description: videoData.description,
        image: videoData.thumbnailUrl || (videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : null),
        siteName: 'YouTube',
        author: videoData.channelName,
        channelUrl: videoData.channelUrl,
        isVerified: videoData.isVerified,
        videoId,
        viewCount: videoData.viewCount,
        likeCount: videoData.likeCount,
        publishDate: videoData.dateString,
        duration: ''  // Difficile à extraire sans l'API
      };
    } catch (error) {
      console.error(`[YouTube Scraper] Erreur:`, error);
      return null;
    }
  }
  
  module.exports = { scrape };