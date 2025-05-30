// controllers/uploadController.js - TOUTE MODÉRATION DÉSACTIVÉE
const cloudinary = require('../config/cloudinary');
const fs = require('fs');
const { promisify } = require('util');

// Conversion des fonctions fs en promesses
const unlinkAsync = promisify(fs.unlink);

/**
 * Upload une image SANS AUCUNE modération
 * @param {Object} req - Requête Express
 * @param {Object} res - Réponse Express
 */
exports.uploadImage = async (req, res) => {
  try {
    console.log('📤 Upload d\'image - AUCUNE modération');
    
    // Extraction de l'image (base64 ou fichier)
    let imageData;
    let imagePath;
    
    if (req.body && req.body.image && typeof req.body.image === 'string' && req.body.image.startsWith('data:image/')) {
      // Image en Base64
      imageData = req.body.image;
    } else if (req.file) {
      // Image uploadée via multer
      imagePath = req.file.path;
      imageData = req.file;
    } else {
      return res.status(400).json({ message: 'Aucune image fournie' });
    }
    
    // Upload DIRECT vers Cloudinary - AUCUNE modération
    let uploadResult;
    
    if (imagePath) {
      // Upload depuis le fichier
      uploadResult = await cloudinary.uploader.upload(imagePath, {
        folder: 'chat_images',
        resource_type: 'image',
        tags: ['hushy', 'unmoderated']
      });
    } else {
      // Upload depuis base64
      uploadResult = await cloudinary.uploader.upload(imageData, {
        folder: 'chat_images',
        resource_type: 'image',
        tags: ['hushy', 'unmoderated']
      });
    }
    
    // Nettoyer le fichier temporaire
    if (imagePath) {
      await unlinkAsync(imagePath).catch(err => console.error('Erreur suppression fichier temporaire:', err));
    }
    
    console.log('✅ Image uploadée sans modération:', uploadResult.secure_url);
    
    // Retourner le résultat
    res.status(200).json({
      url: uploadResult.secure_url,
      public_id: uploadResult.public_id,
      width: uploadResult.width,
      height: uploadResult.height,
      format: uploadResult.format,
      message: 'Image téléchargée sans modération'
    });
  } catch (error) {
    console.error('Erreur lors du téléchargement de l\'image:', error);
    res.status(500).json({ 
      message: 'Erreur serveur lors de l\'upload', 
      error: error.message 
    });
  }
};

/**
 * Formatage du temps en minutes:secondes
 * @param {number} seconds - Durée en secondes
 * @returns {string} - Format MM:SS
 */
const formatTime = (seconds) => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
};

/**
 * Upload un fichier audio SANS AUCUNE modération
 * @param {Object} req - Requête Express
 * @param {Object} res - Réponse Express
 */
exports.uploadAudio = async (req, res) => {
  try {
    console.log('🎵 Upload d\'audio - AUCUNE modération');
    
    // Extraction de l'audio (fichier ou base64)
    let audioData;
    let audioPath;
    
    if (req.file) {
      // Audio uploadé via multer
      audioPath = req.file.path;
      audioData = req.file;
    } else if (req.body && req.body.audio && typeof req.body.audio === 'string' && req.body.audio.startsWith('data:audio/')) {
      // Audio en Base64
      audioData = req.body.audio;
    } else {
      return res.status(400).json({ message: 'Aucun fichier audio fourni' });
    }
    
    // Upload DIRECT vers Cloudinary - AUCUNE modération
    let uploadResult;
    
    if (audioPath) {
      // Upload depuis le fichier
      uploadResult = await cloudinary.uploader.upload(audioPath, {
        folder: 'chat_audio',
        resource_type: 'auto',
        tags: ['audio', 'hushy', 'unmoderated']
      });
    } else {
      // Upload depuis base64
      uploadResult = await cloudinary.uploader.upload(audioData, {
        folder: 'chat_audio',
        resource_type: 'auto',
        tags: ['audio', 'hushy', 'unmoderated']
      });
    }
    
    // Nettoyer le fichier temporaire
    if (audioPath) {
      await unlinkAsync(audioPath).catch(err => console.error('Erreur suppression fichier temporaire:', err));
    }
    
    // Formater la durée si disponible
    const duration = uploadResult.duration || 0;
    const formattedDuration = formatTime(duration);
    
    console.log('✅ Audio uploadé sans modération:', uploadResult.secure_url);
    
    // Retourner le résultat
    res.status(200).json({
      url: uploadResult.secure_url,
      public_id: uploadResult.public_id,
      duration: formattedDuration,
      format: uploadResult.format,
      message: 'Audio téléchargé sans modération'
    });
  } catch (error) {
    console.error('Erreur lors du téléchargement de l\'audio:', error);
    res.status(500).json({ 
      message: 'Erreur serveur lors de l\'upload audio', 
      error: error.message 
    });
  }
};

/**
 * Upload un fichier vidéo SANS AUCUNE modération
 * @param {Object} req - Requête Express
 * @param {Object} res - Réponse Express
 */
exports.uploadVideo = async (req, res) => {
  try {
    console.log('🎥 Upload de vidéo - AUCUNE modération');
    
    // Extraction de la vidéo
    let videoPath;
    let videoData;
    
    if (req.file) {
      // Vidéo uploadée via multer
      videoPath = req.file.path;
      videoData = req.file;
    } else if (req.body && req.body.video && typeof req.body.video === 'string' && req.body.video.startsWith('data:video/')) {
      // Vidéo en Base64
      videoData = req.body.video;
    } else {
      return res.status(400).json({ message: 'Aucun fichier vidéo fourni' });
    }
    
    // Upload DIRECT vers Cloudinary - AUCUNE modération
    let uploadResult;
    
    if (videoPath) {
      uploadResult = await cloudinary.uploader.upload(videoPath, {
        folder: 'chat_videos',
        resource_type: 'video',
        tags: ['hushy', 'video', 'unmoderated']
      });
    } else {
      uploadResult = await cloudinary.uploader.upload(videoData, {
        folder: 'chat_videos',
        resource_type: 'video',
        tags: ['hushy', 'video', 'unmoderated']
      });
    }
    
    // Nettoyer le fichier temporaire
    if (videoPath) {
      await unlinkAsync(videoPath).catch(err => console.error('Erreur suppression fichier temporaire:', err));
    }
    
    console.log('✅ Vidéo uploadée sans modération:', uploadResult.secure_url);
    
    // Retourner le résultat sans aucune mention de modération
    return res.status(200).json({
      url: uploadResult.secure_url,
      public_id: uploadResult.public_id,
      duration: formatTime(uploadResult.duration || 0),
      format: uploadResult.format,
      message: 'Vidéo téléchargée sans modération'
    });
  } catch (error) {
    console.error('Erreur lors du téléchargement de la vidéo:', error);
    res.status(500).json({ 
      message: 'Erreur serveur lors de l\'upload vidéo', 
      error: error.message 
    });
  }
};

/**
 * Webhook désactivé (plus de modération)
 */
exports.handleModerationWebhook = async (req, res) => {
  console.log('📨 Webhook de modération reçu mais IGNORÉ (modération désactivée)');
  res.status(200).json({ 
    message: 'Webhook ignoré - modération complètement désactivée',
    status: 'disabled'
  });
};

/**
 * Fonction pour supprimer un média
 * @param {string} publicId - ID public Cloudinary
 * @param {string} resourceType - Type de ressource ('image', 'video', 'raw')
 */
exports.deleteMedia = async (publicId, resourceType = 'image') => {
  try {
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType
    });
    
    return { 
      success: result.result === 'ok',
      result 
    };
  } catch (error) {
    console.error(`Erreur lors de la suppression du média (${resourceType}):`, error);
    return { 
      success: false, 
      error: error.message 
    };
  }
};