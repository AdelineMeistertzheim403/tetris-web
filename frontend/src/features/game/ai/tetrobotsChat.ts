import type { TetrobotsPersonality } from "./tetrobots";
import {
  TETROBOT_ADAPTIVE_SHIFT_EVOLUTION,
  TETROBOT_BUBBLE_ACCENTS,
  TETROBOT_MATCH_DIALOGUES,
  TETROBOT_MEMORY_DIALOGUES,
  TETROBOT_SCORE_TROLL_DIALOGUES,
} from "../../tetrobots/data/tetrobotsDialogues";

export type PlayerStyle =
  | "aggressive"
  | "defensive"
  | "clean"
  | "messy"
  | "panic"
  | "balanced";

export type BotEvent =
  | { type: "match_start" }
  | { type: "player_tetris" }
  | { type: "player_combo"; value: number }
  | { type: "bot_tetris" }
  | { type: "bot_blunder" }
  | { type: "player_high_stack" }
  | { type: "bot_win" }
  | { type: "bot_lose" }
  | { type: "close_call" }
  | { type: "long_match" }
  | { type: "player_back_to_back" }
  // 🔥 Roguelike Versus
  | { type: "player_perk_pick"; perk: string }
  | { type: "player_synergy"; id: string }
  | { type: "player_mutation"; id: string }
  | { type: "bot_perk_pick"; perk: string }
  | { type: "bot_synergy"; id: string }
  | { type: "chaos_triggered" }
  | { type: "bomb_sent" }
  | { type: "huge_attack" }
  | { type: "comeback" }
  | { type: "strategy_shift" }
  | { type: "bot_strategy_shift"; from: string; to: string }
  | { type: "bot_detect_aggressive_player" }
  | { type: "bot_detect_defensive_player" }
  | { type: "bot_detect_combo_spam" }
  | { type: "bot_detect_high_risk" }
  | { type: "bot_panic_mode" }
  | { type: "bot_recovered" }
  | { type: "bot_exploiting_player_pattern" }
  | { type: "bot_failed_adaptation" }
  | { type: "bot_analysis_complete" };

export type BotMood =
  | "idle"
  | "thinking"
  | "happy"
  | "angry"
  | "surprised"
  | "sad"
  | "evil"
  | "glitch"
  | "overclock"
  | "chaos";

const LAST_PICK_BY_EVENT: Partial<
  Record<TetrobotsPersonality["id"], Partial<Record<BotEvent["type"], number>>>
> = {};
const EVENT_PICK_BAGS: Partial<
  Record<TetrobotsPersonality["id"], Partial<Record<BotEvent["type"], number[]>>>
> = {};
const STRATEGY_SHIFT_COUNT: Partial<Record<TetrobotsPersonality["id"], number>> = {};

const applyTemplate = (message: string, event: BotEvent): string => {
  if (event.type === "player_combo") {
    return message.replace("{combo}", String(event.value));
  }
  if (event.type === "bot_strategy_shift") {
    return message.replace("{from}", event.from).replace("{to}", event.to);
  }
  return message;
};

const getEvolvingShiftLine = (
  personality: TetrobotsPersonality
): string | null => {
  const lines = TETROBOT_ADAPTIVE_SHIFT_EVOLUTION[personality.id];
  if (!lines || lines.length === 0) return null;
  const nextCount = (STRATEGY_SHIFT_COUNT[personality.id] ?? 0) + 1;
  STRATEGY_SHIFT_COUNT[personality.id] = nextCount;
  if (nextCount > lines.length) return null;
  return lines[nextCount - 1];
};

const shuffleIndexes = (size: number, rng: () => number): number[] => {
  const values = Array.from({ length: size }, (_, idx) => idx);
  for (let i = values.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [values[i], values[j]] = [values[j], values[i]];
  }
  return values;
};

const getDialoguePool = (
  personality: TetrobotsPersonality,
  event: BotEvent["type"]
): string[] => {
  const ownPool = TETROBOT_MATCH_DIALOGUES[personality.id]?.[event] ?? [];
  if (event !== "bot_strategy_shift") return ownPool;
  const legacyPool = TETROBOT_MATCH_DIALOGUES[personality.id]?.strategy_shift ?? [];
  return [...new Set([...ownPool, ...legacyPool])];
};

const pickDialogueIndex = (
  personality: TetrobotsPersonality,
  event: BotEvent["type"],
  poolSize: number,
  rng: () => number
): number => {
  if (!EVENT_PICK_BAGS[personality.id]) EVENT_PICK_BAGS[personality.id] = {};
  let bag = EVENT_PICK_BAGS[personality.id]![event];
  const previousIndex = LAST_PICK_BY_EVENT[personality.id]?.[event];

  if (!bag || bag.length === 0) {
    bag = shuffleIndexes(poolSize, rng);
    if (
      poolSize > 1 &&
      previousIndex !== undefined &&
      bag[0] === previousIndex
    ) {
      const swapIdx = 1 + Math.floor(rng() * (poolSize - 1));
      [bag[0], bag[swapIdx]] = [bag[swapIdx], bag[0]];
    }
    EVENT_PICK_BAGS[personality.id]![event] = bag;
  }

  return bag.shift() as number;
};

export function getBotMessage(
  personality: TetrobotsPersonality,
  event: BotEvent,
  rng: () => number = Math.random
): string | null {
  if (event.type === "bot_strategy_shift") {
    const progressive = getEvolvingShiftLine(personality);
    if (progressive && rng() < 0.55) return applyTemplate(progressive, event);
  }
  const pool = getDialoguePool(personality, event.type);
  if (!pool || pool.length === 0) return null;
  const index = pickDialogueIndex(personality, event.type, pool.length, rng);
  if (!LAST_PICK_BY_EVENT[personality.id]) {
    LAST_PICK_BY_EVENT[personality.id] = {};
  }
  LAST_PICK_BY_EVENT[personality.id]![event.type] = index;
  return applyTemplate(pool[index], event);
}

export function resetBotDialogueState(personalityId?: TetrobotsPersonality["id"]) {
  if (personalityId) {
    delete LAST_PICK_BY_EVENT[personalityId];
    delete EVENT_PICK_BAGS[personalityId];
    delete STRATEGY_SHIFT_COUNT[personalityId];
    return;
  }

  (Object.keys(LAST_PICK_BY_EVENT) as TetrobotsPersonality["id"][]).forEach((id) => {
    delete LAST_PICK_BY_EVENT[id];
  });
  (Object.keys(EVENT_PICK_BAGS) as TetrobotsPersonality["id"][]).forEach((id) => {
    delete EVENT_PICK_BAGS[id];
  });
  (Object.keys(STRATEGY_SHIFT_COUNT) as TetrobotsPersonality["id"][]).forEach((id) => {
    delete STRATEGY_SHIFT_COUNT[id];
  });
}

export function getBotBubbleAccent(personality: TetrobotsPersonality): string {
  return TETROBOT_BUBBLE_ACCENTS[personality.id];
}

export function getMoodFromEvent(
  personality: TetrobotsPersonality,
  event: BotEvent["type"]
): BotMood {
  switch (event) {
    case "match_start":
      return "thinking";
    case "player_tetris":
      return personality.id === "apex" ? "angry" : "surprised";
    case "player_combo":
      return personality.id === "rookie" ? "surprised" : "angry";
    case "player_back_to_back":
      return personality.id === "apex" ? "angry" : "surprised";
    case "bot_tetris":
      return "happy";
    case "bot_blunder":
      return "glitch";
    case "player_high_stack":
      return personality.id === "apex" ? "evil" : "thinking";
    case "bot_win":
      return personality.id === "apex" ? "evil" : "happy";
    case "bot_lose":
      return personality.id === "rookie" ? "sad" : "angry";
    case "close_call":
      return "surprised";
    case "long_match":
      return "thinking";
    case "player_perk_pick":
      return personality.id === "rookie" ? "surprised" : "thinking";
    case "player_synergy":
      return personality.id === "apex" ? "angry" : "surprised";
    case "player_mutation":
      return "thinking";
    case "bot_perk_pick":
      return "overclock";
    case "bot_synergy":
      return "overclock";
    case "chaos_triggered":
      return "chaos";
    case "bomb_sent":
      return personality.id === "apex" ? "angry" : "surprised";
    case "huge_attack":
      return personality.id === "apex" ? "evil" : "happy";
    case "comeback":
      return "surprised";
    case "strategy_shift":
      return personality.id === "apex" ? "thinking" : "overclock";
    case "bot_strategy_shift":
      return "thinking";
    case "bot_detect_aggressive_player":
      return personality.id === "apex" ? "evil" : "thinking";
    case "bot_detect_defensive_player":
      return personality.id === "apex" ? "evil" : "thinking";
    case "bot_detect_combo_spam":
      return personality.id === "apex" ? "angry" : "thinking";
    case "bot_detect_high_risk":
      return "surprised";
    case "bot_panic_mode":
      return personality.id === "rookie" ? "sad" : "angry";
    case "bot_recovered":
      return "happy";
    case "bot_exploiting_player_pattern":
      return personality.id === "apex" ? "evil" : "happy";
    case "bot_failed_adaptation":
      return personality.id === "apex" ? "angry" : "sad";
    case "bot_analysis_complete":
      return "overclock";
    default:
      return "idle";
  }
}

export function getMemoryDialogue(
  personality: TetrobotsPersonality,
  style: PlayerStyle
): string {
  return TETROBOT_MEMORY_DIALOGUES[style][personality.id];
}

export function getScoreTrollDialogue(
  personality: TetrobotsPersonality,
  playerScore: number,
  botScore: number
): string | null {
  const diff = playerScore - botScore;
  if (diff > 20000) {
    return TETROBOT_SCORE_TROLL_DIALOGUES.ahead[personality.id];
  }
  if (diff < -20000) {
    return TETROBOT_SCORE_TROLL_DIALOGUES.behind[personality.id];
  }
  return null;
}
