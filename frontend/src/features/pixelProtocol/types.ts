export type Tetromino = "I" | "O" | "T" | "L" | "J" | "S" | "Z";
export type PlatformType =
  | "stable"
  | "unstable"
  | "rotating"
  | "glitch"
  | "bounce"
  | "grapplable"
  | "armored"
  | "hackable";
export type EnemyKind = "rookie" | "pulse" | "apex";
export type PixelSkill =
  | "DATA_GRAPPLE"
  | "OVERJUMP"
  | "PHASE_SHIFT"
  | "PULSE_SHOCK"
  | "OVERCLOCK_MODE"
  | "TIME_BUFFER"
  | "PLATFORM_SPAWN";

export type DataOrbAffinity = "standard" | "blue" | "red" | "green" | "purple";

export type AbilityFlags = {
  doubleJump: boolean;
  extraAirJumps: number;
  airDash: boolean;
  hackWave: boolean;
  shield: boolean;
  overjump: boolean;
  dataGrapple: boolean;
  phaseShift: boolean;
  pulseShock: boolean;
  overclockMode: boolean;
  timeBuffer: boolean;
  platformSpawn: boolean;
};

export type PlatformDef = {
  id: string;
  tetromino: Tetromino;
  x: number;
  y: number;
  rotation?: 0 | 1 | 2 | 3;
  type: PlatformType;
  rotateEveryMs?: number;
};

export type DataOrb = {
  id: string;
  x: number;
  y: number;
  affinity?: DataOrbAffinity;
  grantsSkill?: PixelSkill | null;
  taken?: boolean;
};

// Un checkpoint stocke a la fois le marqueur visible et la position de respawn.
export type Checkpoint = {
  id: string;
  x: number;
  y: number;
  spawnX: number;
  spawnY: number;
  activated?: boolean;
};

export type Enemy = {
  id: string;
  kind: EnemyKind;
  x: number;
  y: number;
  vx: number;
  minX: number;
  maxX: number;
  stunnedUntil: number;
};

export type LevelDef = {
  id: string;
  world: number;
  name: string;
  worldWidth: number;
  requiredOrbs: number;
  spawn: { x: number; y: number };
  portal: { x: number; y: number };
  platforms: PlatformDef[];
  checkpoints: Checkpoint[];
  orbs: DataOrb[];
  enemies: Enemy[];
};

export type Player = {
  x: number;
  y: number;
  w: number;
  h: number;
  vx: number;
  vy: number;
  facing: 1 | -1;
  grounded: boolean;
  jumpsLeft: number;
  hp: number;
  dashUntil: number;
  dashCooldownUntil: number;
  invulnUntil: number;
  phaseShiftUntil: number;
  phaseShiftCooldownUntil: number;
  overclockUntil: number;
  overclockCooldownUntil: number;
  pulseShockCooldownUntil: number;
  timeBufferCooldownUntil: number;
  platformSpawnCooldownUntil: number;
  grappleUntil: number;
  grappleCooldownUntil: number;
  grappleTargetX: number | null;
  grappleTargetY: number | null;
  grappleLandY: number | null;
};

// Les plateformes runtime portent un etat temporaire qui ne doit jamais revenir dans les donnees de niveau.
export type RuntimePlatform = PlatformDef & {
  currentRotation: 0 | 1 | 2 | 3;
  active: boolean;
  unstableWakeAt: number;
  unstableDropAt: number;
  hackedUntil: number;
  nextRotateAt: number;
  expiresAt: number | null;
  temporary: boolean;
};

export type GrappleAnchor = {
  x: number;
  y: number;
  landY: number;
  platformId: string;
};

export type PlayerHistoryEntry = {
  at: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  facing: 1 | -1;
  grounded: boolean;
  jumpsLeft: number;
  hp: number;
};

export type GameRuntime = {
  startedAt: number;
  player: Player;
  platforms: RuntimePlatform[];
  checkpoints: Checkpoint[];
  respawn: { x: number; y: number };
  orbs: DataOrb[];
  enemies: Enemy[];
  cameraX: number;
  cameraY: number;
  collected: number;
  history: PlayerHistoryEntry[];
  status: "running" | "won" | "lost";
  message: string;
};

// Rect est la primitive de collision commune au joueur, aux ennemis, aux blocs et aux objectifs.
export type Rect = {
  x: number;
  y: number;
  w: number;
  h: number;
  platformId?: string;
  type?: PlatformType;
};

export type InputSnapshot = {
  left: boolean;
  right: boolean;
  wantJump: boolean;
  wantDash: boolean;
  wantHack: boolean;
  wantGrapple: boolean;
  wantPhaseShift: boolean;
  wantPulseShock: boolean;
  wantOverclock: boolean;
  wantTimeBuffer: boolean;
  wantPlatformSpawn: boolean;
  wantRespawn: boolean;
};
