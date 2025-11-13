import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import authRoutes from "./routes/auth.routes";
import scoreRoutes from "./routes/score.routes";
import { corsOptions } from "./config/cors.config";

dotenv.config();

const app = express();

// ✅ CORS doit être appliqué AVANT toute route
app.use(cors(corsOptions));

// ❌ NE JAMAIS gérer manuellement OPTIONS avec regex
// Express + cors gère déjà automatiquement les preflight


// Body parser
app.use(express.json());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/scores", scoreRoutes);

app.get("/", (_, res) => res.send("✅ Tetris backend en ligne"));

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
