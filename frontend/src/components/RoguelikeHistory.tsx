import { useEffect, useState } from "react";
import { getMyRoguelikeRuns } from "../services/roguelike.service";
import type { RoguelikeRunHistoryItem } from "../services/roguelike.service";
import { ALL_PERKS } from "../data/perks";

const perkIconMap: Record<string, string> = ALL_PERKS.reduce((acc, perk) => {
  acc[perk.id] = perk.icon ?? "★";
  return acc;
}, {} as Record<string, string>);

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
      <div className="panel-header">
        <div>
          <p className="eyebrow">Historique</p>
          <h3>Vos dernières runs</h3>
        </div>
      </div>

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
              return (
                <article key={run.id} className="run-card run-card--center">
                  <header className="run-card__top run-card__top--center">
                    <div className="pill-group">
                      <StatusBadge status={run.status} />
                      {run.chaosMode && <span className="pill pill-ghost">🔥 Chaos</span>}
                    </div>
                    <div className="run-line">
                      <span className="muted">#{run.seed.slice(0, 6)}</span>
                      <span className="muted">Score {run.score.toLocaleString("fr-FR")}</span>
                      <span className="muted">Niv {run.level}</span>
                      <span className="muted">Lignes {run.lines}</span>
                      <span className="muted">Durée {duration ?? "—"}</span>
                    </div>
                  </header>

                  <div className="run-line perks-line">
                    {Array.isArray(run.perks) && run.perks.length > 0 ? (
                      run.perks.map((perk) => (
                        <span key={perk} className="pill pill-ghost">
                          {perkIconMap[perk] ?? "★"}
                        </span>
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
