import pino from "pino";

/**
 * Logger partagé backend.
 * En dev: sortie lisible (`pino-pretty`), en prod: JSON structuré.
 */
const level = process.env.LOG_LEVEL || "info";
const isDev = (process.env.NODE_ENV || "development") === "development";

export const logger = pino({
  level,
  transport: isDev
    ? {
        target: "pino-pretty",
        options: {
          translateTime: "SYS:HH:MM:ss",
          colorize: true,
          ignore: "pid,hostname",
        },
      }
    : undefined,
});
