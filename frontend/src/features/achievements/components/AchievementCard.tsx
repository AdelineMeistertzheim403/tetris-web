// Composant UI AchievementCard.tsx.
import type { Achievement } from "../data/achievements";
import { achievementIconPath } from "../../../shared/utils/assetPaths";

export default function AchievementCard({
  achievement,
  unlocked,
  progress,
}: {
  achievement: Achievement & {
    progress?: { current: number; target: number; label?: string };
  };
  unlocked: boolean;
  progress?: { current: number; target: number; label?: string };
}) {
  const ratio = progress ? Math.max(0, Math.min(100, (progress.current / Math.max(1, progress.target)) * 100)) : 0;
  return (
    <div className={`achievement-card ${unlocked ? "unlocked" : "locked"}`}>
      <div className="icon-wrapper">
        {unlocked ? (
          <img src={achievementIconPath(achievement.icon)} />
        ) : (
          <span className="locked-icon">?</span>
        )}
      </div>

      <div className="content">
        <h3>{unlocked || !achievement.secret ? achievement.name : "???"}</h3>
        <p>
          {unlocked || !achievement.secret
            ? achievement.description
            : "Succès secret"}
        </p>
        {!unlocked && progress ? (
          <div className="achievement-progress">
            <div className="achievement-progress__meta">
              <span>Progression</span>
              <strong>{progress.label ?? `${progress.current}/${progress.target}`}</strong>
            </div>
            <div className="achievement-progress__bar" aria-hidden="true">
              <div
                className="achievement-progress__fill"
                style={{ width: `${ratio}%` }}
              />
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
