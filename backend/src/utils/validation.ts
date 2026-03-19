// src/utils/validation.ts
import { z } from "zod";
import { GameMode } from "../types/GameMode";

// Helper pour accepter les nombres décimaux tout en les ramenant à des entiers bornés
const intWithin = (min: number, max: number) =>
  z
    .number()
    .finite()
    .transform((v) => Math.round(v))
    .pipe(z.number().int().min(min).max(max));

const MAX_SAFE_INT = Number.MAX_SAFE_INTEGER;
const MAX_ROGUELIKE_SCORE = MAX_SAFE_INT;
const MAX_ROGUELIKE_SCORE_MULTIPLIER = MAX_SAFE_INT;
const MAX_ROGUELIKE_GRAVITY_MULTIPLIER = 100;
const MAX_ROGUELIKE_LINE_CLEARS = 5_000;
const MAX_PUZZLE_MOVES = 500;
const MAX_PUZZLE_LINES = 10_000;

export const registerSchema = z.object({
  pseudo: z.string().min(2).max(50),
  email: z.string().email(),
  password: z.string().min(6).max(100),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6).max(100),
});

const hexColorSchema = z
  .string()
  .trim()
  .regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/);

const settingsKeyBindingsSchema = z.object({
  left: z.string().trim().min(1).max(32),
  right: z.string().trim().min(1).max(32),
  down: z.string().trim().min(1).max(32),
  rotate: z.string().trim().min(1).max(32),
  harddrop: z.string().trim().min(1).max(32),
  hold: z.string().trim().min(1).max(32),
  bomb: z.string().trim().min(1).max(32),
  freeze: z.string().trim().min(1).max(32),
});

const settingsUiColorsSchema = z.object({
  accent: hexColorSchema,
  accentSecondary: hexColorSchema,
  accentWarm: hexColorSchema,
  panelBg: hexColorSchema,
  boardBg: hexColorSchema,
  boardBorder: hexColorSchema,
  text: hexColorSchema,
  muted: hexColorSchema,
});

const settingsPieceColorsSchema = z.object({
  I: hexColorSchema,
  O: hexColorSchema,
  T: hexColorSchema,
  S: hexColorSchema,
  Z: hexColorSchema,
  L: hexColorSchema,
  J: hexColorSchema,
});

export const userSettingsSchema = z.object({
  keyBindings: settingsKeyBindingsSchema,
  reducedMotion: z.boolean(),
  reducedNeon: z.boolean(),
  uiColors: settingsUiColorsSchema,
  pieceColors: settingsPieceColorsSchema,
});

export const scoreSchema = z.object({
  value: z.number().int().min(0).max(9999999),
  level: z.number().int().min(0).max(999),
  lines: z.number().int().min(0).max(99999),
  mode: z.nativeEnum(GameMode),
});

export const versusMatchSchema = z.object({
  matchId: z.string().trim().min(1).max(64).optional(),
  players: z
    .array(
      z.object({
        slot: z.number().int().min(1).max(2),
        userId: z.number().int().min(1).optional(),
        pseudo: z.string().trim().min(1).max(32),
        score: z.number().int().min(0).max(1_000_000),
        lines: z.number().int().min(0).max(2_000),
      })
    )
    .length(2),
});

export const roguelikeVersusMatchSchema = versusMatchSchema;

export const botProfileUpdateSchema = z.object({
  avgHeight: z.number().min(0).max(40),
  holes: z.number().min(0).max(60),
  comboAvg: z.number().min(0).max(20),
  tetrisRate: z.number().min(0).max(1),
  linesSent: z.number().min(0).max(500),
  linesSurvived: z.number().min(0).max(500),
  redZoneTime: z.number().min(0).max(1),
  leftBias: z.number().min(0).max(1).optional(),
  usedHold: z.boolean().optional(),
  botPersonality: z.enum(["rookie", "balanced", "apex"]).optional(),
});

export const roguelikeStartSchema = z.object({
  seed: z.string().trim().min(1).max(64),
  state: z.record(z.string(), z.any()).optional(), // valider la structure exacte cote front, borne ici au type et a la taille
});

export const roguelikeCheckpointSchema = z.object({
  score: intWithin(0, MAX_ROGUELIKE_SCORE),
  lines: intWithin(0, 5_000),
  level: intWithin(1, 200),
  perks: z.array(z.string().trim().min(1).max(50)).max(40),
  mutations: z
    .array(
      z.object({
        id: z.string().trim().min(1).max(50),
        stacks: intWithin(0, 50),
      })
    )
    .max(40),
  lineClears: z
    .object({
      single: intWithin(0, MAX_ROGUELIKE_LINE_CLEARS),
      double: intWithin(0, MAX_ROGUELIKE_LINE_CLEARS),
      triple: intWithin(0, MAX_ROGUELIKE_LINE_CLEARS),
      tetris: intWithin(0, MAX_ROGUELIKE_LINE_CLEARS),
    })
    .optional(),
  bombs: intWithin(0, 50),
  bombsUsed: intWithin(0, 5_000),
  timeFreezeCharges: intWithin(0, 50),
  chaosMode: z.boolean(),
  gravityMultiplier: z.number().min(0.05).max(MAX_ROGUELIKE_GRAVITY_MULTIPLIER),
  scoreMultiplier: z.number().min(0.1).max(MAX_ROGUELIKE_SCORE_MULTIPLIER),
});

export const roguelikeEndSchema = z.object({
  status: z.enum(["FINISHED", "ABANDONED"]),
});

export const achievementPayloadSchema = z.object({
  id: z.string().trim().min(1).max(64),
  name: z.string().trim().min(1).max(100),
  description: z.string().trim().min(1).max(500),
  icon: z.string().trim().min(1).max(100),
  category: z.string().trim().min(1).max(50),
  hidden: z.boolean().optional(),
});

export const achievementUnlockSchema = z.object({
  achievements: z.array(achievementPayloadSchema).min(1).max(100),
});

export const achievementStatsSchema = z.object({
  loginDays: z.array(z.string().trim().min(1).max(10)).max(400).optional(),
  tetrobotProgression: z.record(z.string(), z.any()).optional(),
  tetrobotXpLedger: z.record(z.string(), z.any()).optional(),
  tetrobotAffinityLedger: z.record(z.string(), z.any()).optional(),
  playerLongTermMemory: z.record(z.string(), z.any()).optional(),
  tetrobotMemories: z.record(z.string(), z.any()).optional(),
  lastTetrobotLevelUp: z.record(z.string(), z.any()).nullable().optional(),
  activeTetrobotChallenge: z.record(z.string(), z.any()).nullable().optional(),
});

export const puzzleAttemptSchema = z.object({
  success: z.boolean(),
  movesUsed: intWithin(0, MAX_PUZZLE_MOVES),
  linesCleared: intWithin(0, MAX_PUZZLE_LINES),
  piecesPlaced: intWithin(0, MAX_PUZZLE_MOVES),
  holdUsed: z.boolean(),
  efficiencyScore: intWithin(0, 1000),
  optimal: z.boolean().optional(),
});

export const puzzleSolutionSchema = z.object({
  movesUsed: intWithin(0, MAX_PUZZLE_MOVES),
  data: z.record(z.string(), z.any()),
  optimal: z.boolean().optional(),
});

const brickfallSoloBrickSchema = z.object({
  x: intWithin(0, 99),
  y: intWithin(0, 99),
  type: z.enum(["normal", "armor", "bonus", "malus", "explosive", "cursed", "mirror"]),
  hp: intWithin(1, 10).optional(),
  drop: z.string().trim().max(64).optional(),
});

export const brickfallSoloLevelSchema = z.object({
  id: z.string().trim().min(1).max(80),
  name: z.string().trim().min(1).max(120),
  width: intWithin(1, 100),
  height: intWithin(1, 100),
  boss: z.boolean().optional(),
  bricks: z.array(brickfallSoloBrickSchema).max(2500),
});

export const brickfallSoloProgressSchema = z.object({
  highestLevel: intWithin(1, 999),
});

const tetromazePosSchema = z.object({
  x: intWithin(0, 99),
  y: intWithin(0, 99),
});

const tetromazeOrbTypeSchema = z.enum([
  "OVERCLOCK",
  "GLITCH",
  "HACK",
  "LOOP",
  "FREEZE_PROTOCOL",
  "MAGNET_FIELD",
  "FIREWALL",
  "GHOST_MODE",
  "DESYNC",
  "MIRROR_SIGNAL",
  "PULSE_WAVE",
  "OVERHEAT",
  "NEURAL_LAG",
  "RANDOMIZER",
  "CORRUPTION",
  "SCAN",
  "VIRUS",
]);

const tetromazeLoopPairSchema = z.object({
  a: tetromazePosSchema,
  b: tetromazePosSchema,
});

const tetromazePowerOrbSchema = tetromazePosSchema.extend({
  type: tetromazeOrbTypeSchema,
});

const tetromazeBotHomeSchema = z.object({
  x: intWithin(0, 99),
  y: intWithin(0, 99),
  width: intWithin(1, 20),
  height: intWithin(1, 20),
  gate: z
    .object({
      x: intWithin(0, 99),
      y: intWithin(0, 99),
      width: intWithin(1, 20),
    })
    .optional(),
});

export const tetromazeLevelSchema = z.object({
  id: z.string().trim().min(1).max(80),
  name: z.string().trim().min(1).max(120).optional(),
  grid: z
    .array(z.string().trim().min(5).max(120).regex(/^[.#]+$/))
    .min(5)
    .max(120),
  playerSpawn: tetromazePosSchema,
  botSpawns: z.array(tetromazePosSchema).max(64),
  botKinds: z.array(z.enum(["rookie", "balanced", "apex"])).max(12).optional(),
  botHome: tetromazeBotHomeSchema.optional(),
  powerOrbs: z.array(tetromazePowerOrbSchema).max(128),
  loopPairs: z.array(tetromazeLoopPairSchema).max(8).optional(),
});

export const tetromazeProgressSchema = z.object({
  highestLevel: intWithin(1, 999).optional(),
  currentLevel: intWithin(1, 999).optional(),
  levelIndex: intWithin(1, 999).optional(),
  score: intWithin(0, 9_999_999).optional(),
});

const pixelCoordSchema = intWithin(-50_000, 50_000);
const tileCoordSchema = intWithin(-2_000, 2_000);

const pixelProtocolPlatformSchema = z.object({
  id: z.string().trim().min(1).max(80),
  tetromino: z.enum(["I", "O", "T", "L", "J", "S", "Z"]),
  x: tileCoordSchema,
  y: tileCoordSchema,
  rotation: z.number().int().min(0).max(3).optional(),
  type: z.enum([
    "stable",
    "unstable",
    "moving",
    "rotating",
    "glitch",
    "bounce",
    "boost",
    "corrupted",
    "magnetic",
    "ice",
    "gravity",
    "grapplable",
    "armored",
    "hackable",
  ]),
  rotateEveryMs: intWithin(0, 60_000).optional(),
  moveAxis: z.enum(["x", "y"]).optional(),
  movePattern: z.enum(["pingpong", "loop"]).optional(),
  moveRangeTiles: intWithin(1, 2_000).optional(),
  moveSpeed: intWithin(1, 4_000).optional(),
});

const pixelProtocolCheckpointSchema = z.object({
  id: z.string().trim().min(1).max(80),
  x: pixelCoordSchema,
  y: pixelCoordSchema,
  spawnX: pixelCoordSchema,
  spawnY: pixelCoordSchema,
});

const pixelProtocolSkillSchema = z.enum([
  "DATA_GRAPPLE",
  "OVERJUMP",
  "PHASE_SHIFT",
  "PULSE_SHOCK",
  "OVERCLOCK_MODE",
  "TIME_BUFFER",
  "PLATFORM_SPAWN",
]);

const pixelProtocolOrbSchema = z.object({
  id: z.string().trim().min(1).max(80),
  x: pixelCoordSchema,
  y: pixelCoordSchema,
  affinity: z.enum(["standard", "blue", "red", "green", "purple"]).optional(),
  grantsSkill: pixelProtocolSkillSchema.nullable().optional(),
});

const pixelProtocolEnemySchema = z.object({
  id: z.string().trim().min(1).max(80),
  kind: z.enum(["rookie", "pulse", "apex"]),
  x: pixelCoordSchema,
  y: pixelCoordSchema,
  vx: z.number().finite().min(-10_000).max(10_000),
  minX: pixelCoordSchema,
  maxX: pixelCoordSchema,
  stunnedUntil: z.number().finite().min(0).max(1_000_000_000),
});

const pixelProtocolBuiltinDecorationTypeSchema = z.enum([
    "tetromino_I",
    "tetromino_T",
    "tetromino_L",
    "tetromino_Z",
    "tetromino_O",
    "tetromino_S",
    "tetromino_J",
    "tetromino_fragment",
    "tetromino_outline",
    "tetromino_glow_block",
    "stacked_tetromino_blocks",
    "tetromino_shadow",
    "broken_tetromino",
    "mini_tetromino_cluster",
    "tetromino_neon_border",
    "data_line",
    "data_nodes",
    "energy_pillar",
    "data_beam",
    "energy_core",
    "horizontal_data_stream",
    "vertical_data_stream",
    "data_pulse_nodes",
    "circuit_cross",
    "data_arrow",
    "packet_squares",
    "network_hub",
    "data_ladder",
    "digital_crosshair",
    "signal_beam",
    "pixel_glitch",
    "broken_pixels",
    "glitch_bar",
    "data_noise",
    "fragment_blocks",
    "glitch_stripes",
    "glitch_fragments",
    "broken_grid",
    "pixel_noise",
    "corrupted_blocks",
    "glitch_diagonal",
    "data_crack",
    "static_bar",
    "corruption_wave",
    "broken_pixels_cluster",
    "teleport_ring",
    "portal_grid",
    "network_triangle",
    "data_hub",
    "node_cluster",
    "server_block",
    "circuit_board",
    "ai_eye",
    "code_panel",
    "matrix_block",
    "ai_eye_large",
    "core_processor",
    "server_rack",
    "ai_triangle",
    "neural_nodes",
    "digital_chip",
    "circuit_hub",
    "core_ring",
    "data_scanner",
    "processor_grid",
    "grid_background",
    "vertical_grid",
    "floating_squares",
    "energy_arcs",
    "digital_wave",
    "horizon_grid",
    "neon_arc",
    "floating_squares_cluster",
    "background_circuit",
    "data_skyline",
    "pixel_star",
    "neon_rectangle",
    "digital_tunnel",
    "data_pulse",
    "wave_grid",
  ]);

const pixelProtocolSvgPackDecorationTypeSchema = z
  .string()
  .trim()
  .regex(/^svg_pack:[a-z0-9_]+$/);

const pixelProtocolTilesetDecorationTypeSchema = z
  .string()
  .trim()
  .regex(/^tileset:[A-Za-z0-9_]+$/);

const pixelProtocolDecorationSchema = z.object({
  id: z.string().trim().min(1).max(80),
  type: z.union([
    pixelProtocolBuiltinDecorationTypeSchema,
    pixelProtocolSvgPackDecorationTypeSchema,
    pixelProtocolTilesetDecorationTypeSchema,
  ]),
  x: pixelCoordSchema,
  y: pixelCoordSchema,
  width: intWithin(4, 20_000),
  height: intWithin(4, 20_000),
  rotation: z.number().finite().min(-360).max(360).optional(),
  opacity: z.number().finite().min(0).max(1).optional(),
  color: hexColorSchema.optional(),
  colorSecondary: hexColorSchema.optional(),
  layer: z.enum(["far", "mid", "near"]).optional(),
  animation: z.enum(["none", "pulse", "flow", "glitch"]).optional(),
  flipX: z.boolean().optional(),
  flipY: z.boolean().optional(),
});

export const pixelProtocolLevelSchema = z.object({
  id: z.string().trim().min(1).max(80),
  world: intWithin(1, 99),
  name: z.string().trim().min(1).max(120),
  worldWidth: intWithin(1, 200_000),
  worldHeight: intWithin(8 * 32, 200_000).optional(),
  worldTopPadding: intWithin(0, 20_000).optional(),
  worldTemplateId: z.string().trim().min(1).max(120).nullable().optional(),
  requiredOrbs: intWithin(0, 999),
  spawn: z.object({
    x: pixelCoordSchema,
    y: pixelCoordSchema,
  }),
  portal: z.object({
    x: pixelCoordSchema,
    y: pixelCoordSchema,
  }),
  platforms: z.array(pixelProtocolPlatformSchema).max(5_000),
  checkpoints: z.array(pixelProtocolCheckpointSchema).max(5_000),
  orbs: z.array(pixelProtocolOrbSchema).max(5_000),
  enemies: z.array(pixelProtocolEnemySchema).max(2_000),
  decorations: z.array(pixelProtocolDecorationSchema).max(5_000).optional(),
});

export const pixelProtocolWorldTemplateSchema = z.object({
  id: z.string().trim().min(1).max(80),
  name: z.string().trim().min(1).max(120),
  worldWidth: intWithin(1, 200_000),
  worldHeight: intWithin(8 * 32, 200_000).optional(),
  worldTopPadding: intWithin(0, 20_000).optional(),
  decorations: z.array(pixelProtocolDecorationSchema).max(5_000),
});

export const pixelProtocolProgressSchema = z.object({
  highestLevel: intWithin(1, 999).optional(),
  currentLevel: intWithin(1, 999).optional(),
});
