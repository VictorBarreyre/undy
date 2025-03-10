import { useTranslation } from 'react-i18next';
import { format, formatDistanceToNow } from 'date-fns';
import { fr, enUS } from 'date-fns/locale';

// Utilitaire de formatage de date qui s'adapte à la langue actuelle
export const useDateFormatter = () => {
  const { i18n } = useTranslation();
  
  // Sélectionner la locale date-fns en fonction de la langue i18n
  const getLocale = () => {
    switch (i18n.language) {
      case 'fr':
        return fr;
      case 'en':
      default:
        return enUS;
    }
  };
  
  // Formater une date selon le format complet (ex: "10 mars 2025, 14:30" ou "March 10, 2025, 2:30 PM")
  const formatDate = (date) => {
    const locale = getLocale();
    
    if (i18n.language === 'fr') {
      return format(new Date(date), "d MMMM yyyy, HH:mm", { locale });
    } else {
      return format(new Date(date), "MMMM d, yyyy, h:mm a", { locale });
    }
  };
  
  // Formater uniquement la date (sans l'heure)
  const formatDateOnly = (date) => {
    const locale = getLocale();
    
    if (i18n.language === 'fr') {
      return format(new Date(date), "d MMMM yyyy", { locale });
    } else {
      return format(new Date(date), "MMMM d, yyyy", { locale });
    }
  };
  
  // Formater uniquement l'heure
  const formatTimeOnly = (date) => {
    const locale = getLocale();
    
    if (i18n.language === 'fr') {
      return format(new Date(date), "HH:mm", { locale });
    } else {
      return format(new Date(date), "h:mm a", { locale });
    }
  };
  
  // Formater le temps restant (pour les expirations)
  const formatTimeLeft = (expiryDate) => {
    const expirationDate = new Date(expiryDate);
    const now = new Date();
    const difference = expirationDate - now;
    
    if (difference <= 0) {
      return i18n.language === 'fr' ? 'Expiré' : 'Expired';
    }
    
    const days = Math.floor(difference / (1000 * 60 * 60 * 24));
    const hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
    const minutes = Math.floor((difference / 1000 / 60) % 60);
    
    if (i18n.language === 'fr') {
      return `${days}j ${hours}h ${minutes}m`;
    } else {
      return `${days}d ${hours}h ${minutes}m`;
    }
  };
  
  // Format relatif (il y a 5 minutes, 2 heures, etc.)
  const formatRelative = (date) => {
    const locale = getLocale();
    return formatDistanceToNow(new Date(date), { 
      addSuffix: true, 
      locale 
    });
  };
  
  return {
    formatDate,
    formatDateOnly,
    formatTimeOnly,
    formatTimeLeft,
    formatRelative
  };
};