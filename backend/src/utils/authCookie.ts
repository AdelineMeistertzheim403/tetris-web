import type { CookieOptions } from "express";
import { env } from "../config";

export const AUTH_COOKIE_NAME = "auth_token";
export const AUTH_COOKIE_MAX_AGE_MS = 24 * 60 * 60 * 1000;

export const getAuthCookieOptions = (): CookieOptions => {
  const isProd = env.nodeEnv === "production";

  return {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    path: "/",
  };
};
