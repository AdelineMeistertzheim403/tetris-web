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
import AchievementsPage from "./features/achievements/pages/AchievementsPage";
import Settings from "./features/settings/pages/Settings";
import { useAuth } from "./features/auth/context/AuthContext";
import { useAchievements } from "./features/achievements/hooks/useAchievements";

function App() {
  const { user } = useAuth();
  const { checkAchievements } = useAchievements();
  const location = useLocation();

  useEffect(() => {
    if (!user) return;
    checkAchievements({ custom: { created_account: true } });
  }, [checkAchievements, user]);

  return (
    <>
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
      <Route path="/roguelike" element={<RoguelikePage />} />
      <Route path="/roguelike/lexique" element={<RoguelikeLexicon />} />
      <Route path="/achievements" element={<AchievementsPage />} />
      <Route path="/settings" element={<Settings />} />
      </Routes>
    </>
  );
}

export default App;
