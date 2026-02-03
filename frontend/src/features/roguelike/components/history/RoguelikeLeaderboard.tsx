import { useEffect, useState } from "react";
import { getRoguelikeLeaderboard } from "../../services/roguelike.service";
import type { RoguelikeLeaderboardItem } from "../../services/roguelike.service";
import { formatScore } from "../../utils/formatScore";

export default function RoguelikeLeaderboard() {
  const [entries, setEntries] = useState<RoguelikeLeaderboardItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Récupération du top 20 depuis l'API roguelike.
    let mounted = true;
    (async () => {
      try {
        const data = await getRoguelikeLeaderboard();
        if (mounted) setEntries(data);
      } catch (err) {
        setError("Impossible de charger le classement" + err);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Leaderboard</p>
          <h3>Top 20 runs</h3>
        </div>
      </div>

      {loading && <p className="muted">Chargement...</p>}
      {error && <p className="error-text">{error}</p>}
      {!loading && !error && entries.length === 0 && (
        <p className="muted">Personne n'a encore terminé de run.</p>
      )}

      {entries.length > 0 && (
        <div className="leaderboard">
          <div className="leaderboard-row leaderboard-head">
            <span>#</span>
            <span>Joueur</span>
            <span>Score</span>
            <span>Niv</span>
            <span>Lignes</span>
            <span>Chaos</span>
          </div>
          {entries.map((entry, idx) => (
            <div key={`${entry.user.pseudo}-${entry.seed}-${idx}`} className="leaderboard-row">
              <span>{idx + 1}</span>
              <span>{entry.user.pseudo}</span>
              <span>{formatScore(entry.score)}</span>
              <span>{entry.level}</span>
              <span>{entry.lines}</span>
              <span>{entry.chaosMode ? "🔥" : "—"}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
