import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import authRoutes from "./routes/auth.routes";
import scoreRoutes from "./routes/score.routes";
import { corsOptions } from "./config/cors.config";

dotenv.config();

const app = express();

// ✅ CORS global avant les routes
app.use(cors(corsOptions));

app.use(express.json());

// ✅ Routes API
app.use("/api/auth", authRoutes);
app.use("/api/scores", scoreRoutes);

// ✅ Route de test
app.get("/", (_, res) => res.send("✅ Tetris backend en ligne"));

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
