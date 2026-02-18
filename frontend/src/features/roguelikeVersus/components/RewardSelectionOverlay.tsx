// Composant UI RewardSelectionOverlay.tsx.
import type { RvRewardOption } from "../types";
import "../../../styles/roguelike-perks.css";

type Props = {
  options: RvRewardOption[];
  onSelect: (option: RvRewardOption) => void;
};

const LABELS: Record<string, { title: string; desc: string }> = {
  emp: { title: "Bombe EMP", desc: "Désactive Hold + Preview 5s." },
  gravity: { title: "Gravity Bomb", desc: "Gravité x2 pendant 6s." },
  mirror: { title: "Mirror Bomb", desc: "Inversion gauche/droite 3s." },
  seed: { title: "Seed Bomb", desc: "Même pièce 5x de suite." },
  fog: { title: "Fog Bomb", desc: "Cache les 3 lignes du bas." },
  shield: { title: "Bouclier", desc: "Réduit le garbage reçu pendant 10s." },
  score_boost: { title: "Boost Score", desc: "+30% score pendant 15s." },
  time_freeze: { title: "Time Freeze", desc: "+1 charge de freeze." },
  slow: { title: "Ralentissement", desc: "Gravité adverse +30% pendant 8s." },
  invert: { title: "Inversion", desc: "Contrôles inversés 4s." },
  preview_off: { title: "Blackout", desc: "Preview off 6s." },
};

export default function RewardSelectionOverlay({ options, onSelect }: Props) {
  if (!options.length) return null;

  return (
    <div className="perk-overlay">
      <div className="perk-modal">
        <h2>CHOISISSEZ UNE RÉCOMPENSE</h2>

        <div className="perk-cards">
          {options.map((option, idx) => {
            const key = option.kind === "perk" || option.kind === "mutation" ? option.id : option.id;
            const label = LABELS[key] ?? {
              title: option.kind.toUpperCase(),
              desc: "Récompense spéciale.",
            };
            const title = option.title ?? label.title;
            const desc = option.description ?? label.desc;
            return (
              <div
                key={`${option.kind}-${option.id}-${idx}`}
                className="perk-card"
                onClick={() => onSelect(option)}
              >
                <h3>{title}</h3>
                <p>{desc}</p>
                <div className="perk-rarity">{option.kind.toUpperCase()}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
