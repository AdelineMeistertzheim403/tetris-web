import { useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth } from "../../auth/context/AuthContext";
import type { TetrobotId } from "../../achievements/types/tetrobots";
import { useAchievements } from "../../achievements/hooks/useAchievements";
import TetrobotRelationsPanel from "../components/TetrobotRelationsPanel";
import TetrobotsSectionNav from "../components/TetrobotsSectionNav";
import { PATHS } from "../../../routes/paths";
import "../../../styles/tetrobots.css";

const BOTS: TetrobotId[] = ["rookie", "pulse", "apex"];

const BOT_LABELS: Record<TetrobotId, string> = {
  rookie: "Rookie",
  pulse: "Pulse",
  apex: "Apex",
};

const LAST_TETROBOT_RELATION_KEY = "tetris-last-tetrobot-relation";

export default function TetrobotsRelationsPage() {
  const { user } = useAuth();
  const { stats } = useAchievements();
  const [searchParams, setSearchParams] = useSearchParams();
  const focusParam = searchParams.get("bot");
  const goalParam = searchParams.get("goal");
  const savedBot =
    typeof window !== "undefined"
      ? window.localStorage.getItem(LAST_TETROBOT_RELATION_KEY)
      : null;
  const activeBot =
    focusParam === "rookie" || focusParam === "pulse" || focusParam === "apex"
      ? (focusParam as TetrobotId)
      : savedBot === "rookie" || savedBot === "pulse" || savedBot === "apex"
        ? (savedBot as TetrobotId)
        : "rookie";
  const activeIndex = BOTS.indexOf(activeBot);
  const previousBot = BOTS[(activeIndex - 1 + BOTS.length) % BOTS.length];
  const nextBot = BOTS[(activeIndex + 1) % BOTS.length];

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(LAST_TETROBOT_RELATION_KEY, activeBot);
  }, [activeBot]);

  const setActiveBot = (bot: TetrobotId) => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set("bot", bot);
    nextParams.delete("goal");
    setSearchParams(nextParams);
  };

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

      <TetrobotsSectionNav
        isLoggedIn={Boolean(user)}
        activeBot={user ? activeBot : null}
        onBotChange={user ? setActiveBot : undefined}
        botSummaries={
          user
            ? {
                rookie: {
                  level: stats.tetrobotProgression.rookie.level,
                  mood: stats.tetrobotProgression.rookie.mood,
                  affinity: stats.tetrobotProgression.rookie.affinity,
                },
                pulse: {
                  level: stats.tetrobotProgression.pulse.level,
                  mood: stats.tetrobotProgression.pulse.mood,
                  affinity: stats.tetrobotProgression.pulse.affinity,
                },
                apex: {
                  level: stats.tetrobotProgression.apex.level,
                  mood: stats.tetrobotProgression.apex.mood,
                  affinity: stats.tetrobotProgression.apex.affinity,
                },
              }
            : undefined
        }
      />

      {user ? (
        <>
          <TetrobotRelationsPanel
            key={activeBot}
            activeBot={activeBot}
            highlightedGoalId={goalParam}
          />

          <section className="tetrobots-relations-pagination" aria-label="Navigation entre Tetrobots">
            <div className="tetrobots-pagination">
              <button type="button" onClick={() => setActiveBot(previousBot)}>
                Precedent
              </button>
              <span>
                {BOT_LABELS[activeBot]} · {activeIndex + 1}/{BOTS.length}
              </span>
              <button type="button" onClick={() => setActiveBot(nextBot)}>
                Suivant
              </button>
            </div>
          </section>
        </>
      ) : (
        <section className="tetrobots-gate">
          <p className="tetrobots-kicker">ACCES RESTREINT</p>
          <h2>Connecte-toi pour ouvrir le centre de liaison</h2>
          <p>
            La page relation affiche la memoire long terme des bots, leur humeur, leur
            affinite et les conditions pour regagner la confiance d&apos;Apex.
          </p>
          <div className="tetrobots-gate__actions">
            <Link to={PATHS.login} className="tetrobots-section-nav__link tetrobots-section-nav__link--active">
              Connexion
            </Link>
            <Link to={PATHS.tetrobots} className="tetrobots-section-nav__link">
              Voir les profils
            </Link>
          </div>
        </section>
      )}
    </main>
  );
}
