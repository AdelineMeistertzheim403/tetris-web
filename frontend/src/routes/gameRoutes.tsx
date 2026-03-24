import { lazy } from "react";
import { Route } from "react-router-dom";
import { withRouteElement } from "./routeElement";
import { PATHS } from "./paths";
import type { AppRouteSpec } from "./routeTypes";

const Game = lazy(() => import("../features/game/pages/Game"));
const Sprint = lazy(() => import("../features/game/pages/Sprint"));
const TetrisHub = lazy(() => import("../features/app/pages/TetrisHub"));
const Versus = lazy(() => import("../features/versus/pages/Versus"));
const RoguelikePage = lazy(() => import("../features/roguelike/pages/RoguelikePage"));
const RoguelikeLexicon = lazy(() => import("../features/roguelike/pages/RoguelikeLexicon"));
const RoguelikeVersus = lazy(() => import("../features/roguelikeVersus/pages/RoguelikeVersus"));
const PuzzleSelect = lazy(() => import("../features/puzzle/pages/PuzzleSelect"));
const PuzzleRun = lazy(() => import("../features/puzzle/pages/PuzzleRun"));
const BrickfallSolo = lazy(() => import("../features/brickfallSolo/pages/BrickfallSolo"));
const BrickfallSoloPlay = lazy(() => import("../features/brickfallSolo/pages/BrickfallSoloPlay"));
const BrickfallEditor = lazy(() => import("../features/brickfallSolo/pages/BrickfallEditor"));
const BrickfallEditorHelp = lazy(
  () => import("../features/brickfallSolo/pages/BrickfallEditorHelp")
);
const BrickfallSoloCommunityHub = lazy(
  () => import("../features/brickfallSolo/pages/BrickfallSoloCommunityHub")
);

export const gameRouteSpecs: AppRouteSpec[] = [
  { key: "game", path: PATHS.game, element: <Game /> },
  { key: "sprint", path: PATHS.sprint, element: <Sprint /> },
  { key: "tetris-hub", path: PATHS.tetrisHub, element: <TetrisHub /> },
  { key: "versus", path: PATHS.versus, element: <Versus /> },
  { key: "roguelike", path: PATHS.roguelike, element: <RoguelikePage /> },
  { key: "roguelike-versus", path: PATHS.roguelikeVersus, element: <RoguelikeVersus /> },
  { key: "roguelike-lexicon", path: PATHS.roguelikeLexicon, element: <RoguelikeLexicon /> },
  { key: "puzzle", path: PATHS.puzzle, element: <PuzzleSelect /> },
  { key: "puzzle-run", path: PATHS.puzzleRun, element: <PuzzleRun /> },
  { key: "brickfall-solo", path: PATHS.brickfallSolo, element: <BrickfallSolo /> },
  {
    key: "brickfall-solo-community",
    path: PATHS.brickfallSoloCommunity,
    element: <BrickfallSoloCommunityHub />,
  },
  { key: "brickfall-solo-play", path: PATHS.brickfallSoloPlay, element: <BrickfallSoloPlay /> },
  {
    key: "brickfall-editor",
    path: PATHS.brickfallEditor,
    element: <BrickfallEditor />,
    requiresAuth: true,
  },
  { key: "brickfall-editor-help", path: PATHS.brickfallEditorHelp, element: <BrickfallEditorHelp /> },
];

export const gameRoutes = gameRouteSpecs.map((route) => (
  <Route
    key={route.key}
    path={route.path}
    element={withRouteElement(route.element, route.requiresAuth)}
  />
));
