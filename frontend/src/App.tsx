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
  const { user } = useAuth();
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
