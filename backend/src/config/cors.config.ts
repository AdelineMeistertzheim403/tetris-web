const allowedOrigins = [
  "http://localhost:5173",
  "https://tetris.adelinemeistertzheim.fr",
  "https://www.tetris.adelinemeistertzheim.fr",
];

export const corsOptions = {
  origin: (origin: string | undefined, callback: any) => {
    if (!origin) return callback(null, true); // requêtes serveur → OK

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    } else {
      console.error("❌ CORS BLOCKED — Origin:", origin);
      return callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};