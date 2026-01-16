import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Navbar() {
  const { user } = useAuth();

  return (
    <nav
      className="neon-navbar flex justify-between items-center
                 px-24 py-8 min-h-[70px]
                 bg-gradient-to-b from-[#0b001a] to-[#1a0033]
                 border-y-4 border-pink-500
                 font-retro uppercase tracking-wider"
    >
      {/* 🔹 Logo */}
      <img
        src="/tetris-roguelike-logo.svg"
        alt="Tetris Roguelike logo"
        className="nav-logo"
      />

      {/* 🔹 Liens principaux */}
      <div className="flex gap-16 text-lg items-center">
        {user ? (
          <Link to="/dashboard" className="neon-link text-pink-400">
            Dashboard
          </Link>
        ) : (
          <Link to="/" className="neon-link text-pink-400">
            Accueil
          </Link>
        )}
        {user ? (
          <Link to="/game" className="neon-link text-pink-400">
            Jouer
          </Link>
        ) : (
          <div></div>
        )}
        {user ? (
          <Link to="/sprint" className="neon-link text-pink-400">
            Sprint
          </Link>

        ) : (
          <div></div>
        )}
        {user ? (
          <Link to="/versus" className="neon-link text-pink-400">
            Versus
          </Link>

        ) : (
          <div></div>
        )}

        {user ? (
          <Link to="/roguelike" className="nav-link roguelike">
            ROGUELIKE
          </Link>

        ) : (
          <div></div>
        )}

        <Link to="/leaderboard" className="neon-link text-pink-400">
          Classement
        </Link>
      </div>

      {/* 🔹 Section droite */}
      <div className="flex items-center gap-6">
        {user ? (
          <span className="text-3xl text-pink-400 hover:text-yellow-400 transition duration-300
                   drop-shadow-[0_0_6px_rgba(255,0,150,0.5)] relative neon-link">{user.pseudo}</span>
        ) : (
          <Link to="/login" className="neon-link text-pink-400">
            Connexion
          </Link>
        )}
      </div>
    </nav>
  );
}
