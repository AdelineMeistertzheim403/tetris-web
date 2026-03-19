/// <reference types="node" />

import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "fs";
import { join, relative, resolve } from "path";
import { ACHIEVEMENTS } from "../data/achievements";
import type { Achievement, AchievementCondition } from "../data/achievements";

const FRONTEND_SRC_ROOT = resolve(process.cwd(), "src");
const ACHIEVEMENT_DATA_PATH = resolve(
  process.cwd(),
  "src/features/achievements/data/achievements.ts"
);
const HOOK_PATH = resolve(
  process.cwd(),
  "src/features/achievements/hooks/useAchievements.ts"
);
const LOGIC_PATH = resolve(
  process.cwd(),
  "src/features/achievements/lib/tetrobotAchievementLogic.ts"
);

const hookSource = readFileSync(HOOK_PATH, "utf8");
const logicSource = readFileSync(LOGIC_PATH, "utf8");

const BUILT_IN_CUSTOM_KEYS = new Set([
  "login_days_7",
  "login_days_30",
  "achievements_50_percent",
  "achievements_100_percent",
]);

const checkerHandledTypes = new Set(
  Array.from(hookSource.matchAll(/case "([^"]+)":/g), (match) => match[1] as string).filter(
    (value) =>
      [
        "runs_played",
        "score_reached",
        "level_reached",
        "lines_cleared",
        "tetris_cleared",
        "bombs_used",
        "no_bomb_run",
        "perk_count",
        "synergy_count",
        "synergy_activated",
        "mutation_count",
        "chaos_mode_run",
        "second_chance_used",
        "seed_used",
        "seed_score",
        "same_seed_runs",
        "history_viewed",
        "counter",
        "custom",
        "affinity",
      ].includes(value)
  )
);

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const fullPath = join(dir, entry);
    const stats = statSync(fullPath);
    if (stats.isDirectory()) return walk(fullPath);
    if (!fullPath.endsWith(".ts") && !fullPath.endsWith(".tsx")) return [];
    if (fullPath.endsWith(".test.ts")) return [];
    if (fullPath === ACHIEVEMENT_DATA_PATH) return [];
    return [fullPath];
  });
}

const sourceFiles = walk(FRONTEND_SRC_ROOT);
const sourceByFile = new Map(sourceFiles.map((file) => [file, readFileSync(file, "utf8")]));

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function findEmitterFiles(key: string) {
  const pattern = new RegExp(`\\b${escapeRegExp(key)}\\b\\s*:`);
  return sourceFiles.filter((file) => pattern.test(sourceByFile.get(file) ?? ""));
}

function formatReport(
  rows: Array<{
    id: string;
    key: string;
    name: string;
    derived?: boolean;
    builtin?: boolean;
    emitters?: string[];
  }>
) {
  return rows
    .map((row) => {
      const emitters = (row.emitters ?? [])
        .map((file) => relative(process.cwd(), file))
        .join(", ");
      return [
        `${row.id} (${row.name})`,
        `key=${row.key || "-"}`,
        `derived=${row.derived ? "yes" : "no"}`,
        `builtin=${row.builtin ? "yes" : "no"}`,
        `emitters=${emitters || "-"}`,
      ].join(" | ");
    })
    .join("\n");
}

function isCustomCondition(
  condition: AchievementCondition
): condition is Extract<AchievementCondition, { type: "custom" }> {
  return condition.type === "custom";
}

function isCounterCondition(
  condition: AchievementCondition
): condition is Extract<AchievementCondition, { type: "counter" }> {
  return condition.type === "counter";
}

describe("achievement wiring audit", () => {
  it("covers every achievement condition type in the central checker", () => {
    const missingTypes = Array.from(
      new Set(ACHIEVEMENTS.map((achievement) => achievement.condition.type))
    ).filter((type) => !checkerHandledTypes.has(type));

    expect(missingTypes).toEqual([]);
  });

  it("gives every custom achievement a detectable unlock source", () => {
    const missing = ACHIEVEMENTS.filter((achievement): achievement is Achievement & {
      condition: Extract<AchievementCondition, { type: "custom" }>;
    } => isCustomCondition(achievement.condition))
      .map((achievement) => {
        const key = achievement.condition.key;
        const derived = logicSource.includes(`case "${key}"`);
        const builtin = BUILT_IN_CUSTOM_KEYS.has(key);
        const emitters = findEmitterFiles(key);
        return {
          id: achievement.id,
          name: achievement.name,
          key,
          derived,
          builtin,
          emitters,
        };
      })
      .filter((row) => !row.derived && !row.builtin && row.emitters.length === 0);

    expect(
      missing,
      missing.length
        ? `Custom achievements without unlock source:\n${formatReport(missing)}`
        : undefined
    ).toEqual([]);
  });

  it("gives every counter achievement a detectable counter source", () => {
    const missing = ACHIEVEMENTS.filter((achievement): achievement is Achievement & {
      condition: Extract<AchievementCondition, { type: "counter" }>;
    } => isCounterCondition(achievement.condition))
      .map((achievement) => {
        const key = achievement.condition.key;
        const derived = logicSource.includes(`case "${key}"`);
        const emitters = findEmitterFiles(key);
        return {
          id: achievement.id,
          name: achievement.name,
          key,
          derived,
          emitters,
        };
      })
      .filter((row) => !row.derived && row.emitters.length === 0);

    expect(
      missing,
      missing.length
        ? `Counter achievements without source:\n${formatReport(missing)}`
        : undefined
    ).toEqual([]);
  });
});
