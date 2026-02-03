import type { AchievementContext } from "../context/AchievementsContext";

export type AchievementTrigger =
  | "RUN_END"
  | "LINE_CLEAR"
  | "LEVEL_UP"
  | "BOMB_USED"
  | "PERK_TAKEN"
  | "MUTATION_TAKEN"
  | "SYNERGY_ACTIVATED"
  | "TIME_FREEZE_USED";

export type Achievement = {
  id: string;
  name: string;
  description: string;
  icon: string;

  trigger: AchievementTrigger;

  // condition simple
  condition?: (ctx: AchievementContext) => boolean;

  // progression
  progress?: {
    current: number;
    target: number;
  };

  secret?: boolean;
};