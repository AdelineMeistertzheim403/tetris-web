import { lazy, Suspense, useEffect } from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import Navbar from "./features/app/components/Navbar";
import Login from "./features/auth/pages/Login";
import Register from "./features/auth/pages/Register";
import Dashboard from "./features/app/pages/Dashboard";
import TetrisHub from "./features/app/pages/TetrisHub";
import Game from "./features/game/pages/Game";
import Leaderboard from "./features/game/pages/Leaderboard";
import ProtectedRoute from "./features/auth/components/ProtectedRoute";
import Home from "./features/app/pages/Home";
import Sprint from "./features/game/pages/Sprint";
import Versus from "./features/versus/pages/Versus";
import RoguelikePage from "./features/roguelike/pages/RoguelikePage";
import RoguelikeLexicon from "./features/roguelike/pages/RoguelikeLexicon";
import RoguelikeVersus from "./features/roguelikeVersus/pages/RoguelikeVersus";
import BrickfallSolo from "./features/brickfallSolo/pages/BrickfallSolo";
import BrickfallSoloPlay from "./features/brickfallSolo/pages/BrickfallSoloPlay";
import BrickfallEditor from "./features/brickfallSolo/pages/BrickfallEditor";
import BrickfallEditorHelp from "./features/brickfallSolo/pages/BrickfallEditorHelp";
import BrickfallSoloCommunityHub from "./features/brickfallSolo/pages/BrickfallSoloCommunityHub";
import AchievementsPage from "./features/achievements/pages/AchievementsPage";
import Settings from "./features/settings/pages/Settings";
import PuzzleSelect from "./features/puzzle/pages/PuzzleSelect";
import PuzzleRun from "./features/puzzle/pages/PuzzleRun";
import TetromazePage from "./features/tetromaze/pages/TetromazePage";
import TetromazeHub from "./features/tetromaze/pages/TetromazeHub";
import TetromazeEditor from "./features/tetromaze/pages/TetromazeEditor";
import TetromazeEditorHelp from "./features/tetromaze/pages/TetromazeEditorHelp";
import TetromazeCommunityHub from "./features/tetromaze/pages/TetromazeCommunityHub";
import TetrobotsPage from "./features/tetrobots/pages/TetrobotsPage";
import TetrobotsHelpPage from "./features/tetrobots/pages/TetrobotsHelpPage";
import TetrobotsRelationsPage from "./features/tetrobots/pages/TetrobotsRelationsPage";
import { useAuth } from "./features/auth/context/AuthContext";
import { useAchievements } from "./features/achievements/hooks/useAchievements";

const PixelProtocolHub = lazy(() => import("./features/pixelProtocol/pages/PixelProtocolHub"));
const PixelProtocolPage = lazy(() => import("./features/pixelProtocol/pages/PixelProtocolPage"));
const PixelProtocolEditor = lazy(() => import("./features/pixelProtocol/pages/PixelProtocolEditor"));
const PixelProtocolEditorHelp = lazy(() => import("./features/pixelProtocol/pages/PixelProtocolEditorHelp"));
const PixelProtocolCommunityHub = lazy(() => import("./features/pixelProtocol/pages/PixelProtocolCommunityHub"));
const PixelProtocolCommunityLevelPage = lazy(() => import("./features/pixelProtocol/pages/PixelProtocolCommunityLevelPage"));

function App() {
  const { user } = useAuth();
  const { checkAchievements } = useAchievements();
  const location = useLocation();

  useEffect(() => {
    // Marque la création de compte comme “achievement” une seule fois après login.
    if (!user) return;
    checkAchievements({ custom: { created_account: true } });
  }, [checkAchievements, user]);

  return (
    <>
      {/* Navbar globale affichée sur toutes les routes */}
      <Navbar />
      <Suspense fallback={<div className="panel">Chargement...</div>}>
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={<Home />} />
          <Route path="/game" element={<Game />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route path="/sprint" element={<Sprint />} />
          <Route path="/tetris-hub" element={<TetrisHub />} />
          <Route path="/versus" element={<Versus />} />
          <Route path="/brickfall-solo" element={<BrickfallSolo />} />
          <Route path="/brickfall-solo/community" element={<BrickfallSoloCommunityHub />} />
          <Route path="/brickfall-solo/play" element={<BrickfallSoloPlay />} />
          <Route path="/brickfall-editor" element={<BrickfallEditor />} />
          <Route path="/brickfall/help/editor" element={<BrickfallEditorHelp />} />
          <Route path="/roguelike" element={<RoguelikePage />} />
          <Route path="/roguelike-versus" element={<RoguelikeVersus />} />
          <Route path="/roguelike/lexique" element={<RoguelikeLexicon />} />
          <Route path="/puzzle" element={<PuzzleSelect />} />
          <Route path="/puzzle/:id" element={<PuzzleRun />} />
          <Route path="/tetromaze" element={<TetromazeHub />} />
          <Route path="/tetromaze/community" element={<TetromazeCommunityHub />} />
          <Route path="/tetromaze/play" element={<TetromazePage />} />
          <Route path="/tetromaze/editor" element={<TetromazeEditor />} />
          <Route path="/tetromaze/help/editor" element={<TetromazeEditorHelp />} />
          <Route path="/pixel-protocol" element={<PixelProtocolHub />} />
          <Route path="/pixel-protocol/community" element={<PixelProtocolCommunityHub />} />
          <Route path="/pixel-protocol/play" element={<PixelProtocolPage />} />
          <Route
            path="/pixel-protocol/community/:publishedId"
            element={<PixelProtocolCommunityLevelPage />}
          />
          <Route
            path="/pixel-protocol/editor"
            element={
              <ProtectedRoute>
                <PixelProtocolEditor />
              </ProtectedRoute>
            }
          />
          <Route path="/pixel-protocol/help/editor" element={<PixelProtocolEditorHelp />} />
          <Route path="/tetrobots" element={<TetrobotsPage />} />
          <Route path="/tetrobots/help" element={<TetrobotsHelpPage />} />
          <Route path="/tetrobots/relations" element={<TetrobotsRelationsPage />} />
          <Route path="/achievements" element={<AchievementsPage />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </Suspense>
    </>
  );
}

export default App;
