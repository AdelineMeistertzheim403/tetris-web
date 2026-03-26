import { useEffect, useRef } from "react";
import { Routes, useLocation } from "react-router-dom";
import Navbar from "./features/app/components/Navbar";
import { useAuth } from "./features/auth/context/AuthContext";
import { useAchievements } from "./features/achievements/hooks/useAchievements";
import { coreRoutes } from "./routes/coreRoutes";
import { gameRoutes } from "./routes/gameRoutes";
import { HIDE_NAVBAR_PATHS } from "./routes/paths";
import { tetroVerseRoutes } from "./routes/tetroVerseRoutes";
import { PixelModeProvider } from "./features/pixelMode/context/PixelModeContext";
import PixelModeViewport from "./features/pixelMode/components/PixelModeViewport";
import "./styles/pixel-mode.css";

function App() {
  const { user } = useAuth();
  const { checkAchievements } = useAchievements();
  const location = useLocation();
  const checkAchievementsRef = useRef(checkAchievements);
  const historyPatchedRef = useRef(false);

  useEffect(() => {
    checkAchievementsRef.current = checkAchievements;
  }, [checkAchievements]);

  useEffect(() => {
    if (historyPatchedRef.current) return;
    historyPatchedRef.current = true;

    const originalPushState = window.history.pushState.bind(window.history);
    const originalReplaceState = window.history.replaceState.bind(window.history);

    const shouldForceDocumentNavigation = (url?: string | URL | null) => {
      if (!url) return null;

      const nextUrl = new URL(url.toString(), window.location.href);
      const currentUrl = new URL(window.location.href);

      if (nextUrl.origin !== currentUrl.origin) return null;

      const routeChanged =
        nextUrl.pathname !== currentUrl.pathname || nextUrl.search !== currentUrl.search;

      return routeChanged ? nextUrl : null;
    };

    window.history.pushState = function pushState(
      data: unknown,
      unused: string,
      url?: string | URL | null
    ) {
      const nextUrl = shouldForceDocumentNavigation(url);
      if (nextUrl) {
        window.location.assign(nextUrl.toString());
        return;
      }

      originalPushState(data, unused, url);
    };

    window.history.replaceState = function replaceState(
      data: unknown,
      unused: string,
      url?: string | URL | null
    ) {
      const nextUrl = shouldForceDocumentNavigation(url);
      if (nextUrl) {
        window.location.replace(nextUrl.toString());
        return;
      }

      originalReplaceState(data, unused, url);
    };

    return () => {
      window.history.pushState = originalPushState;
      window.history.replaceState = originalReplaceState;
      historyPatchedRef.current = false;
    };
  }, []);

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
    <PixelModeProvider>
      <>
        {!shouldHideNavbar ? <Navbar /> : null}
        <PixelModeViewport />
        <Routes>
          {coreRoutes}
          {gameRoutes}
          {tetroVerseRoutes}
        </Routes>
      </>
    </PixelModeProvider>
  );
}

export default App;
