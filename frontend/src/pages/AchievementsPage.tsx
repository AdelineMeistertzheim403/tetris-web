import { useMemo, useState } from "react";
import AchievementCard from "../components/AchievementCard";
import { useAchievements } from "../hooks/useAchievements";
import "../styles/achievements.scss";

type Filter = "all" | "unlocked" | "locked";

export default function AchievementsPage() {
  const { achievements } = useAchievements();
  const [filter, setFilter] = useState<Filter>("all");

  const filtered = useMemo(() => {
    switch (filter) {
      case "unlocked":
        return achievements.filter((a) => a.unlocked);
      case "locked":
        return achievements.filter((a) => !a.unlocked);
      default:
        return achievements;
    }
  }, [achievements, filter]);

  const unlockedCount = achievements.filter((a) => a.unlocked).length;

  return (
    <div className="achievements-page">
      <header>
        <h1>Succès</h1>
        <p>
          {unlockedCount}/{achievements.length} débloqués
        </p>
      </header>

      <div className="filters">
        <button onClick={() => setFilter("all")}>Tous</button>
        <button onClick={() => setFilter("unlocked")}>Débloqués</button>
        <button onClick={() => setFilter("locked")}>Verrouillés</button>
      </div>

      <div className="achievement-grid">
        {filtered.map((achievement) => (
          <AchievementCard
            key={achievement.id}
            achievement={achievement}
            unlocked={achievement.unlocked}
          />
        ))}
      </div>
    </div>
  );
}
