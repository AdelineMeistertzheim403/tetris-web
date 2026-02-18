import { useMemo, useState } from "react";

import { useAchievements } from "../hooks/useAchievements";
import "../../../styles/achievements.scss";
import AchievementCard from "../components/AchievementCard";
import type { AchievementGroup } from "../data/achievements";

type Filter = "all" | "unlocked" | "locked";

export default function AchievementsPage() {
  const { achievements } = useAchievements();
  const [filter, setFilter] = useState<Filter>("all");
  const visibleAchievements = useMemo(
    () => achievements.filter((a) => a.mode !== "BRICKFALL_VERSUS"),
    [achievements]
  );

  // Ordre d'affichage explicite pour garder une lecture cohérente.
  const groupOrder: AchievementGroup[] = [
    "GLOBAL",
    "CROSS",
    "CLASSIQUE",
    "SPRINT",
    "VERSUS",
    "SOLO",
    "SKILL",
    "POWER",
    "EDITOR",
    "BOT",
    "BOT_ADAPTIVE",
    "ROGUELIKE",
    "ROGUELIKE_VERSUS",
    "PUZZLE",
    "SECRETS",
  ];

  const groupLabels: Record<AchievementGroup, string> = {
    GLOBAL: "Succès globaux",
    CROSS: "Succès transversaux",
    CLASSIQUE: "Mode Classique",
    SPRINT: "Mode Sprint",
    VERSUS: "Mode Versus",
    SOLO: "Brickfall Solo - Progression",
    SKILL: "Brickfall Solo - Skill",
    POWER: "Brickfall Solo - Power Play",
    EDITOR: "Brickfall Solo - Editeur",
    BOT: "Mode Tetrobots",
    BOT_ADAPTIVE: "Mode Tetrobots Adaptatif",
    BRICKFALL: "Mode Brickfall Versus",
    ROGUELIKE: "Mode Roguelike",
    ROGUELIKE_VERSUS: "Mode Roguelike Versus",
    PUZZLE: "Mode Énigme",
    SECRETS: "Succès secrets",
  };

  const filtered = useMemo(() => {
    // Filtrage local en mémoire (pas d'appel réseau).
    switch (filter) {
      case "unlocked":
        return visibleAchievements.filter((a) => a.unlocked);
      case "locked":
        return visibleAchievements.filter((a) => !a.unlocked);
      default:
        return visibleAchievements;
    }
  }, [filter, visibleAchievements]);

  const grouped = useMemo(() => {
    // Regroupement par catégorie pour un rendu en sections.
    const map = new Map<AchievementGroup, typeof filtered>();
    for (const achievement of filtered) {
      const group = achievement.group ?? "ROGUELIKE";
      if (!map.has(group)) map.set(group, []);
      map.get(group)?.push(achievement);
    }
    return map;
  }, [filtered]);

  const unlockedCount = visibleAchievements.filter((a) => a.unlocked).length;

  return (
    <div className="achievements-page">
      <header>
        <h1>Succès</h1>
        <p>
          {unlockedCount}/{visibleAchievements.length} débloqués
        </p>
      </header>

      <div className="filters">
        <button onClick={() => setFilter("all")}>Tous</button>
        <button onClick={() => setFilter("unlocked")}>Débloqués</button>
        <button onClick={() => setFilter("locked")}>Verrouillés</button>
      </div>

      {groupOrder.map((group) => {
        const items = grouped.get(group) ?? [];
        if (!items.length) return null;
        return (
          <section key={group} className="achievement-section">
            <div className="section-header">
              <h2>{groupLabels[group]}</h2>
              <span>
                {items.filter((a) => a.unlocked).length}/{items.length}
              </span>
            </div>
            <div className="achievement-grid">
              {items.map((achievement) => (
                <AchievementCard
                  key={achievement.id}
                  achievement={achievement}
                  unlocked={achievement.unlocked}
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
