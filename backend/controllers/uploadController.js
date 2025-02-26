// controllers/uploadController.js
const cloudinary = require('../config/cloudinary');

exports.uploadImage = async (req, res) => {
    try {
      const { image } = req.body;
      
      if (!image) {
        return res.status(400).json({ message: 'Aucune image fournie' });
      }
      
      // Upload de l'image vers Cloudinary
      const result = await cloudinary.uploader.upload(image, {
        folder: 'chat_images',
        resource_type: 'image',
        // Vous pouvez définir une date d'expiration pour les images
        // Elles seront supprimées automatiquement après cette période
        // transformation: [{ expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) }]
      });
      
      // Retourner l'URL et d'autres informations utiles
      res.status(200).json({
        url: result.secure_url,
        public_id: result.public_id,
        message: 'Image téléchargée avec succès'
      });
    } catch (error) {
      console.error('Erreur lors du téléchargement de l\'image:', error);
      res.status(500).json({ 
        message: 'Erreur serveur lors de l\'upload', 
        error: error.message 
      });
    }
  };
  
  // Fonction pour supprimer une image (si nécessaire lors de la suppression d'une conversation)
  exports.deleteImage = async (publicId) => {
    try {
      const result = await cloudinary.uploader.destroy(publicId);
      return { success: true, result };
    } catch (error) {
      console.error('Erreur lors de la suppression de l\'image:', error);
      return { success: false, error: error.message };
    }
  };