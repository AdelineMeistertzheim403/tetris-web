export type Tetromino = "I" | "O" | "T" | "L" | "J" | "S" | "Z";
export type PlatformType =
  | "stable"
  | "unstable"
  | "rotating"
  | "glitch"
  | "bounce"
  | "armored"
  | "hackable";
export type EnemyKind = "rookie" | "pulse" | "apex";
export type AbilityFlags = {
  doubleJump: boolean;
  airDash: boolean;
  hackWave: boolean;
  shield: boolean;
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

export type DataOrb = { id: string; x: number; y: number; taken?: boolean };

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
};

// Les plateformes runtime portent un etat temporaire qui ne doit jamais revenir dans les donnees de niveau.
export type RuntimePlatform = PlatformDef & {
  currentRotation: 0 | 1 | 2 | 3;
  active: boolean;
  unstableWakeAt: number;
  unstableDropAt: number;
  hackedUntil: number;
  nextRotateAt: number;
};

export type GameRuntime = {
  player: Player;
  platforms: RuntimePlatform[];
  checkpoints: Checkpoint[];
  respawn: { x: number; y: number };
  orbs: DataOrb[];
  enemies: Enemy[];
  cameraX: number;
  cameraY: number;
  collected: number;
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
  wantRespawn: boolean;
};
