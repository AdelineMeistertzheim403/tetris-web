import { Routes, Route } from "react-router-dom";
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

function App() {
  return (
    <>
      <Navbar />
      <Routes>
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
      </Routes>
    </>
  );
}

export default App;
