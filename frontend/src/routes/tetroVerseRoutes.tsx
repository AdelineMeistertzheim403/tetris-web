import { Route } from "react-router-dom";
import TetroVerseHub from "../features/app/pages/TetroVerseHub";
import TetromazePage from "../features/tetromaze/pages/TetromazePage";
import TetromazeHub from "../features/tetromaze/pages/TetromazeHub";
import TetromazeEditor from "../features/tetromaze/pages/TetromazeEditor";
import TetromazeEditorHelp from "../features/tetromaze/pages/TetromazeEditorHelp";
import TetromazeCommunityHub from "../features/tetromaze/pages/TetromazeCommunityHub";
import PixelProtocolHub from "../features/pixelProtocol/pages/PixelProtocolHub";
import PixelProtocolPage from "../features/pixelProtocol/pages/PixelProtocolPage";
import PixelProtocolEditor from "../features/pixelProtocol/pages/PixelProtocolEditor";
import PixelProtocolEditorHelp from "../features/pixelProtocol/pages/PixelProtocolEditorHelp";
import PixelProtocolCommunityHub from "../features/pixelProtocol/pages/PixelProtocolCommunityHub";
import PixelProtocolCommunityLevelPage from "../features/pixelProtocol/pages/PixelProtocolCommunityLevelPage";
import PixelInvasionPage from "../features/pixelInvasion/pages/PixelInvasionPage";
import { withRouteElement } from "./routeElement";
import { PATHS } from "./paths";
import type { AppRouteSpec } from "./routeTypes";

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
