import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  server: {
    host: "0.0.0.0",
    port: 5173,
    allowedHosts: [
      "tetris.adelinemeistertzheim.fr",
      "localhost",
      "127.0.0.1",
    ],
    proxy: mode === "development"
      ? {
          "/api": {
            target: "http://localhost:8080", // back local
            changeOrigin: true,
            secure: false,
          },
        }
      : undefined, // Pas de proxy en prod (on utilise l’URL absolue)
  },
}));
