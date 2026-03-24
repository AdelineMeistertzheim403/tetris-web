import { lazy } from "react";
import { Route } from "react-router-dom";
import { withRouteElement } from "./routeElement";
import { PATHS } from "./paths";
import type { AppRouteSpec } from "./routeTypes";

const TetroVerseHub = lazy(() => import("../features/app/pages/TetroVerseHub"));
const TetromazePage = lazy(() => import("../features/tetromaze/pages/TetromazePage"));
const TetromazeHub = lazy(() => import("../features/tetromaze/pages/TetromazeHub"));
const TetromazeEditor = lazy(() => import("../features/tetromaze/pages/TetromazeEditor"));
const TetromazeEditorHelp = lazy(
  () => import("../features/tetromaze/pages/TetromazeEditorHelp")
);
const TetromazeCommunityHub = lazy(
  () => import("../features/tetromaze/pages/TetromazeCommunityHub")
);
const PixelProtocolHub = lazy(() => import("../features/pixelProtocol/pages/PixelProtocolHub"));
const PixelProtocolPage = lazy(() => import("../features/pixelProtocol/pages/PixelProtocolPage"));
const PixelProtocolEditor = lazy(
  () => import("../features/pixelProtocol/pages/PixelProtocolEditor")
);
const PixelProtocolEditorHelp = lazy(
  () => import("../features/pixelProtocol/pages/PixelProtocolEditorHelp")
);
const PixelProtocolCommunityHub = lazy(
  () => import("../features/pixelProtocol/pages/PixelProtocolCommunityHub")
);
const PixelProtocolCommunityLevelPage = lazy(
  () => import("../features/pixelProtocol/pages/PixelProtocolCommunityLevelPage")
);
const PixelInvasionPage = lazy(() => import("../features/pixelInvasion/pages/PixelInvasionPage"));

export const tetroVerseRouteSpecs: AppRouteSpec[] = [
  { key: "tetro-verse", path: PATHS.tetroVerse, element: <TetroVerseHub /> },
  { key: "tetromaze-hub", path: PATHS.tetromazeHub, element: <TetromazeHub /> },
  {
    key: "tetromaze-community",
    path: PATHS.tetromazeCommunity,
    element: <TetromazeCommunityHub />,
  },
  { key: "tetromaze-play", path: PATHS.tetromazePlay, element: <TetromazePage /> },
  {
    key: "tetromaze-editor",
    path: PATHS.tetromazeEditor,
    element: <TetromazeEditor />,
    requiresAuth: true,
  },
  {
    key: "tetromaze-editor-help",
    path: PATHS.tetromazeEditorHelp,
    element: <TetromazeEditorHelp />,
  },
  { key: "pixel-protocol-hub", path: PATHS.pixelProtocolHub, element: <PixelProtocolHub /> },
  {
    key: "pixel-protocol-community",
    path: PATHS.pixelProtocolCommunity,
    element: <PixelProtocolCommunityHub />,
  },
  {
    key: "pixel-protocol-community-level",
    path: PATHS.pixelProtocolCommunityLevel,
    element: <PixelProtocolCommunityLevelPage />,
  },
  { key: "pixel-protocol-play", path: PATHS.pixelProtocolPlay, element: <PixelProtocolPage /> },
  {
    key: "pixel-protocol-editor",
    path: PATHS.pixelProtocolEditor,
    element: <PixelProtocolEditor />,
    requiresAuth: true,
  },
  {
    key: "pixel-protocol-editor-help",
    path: PATHS.pixelProtocolEditorHelp,
    element: <PixelProtocolEditorHelp />,
  },
  { key: "pixel-invasion", path: PATHS.pixelInvasion, element: <PixelInvasionPage /> },
];

export const tetroVerseRoutes = tetroVerseRouteSpecs.map((route) => (
  <Route
    key={route.key}
    path={route.path}
    element={withRouteElement(route.element, route.requiresAuth)}
  />
));
