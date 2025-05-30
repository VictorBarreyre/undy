// controllers/uploadController.js
const cloudinary = require('../config/cloudinary');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const ModerationService = require('../services/ModerationService');
const ModerationTracking = require('../models/ModerationTracking');

// Conversion des fonctions fs en promesses
const unlinkAsync = promisify(fs.unlink);
const readFileAsync = promisify(fs.readFile);

/**
 * Upload une image avec modération
 * @param {Object} req - Requête Express
 * @param {Object} res - Réponse Express
 */
exports.uploadImage = async (req, res) => {
  try {
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
    
    // Modérer l'image avant upload
    let moderationResult;
    try {
      if (imagePath) {
        // Modération via chemin de fichier
        moderationResult = await ModerationService.moderateImage({ path: imagePath });
      } else {
        // Modération via base64
        moderationResult = await ModerationService.moderateImage(imageData);
      }
      
      // Si l'image est inappropriée, ne pas poursuivre l'upload
      if (moderationResult && moderationResult.isFlagged) {
        return res.status(403).json({
          message: 'L\'image contient du contenu inapproprié',
          reason: moderationResult.reason,
          details: moderationResult.originalCategory
        });
      }
    } catch (moderationError) {
      console.error('Erreur lors de la modération de l\'image:', moderationError);
      // On continue malgré l'erreur de modération, mais on log
    }
    
    // Après modération réussie, uploader vers Cloudinary
    let uploadResult;
    
    if (imagePath) {
      // Upload depuis le fichier
      uploadResult = await cloudinary.uploader.upload(imagePath, {
        folder: 'chat_images',
        resource_type: 'image',
        moderation: 'aws_rek', // Modération supplémentaire via Cloudinary
        tags: ['moderated', 'hushy']
      });
    } else {
      // Upload depuis base64
      uploadResult = await cloudinary.uploader.upload(imageData, {
        folder: 'chat_images',
        resource_type: 'image',
        moderation: 'aws_rek',
        tags: ['moderated', 'hushy']
      });
    }
    
    // Nettoyer le fichier temporaire
    if (imagePath) {
      await unlinkAsync(imagePath).catch(err => console.error('Erreur lors de la suppression du fichier temporaire:', err));
    }
    
    // Retourner le résultat
    res.status(200).json({
      url: uploadResult.secure_url,
      public_id: uploadResult.public_id,
      width: uploadResult.width,
      height: uploadResult.height,
      format: uploadResult.format,
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

/**
 * Vérifier l'accessibilité d'une URL audio
 * @param {string} url - URL à vérifier
 * @returns {Promise<boolean>} - true si accessible
 */
const verifyAudioURL = async (url) => {
  try {
    const response = await axios.head(url);
    return response.status >= 200 && response.status < 300;
  } catch (error) {
    console.error('Erreur de vérification d\'URL audio:', error);
    return false;
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
 * Upload un fichier audio
 * @param {Object} req - Requête Express
 * @param {Object} res - Réponse Express
 */
exports.uploadAudio = async (req, res) => {
  try {
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
    
    // Upload vers Cloudinary
    let uploadResult;
    
    if (audioPath) {
      // Upload depuis le fichier
      uploadResult = await cloudinary.uploader.upload(audioPath, {
        folder: 'chat_audio',
        resource_type: 'auto',
        tags: ['audio', 'hushy']
      });
    } else {
      // Upload depuis base64
      uploadResult = await cloudinary.uploader.upload(audioData, {
        folder: 'chat_audio',
        resource_type: 'auto',
        tags: ['audio', 'hushy']
      });
    }
    
    // Nettoyer le fichier temporaire
    if (audioPath) {
      await unlinkAsync(audioPath).catch(err => console.error('Erreur lors de la suppression du fichier temporaire:', err));
    }
    
    // Vérifier l'accessibilité de l'URL
    const isAccessible = await verifyAudioURL(uploadResult.secure_url);
    if (!isAccessible) {
      console.warn('L\'URL audio n\'est pas immédiatement accessible:', uploadResult.secure_url);
    }
    
    // Formater la durée si disponible
    const duration = uploadResult.duration || 0;
    const formattedDuration = formatTime(duration);
    
    // Retourner le résultat
    res.status(200).json({
      url: uploadResult.secure_url,
      public_id: uploadResult.public_id,
      duration: formattedDuration,
      format: uploadResult.format,
      message: 'Audio téléchargé avec succès'
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
 * Upload un fichier vidéo avec modération asynchrone
 * @param {Object} req - Requête Express
 * @param {Object} res - Réponse Express
 */
exports.uploadVideo = async (req, res) => {
  try {
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
    
    // Générer un ID unique pour le suivi de modération
    const moderationId = `moderation_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    
    // Upload vers Cloudinary en premier avec tag de modération en attente
    let uploadResult;
    
    if (videoPath) {
      uploadResult = await cloudinary.uploader.upload(videoPath, {
        folder: 'chat_videos',
        resource_type: 'video',
        tags: ['pending_moderation', 'hushy', moderationId],
        moderation: 'aws_rek' // Utiliser la modération intégrée à Cloudinary en plus
      });
    } else {
      uploadResult = await cloudinary.uploader.upload(videoData, {
        folder: 'chat_videos',
        resource_type: 'video',
        tags: ['pending_moderation', 'hushy', moderationId],
        moderation: 'aws_rek'
      });
    }

    
    
    // Nettoyer le fichier temporaire
    if (videoPath) {
      await unlinkAsync(videoPath).catch(err => console.error('Erreur lors de la suppression du fichier temporaire:', err));
    }
    
    // Soumettre la vidéo à Sightengine pour analyse asynchrone
    try {
      const submissionResult = await ModerationService.submitVideoForModeration(uploadResult.secure_url);
      
      if (submissionResult.workflowId) {
        // Enregistrer dans la base de données pour suivi
        await ModerationTracking.create({
          workflowId: submissionResult.workflowId,
          cloudinaryId: uploadResult.public_id,
          moderationId: moderationId,
          status: 'pending',
          mediaType: 'video',
          url: uploadResult.secure_url,
          userId: req.user.id
        });
        
        // Retourner le résultat avec avertissement de modération en cours
        return res.status(200).json({
          url: uploadResult.secure_url,
          public_id: uploadResult.public_id,
          duration: formatTime(uploadResult.duration || 0),
          format: uploadResult.format,
          moderationStatus: 'pending',
          workflowId: submissionResult.workflowId,
          message: 'Vidéo téléchargée avec succès (en cours de modération)'
        });
      }
    } catch (moderationError) {
      console.error('Erreur lors de la soumission de la vidéo à Sightengine:', moderationError);
      // Continuer malgré l'erreur de soumission à Sightengine
    }
    
    // Si la soumission à Sightengine a échoué, retourner quand même le résultat
    return res.status(200).json({
      url: uploadResult.secure_url,
      public_id: uploadResult.public_id,
      duration: formatTime(uploadResult.duration || 0),
      format: uploadResult.format,
      moderationStatus: 'warning',
      message: 'Vidéo téléchargée avec succès (modération incomplète)'
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
 * Webhook pour recevoir les notifications de modération de Sightengine
 * @param {Object} req - Requête Express
 * @param {Object} res - Réponse Express
 */
exports.handleModerationWebhook = async (req, res) => {
  try {
    const { workflowId, status } = req.body;
    
    if (!workflowId || status !== 'completed') {
      return res.status(200).json({ message: 'Notification reçue mais ignorée' });
    }
    
    // Récupérer les informations de suivi
    const trackingInfo = await ModerationTracking.findOne({ workflowId });
    
    if (!trackingInfo) {
      console.error(`Aucune information de suivi trouvée pour le workflow ID ${workflowId}`);
      return res.status(200).json({ message: 'Workflow non trouvé dans notre système' });
    }
    
    // Récupérer le résultat de modération
    const statusResult = await ModerationService.checkVideoModerationStatus(workflowId);
    
    // Mettre à jour le statut de tracking
    trackingInfo.status = statusResult.isFlagged ? 'rejected' : 'approved';
    trackingInfo.result = statusResult;
    await trackingInfo.save();
    
    // Si le contenu est inapproprié, supprimer la vidéo
    if (statusResult.isFlagged) {
      try {
        // Supprimer la vidéo de Cloudinary
        await cloudinary.uploader.destroy(trackingInfo.cloudinaryId, {
          resource_type: 'video'
        });
        
        console.log(`Vidéo inappropriée supprimée: ${trackingInfo.cloudinaryId}, raison: ${statusResult.reason}`);
        
        // Implémenter ici la logique pour notifier l'utilisateur ou mettre à jour la base de données
        
        return res.status(200).json({
          message: 'Contenu inapproprié détecté et supprimé',
          action: 'deleted',
          reason: statusResult.reason
        });
      } catch (deleteError) {
        console.error('Erreur lors de la suppression de la vidéo:', deleteError);
        return res.status(200).json({
          message: 'Contenu inapproprié détecté mais erreur lors de la suppression',
          error: deleteError.message
        });
      }
    } else {
      // Si le contenu est approprié, mettre à jour les tags
      try {
        await cloudinary.uploader.remove_tag('pending_moderation', trackingInfo.cloudinaryId);
        await cloudinary.uploader.add_tag('moderated_approved', trackingInfo.cloudinaryId);
        
        return res.status(200).json({
          message: 'Contenu vérifié et approuvé',
          action: 'approved'
        });
      } catch (tagError) {
        console.error('Erreur lors de la mise à jour des tags:', tagError);
        return res.status(200).json({
          message: 'Contenu approuvé mais erreur lors de la mise à jour des tags',
          error: tagError.message
        });
      }
    }
  } catch (error) {
    console.error('Erreur lors du traitement du webhook de modération:', error);
    res.status(500).json({
      message: 'Erreur serveur lors du traitement du webhook',
      error: error.message
    });
  }
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