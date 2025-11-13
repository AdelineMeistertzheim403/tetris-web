import express from "express";

import dotenv from "dotenv";
import authRoutes from "./routes/auth.routes";
import scoreRoutes from "./routes/score.routes";


dotenv.config();

const app = express();

app.use(express.json());

// ====== Routes ======
app.use("/api/auth", authRoutes);
app.use("/api/scores", scoreRoutes);

app.get("/", (_, res) => res.send("✅ Tetris backend en ligne"));

const PORT = Number(process.env.PORT) || 8080;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
