import type { AchievementStats } from "../../achievements/types/achievementStats";
import { TETROBOT_ANOMALY_TOTAL } from "../../tetrobots/logic/tetrobotAnomalies";

export const PIXEL_MODE_ENABLED_STORAGE_KEY = "tetris-pixel-mode-enabled-v1";
export const PIXEL_MODE_RUN_COUNTER_KEY = "pixel_mode_runs";
export const PIXEL_MODE_REGISTERED_RUN_PREFIX = "tetris-pixel-run";
export const PIXEL_MODE_MAX_INSTABILITY = 6;

export const PIXEL_MODE_RUNTIME_LINES = [
  "Tu ressens la difference ?",
  "Les regles ne sont plus fiables ici.",
  "Tu continues malgre la corruption. Interessant.",
  "La couche profonde s'ajuste a toi.",
  "Tu t'adaptes. Ou tu subis.",
  "Le systeme normal ne te protege plus.",
];

const PIXEL_GAMEPLAY_PATHS = new Set([
  "/game",
  "/sprint",
  "/versus",
  "/roguelike",
  "/roguelike-versus",
  "/brickfall-solo/play",
  "/tetromaze/play",
  "/pixel-protocol/play",
  "/pixel-invasion",
]);

export function isPixelModeUnlocked(counters: AchievementStats["counters"]) {
  return (counters.all_easter_egg ?? 0) >= TETROBOT_ANOMALY_TOTAL;
}

export function isPixelGameplayPath(pathname: string) {
  return PIXEL_GAMEPLAY_PATHS.has(pathname) || pathname.startsWith("/puzzle/");
}

export function getPixelInstabilityLevel(runCount: number) {
  const normalizedRuns = Math.max(0, Math.floor(runCount));
  return Math.min(PIXEL_MODE_MAX_INSTABILITY, 1 + Math.floor(normalizedRuns / 2));
}

export function corruptText(text: string, intensity = 0.12, random = Math.random) {
  return text
    .split("")
    .map((char) => {
      if (char === " " || random() > intensity) return char;
      const code = 33 + Math.floor(random() * 94);
      return String.fromCharCode(code);
    })
    .join("");
}

export function getPixelScoreFactor(instabilityLevel: number, random = Math.random) {
  const safeLevel = Math.max(1, instabilityLevel);
  const amplitude = Math.min(0.7, 0.34 + safeLevel * 0.06);
  return 0.8 + random() * amplitude;
}
