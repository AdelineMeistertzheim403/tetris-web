// Composant UI Navbar.tsx.
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/context/AuthContext";
import { PATHS } from "../../../routes/paths";
import { usePixelMode } from "../../pixelMode/hooks/usePixelMode";

export default function Navbar() {
  const { user, logoutUser } = useAuth();
  const navigate = useNavigate();
  const { enabled, toggle, unlocked } = usePixelMode();

  const handleLogout = async () => {
    await logoutUser();
    navigate(PATHS.home, { replace: true });
  };

  return (
    <nav
      className="neon-navbar flex justify-between items-center
                 px-24 py-8 min-h-[70px]
                 bg-gradient-to-b from-[#0b001a] to-[#1a0033]
                 border-y-4 border-pink-500
                 font-retro uppercase tracking-wider"
    >
      {/* Navigation conditionnelle: certaines routes sont réservées aux utilisateurs connectés. */}
      {/* 🔹 Logo */}
      <img
        src="/tetris-roguelike-logo.svg"
        alt="Tetris Roguelike logo"
        className="nav-logo"
      />

      {/* 🔹 Liens principaux */}
      <div className="flex gap-16 text-lg items-center">
        {user ? (
          <>
            <Link to={PATHS.dashboard} className="neon-link text-pink-400">
              Dashboard
            </Link>
            <Link to={PATHS.achievements} className="neon-link text-pink-400">
              Succès
            </Link>
            <Link to={PATHS.tetrobots} className="neon-link text-pink-400">
              Tetrobots
            </Link>
            <Link to={PATHS.settings} className="neon-link text-pink-400">
              Paramètres
            </Link>
            <Link to={PATHS.leaderboard} className="neon-link text-pink-400">
              Classement
            </Link>
          </>
        ) : (
          <>
            <Link to={PATHS.home} className="neon-link text-pink-400">
              Accueil
            </Link>
            <Link to={PATHS.leaderboard} className="neon-link text-pink-400">
              Classement
            </Link>
            <Link to={PATHS.tetrobots} className="neon-link text-pink-400">
              Tetrobots
            </Link>
          </>
        )}
      </div>

      {/* 🔹 Section droite */}
      <div className="flex items-center gap-6">
        {user ? (
          <>
            {unlocked ? (
              <button
                type="button"
                className={`pixel-mode-toggle${enabled ? " pixel-mode-toggle--active" : ""}`}
                onClick={toggle}
              >
                {enabled ? "Mode Pixel ON" : "Mode Pixel OFF"}
              </button>
            ) : null}
            <span className="text-3xl text-pink-400 hover:text-yellow-400 transition duration-300 drop-shadow-[0_0_6px_rgba(255,0,150,0.5)] relative neon-link">
              {user.pseudo}
            </span>
            <button
              onClick={handleLogout}
              className="neon-link text-pink-400"
              type="button"
            >
              Déconnexion
            </button>
          </>
        ) : (
          <Link to={PATHS.login} className="neon-link text-pink-400">
            Connexion
          </Link>
        )}
      </div>
    </nav>
  );
}
