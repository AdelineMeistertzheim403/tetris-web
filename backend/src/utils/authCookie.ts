import type { CookieOptions } from "express";
import { env } from "../config";

// Nom et durée de vie du cookie d'authentification.
export const AUTH_COOKIE_NAME = "auth_token";
export const AUTH_COOKIE_MAX_AGE_MS = 24 * 60 * 60 * 1000;

/**
 * Options de cookie compatibles SPA.
 * `secure` est activé uniquement en production.
 */
export const getAuthCookieOptions = (): CookieOptions => {
  const isProd = env.nodeEnv === "production";

  return {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    path: "/",
  };
};
