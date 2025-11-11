// src/context/AuthContext.tsx
import { createContext, useContext, useEffect, useState } from "react";
import { getCurrentUser, logout } from "../services/authService";

interface AuthContextType {
  user: any;
  setUser: (user: any) => void;
  logoutUser: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  setUser: () => {},
  logoutUser: () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<any>(null);

  // ✅ Charger depuis localStorage au démarrage
  useEffect(() => {
    const storedUser = getCurrentUser();
    if (storedUser) setUser(storedUser);
  }, []);

  // ✅ Fonction de déconnexion complète
  const logoutUser = () => {
    logout();       // vide le localStorage
    setUser(null);  // vide aussi le state React
  };

  return (
    <AuthContext.Provider value={{ user, setUser, logoutUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
