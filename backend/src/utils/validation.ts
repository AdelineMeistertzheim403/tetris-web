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

export const brickfallVersusMatchSchema = z.object({
  matchId: z.string().trim().min(1).max(64).optional(),
  players: z
    .array(
      z.object({
        slot: z.number().int().min(1).max(2),
        userId: z.number().int().min(1).optional(),
        pseudo: z.string().trim().min(1).max(32),
        role: z.enum(["ARCHITECT", "DEMOLISHER"]),
        score: z.number().int().min(0).max(1_000_000),
        lines: z.number().int().min(0).max(2_000),
      })
    )
    .length(2),
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
  loginDays: z.array(z.string().trim().min(1).max(10)).max(400),
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
  type: z.enum(["normal", "armor", "bonus", "malus", "explosive"]),
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
