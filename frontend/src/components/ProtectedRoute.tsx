// frontend/src/components/ProtectedRoute.tsx
import { Navigate } from "react-router-dom";
import { getToken } from "../services/authService";
import type { JSX } from "react";

interface ProtectedRouteProps {
  children: JSX.Element;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const token = getToken();
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return children;
}
