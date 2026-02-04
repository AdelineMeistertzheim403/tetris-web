import type { ActiveMutationRuntime, ActivePerkRuntime } from "./RoguelikeRun";
import { MUTATIONS } from "../../data/mutations";
import { SYNERGIES } from "../../data/synergies";
import {
  mutationIconPath,
  perkIconPath,
  synergyIconPath,
} from "../../../../shared/utils/assetPaths";

type RoguelikeRunSummaryProps = {
  visible: boolean;
  score: number;
  lines: number;
  level: number;
  perks: ActivePerkRuntime[];
  mutations: ActiveMutationRuntime[];
  chaosMode: boolean;
  seed: string;
  onReplay: (seed: string) => void;
  onExit: () => void;
};

const fallbackIcon = "/vite.svg";
const perkIconMap: Record<string, string> = {
  "extra-hold": perkIconPath("extra_hold"),
  "soft-gravity": perkIconPath("soft_gravity"),
  "slow-gravity": perkIconPath("slow_gravity"),
  "score-boost": perkIconPath("score_boost"),
  bomb: perkIconPath("bomb"),
  "double-bomb": perkIconPath("double_bomb"),
  "mega-bomb": perkIconPath("mega_bomb"),
  "second-chance": perkIconPath("second_chance"),
  "time-freeze": perkIconPath("time_freeze"),
  "chaos-mode": perkIconPath("chaos_mode"),
  "fast-hold-reset": perkIconPath("fast_hold_reset"),
  "last-stand": perkIconPath("last_stand"),
};
const mutationIconMap = MUTATIONS.reduce<Record<string, string>>((acc, mutation) => {
  acc[mutation.id] = mutationIconPath(mutation.icon);
  return acc;
}, {});
const synergyIconMap = SYNERGIES.reduce<Record<string, string>>((acc, synergy) => {
  acc[synergy.id] = synergyIconPath(synergy.icon);
  return acc;
}, {});

export default function RoguelikeRunSummary({
  visible,
  score,
  lines,
  level,
  perks,
  mutations,
  chaosMode,
  seed,
  onReplay,
  onExit,
}: RoguelikeRunSummaryProps) {
  if (!visible) return null;

  // Recalcule les synergies actives à partir des perks obtenus.
  const perkIds = perks.map((perk) => perk.id);
  const activeSynergies = SYNERGIES.filter((synergy) => {
    const count = synergy.requiredPerks.filter((perkId) => perkIds.includes(perkId)).length;
    const min = synergy.minCount ?? synergy.requiredPerks.length;
    return count >= min;
  });

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

        <div className="summary-section">
          <h3>Perks</h3>
          <div className="summary-icons">
            {perks.length > 0 ? (
              perks.map((perk) => {
                const label = perk.name ?? perk.id;
                const src = perkIconMap[perk.id] ?? fallbackIcon;
                return (
                  <span key={perk.id} className="summary-icon-wrap" title={label}>
                    <img className="summary-icon" src={src} alt={label} />
                  </span>
                );
              })
            ) : (
              <span className="summary-empty">Aucun perk</span>
            )}
          </div>
        </div>
        <div className="summary-section">
          <h3>Mutations</h3>
          <div className="summary-icons">
            {mutations.length > 0 ? (
              mutations.map((mutation) => {
                const label = mutation.name ?? mutation.id;
                const src = mutationIconMap[mutation.id] ?? fallbackIcon;
                const stack = mutation.stacks ?? 0;
                const stackSuffix = stack > 1 ? ` x${stack}` : "";
                return (
                  <span
                    key={mutation.id}
                    className="summary-icon-wrap"
                    title={`${label}${stackSuffix}`}
                  >
                    <img className="summary-icon" src={src} alt={label} />
                    {stack > 1 && <span className="summary-icon-stack">x{stack}</span>}
                  </span>
                );
              })
            ) : (
              <span className="summary-empty">Aucune mutation</span>
            )}
          </div>
        </div>
        <div className="summary-section">
          <h3>Synergies</h3>
          <div className="summary-icons">
            {activeSynergies.length > 0 ? (
              activeSynergies.map((synergy) => {
                const src = synergyIconMap[synergy.id] ?? fallbackIcon;
                return (
                  <span key={synergy.id} className="summary-icon-wrap" title={synergy.name}>
                    <img className="summary-icon" src={src} alt={synergy.name} />
                  </span>
                );
              })
            ) : (
              <span className="summary-empty">Aucune synergie</span>
            )}
          </div>
        </div>

        <div className="seed">
          <span>Seed :</span>
          <code>{seed}</code>
          <button onClick={() => navigator.clipboard.writeText(seed)}>
            Copier
          </button>
        </div>

        <div className="actions">
          <button onClick={() => onReplay(seed)}>🔁 Rejouer</button>
          <button onClick={onExit}>🏠 Quitter</button>
        </div>
      </div>
    </div>
  );
}
