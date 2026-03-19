// Parametres de configuration metier.
export const BRICKFALL_BALANCE = {
  board: {
    rows: 22,
    tetrisCols: 15,
    brickfallCols: 25,
    tetrisOffset: 5,
    initialFilledRows: 5,
  },
  match: {
    demolisherTargetBlocks: 100,
    garbageDripIntervalMs: 850,
    maxBufferedGarbage: 8,
  },
  demolisher: {
    startLives: 3,
    powerUpDropRate: 0.08,
    powerUpDurationMs: 10_000,
  },
  architect: {
    lineClearSpeedStep: 0.05,
  },
  interactions: {
    destroyedBlocksPerGarbageTrigger: 10,
  },
};

export type BrickfallRole = "ARCHITECT" | "DEMOLISHER";
export type BrickfallWinReason =
  | "timer"
  | "target_reached"
  | "architect_top_out"
  | "demolisher_no_lives"
  | "core_destroyed";
