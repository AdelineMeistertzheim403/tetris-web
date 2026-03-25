import { Route } from "react-router-dom";
import Game from "../features/game/pages/Game";
import Sprint from "../features/game/pages/Sprint";
import TetrisHub from "../features/app/pages/TetrisHub";
import Versus from "../features/versus/pages/Versus";
import RoguelikePage from "../features/roguelike/pages/RoguelikePage";
import RoguelikeLexicon from "../features/roguelike/pages/RoguelikeLexicon";
import RoguelikeVersus from "../features/roguelikeVersus/pages/RoguelikeVersus";
import PuzzleSelect from "../features/puzzle/pages/PuzzleSelect";
import PuzzleRun from "../features/puzzle/pages/PuzzleRun";
import BrickfallSolo from "../features/brickfallSolo/pages/BrickfallSolo";
import BrickfallSoloPlay from "../features/brickfallSolo/pages/BrickfallSoloPlay";
import BrickfallEditor from "../features/brickfallSolo/pages/BrickfallEditor";
import BrickfallEditorHelp from "../features/brickfallSolo/pages/BrickfallEditorHelp";
import BrickfallSoloCommunityHub from "../features/brickfallSolo/pages/BrickfallSoloCommunityHub";
import { withRouteElement } from "./routeElement";
import { PATHS } from "./paths";
import type { AppRouteSpec } from "./routeTypes";

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
