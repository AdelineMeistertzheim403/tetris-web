import type { EnemyKind, PlatformType } from "./types";

export const TILE = 32;
export const VIEWPORT_W = 30 * TILE;
export const WORLD_H = 18 * TILE;
export const GROUND_Y = WORLD_H - TILE;
export const GRAVITY = 1700;
export const SPEED = 240;
export const JUMP = 560;
export const DASH_SPEED = 620;
export const DASH_MS = 150;
export const WORLD_RENDER_SCALE = 2;
export const PLAYER_VISUAL_SCALE = 1.4;
export const ROOKIE_VISUAL_SCALE = 1.65;
export const PULSE_VISUAL_SCALE = 1.55;
export const APEX_VISUAL_SCALE = 1.7;
export const RUN_ANIMATION_FRAME_MS = 300;
export const CAMERA_TOP_TRIGGER_RATIO = 0.3;
export const CAMERA_BOTTOM_TRIGGER_RATIO = 0.78;

export const PLAYER_IDLE_SPRITE = "/sprites_pixel_protocole/pixel/pixel_iddle.png";
export const PLAYER_RUN_SPRITE = "/sprites_pixel_protocole/pixel/pixel_run.png";
export const PLAYER_JUMP_SPRITE = "/sprites_pixel_protocole/pixel/pixel_jump.png";

export const ENEMY_SPRITES: Record<
  EnemyKind,
  { idle: string; run: string; scale: number }
> = {
  rookie: {
    idle: "/sprites_pixel_protocole/tetrobots/rookie/rookie_iddle.png",
    run: "/sprites_pixel_protocole/tetrobots/rookie/rookie_run.png",
    scale: ROOKIE_VISUAL_SCALE,
  },
  pulse: {
    idle: "/sprites_pixel_protocole/tetrobots/pulse/pulse_iddle.png",
    run: "/sprites_pixel_protocole/tetrobots/pulse/pulse_run.png",
    scale: PULSE_VISUAL_SCALE,
  },
  apex: {
    idle: "/sprites_pixel_protocole/tetrobots/apex/apex_iddle.png",
    run: "/sprites_pixel_protocole/tetrobots/apex/apex_run.png",
    scale: APEX_VISUAL_SCALE,
  },
};

export const PLATFORM_CLASS: Record<PlatformType, string> = {
  stable: "pp-platform--stable",
  unstable: "pp-platform--unstable",
  rotating: "pp-platform--rotating",
  glitch: "pp-platform--glitch",
  bounce: "pp-platform--bounce",
  grapplable: "pp-platform--grapplable",
  armored: "pp-platform--armored",
  hackable: "pp-platform--hackable",
};
