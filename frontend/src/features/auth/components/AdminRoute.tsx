import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import type { JSX } from "react";
import { PATHS } from "../../../routes/paths";

interface AdminRouteProps {
  children: JSX.Element;
}

export default function AdminRoute({ children }: AdminRouteProps) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to={PATHS.login} replace />;
  if (user.role !== "ADMIN") return <Navigate to={PATHS.dashboard} replace />;
  return children;
}
