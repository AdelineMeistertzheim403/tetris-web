// src/context/AuthContext.tsx
import { createContext, useContext, useEffect, useState } from "react";
import { getCurrentUser, logout } from "../services/authService";

interface AuthContextType {
  user: any;
  setUser: (user: any) => void;
  logoutUser: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  setUser: () => {},
  logoutUser: async () => {},
  loading: true,
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Load user from the API on startup
  useEffect(() => {
    let active = true;

    const loadUser = async () => {
      try {
        const storedUser = await getCurrentUser();
        if (active) setUser(storedUser);
      } catch {
        if (active) setUser(null);
      } finally {
        if (active) setLoading(false);
      }
    };

    loadUser();
    return () => {
      active = false;
    };
  }, []);

  // ✅ Fonction de déconnexion complète
  const logoutUser = async () => {
    await logout();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, setUser, logoutUser, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
