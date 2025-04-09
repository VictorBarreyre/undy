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

  exports.uploadAudio = async (req, res) => {
    try {
      // Pour un upload en FormData
      if (req.files && req.files.audio) {
        const audioFile = req.files.audio;
        
        // Vérifier le type du fichier
        if (!audioFile.mimetype.startsWith('audio/')) {
          return res.status(400).json({ message: 'Le fichier doit être un format audio valide' });
        }
  
        // Convertir le fichier en base64 pour Cloudinary si nécessaire
        const base64Audio = `data:${audioFile.mimetype};base64,${audioFile.data.toString('base64')}`;
        
        // Upload de l'audio vers Cloudinary
        const result = await cloudinary.uploader.upload(base64Audio, {
          folder: 'chat_audio',
          resource_type: 'auto', // Permet à Cloudinary de détecter automatiquement le type
          format: 'mp3', // Vous pouvez spécifier un format de sortie si nécessaire
        });
        
        return res.status(200).json({
          url: result.secure_url,
          public_id: result.public_id,
          duration: result.duration, // Cloudinary renvoie la durée pour les fichiers audio
          message: 'Audio téléchargé avec succès'
        });
      }
      // Pour un upload en base64
      else if (req.body.audio) {
        // Si vous recevez un audio déjà au format base64
        const audioData = req.body.audio;
        
        // Upload vers Cloudinary
        const result = await cloudinary.uploader.upload(audioData, {
          folder: 'chat_audio',
          resource_type: 'auto',
          format: 'mp3',
        });
        
        return res.status(200).json({
          url: result.secure_url,
          public_id: result.public_id,
          duration: result.duration,
          message: 'Audio téléchargé avec succès'
        });
      }
      
      return res.status(400).json({ message: 'Aucun fichier audio fourni' });
    } catch (error) {
      console.error('Erreur lors du téléchargement de l\'audio:', error);
      res.status(500).json({ message: 'Erreur serveur.', error: error.message });
    }
  };
  
  // Fonction pour supprimer une image ou un audio (si nécessaire lors de la suppression d'une conversation)
  exports.deleteMedia = async (publicId) => {
    try {
      const result = await cloudinary.uploader.destroy(publicId);
      return { success: true, result };
    } catch (error) {
      console.error('Erreur lors de la suppression du média:', error);
      return { success: false, error: error.message };
    }
  };