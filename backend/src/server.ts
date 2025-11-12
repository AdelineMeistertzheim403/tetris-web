import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import authRoutes from "./routes/auth.routes";
import scoreRoutes from "./routes/score.routes";
import { corsOptions } from "./config/cors.config";

dotenv.config();

const app = express();

// CORS correctement appliqué
app.use(cors(corsOptions));

// Fix OPTIONS pour éviter l’erreur path-to-regexp
app.use((req, res, next) => {
  if (req.method === "OPTIONS") {
    res.set("Access-Control-Allow-Origin", req.headers.origin || "*");
    res.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
    return res.sendStatus(204);
  }
  next();
});

app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/scores", scoreRoutes);

app.get("/", (_, res) => res.send("✅ Tetris backend en ligne"));

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
