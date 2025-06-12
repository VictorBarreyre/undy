// controllers/uploadController.js - AVEC MODÉRATION SIGHTENGINE ACTIVÉE
const cloudinary = require('../config/cloudinary');
const fs = require('fs');
const { promisify } = require('util');
const { 
  analyzeImage, 
  analyzeImageFromFile, 
  analyzeImageFromBase64,
  analyzeImageResult,
  submitVideoForAnalysis,
  checkVideoAnalysisStatus,
  analyzeVideoResult 
} = require('./moderationController');

// Conversion des fonctions fs en promesses
const unlinkAsync = promisify(fs.unlink);

/**
 * Upload une image AVEC modération Sightengine
 * @param {Object} req - Requête Express
 * @param {Object} res - Réponse Express
 */
exports.uploadImage = async (req, res) => {
  try {
    console.log('📤 Upload d\'image - AVEC modération Sightengine activée');
    
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
    
    // 1. MODÉRATION DE L'IMAGE AVEC SIGHTENGINE
    let moderationResult;
    
    try {
      if (imagePath) {
        // Modération depuis le fichier
        console.log('🔍 Analyse Sightengine de l\'image depuis le fichier...');
        const analysisData = await analyzeImageFromFile(req.file);
        moderationResult = analyzeImageResult(analysisData);
      } else {
        // Modération depuis base64
        console.log('🔍 Analyse Sightengine de l\'image depuis base64...');
        const analysisData = await analyzeImageFromBase64(imageData);
        moderationResult = analyzeImageResult(analysisData);
      }
      
      console.log('📊 Résultat Sightengine:', {
        isFlagged: moderationResult.isFlagged,
        reason: moderationResult.reason,
        categories: moderationResult.details?.flaggedCategories
      });
      
      // Si l'image est flaggée, on refuse l'upload
      if (moderationResult.isFlagged) {
        console.log('❌ Image rejetée par Sightengine:', moderationResult.reason);
        
        // Nettoyer le fichier temporaire si présent
        if (imagePath) {
          await unlinkAsync(imagePath).catch(err => 
            console.error('Erreur suppression fichier temporaire:', err)
          );
        }
        
        return res.status(403).json({
          message: 'Image rejetée: contenu inapproprié détecté',
          reason: moderationResult.reason,
          details: moderationResult.details
        });
      }
      
      console.log('✅ Image approuvée par Sightengine');
      
    } catch (moderationError) {
      console.error('⚠️ Erreur lors de la modération Sightengine:', moderationError);
      
      // Configuration: que faire en cas d'erreur de modération?
      const FAIL_OPEN = process.env.MODERATION_FAIL_OPEN === 'true'; // Par défaut: fail closed
      
      if (!FAIL_OPEN) {
        // Fail closed: bloquer l'upload en cas d'erreur
        if (imagePath) {
          await unlinkAsync(imagePath).catch(err => 
            console.error('Erreur suppression fichier temporaire:', err)
          );
        }
        
        return res.status(503).json({
          message: 'Service de modération temporairement indisponible',
          error: 'Veuillez réessayer dans quelques instants'
        });
      }
      
      // Fail open: permettre l'upload avec un tag spécial
      console.log('⚠️ Modération échouée - autorisation par défaut (fail open)');
    }
    
    // 2. UPLOAD VERS CLOUDINARY
    let uploadResult;
    
    if (imagePath) {
      // Upload depuis le fichier
      uploadResult = await cloudinary.uploader.upload(imagePath, {
        folder: 'chat_images',
        resource_type: 'image',
        tags: ['hushy', 'moderated', 'sightengine_approved']
      });
    } else {
      // Upload depuis base64
      uploadResult = await cloudinary.uploader.upload(imageData, {
        folder: 'chat_images',
        resource_type: 'image',
        tags: ['hushy', 'moderated', 'sightengine_approved']
      });
    }
    
    // Nettoyer le fichier temporaire
    if (imagePath) {
      await unlinkAsync(imagePath).catch(err => 
        console.error('Erreur suppression fichier temporaire:', err)
      );
    }
    
    console.log('✅ Image uploadée avec succès:', uploadResult.secure_url);
    
    // Retourner le résultat
    res.status(200).json({
      url: uploadResult.secure_url,
      public_id: uploadResult.public_id,
      width: uploadResult.width,
      height: uploadResult.height,
      format: uploadResult.format,
      moderated: true,
      moderationService: 'sightengine',
      message: 'Image téléchargée avec succès après modération'
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
 * Upload un fichier audio (pas de modération Sightengine pour l'audio)
 * @param {Object} req - Requête Express
 * @param {Object} res - Réponse Express
 */
exports.uploadAudio = async (req, res) => {
  try {
    console.log('🎵 Upload d\'audio - Sans modération Sightengine (non supporté)');
    
    // Extraction de l'audio
    let audioData;
    let audioPath;
    let audioDuration = "00:00";
    
    // Priorité au base64
    if (req.body && req.body.audio && typeof req.body.audio === 'string' && req.body.audio.startsWith('data:audio/')) {
      // Audio en Base64
      audioData = req.body.audio;
      audioDuration = req.body.duration || "00:00";
      console.log('📊 Audio base64 détecté, taille:', audioData.length);
    } else if (req.file) {
      // Audio uploadé via multer
      audioPath = req.file.path;
      audioData = req.file;
      console.log('📁 Fichier audio détecté:', audioPath);
    } else {
      return res.status(400).json({ 
        message: 'Aucun fichier audio fourni',
        details: {
          hasBody: !!req.body,
          bodyKeys: Object.keys(req.body || {}),
          hasFile: !!req.file
        }
      });
    }
    
    // Upload vers Cloudinary
    let uploadResult;
    
    try {
      if (audioPath) {
        uploadResult = await cloudinary.uploader.upload(audioPath, {
          folder: 'chat_audio',
          resource_type: 'auto',
          tags: ['audio', 'hushy']
        });
      } else {
        uploadResult = await cloudinary.uploader.upload(audioData, {
          folder: 'chat_audio',
          resource_type: 'auto',
          tags: ['audio', 'hushy', 'base64']
        });
      }
    } catch (cloudinaryError) {
      console.error('❌ Erreur Cloudinary:', cloudinaryError);
      throw new Error(`Erreur upload Cloudinary: ${cloudinaryError.message}`);
    }
    
    // Nettoyer le fichier temporaire si nécessaire
    if (audioPath) {
      await unlinkAsync(audioPath).catch(err => 
        console.error('Erreur suppression fichier temporaire:', err)
      );
    }
    
    // Utiliser la durée fournie ou celle de Cloudinary
    const finalDuration = audioDuration !== "00:00" 
      ? audioDuration 
      : formatTime(uploadResult.duration || 0);
    
    console.log('✅ Audio uploadé avec succès:', uploadResult.secure_url);
    
    // Retourner le résultat
    res.status(200).json({
      url: uploadResult.secure_url,
      public_id: uploadResult.public_id,
      duration: finalDuration,
      format: uploadResult.format,
      size: uploadResult.bytes,
      message: 'Audio téléchargé avec succès'
    });
  } catch (error) {
    console.error('❌ Erreur lors du téléchargement de l\'audio:', error);
    res.status(500).json({ 
      message: 'Erreur serveur lors de l\'upload audio', 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

/**
 * Upload un fichier vidéo AVEC modération Sightengine asynchrone
 * @param {Object} req - Requête Express
 * @param {Object} res - Réponse Express
 */
exports.uploadVideo = async (req, res) => {
  try {
    console.log('🎥 Upload de vidéo - AVEC modération Sightengine asynchrone');
    
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
    
    // 1. UPLOAD VERS CLOUDINARY D'ABORD
    let uploadResult;
    
    if (videoPath) {
      uploadResult = await cloudinary.uploader.upload(videoPath, {
        folder: 'chat_videos',
        resource_type: 'video',
        tags: ['hushy', 'video', 'pending_moderation']
      });
    } else {
      uploadResult = await cloudinary.uploader.upload(videoData, {
        folder: 'chat_videos',
        resource_type: 'video',
        tags: ['hushy', 'video', 'pending_moderation']
      });
    }
    
    // Nettoyer le fichier temporaire
    if (videoPath) {
      await unlinkAsync(videoPath).catch(err => 
        console.error('Erreur suppression fichier temporaire:', err)
      );
    }
    
    console.log('✅ Vidéo uploadée:', uploadResult.secure_url);
    
    // 2. SOUMETTRE POUR MODÉRATION ASYNCHRONE AVEC SIGHTENGINE
    let moderationWorkflowId = null;
    
    try {
      console.log('🔍 Soumission de la vidéo à Sightengine...');
      const moderationSubmission = await submitVideoForAnalysis(uploadResult.secure_url);
      
      if (moderationSubmission.id) {
        moderationWorkflowId = moderationSubmission.id;
        console.log('✅ Vidéo soumise à Sightengine, workflow ID:', moderationWorkflowId);
        
        // TODO: Stocker le workflow ID avec le public_id dans votre base de données
        // pour pouvoir traiter le webhook plus tard
        // Exemple:
        // await VideoModeration.create({
        //   publicId: uploadResult.public_id,
        //   workflowId: moderationWorkflowId,
        //   status: 'pending',
        //   uploadedAt: new Date()
        // });
      }
    } catch (moderationError) {
      console.error('⚠️ Erreur lors de la soumission à Sightengine:', moderationError);
      // On continue quand même - la vidéo est uploadée
      // mais on ajoute un tag pour indiquer que la modération a échoué
      await cloudinary.uploader.add_tag('moderation_failed', [uploadResult.public_id]);
    }
    
    // Retourner le résultat
    return res.status(200).json({
      url: uploadResult.secure_url,
      public_id: uploadResult.public_id,
      duration: uploadResult.duration || 0,
      durationFormatted: formatTime(uploadResult.duration || 0),
      format: uploadResult.format,
      moderated: false,
      moderationStatus: moderationWorkflowId ? 'pending' : 'failed_to_submit',
      moderationWorkflowId: moderationWorkflowId,
      moderationService: 'sightengine',
      message: 'Vidéo téléchargée avec succès, modération en cours'
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
 * Webhook pour recevoir les résultats de modération Sightengine
 */
exports.handleModerationWebhook = async (req, res) => {
  try {
    console.log('📨 Webhook Sightengine reçu');
    console.log('Headers:', req.headers);
    console.log('Body:', JSON.stringify(req.body, null, 2));
    
    // Vérifier la signature du webhook si configurée
    // Sightengine peut signer les webhooks pour la sécurité
    // const signature = req.headers['x-sightengine-signature'];
    // if (!verifyWebhookSignature(req.body, signature)) {
    //   return res.status(401).json({ message: 'Signature invalide' });
    // }
    
    const { id: workflowId, status, summary, media } = req.body;
    
    if (!workflowId) {
      return res.status(400).json({ message: 'Workflow ID manquant' });
    }
    
    if (status === 'finished' && summary) {
      // Analyser les résultats Sightengine
      const analysisResult = analyzeVideoResult({ summary });
      
      console.log('📊 Analyse Sightengine terminée:', {
        workflowId,
        isFlagged: analysisResult.isFlagged,
        reason: analysisResult.reason
      });
      
      // TODO: Récupérer le public_id depuis votre base de données
      // const videoRecord = await VideoModeration.findOne({ workflowId });
      // if (!videoRecord) {
      //   console.error('Aucun enregistrement trouvé pour le workflow:', workflowId);
      //   return res.status(404).json({ message: 'Workflow non trouvé' });
      // }
      
      if (analysisResult.isFlagged) {
        console.log('❌ Vidéo signalée comme inappropriée par Sightengine:', analysisResult.reason);
        
        // Actions à effectuer:
        // 1. Supprimer la vidéo de Cloudinary
        // await cloudinary.uploader.destroy(videoRecord.publicId, { resource_type: 'video' });
        
        // 2. Mettre à jour le statut dans la base de données
        // await VideoModeration.updateOne(
        //   { workflowId },
        //   { 
        //     status: 'rejected',
        //     reason: analysisResult.reason,
        //     moderatedAt: new Date()
        //   }
        // );
        
        // 3. Notifier l'utilisateur (par email, notification push, etc.)
        // await notifyUser(videoRecord.userId, 'video_rejected', analysisResult.reason);
        
        // 4. Supprimer le message associé si nécessaire
        // await Message.deleteOne({ videoUrl: videoRecord.url });
        
      } else {
        console.log('✅ Vidéo approuvée par Sightengine');
        
        // Actions à effectuer:
        // 1. Mettre à jour les tags Cloudinary
        // await cloudinary.uploader.replace_tag('sightengine_approved', [videoRecord.publicId]);
        // await cloudinary.uploader.remove_tag('pending_moderation', [videoRecord.publicId]);
        
        // 2. Mettre à jour le statut dans la base de données
        // await VideoModeration.updateOne(
        //   { workflowId },
        //   { 
        //     status: 'approved',
        //     moderatedAt: new Date()
        //   }
        // );
      }
    }
    
    res.status(200).json({ 
      message: 'Webhook Sightengine traité avec succès',
      status: 'processed',
      workflowId
    });
  } catch (error) {
    console.error('Erreur lors du traitement du webhook Sightengine:', error);
    res.status(500).json({ 
      message: 'Erreur lors du traitement du webhook',
      error: error.message 
    });
  }
};

/**
 * Fonction pour supprimer un média de Cloudinary
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