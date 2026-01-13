import { useState } from "react";
import "../styles/roguelike.css";
import RoguelikeRun from "../components/RoguelikeRun";
import RoguelikeHistory from "../components/RoguelikeHistory";
import RoguelikeLeaderboard from "../components/RoguelikeLeaderboard";

export default function RoguelikePage() {
  const [started, setStarted] = useState(false);
  const [activeTab, setActiveTab] = useState<"history" | "leaderboard">("history");

  if (started) {
    return <RoguelikeRun />;
  }

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
          <button className="start-cta-btn" onClick={() => setStarted(true)}>
            ▶ Lancer une run
          </button>
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
