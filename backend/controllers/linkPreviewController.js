const { scrapeUrl } = require('./platformScraper'); // Assurez-vous que le chemin est correct

exports.getDataLink = async (req, res) => {
  const { url } = req.query;

  if (!url) {
    return res.status(400).json({
      success: false,
      error: 'URL requise'
    });
  }

  try {
    console.log(`[LinkPreview] Extraction des métadonnées pour: ${url}`);

    // Utiliser le scraping avancé avec Puppeteer via platformScraper
    const scrapedData = await scrapeUrl(url);

    if (scrapedData) {
      console.log(`[LinkPreview] Données extraites avec succès via Puppeteer pour: ${url}`);
      return res.status(200).json({
        success: true,
        data: scrapedData
      });
    } else {
      console.log(`[LinkPreview] Aucune donnée extraite pour: ${url}`);
      return res.status(200).json({
        success: true,
        data: null,
        warning: 'Aucune donnée extraite'
      });
    }
  } catch (error) {
    console.error('[LinkPreview] Erreur lors de l\'extraction des métadonnées:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Erreur lors de l\'extraction des métadonnées'
    });
  }
};
