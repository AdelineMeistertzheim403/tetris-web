import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import "../../../styles/roguelike.css";
import { getMyRoguelikeRuns, type RoguelikeRunHistoryItem } from "../services/roguelike.service";
import { ALL_PERKS } from "../data/perks";
import { MUTATIONS } from "../data/mutations";
import { SYNERGIES } from "../data/synergies";
import type { Synergy } from "../types/Synergy";

const fallbackIcon = "/vite.svg";
const perkIconMap: Record<string, string> = {
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

function isSynergyActive(perks: string[], synergy: Synergy) {
  const count = synergy.requiredPerks.filter((perkId) => perks.includes(perkId)).length;
  const min = synergy.minCount ?? synergy.requiredPerks.length;
  return count >= min;
}

export default function RoguelikeLexicon() {
  const [runs, setRuns] = useState<RoguelikeRunHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const data = await getMyRoguelikeRuns();
        if (mounted) setRuns(data);
      } catch (err) {
        if (mounted) setError("Impossible de charger le lexique.");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const { unlockedPerks, unlockedMutations, unlockedSynergies } = useMemo(() => {
    const perkSet = new Set<string>();
    const mutationSet = new Set<string>();
    const synergySet = new Set<string>();

    runs.forEach((run) => {
      const runPerks = Array.isArray(run.perks) ? run.perks : [];
      runPerks.forEach((perkId) => {
        if (typeof perkId === "string") perkSet.add(perkId);
      });

      const runMutations = Array.isArray(run.mutations) ? run.mutations : [];
      runMutations.forEach((mutation) => {
        if (mutation && typeof mutation.id === "string") {
          mutationSet.add(mutation.id);
        }
      });

      SYNERGIES.forEach((synergy) => {
        if (isSynergyActive(runPerks, synergy)) {
          synergySet.add(synergy.id);
        }
      });
    });

    return {
      unlockedPerks: ALL_PERKS.filter((perk) => perkSet.has(perk.id)),
      unlockedMutations: MUTATIONS.filter((mutation) => mutationSet.has(mutation.id)),
      unlockedSynergies: SYNERGIES.filter((synergy) => synergySet.has(synergy.id)),
    };
  }, [runs]);

  return (
    <div className="roguelike-mode rogue-lexicon">
      <section className="panel lexicon-hero">
        <div>
          <p className="eyebrow">Lexique</p>
          <h2>Vos decouvertes roguelike</h2>
          <p className="hero-subtitle">
            Les perks, mutations et synergies apparaissent ici une fois obtenus au moins
            une fois pendant une run.
          </p>
        </div>
        <div className="lexicon-actions">
          <Link className="lexicon-btn" to="/roguelike">
            Retour au mode roguelike
          </Link>
        </div>
      </section>

      {loading && <p className="muted">Chargement...</p>}
      {error && <p className="error-text">{error}</p>}

      {!loading && !error && (
        <div className="lexicon-sections">
          <section className="panel lexicon-section">
            <div className="panel-header">
              <h3>Perks debloques</h3>
              <span className="muted small">
                {unlockedPerks.length}/{ALL_PERKS.length}
              </span>
            </div>
            {unlockedPerks.length === 0 ? (
              <p className="muted">Aucun perk debloque pour le moment.</p>
            ) : (
              <div className="lexicon-grid">
                {unlockedPerks.map((perk) => {
                  const src = perkIconMap[perk.id] ?? fallbackIcon;
                  return (
                    <article key={perk.id} className="lexicon-card">
                      <span className="lexicon-icon-wrap">
                        <img className="lexicon-icon" src={src} alt={perk.name} />
                      </span>
                      <div className="lexicon-text">
                        <h4>{perk.name}</h4>
                        <p>{perk.description}</p>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          <section className="panel lexicon-section">
            <div className="panel-header">
              <h3>Mutations debloquees</h3>
              <span className="muted small">
                {unlockedMutations.length}/{MUTATIONS.length}
              </span>
            </div>
            {unlockedMutations.length === 0 ? (
              <p className="muted">Aucune mutation debloquee pour le moment.</p>
            ) : (
              <div className="lexicon-grid">
                {unlockedMutations.map((mutation) => {
                  const src = mutation.icon ? `/${mutation.icon}.png` : fallbackIcon;
                  return (
                    <article key={mutation.id} className="lexicon-card">
                      <span className="lexicon-icon-wrap">
                        <img className="lexicon-icon" src={src} alt={mutation.name} />
                      </span>
                      <div className="lexicon-text">
                        <h4>{mutation.name}</h4>
                        <p>{mutation.description}</p>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          <section className="panel lexicon-section">
            <div className="panel-header">
              <h3>Synergies debloquees</h3>
              <span className="muted small">
                {unlockedSynergies.length}/{SYNERGIES.length}
              </span>
            </div>
            {unlockedSynergies.length === 0 ? (
              <p className="muted">Aucune synergie debloquee pour le moment.</p>
            ) : (
              <div className="lexicon-grid">
                {unlockedSynergies.map((synergy) => {
                  const src = synergy.icon ? `/${synergy.icon}.png` : fallbackIcon;
                  return (
                    <article key={synergy.id} className="lexicon-card">
                      <span className="lexicon-icon-wrap">
                        <img className="lexicon-icon" src={src} alt={synergy.name} />
                      </span>
                      <div className="lexicon-text">
                        <h4>{synergy.name}</h4>
                        <p>{synergy.description}</p>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
