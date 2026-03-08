export type Tetromino = "I" | "O" | "T" | "L" | "J" | "S" | "Z";
export type DecorationType =
  | "tetromino_I"
  | "tetromino_T"
  | "tetromino_L"
  | "tetromino_Z"
  | "tetromino_O"
  | "tetromino_S"
  | "tetromino_J"
  | "tetromino_fragment"
  | "tetromino_outline"
  | "tetromino_glow_block"
  | "stacked_tetromino_blocks"
  | "tetromino_shadow"
  | "broken_tetromino"
  | "mini_tetromino_cluster"
  | "tetromino_neon_border"
  | "data_line"
  | "data_nodes"
  | "energy_pillar"
  | "data_beam"
  | "energy_core"
  | "horizontal_data_stream"
  | "vertical_data_stream"
  | "data_pulse_nodes"
  | "circuit_cross"
  | "data_arrow"
  | "packet_squares"
  | "network_hub"
  | "data_ladder"
  | "digital_crosshair"
  | "signal_beam"
  | "pixel_glitch"
  | "broken_pixels"
  | "glitch_bar"
  | "data_noise"
  | "fragment_blocks"
  | "glitch_stripes"
  | "glitch_fragments"
  | "broken_grid"
  | "pixel_noise"
  | "corrupted_blocks"
  | "glitch_diagonal"
  | "data_crack"
  | "static_bar"
  | "corruption_wave"
  | "broken_pixels_cluster"
  | "teleport_ring"
  | "portal_grid"
  | "network_triangle"
  | "data_hub"
  | "node_cluster"
  | "server_block"
  | "circuit_board"
  | "ai_eye"
  | "code_panel"
  | "matrix_block"
  | "ai_eye_large"
  | "core_processor"
  | "server_rack"
  | "ai_triangle"
  | "neural_nodes"
  | "digital_chip"
  | "circuit_hub"
  | "core_ring"
  | "data_scanner"
  | "processor_grid"
  | "grid_background"
  | "vertical_grid"
  | "floating_squares"
  | "energy_arcs"
  | "digital_wave"
  | "horizon_grid"
  | "neon_arc"
  | "floating_squares_cluster"
  | "background_circuit"
  | "data_skyline"
  | "pixel_star"
  | "neon_rectangle"
  | "digital_tunnel"
  | "data_pulse"
  | "wave_grid";
export type DecorationLayer = "far" | "mid" | "near";
export type DecorationAnimation = "none" | "pulse" | "flow" | "glitch";
export type PlatformType =
  | "stable"
  | "unstable"
  | "moving"
  | "rotating"
  | "glitch"
  | "bounce"
  | "boost"
  | "corrupted"
  | "magnetic"
  | "ice"
  | "gravity"
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
  moveAxis?: "x" | "y";
  movePattern?: "pingpong" | "loop";
  moveRangeTiles?: number;
  moveSpeed?: number;
};

export type DecorationDef = {
  id: string;
  type: DecorationType;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  opacity?: number;
  color?: string;
  colorSecondary?: string;
  layer?: DecorationLayer;
  animation?: DecorationAnimation;
  flipX?: boolean;
  flipY?: boolean;
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
  worldHeight?: number;
  requiredOrbs: number;
  spawn: { x: number; y: number };
  portal: { x: number; y: number };
  platforms: PlatformDef[];
  checkpoints: Checkpoint[];
  orbs: DataOrb[];
  enemies: Enemy[];
  decorations?: DecorationDef[];
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
  grapplePlatformId: string | null;
  groundPlatformId: string | null;
  groundedSurface: PlatformType | null;
  gravityInvertedUntil: number;
  corruptedUntil: number;
  corruptedDamageCooldownUntil: number;
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
  moveOriginX: number;
  moveOriginY: number;
  moveProgress: number;
  moveDirection: 1 | -1;
  prevX: number;
  prevY: number;
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
