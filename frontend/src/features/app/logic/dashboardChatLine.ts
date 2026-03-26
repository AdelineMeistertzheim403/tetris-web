import type { AchievementStats } from "../../achievements/types/achievementStats";
import type { BotLevel } from "../../achievements/types/tetrobots";
import {
  TETROBOT_DASHBOARD_CHAT_GLOBAL_LINES,
  TETROBOT_DASHBOARD_CHAT_META,
  TETROBOT_DASHBOARD_CHAT_RARE_LINES,
  TETROBOT_DASHBOARD_PIXEL_LINES,
  TETROBOT_IDS,
} from "../../tetrobots/data/tetrobotsContent";
import { getChatLinesForLevel } from "../../tetrobots/logic/dashboardNarrative";
import {
  getFoundTetrobotAnomalyIds,
  pickRandomTetrobotAnomaly,
  TETROBOT_POST_FINALE_LINES,
  type TetrobotFinaleState,
} from "../../tetrobots/logic/tetrobotAnomalies";
import type { DashboardBot } from "../../tetrobots/logic/dashboardNarrative";
import type { DashboardChatLine } from "./dashboardModels";

export const DASHBOARD_BOT_ROTATION_MS = 60_000;

type DashboardChatLineSelectionArgs = {
  apexLevel: BotLevel;
  botMatches: number;
  botWins: number;
  brickfallWins: number;
  counters: AchievementStats["counters"];
  finaleChoice: TetrobotFinaleState["choice"];
  inactive: boolean;
  previousBot: DashboardBot;
  pulseLevel: BotLevel;
  roguelikeVersusMatches: number;
  roguelikeVersusWins: number;
  rookieLevel: BotLevel;
  rotationSlot: number;
  tetromazeWins: number;
  versusMatches: number;
  versusWins: number;
};

function hashSelectionKey(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function createDeterministicRandom(seed: string) {
  let state = hashSelectionKey(seed) || 1;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function pickDeterministic<T>(items: T[], random: () => number): T {
  return items[Math.floor(random() * items.length)] as T;
}

function getSelectionSeed({
  apexLevel,
  botMatches,
  botWins,
  brickfallWins,
  counters,
  finaleChoice,
  inactive,
  pulseLevel,
  rookieLevel,
  roguelikeVersusMatches,
  roguelikeVersusWins,
  rotationSlot,
  tetromazeWins,
  versusMatches,
  versusWins,
}: Omit<DashboardChatLineSelectionArgs, "previousBot">) {
  const foundAnomalyIds = getFoundTetrobotAnomalyIds(counters);
  const versusLosses = Math.max(0, versusMatches - versusWins);
  const roguelikeVersusLosses = Math.max(
    0,
    roguelikeVersusMatches - roguelikeVersusWins
  );
  const botLosses = Math.max(0, botMatches - botWins);
  const totalWins = versusWins + roguelikeVersusWins + botWins + brickfallWins + tetromazeWins;
  const totalLosses = versusLosses + roguelikeVersusLosses + botLosses;

  return JSON.stringify({
    rotationSlot,
    rookieLevel,
    pulseLevel,
    apexLevel,
    finaleChoice,
    inactive,
    totalWins,
    totalLosses,
    foundAnomalyIds,
  });
}

export function getDashboardChatRotationSlot(now = Date.now()) {
  return Math.floor(now / DASHBOARD_BOT_ROTATION_MS);
}

export function selectDashboardChatLine({
  apexLevel,
  botMatches,
  botWins,
  brickfallWins,
  counters,
  finaleChoice,
  inactive,
  previousBot,
  pulseLevel,
  roguelikeVersusMatches,
  roguelikeVersusWins,
  rookieLevel,
  rotationSlot,
  tetromazeWins,
  versusMatches,
  versusWins,
}: DashboardChatLineSelectionArgs): DashboardChatLine {
  const selectionSeed = getSelectionSeed({
    apexLevel,
    botMatches,
    botWins,
    brickfallWins,
    counters,
    finaleChoice,
    inactive,
    pulseLevel,
    roguelikeVersusMatches,
    roguelikeVersusWins,
    rookieLevel,
    rotationSlot,
    tetromazeWins,
    versusMatches,
    versusWins,
  });
  const random = createDeterministicRandom(selectionSeed);
  const resolvePixelHostBot = () => previousBot ?? pickDeterministic(TETROBOT_IDS, random);
  const pickBot = () => pickDeterministic(TETROBOT_IDS, random);
  const versusLosses = Math.max(0, versusMatches - versusWins);
  const roguelikeVersusLosses = Math.max(
    0,
    roguelikeVersusMatches - roguelikeVersusWins
  );
  const botLosses = Math.max(0, botMatches - botWins);
  const totalWins = versusWins + roguelikeVersusWins + botWins + brickfallWins + tetromazeWins;
  const totalLosses = versusLosses + roguelikeVersusLosses + botLosses;

  if (random() < 0.01) {
    const bot = pickBot();
    return {
      bot,
      speaker: bot,
      text: pickDeterministic(TETROBOT_DASHBOARD_CHAT_RARE_LINES, random),
      anomaly: null,
    };
  }

  if (finaleChoice && random() < (finaleChoice === "break" ? 0.28 : 0.2)) {
    const finaleLine = pickDeterministic(TETROBOT_POST_FINALE_LINES[finaleChoice], random);
    return {
      bot: finaleLine.speaker === "pixel" ? resolvePixelHostBot() : finaleLine.speaker,
      speaker: finaleLine.speaker,
      text: finaleLine.text,
      anomaly: null,
    };
  }

  if (random() < 0.14) {
    const anomaly = pickRandomTetrobotAnomaly(counters, random);
    if (anomaly) {
      return {
        bot: anomaly.bot === "pixel" ? resolvePixelHostBot() : anomaly.bot,
        speaker: anomaly.bot,
        text: anomaly.text,
        anomaly,
      };
    }
  }

  if (random() < 0.08) {
    return {
      bot: resolvePixelHostBot(),
      speaker: "pixel",
      text: pickDeterministic(TETROBOT_DASHBOARD_PIXEL_LINES, random),
      anomaly: null,
    };
  }

  const metaChance = random();
  if (inactive && metaChance < 0.35) {
    const bot = pickBot();
    return {
      bot,
      speaker: bot,
      text: TETROBOT_DASHBOARD_CHAT_META.inactive[bot],
      anomaly: null,
    };
  }

  if (totalLosses >= Math.max(5, totalWins * 1.3) && metaChance < 0.35) {
    const bot = pickBot();
    return {
      bot,
      speaker: bot,
      text: TETROBOT_DASHBOARD_CHAT_META.lowPerformance[bot],
      anomaly: null,
    };
  }

  if (totalWins >= Math.max(8, totalLosses * 1.4) && metaChance < 0.35) {
    const bot = pickBot();
    return {
      bot,
      speaker: bot,
      text: TETROBOT_DASHBOARD_CHAT_META.highPerformance[bot],
      anomaly: null,
    };
  }

  if (random() < 0.22) {
    const bot = pickBot();
    return {
      bot,
      speaker: bot,
      text: pickDeterministic(TETROBOT_DASHBOARD_CHAT_GLOBAL_LINES, random),
      anomaly: null,
    };
  }

  const bot = pickBot();
  const level = bot === "rookie" ? rookieLevel : bot === "pulse" ? pulseLevel : apexLevel;
  return {
    bot,
    speaker: bot,
    text: pickDeterministic(getChatLinesForLevel(bot, level), random),
    anomaly: null,
  };
}
