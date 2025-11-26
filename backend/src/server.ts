import app from "./app";
import { env } from "./config";
import { logger } from "./logger";

const PORT = env.port;

app.listen(PORT, "0.0.0.0", () => {
  logger.info(`Server running on port ${PORT}`);
});
