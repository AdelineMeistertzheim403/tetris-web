import { Suspense, type ReactElement } from "react";
import ProtectedRoute from "../features/auth/components/ProtectedRoute";
import RouteFallback from "./RouteFallback";

export function withRouteElement(element: ReactElement, requiresAuth = false) {
  const content = <Suspense fallback={<RouteFallback />}>{element}</Suspense>;
  return requiresAuth ? <ProtectedRoute>{content}</ProtectedRoute> : content;
}
