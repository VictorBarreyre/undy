import React from 'react';
import { useNavigation, useNavigationState } from '@react-navigation/native';
import NotificationHandler from './NotificationHandler';

// Ce composant wrapper est nécessaire car les hooks de navigation
// ne peuvent être utilisés que dans un composant fonctionnel à l'intérieur
// du NavigationContainer
const NotificationHandlerWrapper = () => {
  // Pas besoin de déclarer navigation ici car il sera passé au composant enfant
  return <NotificationHandler />;
};

export default NotificationHandlerWrapper;