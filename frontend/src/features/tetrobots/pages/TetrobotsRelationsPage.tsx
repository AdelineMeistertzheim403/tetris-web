import { Link, useSearchParams } from "react-router-dom";
import { useAuth } from "../../auth/context/AuthContext";
import TetrobotRelationsPanel from "../components/TetrobotRelationsPanel";
import TetrobotsSectionNav from "../components/TetrobotsSectionNav";
import type { TetrobotId } from "../../achievements/hooks/useAchievements";
import "../../../styles/tetrobots.css";

export default function TetrobotsRelationsPage() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const focusParam = searchParams.get("bot");
  const focusedBot =
    focusParam === "rookie" || focusParam === "pulse" || focusParam === "apex"
      ? (focusParam as TetrobotId)
      : null;

  return (
    <main className="tetrobots-page">
      <header className="tetrobots-hero">
        <p className="tetrobots-kicker">RELATIONS</p>
        <h1>CENTRE DE LIAISON TETROBOT</h1>
        <p>
          Observe la confiance, les souvenirs et les attentes de Rookie, Pulse et Apex.
          Ici, le lien avec les Tetrobots devient une progression a part entiere.
        </p>
      </header>

      <TetrobotsSectionNav isLoggedIn={Boolean(user)} />

      {user ? (
        <TetrobotRelationsPanel focusedBot={focusedBot} />
      ) : (
        <section className="tetrobots-gate">
          <p className="tetrobots-kicker">ACCES RESTREINT</p>
          <h2>Connecte-toi pour ouvrir le centre de liaison</h2>
          <p>
            La page relation affiche la memoire long terme des bots, leur humeur, leur
            affinite et les conditions pour regagner la confiance d&apos;Apex.
          </p>
          <div className="tetrobots-gate__actions">
            <Link to="/login" className="tetrobots-section-nav__link tetrobots-section-nav__link--active">
              Connexion
            </Link>
            <Link to="/tetrobots" className="tetrobots-section-nav__link">
              Voir les profils
            </Link>
          </div>
        </section>
      )}
    </main>
  );
}
