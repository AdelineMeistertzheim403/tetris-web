import { useEffect } from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import Navbar from "./components/Navbar";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Game from "./pages/Game";
import Leaderboard from "./pages/Leaderboard";
import ProtectedRoute from "./components/ProtectedRoute";
import Home from "./pages/Home";
import Sprint from "./pages/Sprint";
import Versus from "./pages/Versus";
import RoguelikePage from "./pages/RoguelikePage";
import RoguelikeLexicon from "./pages/RoguelikeLexicon";
import AchievementsPage from "./pages/AchievementsPage";
import { useAuth } from "./context/AuthContext";
import { useAchievements } from "./hooks/useAchievements";

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
      </Routes>
    </>
  );
}

export default App;
