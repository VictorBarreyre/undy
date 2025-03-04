// Approche 1 : Créer un contexte parent qui contient les deux contextes
const AppContext = createContext();

export const AppProvider = ({ children }) => {
  // État partagé ici
  const [unreadCounts, setUnreadCounts] = useState({});
  
  // Fonctions partagées
  const refreshUnreadCounts = async () => {
    // Implémentation
  };
  
  return (
    <AppContext.Provider value={{ 
      unreadCounts, 
      refreshUnreadCounts,
      // Autres valeurs partagées
    }}>
      <AuthProvider>
        <CardDataProvider>
          {children}
        </CardDataProvider>
      </AuthProvider>
    </AppContext.Provider>
  );
};