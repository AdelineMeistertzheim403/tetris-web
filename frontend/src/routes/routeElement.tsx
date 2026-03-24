import { Suspense, type ReactElement } from "react";
import ProtectedRoute from "../features/auth/components/ProtectedRoute";
import RouteFallback from "./RouteFallback";
import RouteErrorBoundary from "./RouteErrorBoundary";

export function withRouteElement(element: ReactElement, requiresAuth = false) {
  const content = (
    <RouteErrorBoundary>
      <Suspense fallback={<RouteFallback />}>{element}</Suspense>
    </RouteErrorBoundary>
  );
  return requiresAuth ? <ProtectedRoute>{content}</ProtectedRoute> : content;
}
