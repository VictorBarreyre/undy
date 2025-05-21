import React, { useState, useEffect } from 'react';
import { View } from 'react-native';

// Ce composant va charger le NotificationHandler de manière sécurisée
const NotificationHandlerWrapper = () => {
  const [handlerReady, setHandlerReady] = useState(false);
  
  useEffect(() => {
    // Un petit délai pour être certain que NativeBase est prêt
    const timer = setTimeout(() => {
      setHandlerReady(true);
    }, 100);
    
    return () => clearTimeout(timer);
  }, []);
  
  if (!handlerReady) return null;
  
  try {
    // Utiliser require pour dynamiquement importer le composant
    // Vérifier que le module existe avant de l'utiliser
    let NotificationHandler;
    
    try {
      NotificationHandler = require('./NotificationHandler').default;
    } catch (error) {
      console.error("[NOTIFICATION_WRAPPER] Erreur lors de l'import du NotificationHandler:", error);
      return null;
    }
    
    // Vérifier que NotificationHandler est bien défini
    if (!NotificationHandler) {
      console.error("[NOTIFICATION_WRAPPER] NotificationHandler est undefined après l'import");
      return null;
    }
    
    return (
      <View style={{ display: 'none', width: 0, height: 0 }}>
        <NotificationHandler />
      </View>
    );
  } catch (error) {
    console.error("[NOTIFICATION_WRAPPER] Erreur lors du rendu:", error);
    return null;
  }
};

export default NotificationHandlerWrapper;