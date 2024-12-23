// context/CardDataContext.js
import React, { createContext, useState, useContext } from 'react';

// Créer le contexte pour les données des cartes
const CardDataContext = createContext();

// Hook personnalisé pour accéder aux données
export const useCardData = () => {
  return useContext(CardDataContext);
};

// Fournisseur du contexte
export const CardDataProvider = ({ children }) => {
  const [data, setData] = useState([
    {
      id: 1,
      posterpar:'Alice Martin',
      price:'3.90',
      image: require('../../assets/images/card-image.png'), // Image spécifique à la carte
      title: "Les vacances d'été",
      description: "Le Lorem Ipsum est simplement du faux texte utilisé dans la composition et la mise en page avant impression. Le Lorem Ipsum est le faux texte standard.",
      likes: 150,
      comments: 35,
      shares: 12,
      label: "Vacances "
    },
    {
      id: 2,
      posterpar:'Joh Cohen',
      price:'322.90',
      image: require('../../assets/images/card-image.png'), // Image spécifique à la carte
      title: "Le projet immobilier",
      description: "Voici un aperçu d'un projet immobilier qui attire l'attention des investisseurs du monde entier.",
      likes: 250,
      comments: 50,
      shares: 20,
      label: "Immobilier "
    },
    {
      id: 3,
      posterpar:'David Lisnard',
      price:'13.90',
      image: require('../../assets/images/card-image.png'), // Image spécifique à la carte
      title: "Événements de la ville",
      description: "Les événements de la ville sont nombreux ce mois-ci, avec des activités pour tous les goûts.",
      likes: 300,
      comments: 75,
      shares: 25,
      label: "Événements "
    },
    {
      id: 4,
      posterpar:'Jean Marie Bigard',
      price:'8.90',
      image: require('../../assets/images/card-image.png'), // Image spécifique à la carte
      title: "Technologie et innovation",
      description: "Les avancées technologiques changent le monde, découvrez les dernières innovations qui façonnent notre futur.",
      likes: 100,
      comments: 40,
      shares: 18,
      label: "Tech "
    },
    {
      id: 5,
      posterpar:'Thierry Ardisson',
      price:'7.90',
      image: require('../../assets/images/card-image.png'), // Image spécifique à la carte
      title: "Technologie et innovation",
      description: "Les avancées technologiques changent le monde, découvrez les dernières innovations qui façonnent notre futur.",
      likes: 100,
      comments: 40,
      shares: 18,
      label: "Tech "
    },
    {
      id: 6,
      posterpar:'Laurent Baffie',
      price:'34.90',
      image: require('../../assets/images/card-image.png'), // Image spécifique à la carte
      title: "Technologie et innovation",
      description: "Les avancées technologiques changent le monde, découvrez les dernières innovations qui façonnent notre futur.",
      likes: 100,
      comments: 40,
      shares: 18,
      label: "Tech "
    }
  ]);

  return (
    <CardDataContext.Provider value={{ data, setData }}>
      {children}
    </CardDataContext.Provider>
  );
};
