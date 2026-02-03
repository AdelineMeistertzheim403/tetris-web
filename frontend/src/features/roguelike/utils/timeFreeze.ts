import type { Dispatch, SetStateAction } from "react";

export const DEFAULT_TIME_FREEZE_DURATION_MS = 5000;

type TimeFreezePerk = {
  id: string;
  durationMs?: number;
};

export function getTimeFreezeDurationMs(
  perk: TimeFreezePerk | null | undefined,
  fallbackMs: number = DEFAULT_TIME_FREEZE_DURATION_MS
) {
  if (!perk || perk.id !== "time-freeze") return null;
  return perk.durationMs ?? fallbackMs;
}

export function applyTimeFreezeDurationFromPerk(
  perk: TimeFreezePerk,
  setTimeFreezeDuration: Dispatch<SetStateAction<number>>,
  fallbackMs: number = DEFAULT_TIME_FREEZE_DURATION_MS
) {
  const durationMs = getTimeFreezeDurationMs(perk, fallbackMs);
  if (durationMs === null) return null;
  setTimeFreezeDuration(durationMs);
  return durationMs;
}

export function applyTimeFreezeDurationUpdate(
  update: number | ((prev: number) => number),
  setTimeFreezeDuration: Dispatch<SetStateAction<number>>,
  fallbackMs: number = DEFAULT_TIME_FREEZE_DURATION_MS
) {
  setTimeFreezeDuration((prev) => {
    const next = typeof update === "function" ? update(prev) : update;
    if (!Number.isFinite(next) || next <= 0) return fallbackMs;
    return next;
  });
}
