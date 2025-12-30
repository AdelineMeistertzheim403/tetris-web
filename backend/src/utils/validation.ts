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
