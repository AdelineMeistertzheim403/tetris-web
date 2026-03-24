import type { GameMode } from "../../game/types/GameMode";

export type PlayerBehaviorMode = GameMode | "PIXEL_PROTOCOL";
export type TetrobotId = "rookie" | "pulse" | "apex";
export type BotLevel = 1 | 2 | 3 | 4 | 5;
export type BotMood = "angry" | "neutral" | "friendly" | "respect";
export type BotTrait =
  | "contextualTips"
  | "errorDetection"
  | "performanceAnalysis"
  | "deepOptimization"
  | "provocation"
  | "hardcoreCoach";

export type BotState = {
  level: BotLevel;
  xp: number;
  affinity: number;
  mood: BotMood;
  unlockedTraits: BotTrait[];
  lastTip?: string;
};

export type PlayerBotProgression = Record<TetrobotId, BotState>;

export type TetrobotXpEvent =
  | "play_game"
  | "win_game"
  | "try_new_mode"
  | "fail_repeated"
  | "improve_stat";

export type TetrobotXpLedger = Record<TetrobotXpEvent, number>;

export type TetrobotAffinityEvent =
  | "play_regularly"
  | "rage_quit"
  | "improve_stat"
  | "repeat_mistake"
  | "challenge_yourself"
  | "avoid_weakness";

export type TetrobotAffinityLedger = Record<TetrobotAffinityEvent, number>;

export type TetrobotLevelUp = {
  bot: TetrobotId;
  level: BotLevel;
  unlockedTraits: BotTrait[];
  message: string;
  at: number;
} | null;

export type PlayerMistakeKey =
  | "holes"
  | "top_out"
  | "slow"
  | "unsafe_stack"
  | "damage_taken"
  | "misread"
  | "panic_stack"
  | "slow_decision"
  | "greedy_play"
  | "mode_avoidance"
  | "inconsistent_precision";

export type BotMemoryType =
  | "player_progress"
  | "player_failure"
  | "player_avoidance"
  | "player_comeback"
  | "trust_break"
  | "trust_rebuild";

export type ApexTrustState = "open" | "warning" | "cold" | "refusing";

export type MistakeMemory = {
  key: PlayerMistakeKey;
  count: number;
  lastSeenAt: number;
  severity: number;
  trend: "up" | "down" | "stable";
};

export type MistakePhase = "early" | "mid" | "late";
export type MistakePressure = "low" | "medium" | "high";
export type MistakeTrigger = "timeout" | "collapse" | "tilt" | "attrition" | "unknown";

export type ContextualMistakeEntry = {
  key: PlayerMistakeKey;
  phase: MistakePhase;
  pressure: MistakePressure;
  trigger: MistakeTrigger;
};

export type ContextualMistakePattern = {
  key: PlayerMistakeKey;
  phase: MistakePhase;
  pressure: MistakePressure;
  trigger: MistakeTrigger;
  count: number;
  trend: "up" | "down" | "stable";
};

export type PlayerRunContext = {
  boardMaxHeight?: number;
  comboPeak?: number;
  livesRemaining?: number;
  pressureScore?: number;
  stageIndex?: number;
};

export type PlayerRunTimelineTag =
  | "pressure_spike"
  | "recovery"
  | "execution_peak"
  | "resource_loss";

export type PlayerRunTimelineSample = {
  atMs: number;
  phase: MistakePhase;
  runContext: PlayerRunContext;
  tags: PlayerRunTimelineTag[];
};

export type PlayerRunSnapshot = {
  at: number;
  won: boolean;
  durationMs: number;
  mistakeCount: number;
  mistakes: PlayerMistakeKey[];
  contextualMistakes: ContextualMistakeEntry[];
  rageQuitEstimate: boolean;
  runContext?: PlayerRunContext;
  timelineSamples: PlayerRunTimelineSample[];
};

export type PlayerModeProfile = {
  recentRuns: number;
  recentWinRate: number;
  recentMistakeRate: number;
  averageDurationMs: number;
  resilienceScore: number;
  pressureIndex: number;
  averagePressureScore: number;
  averageBoardHeight: number;
  resourceStability: number;
  executionPeak: number;
  averageStageIndex: number;
  volatilityIndex: number;
  recoveryScore: number;
  improvementTrend: "up" | "down" | "stable";
  dominantMistakes: PlayerMistakeKey[];
};

export type PlayerLongTermMemory = {
  recurringMistakes: MistakeMemory[];
  avoidedModes: Record<string, number>;
  strongestModes: Record<string, number>;
  weakestModes: Record<string, number>;
  rageQuitCount: number;
  comebackCount: number;
  consistencyScore: number;
  courageScore: number;
  disciplineScore: number;
  regularityScore: number;
  strategyScore: number;
  weakestModeFocus: PlayerBehaviorMode | null;
  strongestModeFocus: PlayerBehaviorMode | null;
  lingeringResentment: Record<TetrobotId, number>;
  activeRecommendations: Record<TetrobotId, TetrobotRecommendation | null>;
  activeConflict: TetrobotConflict | null;
  activeExclusiveAlignment: TetrobotExclusiveAlignment | null;
  recentRunsByMode: Record<PlayerBehaviorMode, PlayerRunSnapshot[]>;
  modeProfiles: Record<PlayerBehaviorMode, PlayerModeProfile>;
  contextualMistakePatterns: Record<PlayerBehaviorMode, ContextualMistakePattern[]>;
};

export type TetrobotRecommendationKind =
  | "play_underplayed_mode"
  | "reduce_mistakes"
  | "train_weak_mode";

export type TetrobotRecommendation = {
  bot: TetrobotId;
  kind: TetrobotRecommendationKind;
  targetMode: PlayerBehaviorMode | null;
  reason: string;
  issuedAt: number;
  lastEvaluatedAt: number;
  totalSessionsAtIssue: number;
  targetModeSessionsAtIssue: number;
  ignoredSessions: number;
  ignoreThreshold: number;
  ignoredMs: number;
  ignoreThresholdMs: number;
  penaltyCount: number;
};

export type TetrobotConflict = {
  id: string;
  challenger: TetrobotId;
  opponent: TetrobotId;
  challengerMode: PlayerBehaviorMode | null;
  opponentMode: PlayerBehaviorMode | null;
  issuedAt: number;
  totalSessionsAtIssue: number;
  challengerModeSessionsAtIssue: number;
  opponentModeSessionsAtIssue: number;
  resolvedAt: number | null;
  chosenBot: TetrobotId | null;
  summary: string;
};

export type TetrobotExclusiveAlignment = {
  favoredBot: TetrobotId;
  blockedBot: TetrobotId;
  issuedAt: number;
  expiresAt: number;
  sessionsRemaining: number;
  reason: string;
  favoredLine: string;
  blockedLine: string;
  lockedAdvice: string[];
  objectiveLabel: string;
  objectiveMode: PlayerBehaviorMode | null;
  objectiveStartSessions: number;
  objectiveTargetSessions: number;
  objectiveProgress: number;
  rewardAffinity: number;
  rewardXp: number;
  rewardClaimed: boolean;
};

export type BotMemoryEntry = {
  id: string;
  bot: TetrobotId;
  type: BotMemoryType;
  text: string;
  importance: 1 | 2 | 3 | 4 | 5;
  createdAt: number;
};

export type TetrobotChallengeState = {
  id: string;
  bot: TetrobotId;
  kind: "apex_reconciliation";
  status: "offered" | "active" | "completed";
  title: string;
  description: string;
  targetMode: PlayerBehaviorMode | null;
  targetCount: number;
  progress: number;
  rewardAffinity: number;
  rewardXp: number;
  startSessions: number;
  startRageQuitCount: number;
  createdAt: number;
  acceptedAt: number | null;
  resolvedAt: number | null;
};

export type ModeBehaviorStats = {
  sessions: number;
  wins: number;
  losses: number;
  totalDurationMs: number;
  lastPlayedAt: number | null;
};

export type MistakeStats = Record<PlayerMistakeKey, number>;
export type MistakeLastSeenStats = Record<PlayerMistakeKey, number | null>;

export type PlayerBehaviorEvent = {
  mode: PlayerBehaviorMode;
  won?: boolean;
  durationMs?: number;
  mistakes?: PlayerMistakeKey[];
  contextualMistakes?: ContextualMistakeEntry[];
  runContext?: PlayerRunContext;
  timelineSamples?: PlayerRunTimelineSample[];
};

export type TetrobotAchievementEvent =
  | { type: "tip_read"; bot: TetrobotId }
  | { type: "rookie_tip_followed" }
  | { type: "pulse_advice_success" }
  | { type: "apex_refusal" }
  | { type: "apex_trust_restored" }
  | { type: "apex_challenge_accepted" };
