/**
 * Entrypoint HTTP du backend.
 * Monte Express et le serveur WebSocket sur le même port.
 */
import http from "http";
import app from "./app";
import { env } from "./config";
import { logger } from "./logger";
import { setupWebsocket } from "./ws/server";

const PORT = env.port;

const server = http.createServer(app);
setupWebsocket(server);

server.listen(PORT, "0.0.0.0", () => {
  logger.info(`Server running on port ${PORT}`);
});
