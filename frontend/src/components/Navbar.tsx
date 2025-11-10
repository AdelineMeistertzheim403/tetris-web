import { Link, useLocation } from "react-router-dom";

export default function Navbar() {
  const location = useLocation();
  const hideNavbar = location.pathname === "/game";

  if (hideNavbar) return null;

  return (
    <nav
      className="neon-navbar flex justify-between items-center
                 px-24 py-12 min-h-[70px]
                 bg-gradient-to-b from-[#0b001a] to-[#1a0033]
                 border-y-4 border-pink-500
                 text-pink-400 font-retro uppercase tracking-wider"
    >
      {/* 🔹 Logo / Titre */}
      <Link
        to="/"
        className="text-3xl text-pink-400 hover:text-yellow-400 transition duration-300
                   drop-shadow-[0_0_6px_rgba(255,0,150,0.5)]"
      >
        Tetris
      </Link>

      {/* 🔹 Liens de navigation */}
      <div className="flex gap-20 ml-10 text-lg">
        {[
          { to: "/", label: "Accueil" },
          { to: "/game", label: "Jouer" },
          { to: "/leaderboard", label: "Classement" },
          { to: "/login", label: "Connexion" },
        ].map((link) => (
          <Link
            key={link.to}
            to={link.to}
            className="relative group transition duration-300"
          >
            <span className="text-pink-400 group-hover:text-yellow-400 drop-shadow-[0_0_4px_rgba(255,0,150,0.4)]">
              {link.label}
            </span>
            <span
              className="absolute left-0 bottom-[-6px] w-0 h-[2px] bg-yellow-400
                         transition-all duration-300 group-hover:w-full"
            ></span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
