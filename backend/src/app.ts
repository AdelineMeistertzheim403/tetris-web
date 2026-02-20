import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import rateLimit from "express-rate-limit";
import pinoHttp from "pino-http";
import authRoutes from "./routes/auth.routes";
import scoreRoutes from "./routes/score.routes";
import roguelikeRoutes from "./routes/roguelike.routes";
import achievementRoutes from "./routes/achievements.routes";
import puzzleRoutes from "./routes/puzzle.routes";
import brickfallSoloRoutes from "./routes/brickfallSolo.routes";
import tetromazeRoutes from "./routes/tetromaze.routes";
import { env } from "./config";
import { errorHandler } from "./middleware/error.middleware";
import { logger } from "./logger";

const app = express();

// Logger HTTP
app.use(
  pinoHttp({
    logger,
    redact: ["req.headers.authorization", "req.headers.cookie"],
  })
);

// Sécurité / middleware globaux
const allowedOrigins = env.allowedOrigins
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);
const isProd = env.nodeEnv === "production";

const corsConfig = {
  origin: isProd ? allowedOrigins : true, // en dev on reflète l'origine pour éviter les blocages locaux
  credentials: true,
};

app.use(
  cors(corsConfig)
);
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);
app.use(compression());
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());

// Limiteur global léger pour freiner les abus
const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 600,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(globalLimiter);

// ====== Routes ======
app.use("/api/auth", authRoutes);
app.use("/api/scores", scoreRoutes);
app.use("/api/roguelike", roguelikeRoutes);
app.use("/api/achievements", achievementRoutes);
app.use("/api/puzzles", puzzleRoutes);
app.use("/api/brickfall-solo", brickfallSoloRoutes);
app.use("/api/tetromaze", tetromazeRoutes);

app.get("/", (_, res) => res.send("Tetris backend en ligne"));

// Catch-all errors
app.use(errorHandler);

export default app;
