export const testAudioURL = async (url) => {
    try {
      const response = await fetch(url, { method: 'HEAD' });
      return response.ok;
    } catch (error) {
      console.error('Erreur de test d\'URL audio:', error);
      return false;
    }
  };