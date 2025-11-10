import { Link } from "react-router-dom";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center h-[calc(100vh-80px)] text-center">
      <h1 className="text-4xl md:text-5xl mb-6 text-pink-400 drop-shadow-[0_0_15px_#ff00ff]">
         TETRIS
      </h1>

      <p className="text-sm text-cyan-300 max-w-lg mb-10 leading-relaxed">
        Empilez les blocs, battez vos records, et entrez dans la légende du Tetris rétro !
      </p>

      <div className="flex flex-col md:flex-row gap-6">
        <Link to="/login" className="retro-btn">
          Connexion
        </Link>
        <Link to="/register" className="retro-btn">
          Inscription
        </Link>
        <Link to="/game" className="retro-btn">
          Jouer
        </Link>
      </div>
    </div>
  );
}
