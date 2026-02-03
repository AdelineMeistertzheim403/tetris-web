import type { Achievement } from "../data/achievements";


export default function AchievementCard({
  achievement,
  unlocked,
}: {
  achievement: Achievement;
  unlocked: boolean;
}) {
  return (
    <div className={`achievement-card ${unlocked ? "unlocked" : "locked"}`}>
      <div className="icon-wrapper">
        {unlocked ? (
          <img src={`/${achievement.icon}.png`} />
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
      </div>
    </div>
  );
}
