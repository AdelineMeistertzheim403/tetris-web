import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import rateLimit from "express-rate-limit";
import pinoHttp from "pino-http";
import authRoutes from "./routes/auth.routes";
import scoreRoutes from "./routes/score.routes";
import { env } from "./config";
import { errorHandler } from "./middleware/error.middleware";
import { logger } from "./logger";

const app = express();

// Logger HTTP
app.use(
  pinoHttp({
    logger,
    redact: ["req.headers.authorization"],
  })
);

// Sécurité / middleware globaux
const allowedOrigins = env.allowedOrigins
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

const corsConfig = {
  origin: allowedOrigins,
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

// Réponse explicite aux préflight CORS sur les routes API
app.options(/^\/api\/.*$/, cors(corsConfig));

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

app.get("/", (_, res) => res.send("Tetris backend en ligne"));

// Catch-all errors
app.use(errorHandler);

export default app;
