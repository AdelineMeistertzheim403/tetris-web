import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import type { JSX } from "react";

interface ProtectedRouteProps {
  children: JSX.Element;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  if (loading) {
    // Tant que l'auth est en cours de chargement, on ne rend rien.
    return null;
  }
  if (!user) {
    // Redirection vers login si non authentifié.
    return <Navigate to="/login" replace />;
  }
  // L'utilisateur est authentifié: on affiche la page demandée.
  return children;
}
