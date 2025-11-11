import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import authRoutes from "./routes/auth.routes";
import scoreRoutes from "./routes/score.routes";

dotenv.config();

const app = express();

const allowedOrigins = [
  "http://localhost:5173",                    // dev local
  "https://tetris.adelinemeistertzheim.fr",   // front prod
  "https://www.tetris.adelinemeistertzheim.fr", // si tu veux gérer le www
];

app.use(cors({
  origin: (origin, callback) => {
    // autorise si aucune origine (ex: Postman) ou si dans la liste
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn("❌ CORS rejeté pour :", origin);
      callback(new Error("CORS non autorisé"));
    }
  },
  credentials: true,
}));

app.use(express.json());
app.use("/api/auth", authRoutes);
app.use("/api/scores", scoreRoutes);

app.get("/", (_, res) => res.send("✅ Tetris backend en ligne"));

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
