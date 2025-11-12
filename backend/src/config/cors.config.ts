import { CorsOptions } from "cors";

export const corsOptions: CorsOptions = {
  origin: [
    "http://localhost:5173",
    "https://tetris.adelinemeistertzheim.fr", // ✅ ton front prod
    "https://www.tetris.adelinemeistertzheim.fr", // (facultatif)
  ],
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
};
