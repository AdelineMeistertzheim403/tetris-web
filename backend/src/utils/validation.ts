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
  value: z.number().int().min(0).max(999999),
  level: z.number().int().min(0).max(30),
  lines: z.number().int().min(0).max(9999),
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
  bombs: intWithin(0, 50),
  bombsUsed: intWithin(0, 5_000),
  timeFreezeCharges: intWithin(0, 50),
  chaosMode: z.boolean(),
  gravityMultiplier: z.number().min(0.05).max(20),
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
