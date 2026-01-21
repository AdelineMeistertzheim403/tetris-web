import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.string().optional(),
  PORT: z.coerce.number().int().positive().default(8080),
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(16, "JWT_SECRET doit faire au moins 16 caracteres"),
  RUN_TOKEN_SECRET: z.string().min(16).optional(),
  ALLOWED_ORIGINS: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Configuration invalide:", parsed.error.flatten().fieldErrors);
  process.exit(1);
}

const values = parsed.data;

export const env = {
  nodeEnv: values.NODE_ENV ?? "development",
  port: values.PORT,
  databaseUrl: values.DATABASE_URL,
  jwtSecret: values.JWT_SECRET,
  runTokenSecret: values.RUN_TOKEN_SECRET ?? values.JWT_SECRET,
  allowedOrigins: values.ALLOWED_ORIGINS ?? "http://localhost:5173",
};
