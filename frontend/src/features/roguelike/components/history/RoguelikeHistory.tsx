/* eslint-disable @typescript-eslint/no-unused-vars */
import { useEffect, useMemo, useState } from "react";
import { getMyRoguelikeRuns } from "../../services/roguelike.service";
import type { RoguelikeRunHistoryItem } from "../../services/roguelike.service";
import { ALL_PERKS } from "../../data/perks";
import { SYNERGIES } from "../../data/synergies";
import { MUTATIONS } from "../../data/mutations";
import { useAchievements } from "../../../achievements/hooks/useAchievements";
import { formatScore } from "../../utils/formatScore";

const perkImageMap: Record<string, string> = {
  "extra-hold": "/extra_hold.png",
  "soft-gravity": "/soft_gravity.png",
  "slow-gravity": "/slow_gravity.png",
  "score-boost": "/score_boost.png",
  bomb: "/bomb.png",
  "double-bomb": "/double_bomb.png",
  "mega-bomb": "/mega_bomb.png",
  "second-chance": "/second_chance.png",
  "time-freeze": "/time_freeze.png",
  "chaos-mode": "/chaos_mode.png",
  "fast-hold-reset": "/fast_hold_reset.png",
  "last-stand": "/last_stand.png",
};

const perkNameMap = ALL_PERKS.reduce<Record<string, string>>((acc, perk) => {
  acc[perk.id] = perk.name;
  return acc;
}, {});

const mutationMetaMap = MUTATIONS.reduce<Record<string, { name: string; icon: string }>>(
  (acc, mutation) => {
    acc[mutation.id] = { name: mutation.name, icon: mutation.icon };
    return acc;
  },
  {}
);

// Calcule une durée lisible à partir des timestamps backend.
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
  const { checkAchievements, updateStats } = useAchievements();
  const [runs, setRuns] = useState<RoguelikeRunHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);

  useEffect(() => {
    // Chargement initial de l'historique (une seule fois côté UI).
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
    // Tracking "vue d'historique" pour les succès de progression.
    const next = updateStats((prev) => ({
      ...prev,
      historyViewedCount: prev.historyViewedCount + 1,
    }));
    checkAchievements({ historyViewedCount: next.historyViewedCount });
  }, [checkAchievements, updateStats]);

  useEffect(() => {
    // Sécurité : si la page dépasse le nombre de runs (après refresh), on revient au début.
    if (page >= runs.length) {
      setPage(0);
    }
  }, [runs, page]);

  const synergiesByRun = useMemo(() => {
    // Pré-calcul des synergies actives par run pour l'affichage.
    return runs.map((run) => {
      const perkSet = new Set(run.perks);
      return SYNERGIES.filter((s) => s.requiredPerks.every((p) => perkSet.has(p)));
    });
  }, [runs]);

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
              const mutationList = Array.isArray(run.mutations) ? run.mutations : [];
              const stats = [
                { label: "Score", value: formatScore(run.score) },
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
                        <img
                          key={perk}
                          src={perkImageMap[perk] ?? "/vite.svg"}
                          alt={perkNameMap[perk] ?? perk}
                          className="perk-chip"
                          title={perkNameMap[perk] ?? perk}
                        />
                      ))
                    ) : (
                      <span className="muted">Pas de perk</span>
                    )}
                  </div>

                  <div className="run-line perks-line">
                    {mutationList.length > 0 ? (
                      mutationList.map((mutation) => {
                        const meta = mutationMetaMap[mutation.id];
                        const label = meta?.name ?? mutation.id;
                        const icon = meta?.icon ? `/${meta.icon}.png` : "/vite.svg";
                        const stackCount = mutation.stacks ?? 1;
                        const stackSuffix = stackCount > 1 ? ` x${stackCount}` : "";
                        return (
                          <div
                            key={mutation.id}
                            className="mutation-chip"
                            title={`${label}${stackSuffix}`}
                          >
                            <img
                              src={icon}
                              alt={label}
                              className="mutation-chip__img"
                            />
                            {stackCount > 1 && (
                              <span className="mutation-chip__stack">x{stackCount}</span>
                            )}
                          </div>
                        );
                      })
                    ) : (
                      <span className="muted">Aucune mutation</span>
                    )}
                  </div>

                  <div className="run-line perks-line">
                    {synergiesByRun[page]?.length ? (
                      synergiesByRun[page].map((syn) => (
                        <img
                          key={syn.id}
                          src={`/${syn.icon}.png`}
                          alt={syn.name}
                          title={syn.name}
                          className="synergy-chip"
                        />
                      ))
                    ) : (
                      <span className="muted">Aucune synergie</span>
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
