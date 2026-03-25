import { lazy } from "react";
import { Route } from "react-router-dom";
import Home from "../features/app/pages/Home";
import Login from "../features/auth/pages/Login";
import Register from "../features/auth/pages/Register";
import NotFound from "../features/app/pages/NotFound";
import Dashboard from "../features/app/pages/Dashboard";
import { withRouteElement } from "./routeElement";
import { PATHS } from "./paths";
import type { AppRouteSpec } from "./routeTypes";

const Leaderboard = lazy(() => import("../features/game/pages/Leaderboard"));
const AchievementsPage = lazy(() => import("../features/achievements/pages/AchievementsPage"));
const Settings = lazy(() => import("../features/settings/pages/Settings"));
const TetrobotsPage = lazy(() => import("../features/tetrobots/pages/TetrobotsPage"));
const TetrobotsHelpPage = lazy(() => import("../features/tetrobots/pages/TetrobotsHelpPage"));
const TetrobotsRelationsPage = lazy(
  () => import("../features/tetrobots/pages/TetrobotsRelationsPage")
);

export const coreRouteSpecs: AppRouteSpec[] = [
  { key: "home", path: PATHS.home, element: <Home /> },
  { key: "leaderboard", path: PATHS.leaderboard, element: <Leaderboard /> },
  { key: "login", path: PATHS.login, element: <Login /> },
  { key: "register", path: PATHS.register, element: <Register /> },
  { key: "dashboard", path: PATHS.dashboard, element: <Dashboard />, requiresAuth: true },
  {
    key: "achievements",
    path: PATHS.achievements,
    element: <AchievementsPage />,
    requiresAuth: true,
  },
  { key: "settings", path: PATHS.settings, element: <Settings />, requiresAuth: true },
  { key: "tetrobots", path: PATHS.tetrobots, element: <TetrobotsPage /> },
  { key: "tetrobots-help", path: PATHS.tetrobotsHelp, element: <TetrobotsHelpPage /> },
  {
    key: "tetrobots-relations",
    path: PATHS.tetrobotsRelations,
    element: <TetrobotsRelationsPage />,
    requiresAuth: true,
  },
  { key: "not-found", path: PATHS.notFound, element: <NotFound /> },
];

export const coreRoutes = coreRouteSpecs.map((route) => (
  <Route
    key={route.key}
    path={route.path}
    element={withRouteElement(route.element, route.requiresAuth)}
  />
));
