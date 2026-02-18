// Contexte React partage pour ce domaine.
export type AchievementContext = {
  run: {
    score: number;
    lines: number;
    level: number;
    bombsUsed: number;
    perks: string[];
    synergies: string[];
    mutations: string[];
    chaosMode: boolean;
    seed: string;
  };
  global: {
    totalRuns: number;
    totalScore: number;
    achievementsUnlocked: string[];
  };
};