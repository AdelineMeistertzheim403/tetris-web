import { useLocation } from "react-router-dom";
import Navbar from "./features/app/components/Navbar";
import { useCreatedAccountAchievement } from "./features/app/hooks/useCreatedAccountAchievement";
import { useAuth } from "./features/auth/context/AuthContext";
import { useAchievements } from "./features/achievements/hooks/useAchievements";
import { AppRoutes } from "./routes/AppRoutes";
import { HIDE_NAVBAR_PATHS } from "./routes/paths";

function App() {
  const { user } = useAuth();
  const { checkAchievements } = useAchievements();
  const location = useLocation();

  useCreatedAccountAchievement({
    checkAchievements,
    userId: user?.id,
  });

  const shouldHideNavbar = HIDE_NAVBAR_PATHS.has(location.pathname);

  return (
    <>
      {!shouldHideNavbar ? <Navbar /> : null}
      <AppRoutes />
    </>
  );
}

export default App;
