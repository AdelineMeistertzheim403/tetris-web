import { Link } from "react-router-dom";
import { PATHS } from "../../../routes/paths";

export default function NotFound() {
  return (
    <div className="flex min-h-[calc(100vh-120px)] flex-col items-center justify-center px-6 text-center">
      <p className="mb-4 text-sm text-cyan-300">Erreur de navigation</p>
      <h1 className="mb-6 text-4xl text-pink-400 drop-shadow-[0_0_15px_#ff00ff]">404</h1>
      <p className="mb-10 max-w-xl text-sm leading-relaxed text-cyan-300">
        La page demandee n'existe pas ou n'est plus accessible.
      </p>
      <div className="flex flex-col gap-4 md:flex-row">
        <Link to={PATHS.home} className="retro-btn" reloadDocument>
          Retour accueil
        </Link>
        <Link to={PATHS.dashboard} className="retro-btn" reloadDocument>
          Aller dashboard
        </Link>
      </div>
    </div>
  );
}
