
const cache = new Map();

module.exports = {
  // Récupérer une URL du cache
  get: (url) => {
    if (!cache.has(url)) return null;
    const cachedItem = cache.get(url);
    
    // Vérifier si l'entrée a expiré
    if (cachedItem.expires < Date.now()) {
      cache.delete(url);
      return null;
    }
    
    return cachedItem.data;
  },
  
  // Stocker une URL dans le cache
  set: (url, metadata, ttl = 86400000) => { // TTL par défaut: 24h
    cache.set(url, {
      data: metadata,
      expires: Date.now() + ttl
    });
    return metadata;
  },
  
  // Vérifier si une URL est dans le cache et n'a pas expiré
  has: (url) => {
    if (!cache.has(url)) return false;
    
    const cachedItem = cache.get(url);
    if (cachedItem.expires < Date.now()) {
      cache.delete(url);
      return false;
    }
    
    return true;
  },
  
  // Supprimer une URL du cache
  delete: (url) => {
    return cache.delete(url);
  },
  
  // Vider tout le cache
  clear: () => {
    cache.clear();
  }
};