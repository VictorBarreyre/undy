// controllers/uploadController.js
const cloudinary = require('../config/cloudinary');

exports.uploadImage = async (req, res) => {
  try {
    const { image } = req.body;
    
    if (!image) {
      return res.status(400).json({ message: 'Aucune image fournie' });
    }
    
    // Upload de l'image
    const result = await cloudinary.uploader.upload(image, {
      folder: 'chat_images', // Organise les images dans un dossier
      resource_type: 'image',
      // Vous pouvez définir un délai d'expiration pour les images
      // Si vos conversations expirent après 7 jours:
      // invalidate: true,
      // type: 'authenticated',
      // access_mode: 'authenticated',
      // overwrite: true
    });
    
    res.status(200).json({
      url: result.secure_url,
      public_id: result.public_id,
      message: 'Image téléchargée avec succès'
    });
  } catch (error) {
    console.error('Erreur lors du téléchargement de l\'image:', error);
    res.status(500).json({ message: 'Erreur serveur.', error: error.message });
  }
};