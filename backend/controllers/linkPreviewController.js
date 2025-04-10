const { scrapeUrl } = require('./platformScraper');

exports.getDataLink = async (req, res) => {
  console.log('[LinkPreviewController] Entrée dans getDataLink');

  const { url } = req.query;

  if (!url) {
    console.log('[LinkPreviewController] URL manquante');
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
  } finally {
    console.log('[LinkPreviewController] Sortie de getDataLink');
  }
};
