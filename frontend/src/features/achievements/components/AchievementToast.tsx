import type { Achievement } from "../data/achievements";


export default function AchievementToast({
  achievement,
  onClose,
}: {
  achievement: Achievement | null;
  onClose: () => void;
}) {
  if (!achievement) return null;

  return (
    <div className="achievement-toast">
      <img src={`/${achievement.icon}.png`} />
      <div>
        <strong>{achievement.name}</strong>
        <p>{achievement.description}</p>
      </div>
      <button onClick={onClose}>✕</button>
    </div>
  );
}
