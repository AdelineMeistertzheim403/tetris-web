import { useEffect, useState } from "react";
import type { ActivePerkRuntime } from "../run/RoguelikeRun";
import { perkIconPath } from "../../../../shared/utils/assetPaths";

type Props = {
  perk: ActivePerkRuntime;
};

const perkImageMap: Record<string, string> = {
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

const RADIUS = 18;
const CIRC = 2 * Math.PI * RADIUS;

export default function PerkIcon({ perk }: Props) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!perk.expiresAt) return;

    const id = setInterval(() => setNow(Date.now()), 50);
    return () => clearInterval(id);
  }, [perk.expiresAt]);

  let progress = 1;

  if (perk.expiresAt && perk.startedAt) {
    const total = perk.expiresAt - perk.startedAt;
    const remaining = perk.expiresAt - now;
    progress = Math.max(0, remaining / total);
  }

  const src = perkImageMap[perk.id];

  return (
    <div className="perk-icon">
      <img src={src ?? "/vite.svg"} alt={perk.name} className="perk-icon-img" />

      <svg width="40" height="40" className="perk-icon-progress">
        <circle
          cx="20"
          cy="20"
          r={RADIUS}
          stroke="#333"
          strokeWidth="3"
          fill="none"
        />
        {perk.expiresAt && (
          <circle
            cx="20"
            cy="20"
            r={RADIUS}
            stroke="#00eaff"
            strokeWidth="3"
            fill="none"
            strokeDasharray={CIRC}
            strokeDashoffset={CIRC * (1 - progress)}
            style={{
              transition: "stroke-dashoffset 50ms linear",
            }}
          />
        )}
      </svg>
    </div>
  );
}
