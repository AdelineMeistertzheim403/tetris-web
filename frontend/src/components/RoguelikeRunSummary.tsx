import type { ActivePerkRuntime } from "./RoguelikeRun";

type RoguelikeRunSummaryProps = {
  visible: boolean;
  score: number;
  lines: number;
  level: number;
  perks: ActivePerkRuntime[];
  chaosMode: boolean;
  seed: string;
  onReplay: () => void;
  onExit: () => void;
};

export default function RoguelikeRunSummary({
  visible,
  score,
  lines,
  level,
  perks,
  chaosMode,
  seed,
  onReplay,
  onExit,
}: RoguelikeRunSummaryProps) {
  if (!visible) return null;

  return (
    <div className="rogue-summary-overlay">
      <div className="rogue-summary-card">
        <h1>🏁 Fin de la run</h1>

        <div className="stats">
          <p>Score : <strong>{score}</strong></p>
          <p>Lignes : {lines}</p>
          <p>Niveau max : {level}</p>
          <p>Chaos mode : {chaosMode ? "🔥 Oui" : "❌ Non"}</p>
        </div>

        <div className="perks">
          <h3>Perks obtenus</h3>
          <ul>
            {perks.map(p => (
              <li key={p.id}>{p.name}</li>
            ))}
          </ul>
        </div>

        <div className="seed">
          <span>Seed :</span>
          <code>{seed}</code>
          <button onClick={() => navigator.clipboard.writeText(seed)}>
            Copier
          </button>
        </div>

        <div className="actions">
          <button onClick={onReplay}>🔁 Rejouer</button>
          <button onClick={onExit}>🏠 Quitter</button>
        </div>
      </div>
    </div>
  );
}
