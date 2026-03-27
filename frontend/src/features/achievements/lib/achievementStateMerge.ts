import type {
  MistakeLastSeenStats,
  MistakeStats,
  ModeBehaviorStats,
  PlayerBehaviorMode,
  PlayerMistakeKey,
  TetrobotChallengeState,
} from "../types/tetrobots";

const PLAYER_BEHAVIOR_MODES: PlayerBehaviorMode[] = [
  "CLASSIQUE",
  "SPRINT",
  "VERSUS",
  "BRICKFALL_SOLO",
  "ROGUELIKE",
  "ROGUELIKE_VERSUS",
  "PUZZLE",
  "TETROMAZE",
  "PIXEL_INVASION",
  "PIXEL_PROTOCOL",
];

const MISTAKE_KEYS: PlayerMistakeKey[] = [
  "holes",
  "top_out",
  "slow",
  "unsafe_stack",
  "damage_taken",
  "misread",
  "panic_stack",
  "slow_decision",
  "greedy_play",
  "mode_avoidance",
  "inconsistent_precision",
];

const CHALLENGE_STATUS_PRIORITY: Record<TetrobotChallengeState["status"], number> = {
  offered: 0,
  active: 1,
  completed: 2,
};

function maxNullable(left: number | null, right: number | null) {
  if (left === null) return right;
  if (right === null) return left;
  return Math.max(left, right);
}

function minNullable(left: number | null, right: number | null) {
  if (left === null) return right;
  if (right === null) return left;
  return Math.min(left, right);
}

function getChallengeRecency(challenge: TetrobotChallengeState) {
  return Math.max(challenge.resolvedAt ?? 0, challenge.acceptedAt ?? 0, challenge.createdAt);
}

export function mergeModeBehaviorStats(
  local: Record<PlayerBehaviorMode, ModeBehaviorStats>,
  remote: Record<PlayerBehaviorMode, ModeBehaviorStats>
) {
  return Object.fromEntries(
    PLAYER_BEHAVIOR_MODES.map((mode) => {
      const localStats = local[mode];
      const remoteStats = remote[mode];
      const wins = Math.max(localStats.wins, remoteStats.wins);
      const losses = Math.max(localStats.losses, remoteStats.losses);
      return [
        mode,
        {
          sessions: Math.max(localStats.sessions, remoteStats.sessions, wins + losses),
          wins,
          losses,
          totalDurationMs: Math.max(localStats.totalDurationMs, remoteStats.totalDurationMs),
          lastPlayedAt: maxNullable(localStats.lastPlayedAt, remoteStats.lastPlayedAt),
        },
      ];
    })
  ) as Record<PlayerBehaviorMode, ModeBehaviorStats>;
}

export function mergeMistakeStats(
  local: Record<PlayerBehaviorMode, MistakeStats>,
  remote: Record<PlayerBehaviorMode, MistakeStats>
) {
  return Object.fromEntries(
    PLAYER_BEHAVIOR_MODES.map((mode) => [
      mode,
      Object.fromEntries(
        MISTAKE_KEYS.map((key) => [key, Math.max(local[mode][key] ?? 0, remote[mode][key] ?? 0)])
      ) as MistakeStats,
    ])
  ) as Record<PlayerBehaviorMode, MistakeStats>;
}

export function mergeMistakeLastSeenStats(
  local: Record<PlayerBehaviorMode, MistakeLastSeenStats>,
  remote: Record<PlayerBehaviorMode, MistakeLastSeenStats>
) {
  return Object.fromEntries(
    PLAYER_BEHAVIOR_MODES.map((mode) => [
      mode,
      Object.fromEntries(
        MISTAKE_KEYS.map((key) => [key, maxNullable(local[mode][key] ?? null, remote[mode][key] ?? null)])
      ) as MistakeLastSeenStats,
    ])
  ) as Record<PlayerBehaviorMode, MistakeLastSeenStats>;
}

export function mergeTetrobotChallengeState(
  local: TetrobotChallengeState | null,
  remote: TetrobotChallengeState | null
) {
  if (!local) return remote;
  if (!remote) return local;

  if (local.id !== remote.id) {
    const localRecency = getChallengeRecency(local);
    const remoteRecency = getChallengeRecency(remote);

    if (localRecency !== remoteRecency) {
      return remoteRecency > localRecency ? remote : local;
    }

    return CHALLENGE_STATUS_PRIORITY[remote.status] > CHALLENGE_STATUS_PRIORITY[local.status]
      ? remote
      : local;
  }

  const localStatusPriority = CHALLENGE_STATUS_PRIORITY[local.status];
  const remoteStatusPriority = CHALLENGE_STATUS_PRIORITY[remote.status];
  const preferred = remoteStatusPriority > localStatusPriority ? remote : local;
  const fallback = preferred === local ? remote : local;
  const targetCount = Math.max(local.targetCount, remote.targetCount);

  return {
    ...fallback,
    ...preferred,
    title: preferred.title || fallback.title,
    description: preferred.description || fallback.description,
    targetMode: preferred.targetMode ?? fallback.targetMode,
    targetCount,
    progress: Math.min(targetCount, Math.max(local.progress, remote.progress)),
    rewardAffinity: Math.max(local.rewardAffinity, remote.rewardAffinity),
    rewardXp: Math.max(local.rewardXp, remote.rewardXp),
    startSessions: Math.min(local.startSessions, remote.startSessions),
    startRageQuitCount: Math.min(local.startRageQuitCount, remote.startRageQuitCount),
    createdAt: Math.min(local.createdAt, remote.createdAt),
    acceptedAt: minNullable(local.acceptedAt, remote.acceptedAt),
    resolvedAt: maxNullable(local.resolvedAt, remote.resolvedAt),
  };
}
