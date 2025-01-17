// utils.js
export const correctProfilePictureUrl = (url) => {
    if (!url) return null;

    // Supprime les répétitions de l'URL
    const correctedUrl = url.split('https://undy-5948c5547ec9.herokuapp.com').join('').trim();

    // Vérifiez si l'URL commence par 'http'
    if (correctedUrl.startsWith('http')) {
        return correctedUrl;
    }

    // Retourne l'URL par défaut si l'URL n'est pas valide
    return 'https://undy-5948c5547ec9.herokuapp.com/uploads/default.png'; // Remplacez par l'URL correcte de votre photo par défaut
};
