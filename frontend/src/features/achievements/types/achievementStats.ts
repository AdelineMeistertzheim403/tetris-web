import type { GameMode } from "../../game/types/GameMode";
import type {
  BotMemoryEntry,
  MistakeLastSeenStats,
  MistakeStats,
  ModeBehaviorStats,
  PlayerBehaviorMode,
  PlayerBotProgression,
  PlayerLongTermMemory,
  TetrobotAffinityLedger,
  TetrobotChallengeState,
  TetrobotId,
  TetrobotLevelUp,
  TetrobotXpLedger,
} from "./tetrobots";

export type AchievementStats = {
  runsPlayed: number;
  seedRuns: Record<string, number>;
  loginDays: string[];
  historyViewedCount: number;
  modesVisited: Record<GameMode, boolean>;
  level10Modes: Record<GameMode, boolean>;
  scoredModes: Record<GameMode, boolean>;
  playtimeMs: number;
  noHoldRuns: number;
  hardDropCount: number;
  versusMatches: number;
  versusWins: number;
  versusWinStreak: number;
  versusLinesSent: number;
  botMatches: number;
  botWins: number;
  botWinStreak: number;
  botApexWins: number;
  roguelikeVersusMatches: number;
  roguelikeVersusWins: number;
  roguelikeVersusWinStreak: number;
  roguelikeVersusLinesSent: number;
  brickfallSoloLevelsCleared: number;
  brickfallSoloBlocksDestroyed: number;
  brickfallSoloBestWorld: number;
  brickfallSoloCampaignCleared: boolean;
  brickfallSoloEditorCreated: number;
  brickfallSoloEditorWins: number;
  brickfallMatches: number;
  brickfallWins: number;
  brickfallArchitectWins: number;
  brickfallDemolisherWins: number;
  lastScore: number | null;
  puzzleCompletedIds: string[];
  puzzleOptimalCount: number;
  puzzleNoHoldCount: number;
  puzzleSurviveCount: number;
  puzzleFreeZonesTotal: number;
  puzzleLinesTotal: number;
  puzzleWinStreak: number;
  puzzleAttemptsById: Record<string, number>;
  tetromazeRuns: number;
  tetromazeWins: number;
  tetromazeEscapesTotal: number;
  tetromazeEscapesRookie: number;
  tetromazeEscapesPulse: number;
  tetromazeEscapesApex: number;
  tetromazePowerUses: number;
  tetromazeCaptures: number;
  playerBehaviorByMode: Record<PlayerBehaviorMode, ModeBehaviorStats>;
  playerMistakesByMode: Record<PlayerBehaviorMode, MistakeStats>;
  playerMistakeLastSeenByMode: Record<PlayerBehaviorMode, MistakeLastSeenStats>;
  lastPlayedMode: PlayerBehaviorMode | null;
  mostPlayedMode: PlayerBehaviorMode | null;
  lowestWinrateMode: PlayerBehaviorMode | null;
  tetrobotProgression: PlayerBotProgression;
  tetrobotXpLedger: TetrobotXpLedger;
  tetrobotAffinityLedger: TetrobotAffinityLedger;
  playerLongTermMemory: PlayerLongTermMemory;
  tetrobotMemories: Record<TetrobotId, BotMemoryEntry[]>;
  lastTetrobotLevelUp: TetrobotLevelUp;
  activeTetrobotChallenge: TetrobotChallengeState | null;
  counters: Record<string, number>;
};
