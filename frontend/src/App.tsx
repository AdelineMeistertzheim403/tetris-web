import { useEffect } from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import Navbar from "./features/app/components/Navbar";
import Login from "./features/auth/pages/Login";
import Register from "./features/auth/pages/Register";
import Dashboard from "./features/app/pages/Dashboard";
import Game from "./features/game/pages/Game";
import Leaderboard from "./features/game/pages/Leaderboard";
import ProtectedRoute from "./features/auth/components/ProtectedRoute";
import Home from "./features/app/pages/Home";
import Sprint from "./features/game/pages/Sprint";
import Versus from "./features/versus/pages/Versus";
import RoguelikePage from "./features/roguelike/pages/RoguelikePage";
import RoguelikeLexicon from "./features/roguelike/pages/RoguelikeLexicon";
import RoguelikeVersus from "./features/roguelikeVersus/pages/RoguelikeVersus";
import BrickfallVersus from "./features/brickfallVersus/pages/BrickfallVersus";
import BrickfallSolo from "./features/brickfallSolo/pages/BrickfallSolo";
import BrickfallSoloPlay from "./features/brickfallSolo/pages/BrickfallSoloPlay";
import BrickfallEditor from "./features/brickfallSolo/pages/BrickfallEditor";
import AchievementsPage from "./features/achievements/pages/AchievementsPage";
import Settings from "./features/settings/pages/Settings";
import PuzzleSelect from "./features/puzzle/pages/PuzzleSelect";
import PuzzleRun from "./features/puzzle/pages/PuzzleRun";
import TetromazePage from "./features/tetromaze/pages/TetromazePage";
import TetrobotsPage from "./features/tetrobots/pages/TetrobotsPage";
import { useAuth } from "./features/auth/context/AuthContext";
import { useAchievements } from "./features/achievements/hooks/useAchievements";

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
      <Route path="/versus" element={<Versus />} />
      <Route path="/brickfall-solo" element={<BrickfallSolo />} />
      <Route path="/brickfall-solo/play" element={<BrickfallSoloPlay />} />
      <Route path="/brickfall-editor" element={<BrickfallEditor />} />
      <Route path="/brickfall-versus" element={<BrickfallVersus />} />
      <Route path="/roguelike" element={<RoguelikePage />} />
      <Route path="/roguelike-versus" element={<RoguelikeVersus />} />
      <Route path="/roguelike/lexique" element={<RoguelikeLexicon />} />
      <Route path="/puzzle" element={<PuzzleSelect />} />
      <Route path="/puzzle/:id" element={<PuzzleRun />} />
      <Route path="/tetromaze" element={<TetromazePage />} />
      <Route path="/tetrobots" element={<TetrobotsPage />} />
      <Route path="/achievements" element={<AchievementsPage />} />
      <Route path="/settings" element={<Settings />} />
      </Routes>
    </>
  );
}

export default App;
