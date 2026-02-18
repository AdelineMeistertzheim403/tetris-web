// Composant UI StatusBadges.tsx.
import type { StatusBadge } from "../../../utils/runCalculations";

type Props = {
  badges: StatusBadge[];
};

export default function StatusBadges({ badges }: Props) {
  return (
    <div className="status-strip">
      {badges.map((badge) => (
        <div
          key={`${badge.label}-${badge.value}`}
          className={`status-badge status-badge--${badge.tone ?? "neutral"}`}
          title={badge.label}
        >
          <span className="status-label">{badge.label}</span>
          <span className="status-value">{badge.value}</span>
        </div>
      ))}
    </div>
  );
}
