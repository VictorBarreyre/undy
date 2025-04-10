// controllers/uploadController.js
const cloudinary = require('../config/cloudinary');
const axios = require('axios');


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

  const verifyAudioURL = async (url) => {
    try {
      const response = await axios.head(url);
      return response.status >= 200 && response.status < 300;
    } catch (error) {
      console.error('Erreur de vérification d\'URL audio:', error);
      return false;
    }
  };


  exports.uploadAudio = async (req, res) => {
    try {
      // Pour un upload en FormData
      if (req.files && req.files.audio) {
        const audioFile = req.files.audio;
        
        console.log("Type MIME du fichier reçu:", audioFile.mimetype);
        
        // Vérifier le type du fichier
        if (!audioFile.mimetype.startsWith('audio/')) {
          return res.status(400).json({ message: 'Le fichier doit être un format audio valide' });
        }
  
        // Utiliser directement les données du fichier au lieu de le convertir en base64
        const uploadResult = await cloudinary.uploader.upload(audioFile.tempFilePath, {
          folder: 'chat_audio',
          resource_type: 'auto',
          // Pas besoin de spécifier format ici
        });
  
        // Vérification d'accessibilité si vous avez cette fonction
        if (typeof verifyAudioURL === 'function') {
          const isAccessible = await verifyAudioURL(uploadResult.secure_url);
          if (!isAccessible) {
            console.error('L\'URL Cloudinary n\'est pas accessible:', uploadResult.secure_url);
          }
        }
  
        // Utilisez uploadResult au lieu de result
        const duration = uploadResult.duration || 0;
        const formattedDuration = formatTime(duration);
        
        return res.status(200).json({
          url: uploadResult.secure_url,
          public_id: uploadResult.public_id,
          duration: formattedDuration,
          message: 'Audio téléchargé avec succès'
        });
      }
      // Pour un upload en base64
      else if (req.body.audio) {
        // S'assurer que la chaîne base64 est complète et valide
        const audioData = req.body.audio;
        if (!audioData.startsWith('data:audio/')) {
          return res.status(400).json({ message: 'Format audio base64 invalide' });
        }
        
        // Upload vers Cloudinary
        const uploadResult = await cloudinary.uploader.upload(audioData, {
          folder: 'chat_audio',
          resource_type: 'auto'
        });
        
        return res.status(200).json({
          url: uploadResult.secure_url,
          public_id: uploadResult.public_id,
          duration: uploadResult.duration,
          message: 'Audio téléchargé avec succès'
        });
      }
      
      return res.status(400).json({ message: 'Aucun fichier audio fourni' });
    } catch (error) {
      console.error('Erreur lors du téléchargement de l\'audio:', error);
      res.status(500).json({ message: 'Erreur serveur.', error: error.message });
    }
  };
  
  // Ajoutez cette fonction de formatage si elle n'existe pas déjà
  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
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