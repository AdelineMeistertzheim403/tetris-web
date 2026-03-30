import { Route } from "react-router-dom";
import Home from "../features/app/pages/Home";
import Login from "../features/auth/pages/Login";
import Register from "../features/auth/pages/Register";
import NotFound from "../features/app/pages/NotFound";
import Dashboard from "../features/app/pages/Dashboard";
import DashboardEditor from "../features/app/pages/DashboardEditor";
import Leaderboard from "../features/game/pages/Leaderboard";
import AchievementsPage from "../features/achievements/pages/AchievementsPage";
import Settings from "../features/settings/pages/Settings";
import TetrobotsPage from "../features/tetrobots/pages/TetrobotsPage";
import TetrobotsHelpPage from "../features/tetrobots/pages/TetrobotsHelpPage";
import TetrobotsAnomaliesPage from "../features/tetrobots/pages/TetrobotsAnomaliesPage";
import TetrobotsRelationsPage from "../features/tetrobots/pages/TetrobotsRelationsPage";
import { withRouteElement } from "./routeElement";
import { PATHS } from "./paths";
import type { AppRouteSpec } from "./routeTypes";

export const coreRouteSpecs: AppRouteSpec[] = [
  { key: "home", path: PATHS.home, element: <Home /> },
  { key: "leaderboard", path: PATHS.leaderboard, element: <Leaderboard /> },
  { key: "login", path: PATHS.login, element: <Login /> },
  { key: "register", path: PATHS.register, element: <Register /> },
  { key: "dashboard", path: PATHS.dashboard, element: <Dashboard />, requiresAuth: true },
  {
    key: "dashboard-editor",
    path: PATHS.dashboardEditor,
    element: <DashboardEditor />,
    requiresAuth: true,
  },
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
    key: "tetrobots-anomalies",
    path: PATHS.tetrobotsAnomalies,
    element: <TetrobotsAnomaliesPage />,
  },
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
