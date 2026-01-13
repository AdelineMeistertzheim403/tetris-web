/* eslint-disable @typescript-eslint/no-unused-vars */
import { useEffect, useState } from "react";
import { getMyRoguelikeRuns } from "../services/roguelike.service";
import type { RoguelikeRunHistoryItem } from "../services/roguelike.service";


function formatDuration(run: RoguelikeRunHistoryItem) {
  if (!run.endedAt) return null;
  const diff = new Date(run.endedAt).getTime() - new Date(run.createdAt).getTime();
  if (diff <= 0) return "—";
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds.toString().padStart(2, "0")}s`;
}

function StatusBadge({ status }: { status: RoguelikeRunHistoryItem["status"] }) {
  const map = {
    FINISHED: { label: "Finie", color: "#22c55e" },
    ABANDONED: { label: "Abandonnée", color: "#f59e0b" },
    IN_PROGRESS: { label: "En cours", color: "#38bdf8" },
  } as const;
  const meta = map[status];
  return (
    <span
      className="pill"
      style={{
        background: `${meta.color}22`,
        color: meta.color,
        border: `1px solid ${meta.color}55`,
      }}
    >
      {meta.label}
    </span>
  );
}

export default function RoguelikeHistory() {
  const [runs, setRuns] = useState<RoguelikeRunHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const perkClassMap: Record<string, string> = {
  "extra-hold": "perk-extra-hold",
  "soft-gravity": "perk-soft-gravity",
  "slow-gravity": "perk-slow-gravity",
  "score-boost": "perk-score-boost",
  bomb: "perk-bomb",
  "double-bomb": "perk-double-bomb",
  "mega-bomb": "perk-mega-bomb",
  "second-chance": "perk-second-chance",
  "time-freeze": "perk-time-freeze",
  "chaos-mode": "perk-chaos-mode",
  "fast-hold-reset": "perk-fast-hold-reset",
  "last-stand": "perk-last-stand",
};

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const data = await getMyRoguelikeRuns();
        if (mounted) setRuns(data);
      } catch (err) {
        setError("Impossible de charger l'historique");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (page >= runs.length) {
      setPage(0);
    }
  }, [runs, page]);

  return (
    <section className="panel">

      {loading && <p className="muted">Chargement...</p>}
      {error && <p className="error-text">{error}</p>}
      {!loading && !error && runs.length === 0 && (
        <p className="muted">Aucune run enregistrée pour le moment.</p>
      )}

      {runs.length > 0 && (
        <>
          <div className="runs-grid">
            {(() => {
              const run = runs[page];
              const duration = formatDuration(run);
              const started = new Date(run.createdAt).toLocaleString();
              const stats = [
                { label: "Score", value: run.score.toLocaleString("fr-FR") },
                { label: "Niveau", value: run.level },
                { label: "Lignes", value: run.lines },
                { label: "Durée", value: duration ?? "—" },
                { label: "Seed", value: `#${run.seed.slice(0, 6)}` },
              ];
              return (
                <article key={run.id} className="run-card run-card--center">
                  <header className="run-card__top run-card__top--center">
                    <div className="pill-group">
                      <StatusBadge status={run.status} />
                      {run.chaosMode && <span className="pill pill-ghost">🔥 Chaos</span>}
                    </div>
                  </header>

                  <div className="run-line stats-line">
                    {stats.map((stat) => (
                      <div key={stat.label} className="stat-block">
                        <span className="stat-label">{stat.label}</span>
                        <span className="stat-value">{stat.value}</span>
                      </div>
                    ))}
                  </div>

                  <div className="run-line perks-line">
                    {Array.isArray(run.perks) && run.perks.length > 0 ? (
                      run.perks.map((perk) => (
                        <span key={perk} className={`perk-icon ${perkClassMap[perk] ?? ""}`} />
                      ))
                    ) : (
                      <span className="muted">Pas de perk</span>
                    )}
                  </div>

                  <div className="run-line">
                    <span className="muted small">Début : {started}</span>
                  </div>
                </article>
              );
            })()}
          </div>
          <div className="history-pager">
            <button
              className="pager-btn"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
            >
              ← Précédente
            </button>
            <span className="muted small">
              Run {page + 1} / {runs.length}
            </span>
            <button
              className="pager-btn"
              onClick={() => setPage((p) => Math.min(runs.length - 1, p + 1))}
              disabled={page >= runs.length - 1}
            >
              Suivante →
            </button>
          </div>
        </>
      )}
    </section>
  );
}
