// scrapers/appleMapscraper.js
/**
 * Extrait les données d'une localisation Apple Maps
 * @param {Browser} browser - Instance Puppeteer du navigateur
 * @param {string} url - URL de la localisation
 * @returns {Promise<Object>} - Données de la localisation
 */
async function scrape(browser, url) {
    try {
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
      return null;
    }
  }
  
  module.exports = { scrape };