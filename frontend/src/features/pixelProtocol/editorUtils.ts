import { GROUND_Y, TILE, WORLD_H } from "./constants";
import {
  abilityFlags,
  allCollisionBlocks,
  cloneLevel,
  defaultViewportWorldWidth,
  platformBlocks,
} from "./logic";
import { updatePlayer } from "./game/updatePlayer";
import type { LevelDef, PlatformDef, Rect, RuntimePlatform } from "./types";

const PLAYER_W = 24;
const PLAYER_H = 30;
const DT = 1 / 60;
const SIMULATION_MS = 1800;
const MAX_STEPS = Math.round((SIMULATION_MS / 1000) / DT);

type SourceNode =
  | { kind: "spawn" }
  | { kind: "platform"; platformId: string };

type JumpProfile = {
  dashAtMs: number | null;
  doubleJumpAtMs: number | null;
  jumpAtMs: number;
};

export type EditorIssue = {
  message: string;
  platformId?: string;
  severity: "error" | "warning";
};

export type PlatformRenderData = {
  platform: PlatformDef;
  blocks: Rect[];
  bounds: { left: number; top: number; width: number; height: number } | null;
  center: { x: number; y: number } | null;
};

export type ReachabilityLink = {
  from: { kind: "spawn" } | { kind: "platform"; platformId: string };
  to: { platformId: string };
};

export type PlatformValidation = {
  isValid: boolean;
  issues: EditorIssue[];
  reachablePlatformIds: string[];
  links: ReachabilityLink[];
};

const JUMP_PROFILES: JumpProfile[] = [
  { jumpAtMs: 0, dashAtMs: null, doubleJumpAtMs: null },
  { jumpAtMs: 70, dashAtMs: null, doubleJumpAtMs: null },
  { jumpAtMs: 140, dashAtMs: null, doubleJumpAtMs: null },
  { jumpAtMs: 0, dashAtMs: null, doubleJumpAtMs: 220 },
  { jumpAtMs: 70, dashAtMs: null, doubleJumpAtMs: 260 },
  { jumpAtMs: 0, dashAtMs: 120, doubleJumpAtMs: null },
  { jumpAtMs: 70, dashAtMs: 160, doubleJumpAtMs: null },
  { jumpAtMs: 0, dashAtMs: 110, doubleJumpAtMs: 240 },
  { jumpAtMs: 70, dashAtMs: 160, doubleJumpAtMs: 280 },
];

function runtimePlatform(platform: PlatformDef): RuntimePlatform {
  return {
    ...platform,
    active: true,
    currentRotation: platform.rotation ?? 0,
    hackedUntil: 0,
    nextRotateAt: Number.POSITIVE_INFINITY,
    unstableDropAt: 0,
    unstableWakeAt: 0,
    expiresAt: null,
    temporary: false,
  };
}

function rectBounds(blocks: Rect[]) {
  if (blocks.length === 0) return null;
  const left = Math.min(...blocks.map((block) => block.x));
  const top = Math.min(...blocks.map((block) => block.y));
  const right = Math.max(...blocks.map((block) => block.x + block.w));
  const bottom = Math.max(...blocks.map((block) => block.y + block.h));
  return { left, top, width: right - left, height: bottom - top };
}

function rectCenter(bounds: { left: number; top: number; width: number; height: number } | null) {
  if (!bounds) return null;
  return {
    x: bounds.left + bounds.width / 2,
    y: bounds.top + bounds.height / 2,
  };
}

function topSupportSamples(platform: RuntimePlatform): Array<{ x: number; y: number }> {
  const blocks = platformBlocks(platform);
  const occupied = new Set(blocks.map((block) => `${block.x}:${block.y}`));
  const samples: Array<{ x: number; y: number }> = [];

  for (const block of blocks) {
    if (occupied.has(`${block.x}:${block.y - TILE}`)) continue;
    samples.push({ x: block.x, y: block.y - PLAYER_H });
    samples.push({ x: block.x + 4, y: block.y - PLAYER_H });
    samples.push({ x: block.x + 8, y: block.y - PLAYER_H });
  }

  return samples;
}

function standsOnTarget(
  player: { x: number; y: number; w: number; h: number; grounded: boolean },
  blocks: Rect[]
) {
  if (!player.grounded) return false;
  const feetY = player.y + player.h;
  return blocks.some((block) => {
    const overlapsX = player.x < block.x + block.w && player.x + player.w > block.x;
    return overlapsX && Math.abs(feetY - block.y) <= 2;
  });
}

function edgeDistance(source: Rect[], target: Rect[]) {
  const sourceLeft = Math.min(...source.map((block) => block.x));
  const sourceRight = Math.max(...source.map((block) => block.x + block.w));
  const targetLeft = Math.min(...target.map((block) => block.x));
  const targetRight = Math.max(...target.map((block) => block.x + block.w));

  if (targetLeft > sourceRight) return targetLeft - sourceRight;
  if (sourceLeft > targetRight) return sourceLeft - targetRight;
  return 0;
}

function plausibleJump(sourceBlocks: Rect[], targetBlocks: Rect[], world: number) {
  const sourceTop = Math.min(...sourceBlocks.map((block) => block.y));
  const targetTop = Math.min(...targetBlocks.map((block) => block.y));
  const verticalRise = sourceTop - targetTop;
  const verticalDrop = targetTop - sourceTop;
  const horizontalGap = edgeDistance(sourceBlocks, targetBlocks);

  const extraJump = world >= 2 ? 150 : 0;
  const extraDash = world >= 3 ? 190 : 0;

  if (verticalRise > 210 + extraJump) return false;
  if (horizontalGap > 250 + extraJump + extraDash) return false;
  if (verticalDrop > 340) return false;
  return true;
}

function canReachPlatform(
  level: LevelDef,
  source: SourceNode,
  targetId: string,
  runtimePlatforms: RuntimePlatform[],
  collisionBlocks: Rect[]
) {
  const targetPlatform = runtimePlatforms.find((platform) => platform.id === targetId);
  if (!targetPlatform) return false;
  const targetBlocks = platformBlocks(targetPlatform);
  if (targetBlocks.length === 0) return false;

  const starts =
    source.kind === "spawn"
      ? [{ x: level.spawn.x, y: level.spawn.y, grounded: false }]
      : topSupportSamples(
          runtimePlatforms.find((platform) => platform.id === source.platformId)!
        ).map((sample) => ({
          x: sample.x,
          y: sample.y,
          grounded: true,
        }));

  if (starts.length === 0) return false;

  const sourceBlocks =
    source.kind === "spawn"
      ? [{ x: level.spawn.x, y: level.spawn.y, w: PLAYER_W, h: PLAYER_H }]
      : platformBlocks(runtimePlatforms.find((platform) => platform.id === source.platformId)!);

  if (source.kind !== "spawn" && !plausibleJump(sourceBlocks, targetBlocks, level.world)) {
    return false;
  }

  const ability = abilityFlags(level.world);

  for (const start of starts) {
    for (const profile of JUMP_PROFILES) {
      if (!ability.doubleJump && profile.doubleJumpAtMs !== null) continue;
      if (!ability.airDash && profile.dashAtMs !== null) continue;

      const game = cloneLevel(level);
      game.player.x = start.x;
      game.player.y = start.y;
      game.player.vx = 0;
      game.player.vy = 0;
      game.player.grounded = start.grounded;
      game.player.jumpsLeft = ability.extraAirJumps;

      let dashUsed = false;
      let doubleJumpUsed = false;

      for (let step = 0; step < MAX_STEPS; step += 1) {
        const now = step * DT * 1000;
        const targetCenter =
          targetBlocks.reduce((sum, block) => sum + block.x + block.w / 2, 0) /
          targetBlocks.length;
        const playerCenter = game.player.x + game.player.w / 2;
        const direction = targetCenter >= playerCenter ? 1 : -1;

        const wantsJump =
          Math.abs(now - profile.jumpAtMs) < 8 ||
          (!doubleJumpUsed &&
            profile.doubleJumpAtMs !== null &&
            Math.abs(now - profile.doubleJumpAtMs) < 8);
        const wantsDash =
          !dashUsed &&
          profile.dashAtMs !== null &&
          Math.abs(now - profile.dashAtMs) < 8;

        updatePlayer({
          ability,
          blocks: collisionBlocks,
          dt: DT,
          game,
          input: {
            left: direction < 0,
            right: direction > 0,
            wantDash: wantsDash,
            wantHack: false,
            wantJump: wantsJump,
            wantPhaseShift: false,
            wantPulseShock: false,
            wantOverclock: false,
            wantTimeBuffer: false,
            wantPlatformSpawn: false,
            wantGrapple: false,
            wantRespawn: false,
          },
          level,
          now,
          viewportHeight: WORLD_H,
          viewportWidth: defaultViewportWorldWidth(),
        });

        if (wantsDash) dashUsed = true;
        if (wantsJump && now > profile.jumpAtMs + 20) doubleJumpUsed = true;

        if (standsOnTarget(game.player, targetBlocks)) {
          return true;
        }

        if (game.player.y > WORLD_H + 96) break;
      }
    }
  }

  return false;
}

export function platformRenderData(level: LevelDef): PlatformRenderData[] {
  return level.platforms.map((platform) => {
    const blocks = platformBlocks(runtimePlatform(platform));
    const bounds = rectBounds(blocks);
    return {
      platform,
      blocks,
      bounds,
      center: rectCenter(bounds),
    };
  });
}

export function validatePlatformLayout(level: LevelDef): PlatformValidation {
  const issues: EditorIssue[] = [];
  const links: ReachabilityLink[] = [];
  const rendered = platformRenderData(level);
  const occupied = new Map<string, string>();
  const groundLimit = GROUND_Y;

  for (const { blocks, platform } of rendered) {
    for (const block of blocks) {
      if (
        block.x < 0 ||
        block.x + block.w > level.worldWidth ||
        block.y < 0 ||
        block.y + block.h > groundLimit
      ) {
        issues.push({
          message: `La plateforme ${platform.id} sort de la zone jouable.`,
          platformId: platform.id,
          severity: "error",
        });
        break;
      }

      const key = `${block.x / TILE}:${block.y / TILE}`;
      const existing = occupied.get(key);
      if (existing && existing !== platform.id) {
        issues.push({
          message: `Les plateformes ${existing} et ${platform.id} se chevauchent.`,
          platformId: platform.id,
          severity: "error",
        });
        break;
      }
      occupied.set(key, platform.id);
    }
  }

  if (issues.length > 0) {
    return { isValid: false, issues, reachablePlatformIds: [], links };
  }

  const runtimePlatforms = level.platforms.map(runtimePlatform);
  const collisionBlocks = allCollisionBlocks(runtimePlatforms, level.worldWidth);
  const reachable = new Set<string>();
  const queue: SourceNode[] = [{ kind: "spawn" }];

  while (queue.length > 0) {
    const source = queue.shift()!;
    for (const platform of level.platforms) {
      if (reachable.has(platform.id)) continue;
      if (!canReachPlatform(level, source, platform.id, runtimePlatforms, collisionBlocks)) {
        continue;
      }
      reachable.add(platform.id);
      links.push({
        from: source.kind === "spawn" ? { kind: "spawn" } : { kind: "platform", platformId: source.platformId },
        to: { platformId: platform.id },
      });
      queue.push({ kind: "platform", platformId: platform.id });
    }
  }

  for (const platform of level.platforms) {
    if (reachable.has(platform.id)) continue;
    issues.push({
      message: `La plateforme ${platform.id} n'est pas atteignable avec les capacites du monde ${level.world}.`,
      platformId: platform.id,
      severity: "error",
    });
  }

  return {
    isValid: issues.length === 0,
    issues,
    reachablePlatformIds: [...reachable],
    links,
  };
}
