// Composant UI Navbar.tsx.
import { Link } from "react-router-dom";
import { useAuth } from "../../auth/context/AuthContext";
import { PATHS } from "../../../routes/paths";

export default function Navbar() {
  const { user, logoutUser } = useAuth();

  const handleLogout = async () => {
    await logoutUser();
    window.location.assign(PATHS.home);
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
            <Link to={PATHS.dashboard} className="neon-link text-pink-400" reloadDocument>
              Dashboard
            </Link>
            <Link to={PATHS.achievements} className="neon-link text-pink-400" reloadDocument>
              Succès
            </Link>
            <Link to={PATHS.tetrobots} className="neon-link text-pink-400" reloadDocument>
              Tetrobots
            </Link>
            <Link to={PATHS.settings} className="neon-link text-pink-400" reloadDocument>
              Paramètres
            </Link>
            <Link to={PATHS.leaderboard} className="neon-link text-pink-400" reloadDocument>
              Classement
            </Link>
          </>
        ) : (
          <>
            <Link to={PATHS.home} className="neon-link text-pink-400" reloadDocument>
              Accueil
            </Link>
            <Link to={PATHS.leaderboard} className="neon-link text-pink-400" reloadDocument>
              Classement
            </Link>
            <Link to={PATHS.tetrobots} className="neon-link text-pink-400" reloadDocument>
              Tetrobots
            </Link>
          </>
        )}
      </div>

      {/* 🔹 Section droite */}
      <div className="flex items-center gap-6">
        {user ? (
          <>
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
          <Link to={PATHS.login} className="neon-link text-pink-400" reloadDocument>
            Connexion
          </Link>
        )}
      </div>
    </nav>
  );
}
