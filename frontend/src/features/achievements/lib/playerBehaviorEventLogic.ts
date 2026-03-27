import type { PlayerBehaviorEvent, PlayerBehaviorMode } from "../types/tetrobots";

const SHORT_LOSS_IS_NOT_RAGE_QUIT_MODES: PlayerBehaviorMode[] = [
  "VERSUS",
  "ROGUELIKE_VERSUS",
];

export function estimateRageQuitFromBehaviorEvent(
  event: Pick<PlayerBehaviorEvent, "mode" | "won" | "durationMs">
) {
  if (event.won !== false) return false;

  const durationMs = Math.max(0, event.durationMs ?? 0);
  if (durationMs === 0 || durationMs >= 90_000) return false;

  return !SHORT_LOSS_IS_NOT_RAGE_QUIT_MODES.includes(event.mode);
}
