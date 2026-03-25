import { useEffect, useRef } from "react";
import { Routes, useLocation } from "react-router-dom";
import Navbar from "./features/app/components/Navbar";
import { useAuth } from "./features/auth/context/AuthContext";
import { useAchievements } from "./features/achievements/hooks/useAchievements";
import { coreRoutes } from "./routes/coreRoutes";
import { gameRoutes } from "./routes/gameRoutes";
import { HIDE_NAVBAR_PATHS } from "./routes/paths";
import { tetroVerseRoutes } from "./routes/tetroVerseRoutes";

function App() {
  const { user, loading } = useAuth();
  const { checkAchievements } = useAchievements();
  const location = useLocation();
  const checkAchievementsRef = useRef(checkAchievements);

  useEffect(() => {
    checkAchievementsRef.current = checkAchievements;
  }, [checkAchievements]);

  useEffect(() => {
    // Marque la création de compte comme “achievement” une seule fois après login.
    if (!user?.id) return;

    const storageKey = `achievement-created-account:${user.id}`;
    try {
      if (sessionStorage.getItem(storageKey)) return;
      checkAchievementsRef.current({ custom: { created_account: true } });
      sessionStorage.setItem(storageKey, "1");
    } catch {
      checkAchievementsRef.current({ custom: { created_account: true } });
    }
  }, [user?.id]);

  const shouldHideNavbar = HIDE_NAVBAR_PATHS.has(location.pathname);

  return (
    <>
      <div
        style={{
          position: "fixed",
          right: "12px",
          bottom: "12px",
          zIndex: 9999,
          padding: "10px 12px",
          background: "rgba(0, 0, 0, 0.88)",
          color: "#7df9ff",
          border: "1px solid #ff4db8",
          fontFamily: "'Press Start 2P', monospace",
          fontSize: "10px",
          lineHeight: 1.6,
          maxWidth: "min(420px, calc(100vw - 24px))",
          wordBreak: "break-word",
          boxShadow: "0 0 18px rgba(255, 77, 184, 0.35)",
        }}
      >
        <div>react-path: {location.pathname}</div>
        <div>browser-path: {window.location.pathname}</div>
        <div>auth-loading: {loading ? "true" : "false"}</div>
        <div>auth-user: {user ? "connected" : "null"}</div>
      </div>
      {/* Navbar globale affichée sur toutes les routes */}
      {!shouldHideNavbar ? <Navbar /> : null}
      <Routes>
        {coreRoutes}
        {gameRoutes}
        {tetroVerseRoutes}
      </Routes>
    </>
  );
}

export default App;
