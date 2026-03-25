import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import "../../../styles/roguelike.css";
import RoguelikeRun from "../components/run/RoguelikeRun";
import RoguelikeHistory from "../components/history/RoguelikeHistory";
import RoguelikeLeaderboard from "../components/history/RoguelikeLeaderboard";
import { useAchievements } from "../../achievements/hooks/useAchievements";
import { TOTAL_GAME_MODES } from "../../game/types/GameMode";
import { PATHS } from "../../../routes/paths";

export default function RoguelikePage() {
  const { updateStats, checkAchievements } = useAchievements();
  // État de la page "hub" roguelike: démarrage d'une run, onglet actif, et mode seed.
  const [started, setStarted] = useState(false);
  const [activeTab, setActiveTab] = useState<"history" | "leaderboard">("history");
  const [showSeedInput, setShowSeedInput] = useState(false);
  const [seedInput, setSeedInput] = useState("");
  const [seedToPlay, setSeedToPlay] = useState<string | null>(null);
  const [seededMode, setSeededMode] = useState(false);
  const visitedRef = useRef(false);

  useEffect(() => {
    // Tracking "visite de mode" pour les succès globaux.
    if (visitedRef.current) return;
    visitedRef.current = true;
    const next = updateStats((prev) => ({
      ...prev,
      modesVisited: { ...prev.modesVisited, ROGUELIKE: true },
    }));
    const visitedCount = Object.values(next.modesVisited).filter(Boolean).length;
    if (visitedCount >= TOTAL_GAME_MODES) {
      checkAchievements({ custom: { modes_visited_all: true } });
    }
  }, [checkAchievements, updateStats]);

  if (started) {
    // Une fois la run lancée, on bascule entièrement sur le composant de run.
    return <RoguelikeRun initialSeed={seedToPlay ?? undefined} seededMode={seededMode} />;
  }

  const handleStartRandom = () => {
    // Démarrage d'une run aléatoire (seed générée côté jeu).
    setSeededMode(false);
    setSeedToPlay(null);
    setStarted(true);
  };

  const handleStartSeed = (seed: string) => {
    // Démarrage d'une run seedée: on normalise la seed pour garantir une RNG stable.
    const normalized = seed.trim().toUpperCase();
    if (!normalized) return;
    setSeededMode(true);
    setSeedToPlay(normalized);
    setStarted(true);
  };

  return (
    <div className="roguelike-mode">
      <section className="rogue-hero panel">
        <div>
          <p className="eyebrow">Mode Roguelike</p>
          <h2>Une seule vie. Des perks à chaque palier.</h2>
          <p className="hero-subtitle">
            Choisis un perk toutes les 10 lignes, expérimente Chaos, bombes, time-freeze...
            Termine ta run pour entrer au classement.
          </p>
          <div className="hero-actions">
            <button className="start-cta-btn" onClick={handleStartRandom}>
              ▶ Lancer une run
            </button>
            <button
              className="seed-cta-btn"
              onClick={() => setShowSeedInput((v) => !v)}
            >
              🔮 Jouer une seed
            </button>
            <Link className="lexicon-btn" to={PATHS.roguelikeLexicon}>
              Lexique
            </Link>
          </div>
          {showSeedInput && (
            <form
              className="seed-form"
              onSubmit={(event) => {
                event.preventDefault();
                handleStartSeed(seedInput);
              }}
            >
              <input
                type="text"
                placeholder="Ex: DEVIL-666"
                value={seedInput}
                onChange={(event) => setSeedInput(event.target.value)}
              />
              <button type="submit">Lancer la seed</button>
              <button
                type="button"
                className="seed-devil"
                onClick={() => handleStartSeed("DEVIL-666")}
              >
                DEVIL-666
              </button>
              <p className="seed-hint">Seed spéciale: DEVIL-666</p>
            </form>
          )}
        </div>
      </section>

      <section className="rogue-tabs">
        <div className="tab-bar">
          <button
            className={`tab-btn ${activeTab === "history" ? "active" : ""}`}
            onClick={() => setActiveTab("history")}
          >
            Historique
          </button>
          <button
            className={`tab-btn ${activeTab === "leaderboard" ? "active" : ""}`}
            onClick={() => setActiveTab("leaderboard")}
          >
            Leaderboard
          </button>
        </div>

        <div className="tab-panel">
          {activeTab === "history" ? <RoguelikeHistory /> : <RoguelikeLeaderboard />}
        </div>
      </section>
    </div>
  );
}
