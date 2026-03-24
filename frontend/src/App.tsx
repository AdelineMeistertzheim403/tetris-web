import { lazy, Suspense, useEffect } from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import Navbar from "./features/app/components/Navbar";
import Login from "./features/auth/pages/Login";
import Register from "./features/auth/pages/Register";
import ProtectedRoute from "./features/auth/components/ProtectedRoute";
import Home from "./features/app/pages/Home";
import { useAuth } from "./features/auth/context/AuthContext";
import { useAchievements } from "./features/achievements/hooks/useAchievements";

const Dashboard = lazy(() => import("./features/app/pages/Dashboard"));
const TetrisHub = lazy(() => import("./features/app/pages/TetrisHub"));
const TetroVerseHub = lazy(() => import("./features/app/pages/TetroVerseHub"));
const Game = lazy(() => import("./features/game/pages/Game"));
const Leaderboard = lazy(() => import("./features/game/pages/Leaderboard"));
const Sprint = lazy(() => import("./features/game/pages/Sprint"));
const Versus = lazy(() => import("./features/versus/pages/Versus"));
const RoguelikePage = lazy(() => import("./features/roguelike/pages/RoguelikePage"));
const RoguelikeLexicon = lazy(() => import("./features/roguelike/pages/RoguelikeLexicon"));
const RoguelikeVersus = lazy(() => import("./features/roguelikeVersus/pages/RoguelikeVersus"));
const BrickfallSolo = lazy(() => import("./features/brickfallSolo/pages/BrickfallSolo"));
const BrickfallSoloPlay = lazy(() => import("./features/brickfallSolo/pages/BrickfallSoloPlay"));
const BrickfallEditor = lazy(() => import("./features/brickfallSolo/pages/BrickfallEditor"));
const BrickfallEditorHelp = lazy(() => import("./features/brickfallSolo/pages/BrickfallEditorHelp"));
const BrickfallSoloCommunityHub = lazy(
  () => import("./features/brickfallSolo/pages/BrickfallSoloCommunityHub")
);
const AchievementsPage = lazy(() => import("./features/achievements/pages/AchievementsPage"));
const Settings = lazy(() => import("./features/settings/pages/Settings"));
const PuzzleSelect = lazy(() => import("./features/puzzle/pages/PuzzleSelect"));
const PuzzleRun = lazy(() => import("./features/puzzle/pages/PuzzleRun"));
const TetromazePage = lazy(() => import("./features/tetromaze/pages/TetromazePage"));
const TetromazeHub = lazy(() => import("./features/tetromaze/pages/TetromazeHub"));
const TetromazeEditor = lazy(() => import("./features/tetromaze/pages/TetromazeEditor"));
const TetromazeEditorHelp = lazy(() => import("./features/tetromaze/pages/TetromazeEditorHelp"));
const TetromazeCommunityHub = lazy(
  () => import("./features/tetromaze/pages/TetromazeCommunityHub")
);
const TetrobotsPage = lazy(() => import("./features/tetrobots/pages/TetrobotsPage"));
const TetrobotsHelpPage = lazy(() => import("./features/tetrobots/pages/TetrobotsHelpPage"));
const TetrobotsRelationsPage = lazy(
  () => import("./features/tetrobots/pages/TetrobotsRelationsPage")
);
const PixelProtocolHub = lazy(() => import("./features/pixelProtocol/pages/PixelProtocolHub"));
const PixelProtocolPage = lazy(() => import("./features/pixelProtocol/pages/PixelProtocolPage"));
const PixelProtocolEditor = lazy(
  () => import("./features/pixelProtocol/pages/PixelProtocolEditor")
);
const PixelProtocolEditorHelp = lazy(
  () => import("./features/pixelProtocol/pages/PixelProtocolEditorHelp")
);
const PixelProtocolCommunityHub = lazy(
  () => import("./features/pixelProtocol/pages/PixelProtocolCommunityHub")
);
const PixelProtocolCommunityLevelPage = lazy(
  () => import("./features/pixelProtocol/pages/PixelProtocolCommunityLevelPage")
);
const PixelInvasionPage = lazy(() => import("./features/pixelInvasion/pages/PixelInvasionPage"));

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
          <Route path="/tetro-verse" element={<TetroVerseHub />} />
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
          <Route path="/pixel-invasion" element={<PixelInvasionPage />} />
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
