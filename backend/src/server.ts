import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import authRoutes from "./routes/auth.routes";
import scoreRoutes from "./routes/score.routes";
import { corsOptions } from "./config/cors.config";

dotenv.config();

const app = express();

const allowedOrigins = [
  "http://localhost:5173",                    // dev local
  "https://tetris.adelinemeistertzheim.fr",   // front prod
  "https://www.tetris.adelinemeistertzheim.fr", // si tu veux gérer le www
];

app.use(cors(corsOptions));

app.use(express.json());
app.use("/api/auth", authRoutes);
app.use("/api/scores", scoreRoutes);

app.get("/", (_, res) => res.send("✅ Tetris backend en ligne"));

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
