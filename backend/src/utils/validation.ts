// src/utils/validation.ts
import { z } from "zod";
import { GameMode } from "../types/GameMode";

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
  score: z.number().int().min(0).max(2_000_000),
  lines: z.number().int().min(0).max(5_000),
  level: z.number().int().min(1).max(200),
  perks: z.array(z.string().trim().min(1).max(50)).max(40),
  mutations: z
    .array(
      z.object({
        id: z.string().trim().min(1).max(50),
        stacks: z.number().int().min(0).max(50),
      })
    )
    .max(40),
  bombs: z.number().int().min(0).max(50),
  timeFreezeCharges: z.number().int().min(0).max(50),
  chaosMode: z.boolean(),
  gravityMultiplier: z.number().min(0.05).max(20),
  scoreMultiplier: z.number().min(0.1).max(50),
});

export const roguelikeEndSchema = z.object({
  status: z.enum(["FINISHED", "ABANDONED"]),
});
