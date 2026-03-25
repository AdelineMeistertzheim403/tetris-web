import type { ReactElement } from "react";

export type AppRouteSpec = {
  key: string;
  path: string;
  element: ReactElement;
  requiresAuth?: boolean;
};
