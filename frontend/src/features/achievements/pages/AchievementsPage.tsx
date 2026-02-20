import { useMemo, useState } from "react";

import { useAchievements } from "../hooks/useAchievements";
import "../../../styles/achievements.scss";
import AchievementCard from "../components/AchievementCard";
import type { AchievementGroup } from "../data/achievements";
import type { GameMode } from "../../game/types/GameMode";

type Filter = "all" | "unlocked" | "locked";
type GroupFilter = "all" | AchievementGroup;
type ModeFilter = "all" | GameMode | "ALL";

export default function AchievementsPage() {
  const { achievements } = useAchievements();
  const [filter, setFilter] = useState<Filter>("all");
  const [groupFilter, setGroupFilter] = useState<GroupFilter>("all");
  const [modeFilter, setModeFilter] = useState<ModeFilter>("all");
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
    "TETROMAZE",
    "TETROMAZE_SKILL",
    "TETROMAZE_POWER",
    "TETROBOTS",
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
    TETROMAZE: "Tetromaze - Progression",
    TETROMAZE_SKILL: "Tetromaze - Skill",
    TETROMAZE_POWER: "Tetromaze - Power Play",
    TETROBOTS: "Tetromaze - Tetrobots",
    BRICKFALL: "Mode Brickfall Versus",
    ROGUELIKE: "Mode Roguelike",
    ROGUELIKE_VERSUS: "Mode Roguelike Versus",
    PUZZLE: "Mode Énigme",
    SECRETS: "Succès secrets",
  };

  const modeOrder: Array<GameMode | "ALL"> = [
    "ALL",
    "CLASSIQUE",
    "SPRINT",
    "VERSUS",
    "BRICKFALL_SOLO",
    "ROGUELIKE",
    "ROGUELIKE_VERSUS",
    "PUZZLE",
    "TETROMAZE",
  ];

  const modeLabels: Record<GameMode | "ALL", string> = {
    ALL: "Tous modes",
    CLASSIQUE: "Classique",
    SPRINT: "Sprint",
    VERSUS: "Versus",
    BRICKFALL_SOLO: "Brickfall Solo",
    BRICKFALL_VERSUS: "Brickfall Versus",
    ROGUELIKE: "Roguelike",
    ROGUELIKE_VERSUS: "Roguelike Versus",
    PUZZLE: "Puzzle",
    TETROMAZE: "Tetromaze",
  };

  const filtered = useMemo(() => {
    // Filtrage local en mémoire (pas d'appel réseau).
    return visibleAchievements.filter((achievement) => {
      if (filter === "unlocked" && !achievement.unlocked) return false;
      if (filter === "locked" && achievement.unlocked) return false;

      if (groupFilter !== "all" && (achievement.group ?? "ROGUELIKE") !== groupFilter) {
        return false;
      }

      if (modeFilter !== "all" && achievement.mode !== modeFilter) {
        return false;
      }

      return true;
    });
  }, [filter, groupFilter, modeFilter, visibleAchievements]);

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
        <select
          aria-label="Filtrer par groupe"
          value={groupFilter}
          onChange={(e) => setGroupFilter(e.target.value as GroupFilter)}
        >
          <option value="all">Tous les groupes</option>
          {groupOrder.map((group) => (
            <option key={group} value={group}>
              {groupLabels[group]}
            </option>
          ))}
        </select>
        <select
          aria-label="Filtrer par mode de jeu"
          value={modeFilter}
          onChange={(e) => setModeFilter(e.target.value as ModeFilter)}
        >
          <option value="all">Tous les modes</option>
          {modeOrder.map((mode) => (
            <option key={mode} value={mode}>
              {modeLabels[mode]}
            </option>
          ))}
        </select>
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
