// services/videoModerationPolling.js - Alternative aux webhooks

const { checkVideoAnalysisStatus, analyzeVideoResult } = require('../controllers/moderationController');
const cloudinary = require('../config/cloudinary');
const VideoModeration = require('../models/VideoModeration'); // À créer

/**
 * Service de polling pour vérifier le statut des vidéos en modération
 * À exécuter toutes les X minutes via un cron job
 */
class VideoModerationPollingService {
  constructor() {
    this.isRunning = false;
    this.pollingInterval = null;
  }

  /**
   * Démarrer le polling
   * @param {number} intervalMinutes - Intervalle en minutes (par défaut 5)
   */
  start(intervalMinutes = 5) {
    if (this.isRunning) {
      console.log('⚠️ Le service de polling est déjà en cours d\'exécution');
      return;
    }

    console.log(`🚀 Démarrage du service de polling (intervalle: ${intervalMinutes} minutes)`);
    this.isRunning = true;

    // Exécuter immédiatement
    this.checkPendingVideos();

    // Puis toutes les X minutes
    this.pollingInterval = setInterval(() => {
      this.checkPendingVideos();
    }, intervalMinutes * 60 * 1000);
  }

  /**
   * Arrêter le polling
   */
  stop() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
      this.isRunning = false;
      console.log('🛑 Service de polling arrêté');
    }
  }

  /**
   * Vérifier toutes les vidéos en attente de modération
   */
  async checkPendingVideos() {
    try {
      console.log('🔍 Vérification des vidéos en attente de modération...');

      // Récupérer toutes les vidéos avec statut "pending"
      const pendingVideos = await VideoModeration.find({ 
        status: 'pending',
        workflowId: { $exists: true }
      });

      console.log(`📊 ${pendingVideos.length} vidéos en attente`);

      // Vérifier chaque vidéo
      for (const video of pendingVideos) {
        await this.checkVideoStatus(video);
        
        // Attendre un peu entre chaque vérification pour ne pas surcharger l'API
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

    } catch (error) {
      console.error('❌ Erreur lors de la vérification des vidéos:', error);
    }
  }

  /**
   * Vérifier le statut d'une vidéo spécifique
   * @param {Object} videoRecord - Enregistrement de la vidéo dans la DB
   */
  async checkVideoStatus(videoRecord) {
    try {
      console.log(`🎥 Vérification de la vidéo ${videoRecord.publicId} (workflow: ${videoRecord.workflowId})`);

      // Appeler l'API Sightengine pour vérifier le statut
      const statusData = await checkVideoAnalysisStatus(videoRecord.workflowId);

      // Si l'analyse n'est pas terminée, on continue
      if (statusData.status !== 'finished') {
        console.log(`⏳ Analyse en cours (${statusData.progress || 0}%)`);
        return;
      }

      // Analyser les résultats
      const analysisResult = analyzeVideoResult(statusData);
      
      console.log(`📊 Analyse terminée:`, {
        workflowId: videoRecord.workflowId,
        isFlagged: analysisResult.isFlagged,
        reason: analysisResult.reason
      });

      if (analysisResult.isFlagged) {
        // Vidéo inappropriée
        await this.handleRejectedVideo(videoRecord, analysisResult);
      } else {
        // Vidéo approuvée
        await this.handleApprovedVideo(videoRecord);
      }

      // Mettre à jour le statut dans la base de données
      await VideoModeration.updateOne(
        { _id: videoRecord._id },
        {
          status: analysisResult.isFlagged ? 'rejected' : 'approved',
          reason: analysisResult.reason,
          moderatedAt: new Date(),
          moderationDetails: analysisResult.details
        }
      );

    } catch (error) {
      console.error(`❌ Erreur lors de la vérification de la vidéo ${videoRecord.publicId}:`, error);
      
      // Si c'est une erreur 404, le workflow n'existe peut-être plus
      if (error.response?.status === 404) {
        await VideoModeration.updateOne(
          { _id: videoRecord._id },
          { 
            status: 'error',
            error: 'Workflow introuvable',
            moderatedAt: new Date()
          }
        );
      }
    }
  }

  /**
   * Gérer une vidéo rejetée
   * @param {Object} videoRecord - Enregistrement de la vidéo
   * @param {Object} analysisResult - Résultat de l'analyse
   */
  async handleRejectedVideo(videoRecord, analysisResult) {
    console.log(`❌ Vidéo rejetée: ${videoRecord.publicId} - Raison: ${analysisResult.reason}`);

    try {
      // 1. Supprimer la vidéo de Cloudinary
      await cloudinary.uploader.destroy(videoRecord.publicId, { 
        resource_type: 'video' 
      });
      console.log('✅ Vidéo supprimée de Cloudinary');

      // 2. Supprimer le message associé (si applicable)
      if (videoRecord.messageId) {
        const Message = require('../models/Message'); // À adapter selon votre modèle
        await Message.deleteOne({ _id: videoRecord.messageId });
        console.log('✅ Message associé supprimé');
      }

      // 3. Notifier l'utilisateur (exemple)
      if (videoRecord.userId) {
        // await notifyUser(videoRecord.userId, 'video_rejected', {
        //   reason: analysisResult.reason,
        //   videoTitle: videoRecord.title
        // });
        console.log('📧 Notification envoyée à l\'utilisateur');
      }

    } catch (error) {
      console.error('Erreur lors du traitement de la vidéo rejetée:', error);
    }
  }

  /**
   * Gérer une vidéo approuvée
   * @param {Object} videoRecord - Enregistrement de la vidéo
   */
  async handleApprovedVideo(videoRecord) {
    console.log(`✅ Vidéo approuvée: ${videoRecord.publicId}`);

    try {
      // Mettre à jour les tags Cloudinary
      await cloudinary.uploader.replace_tag('sightengine_approved', [videoRecord.publicId]);
      await cloudinary.uploader.remove_tag('pending_moderation', [videoRecord.publicId]);
      console.log('✅ Tags Cloudinary mis à jour');

      // Notifier l'utilisateur si nécessaire
      if (videoRecord.userId) {
        // await notifyUser(videoRecord.userId, 'video_approved', {
        //   videoTitle: videoRecord.title
        // });
      }

    } catch (error) {
      console.error('Erreur lors du traitement de la vidéo approuvée:', error);
    }
  }

  /**
   * Obtenir les statistiques du service
   */
  async getStats() {
    const stats = await VideoModeration.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    return {
      isRunning: this.isRunning,
      stats: stats.reduce((acc, curr) => {
        acc[curr._id] = curr.count;
        return acc;
      }, {}),
      total: stats.reduce((sum, curr) => sum + curr.count, 0)
    };
  }
}

// Créer une instance unique
const videoModerationPolling = new VideoModerationPollingService();

module.exports = videoModerationPolling;