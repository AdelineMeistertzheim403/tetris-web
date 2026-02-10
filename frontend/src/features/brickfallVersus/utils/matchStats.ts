import type { BrickfallRole, BrickfallWinReason } from "../config/balance";

const STORAGE_KEY = "brickfall-versus-round-stats-v1";

export type BrickfallRoundStat = {
  at: number;
  matchId: string | null;
  playerRole: BrickfallRole;
  winnerRole: BrickfallRole;
  reason: BrickfallWinReason;
  durationMs: number;
  blocksDestroyed: number;
};

type BrickfallStatsStore = {
  rounds: BrickfallRoundStat[];
};

export type BrickfallStatsSummary = {
  totalRounds: number;
  architectWins: number;
  demolisherWins: number;
  architectWinRate: number;
  demolisherWinRate: number;
};

function readStore(): BrickfallStatsStore {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { rounds: [] };
    const parsed = JSON.parse(raw) as BrickfallStatsStore;
    if (!parsed || !Array.isArray(parsed.rounds)) return { rounds: [] };
    return parsed;
  } catch {
    return { rounds: [] };
  }
}

function writeStore(store: BrickfallStatsStore) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // Ignore storage errors to avoid blocking gameplay.
  }
}

export function summarizeBrickfallStats(rounds: BrickfallRoundStat[]): BrickfallStatsSummary {
  const totalRounds = rounds.length;
  const architectWins = rounds.filter((r) => r.winnerRole === "ARCHITECT").length;
  const demolisherWins = rounds.filter((r) => r.winnerRole === "DEMOLISHER").length;
  return {
    totalRounds,
    architectWins,
    demolisherWins,
    architectWinRate: totalRounds ? architectWins / totalRounds : 0,
    demolisherWinRate: totalRounds ? demolisherWins / totalRounds : 0,
  };
}

export function recordBrickfallRound(round: BrickfallRoundStat): BrickfallStatsSummary {
  const store = readStore();
  const rounds = [...store.rounds, round].slice(-500);
  writeStore({ rounds });
  const summary = summarizeBrickfallStats(rounds);
  console.info("[BrickfallStats]", {
    round,
    summary: {
      ...summary,
      architectWinRatePct: Math.round(summary.architectWinRate * 100),
      demolisherWinRatePct: Math.round(summary.demolisherWinRate * 100),
    },
  });
  return summary;
}

export function readBrickfallRounds(): BrickfallRoundStat[] {
  return readStore().rounds;
}
