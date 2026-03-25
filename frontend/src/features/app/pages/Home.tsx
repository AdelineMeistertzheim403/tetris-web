import { Link } from "react-router-dom";
import { PATHS } from "../../../routes/paths";

export default function Home() {
  // Page d'accueil publique (avant authentification).
  return (
    <div className="flex flex-col items-center justify-center h-[calc(100vh-80px)] text-center">
      <h1 className="text-4xl md:text-5xl mb-6 text-pink-400 drop-shadow-[0_0_15px_#ff00ff]">
         TETRO WORLD
      </h1>

      <p className="text-sm text-cyan-300 max-w-lg mb-10 leading-relaxed">
        Entrez dans l'arene Tetroworld: progression, defis, records et affrontements vous attendent.
      </p>

      <div className="flex flex-col md:flex-row gap-6">
        <Link to={PATHS.login} className="retro-btn" reloadDocument>
          Connexion
        </Link>
        <Link to={PATHS.register} className="retro-btn" reloadDocument>
          Inscription
        </Link>
      </div>
    </div>
  );
}
