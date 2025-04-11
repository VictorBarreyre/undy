// scrapers/appleMapscraper.js
/**
 * Extrait les données d'une localisation Apple Maps
 * @param {Browser} browser - Instance Puppeteer du navigateur
 * @param {string} url - URL de la localisation
 * @param {Page} [existingPage] - Page Puppeteer existante (optionnelle)
 * @returns {Promise<Object>} - Données de la localisation
 */
async function scrape(browser, url, existingPage = null) {
  const page = existingPage || await browser.newPage();
  
  try {
    if (!existingPage) {
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    }
    
    // Extraction directe depuis l'URL car Apple Maps utilise beaucoup les paramètres d'URL
    const latMatch = url.match(/[?&]ll=([^,&]+)/i);
    const lngMatch = url.match(/[?&]ll=[^,&]+,([^&]+)/i);
    const addressMatch = url.match(/[?&]q=([^&]+)/i) || url.match(/[?&]address=([^&]+)/i);
    const nameMatch = url.match(/[?&]t=([^&]+)/i);
    
    let lat = null, lng = null, address = null, name = null;
    
    if (latMatch && latMatch[1]) lat = parseFloat(latMatch[1]);
    if (lngMatch && lngMatch[1]) lng = parseFloat(lngMatch[1]);
    
    if (addressMatch && addressMatch[1]) {
      try {
        address = decodeURIComponent(addressMatch[1]).replace(/\+/g, ' ');
      } catch (e) {
        address = addressMatch[1].replace(/\+/g, ' ');
      }
    }
    
    if (nameMatch && nameMatch[1]) {
      try {
        name = decodeURIComponent(nameMatch[1]).replace(/\+/g, ' ');
      } catch (e) {
        name = nameMatch[1].replace(/\+/g, ' ');
      }
    }
    
    // Si on n'a pas assez d'infos pour extraire les données de base, essayons d'accéder à la page
    if ((!lat || !lng) && (!name && !address)) {
      try {
        // Définir un timeout pour la navigation
        await page.setDefaultNavigationTimeout(15000);
        
        // Navigation avec timeout réduit
        await page.goto(url, { 
          waitUntil: 'networkidle2',
          timeout: 10000
        });
        
        // Essayer d'extraire les métadonnées ou les données de la page
        const pageData = await Promise.race([
          page.evaluate(() => {
            try {
              // Extraire les métadonnées des balises meta
              const getMetaContent = (property) => {
                const meta = document.querySelector(`meta[property="${property}"]`) || 
                            document.querySelector(`meta[name="${property}"]`);
                return meta ? meta.getAttribute('content') : null;
              };
              
              const title = getMetaContent('og:title') || document.title;
              const description = getMetaContent('og:description');
              
              // Essayer de trouver des coordonnées dans la page
              let lat = null, lng = null;
              
              // Rechercher dans les scripts
              const scripts = Array.from(document.querySelectorAll('script'));
              for (const script of scripts) {
                const content = script.textContent || '';
                const coordMatch = content.match(/"latitude"\s*:\s*([0-9.-]+)\s*,\s*"longitude"\s*:\s*([0-9.-]+)/i);
                if (coordMatch) {
                  lat = parseFloat(coordMatch[1]);
                  lng = parseFloat(coordMatch[2]);
                  break;
                }
              }
              
              return {
                title,
                description,
                coordinates: lat && lng ? { lat, lng } : null
              };
            } catch (error) {
              console.error('Erreur lors de l\'extraction des données de la page:', error);
              return {};
            }
          }),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Timeout extraire données page')), 5000)
          )
        ]).catch(error => {
          console.warn(`[Apple Maps Scraper] Avertissement: ${error.message}`);
          return {};
        });
        
        // Mettre à jour nos données si on a trouvé quelque chose
        if (pageData.title && !name) name = pageData.title;
        if (pageData.description && !address) address = pageData.description;
        if (pageData.coordinates && (!lat || !lng)) {
          lat = pageData.coordinates.lat;
          lng = pageData.coordinates.lng;
        }
      } catch (navigationError) {
        console.warn(`[Apple Maps Scraper] Navigation échouée: ${navigationError.message}`);
      }
    }
    
    // Si on a des coordonnées, essayons de récupérer une image statique
    let image = null;
    if (lat !== null && lng !== null) {
      // Utiliser l'API OpenStreetMap pour générer une image statique
      image = `https://staticmap.openstreetmap.de/staticmap.php?center=${lat},${lng}&zoom=15&size=600x400&maptype=mapnik&markers=${lat},${lng},lightblue1`;
    }
    
    return {
      url,
      platform: 'apple_maps',
      title: name || address || 'Localisation',
      description: address || '',
      image,
      siteName: 'Apple Plans',
      address,
      coordinates: (lat !== null && lng !== null) ? { lat, lng } : null,
      locationName: name
    };
  } catch (error) {
    console.error(`[Apple Maps Scraper] Erreur:`, error);
    
    // Fallback minimal
    return {
      url,
      platform: 'apple_maps',
      title: 'Localisation',
      description: '',
      image: null,
      siteName: 'Apple Plans',
      error: true
    };
  } finally {
    // Ne fermer la page que si nous l'avons créée dans cette fonction
    if (!existingPage && page) {
      await page.close().catch(e => console.error('[Apple Maps Scraper] Erreur de fermeture de page:', e));
    }
  }
}

module.exports = { scrape };