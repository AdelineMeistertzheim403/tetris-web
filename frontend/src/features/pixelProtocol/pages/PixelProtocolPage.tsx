import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../../../styles/pixel-protocol.css";

type Tetromino = "I" | "O" | "T" | "L" | "J" | "S" | "Z";
type PlatformType = "stable" | "unstable" | "rotating" | "glitch" | "bounce" | "armored" | "hackable";
type EnemyKind = "rookie" | "pulse" | "apex";

type PlatformDef = {
  id: string;
  tetromino: Tetromino;
  x: number;
  y: number;
  rotation?: 0 | 1 | 2 | 3;
  type: PlatformType;
  rotateEveryMs?: number;
};

type DataOrb = { id: string; x: number; y: number; taken?: boolean };
type Enemy = {
  id: string;
  kind: EnemyKind;
  x: number;
  y: number;
  vx: number;
  minX: number;
  maxX: number;
  stunnedUntil: number;
};

type LevelDef = {
  id: string;
  world: number;
  name: string;
  requiredOrbs: number;
  spawn: { x: number; y: number };
  portal: { x: number; y: number };
  platforms: PlatformDef[];
  orbs: DataOrb[];
  enemies: Enemy[];
};

type Player = {
  x: number;
  y: number;
  w: number;
  h: number;
  vx: number;
  vy: number;
  grounded: boolean;
  jumpsLeft: number;
  hp: number;
  dashUntil: number;
  dashCooldownUntil: number;
  invulnUntil: number;
};

type RuntimePlatform = PlatformDef & {
  currentRotation: 0 | 1 | 2 | 3;
  active: boolean;
  unstableWakeAt: number;
  hackedUntil: number;
  nextRotateAt: number;
};

type GameRuntime = {
  levelIndex: number;
  player: Player;
  platforms: RuntimePlatform[];
  orbs: DataOrb[];
  enemies: Enemy[];
  collected: number;
  startedAt: number;
  status: "running" | "won" | "lost";
  message: string;
};

type Rect = { x: number; y: number; w: number; h: number; platformId?: string; type?: PlatformType };

const TILE = 32;
const WORLD_W = 30 * TILE;
const WORLD_H = 18 * TILE;
const GRAVITY = 1700;
const SPEED = 240;
const JUMP = 560;
const DASH_SPEED = 620;
const DASH_MS = 150;

const SHAPES: Record<Tetromino, Array<{ x: number; y: number }>> = {
  I: [
    { x: -1, y: 0 },
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 2, y: 0 },
  ],
  O: [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 0, y: 1 },
    { x: 1, y: 1 },
  ],
  T: [
    { x: -1, y: 0 },
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 0, y: 1 },
  ],
  L: [
    { x: -1, y: 0 },
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 1, y: 1 },
  ],
  J: [
    { x: -1, y: 1 },
    { x: -1, y: 0 },
    { x: 0, y: 0 },
    { x: 1, y: 0 },
  ],
  S: [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: -1, y: 1 },
    { x: 0, y: 1 },
  ],
  Z: [
    { x: -1, y: 0 },
    { x: 0, y: 0 },
    { x: 0, y: 1 },
    { x: 1, y: 1 },
  ],
};

const LEVELS: LevelDef[] = [
  {
    id: "w1-1",
    world: 1,
    name: "Bloc Stable",
    requiredOrbs: 3,
    spawn: { x: 80, y: 430 },
    portal: { x: 860, y: 120 },
    platforms: [
      { id: "p1", tetromino: "I", x: 4, y: 15, type: "stable" },
      { id: "p2", tetromino: "T", x: 11, y: 13, type: "stable" },
      { id: "p3", tetromino: "L", x: 18, y: 11, type: "bounce" },
      { id: "p4", tetromino: "O", x: 24, y: 8, type: "stable" },
    ],
    orbs: [
      { id: "o1", x: 210, y: 440 },
      { id: "o2", x: 520, y: 340 },
      { id: "o3", x: 800, y: 240 },
    ],
    enemies: [
      { id: "e1", kind: "rookie", x: 430, y: 470, vx: 60, minX: 330, maxX: 560, stunnedUntil: 0 },
    ],
  },
  {
    id: "w2-1",
    world: 2,
    name: "Glitch Sector",
    requiredOrbs: 4,
    spawn: { x: 60, y: 420 },
    portal: { x: 900, y: 90 },
    platforms: [
      { id: "p1", tetromino: "I", x: 3, y: 15, type: "unstable" },
      { id: "p2", tetromino: "S", x: 9, y: 13, type: "glitch" },
      { id: "p3", tetromino: "T", x: 15, y: 11, type: "rotating", rotateEveryMs: 2200 },
      { id: "p4", tetromino: "Z", x: 21, y: 9, type: "unstable" },
      { id: "p5", tetromino: "O", x: 26, y: 6, type: "stable" },
    ],
    orbs: [
      { id: "o1", x: 180, y: 450 },
      { id: "o2", x: 350, y: 360 },
      { id: "o3", x: 620, y: 295 },
      { id: "o4", x: 850, y: 200 },
    ],
    enemies: [
      { id: "e1", kind: "rookie", x: 340, y: 470, vx: 70, minX: 300, maxX: 500, stunnedUntil: 0 },
      { id: "e2", kind: "pulse", x: 700, y: 330, vx: 85, minX: 620, maxX: 780, stunnedUntil: 0 },
    ],
  },
  {
    id: "w3-1",
    world: 3,
    name: "Corrupted Grid",
    requiredOrbs: 5,
    spawn: { x: 80, y: 430 },
    portal: { x: 900, y: 88 },
    platforms: [
      { id: "p1", tetromino: "I", x: 4, y: 15, type: "hackable" },
      { id: "p2", tetromino: "J", x: 9, y: 13, type: "rotating", rotateEveryMs: 1700 },
      { id: "p3", tetromino: "L", x: 14, y: 11, type: "glitch" },
      { id: "p4", tetromino: "T", x: 19, y: 9, type: "unstable" },
      { id: "p5", tetromino: "S", x: 23, y: 7, type: "bounce" },
      { id: "p6", tetromino: "O", x: 27, y: 5, type: "armored" },
    ],
    orbs: [
      { id: "o1", x: 150, y: 440 },
      { id: "o2", x: 330, y: 380 },
      { id: "o3", x: 500, y: 300 },
      { id: "o4", x: 700, y: 235 },
      { id: "o5", x: 865, y: 170 },
    ],
    enemies: [
      { id: "e1", kind: "pulse", x: 320, y: 450, vx: 100, minX: 260, maxX: 470, stunnedUntil: 0 },
      { id: "e2", kind: "pulse", x: 620, y: 328, vx: 110, minX: 560, maxX: 780, stunnedUntil: 0 },
      { id: "e3", kind: "apex", x: 820, y: 266, vx: 140, minX: 740, maxX: 900, stunnedUntil: 0 },
    ],
  },
  {
    id: "w4-1",
    world: 4,
    name: "Apex Core",
    requiredOrbs: 6,
    spawn: { x: 70, y: 430 },
    portal: { x: 905, y: 80 },
    platforms: [
      { id: "p1", tetromino: "I", x: 3, y: 15, type: "unstable" },
      { id: "p2", tetromino: "T", x: 8, y: 13, type: "rotating", rotateEveryMs: 1600 },
      { id: "p3", tetromino: "L", x: 13, y: 11, type: "hackable" },
      { id: "p4", tetromino: "J", x: 18, y: 9, type: "glitch" },
      { id: "p5", tetromino: "S", x: 22, y: 7, type: "bounce" },
      { id: "p6", tetromino: "Z", x: 26, y: 5, type: "rotating", rotateEveryMs: 1400 },
      { id: "p7", tetromino: "O", x: 28, y: 3, type: "armored" },
    ],
    orbs: [
      { id: "o1", x: 145, y: 440 },
      { id: "o2", x: 310, y: 375 },
      { id: "o3", x: 470, y: 310 },
      { id: "o4", x: 620, y: 250 },
      { id: "o5", x: 770, y: 185 },
      { id: "o6", x: 900, y: 130 },
    ],
    enemies: [
      { id: "e1", kind: "rookie", x: 260, y: 465, vx: 90, minX: 200, maxX: 380, stunnedUntil: 0 },
      { id: "e2", kind: "pulse", x: 550, y: 338, vx: 120, minX: 480, maxX: 680, stunnedUntil: 0 },
      { id: "e3", kind: "apex", x: 800, y: 212, vx: 160, minX: 710, maxX: 920, stunnedUntil: 0 },
    ],
  },
];

const PLATFORM_CLASS: Record<PlatformType, string> = {
  stable: "pp-platform--stable",
  unstable: "pp-platform--unstable",
  rotating: "pp-platform--rotating",
  glitch: "pp-platform--glitch",
  bounce: "pp-platform--bounce",
  armored: "pp-platform--armored",
  hackable: "pp-platform--hackable",
};

function rotate(point: { x: number; y: number }, turns: number) {
  let p = { ...point };
  for (let i = 0; i < turns; i += 1) p = { x: -p.y, y: p.x };
  return p;
}

function rectIntersects(a: Rect, b: Rect) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function platformBlocks(platform: RuntimePlatform): Rect[] {
  if (!platform.active) return [];
  const base = SHAPES[platform.tetromino];
  return base.map((block) => {
    const p = rotate(block, platform.currentRotation);
    return {
      x: (platform.x + p.x) * TILE,
      y: (platform.y + p.y) * TILE,
      w: TILE,
      h: TILE,
      platformId: platform.id,
      type: platform.type,
    };
  });
}

function allCollisionBlocks(platforms: RuntimePlatform[]): Rect[] {
  return platforms.flatMap((p) => platformBlocks(p));
}

function cloneLevel(level: LevelDef): GameRuntime {
  return {
    levelIndex: LEVELS.findIndex((l) => l.id === level.id),
    player: {
      x: level.spawn.x,
      y: level.spawn.y,
      w: 24,
      h: 30,
      vx: 0,
      vy: 0,
      grounded: false,
      jumpsLeft: 1,
      hp: 3,
      dashUntil: 0,
      dashCooldownUntil: 0,
      invulnUntil: 0,
    },
    platforms: level.platforms.map((p) => ({
      ...p,
      currentRotation: p.rotation ?? 0,
      active: true,
      unstableWakeAt: 0,
      hackedUntil: 0,
      nextRotateAt: p.rotateEveryMs ? performance.now() + p.rotateEveryMs : Number.POSITIVE_INFINITY,
    })),
    orbs: level.orbs.map((o) => ({ ...o, taken: false })),
    enemies: level.enemies.map((e) => ({ ...e })),
    collected: 0,
    startedAt: performance.now(),
    status: "running",
    message: "Collecte les Data-Orbs puis atteins le portail.",
  };
}

function abilityFlags(world: number) {
  return {
    doubleJump: world >= 2,
    airDash: world >= 3,
    hackWave: world >= 3,
    shield: world >= 4,
  };
}

export default function PixelProtocolPage() {
  const navigate = useNavigate();
  const [, setRenderTick] = useState(0);
  const [levelIndex, setLevelIndex] = useState(0);
  const runtimeRef = useRef<GameRuntime>(cloneLevel(LEVELS[0]));
  const keysRef = useRef<Set<string>>(new Set());
  const justPressedRef = useRef<Set<string>>(new Set());
  const frameRef = useRef<number | null>(null);
  const lastTsRef = useRef<number>(performance.now());

  const level = LEVELS[levelIndex];
  const ability = useMemo(() => abilityFlags(level.world), [level.world]);

  useEffect(() => {
    runtimeRef.current = cloneLevel(level);
    setRenderTick((v) => v + 1);
  }, [level]);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (!keysRef.current.has(e.code)) justPressedRef.current.add(e.code);
      keysRef.current.add(e.code);
    };
    const up = (e: KeyboardEvent) => {
      keysRef.current.delete(e.code);
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  useEffect(() => {
    const loop = (ts: number) => {
      const dt = Math.min(0.033, (ts - lastTsRef.current) / 1000);
      lastTsRef.current = ts;

      const game = runtimeRef.current;
      const now = ts;
      if (game.status === "running") {
        for (const p of game.platforms) {
          if (p.type === "unstable" && !p.active && now >= p.unstableWakeAt) p.active = true;
          if (p.type === "hackable" && p.hackedUntil > 0 && now >= p.hackedUntil) p.hackedUntil = 0;
          if (p.type === "rotating" && p.rotateEveryMs && now >= p.nextRotateAt) {
            p.currentRotation = ((p.currentRotation + 1) % 4) as 0 | 1 | 2 | 3;
            p.nextRotateAt = now + p.rotateEveryMs;
          }
        }

        const blocks = allCollisionBlocks(game.platforms);
        const player = game.player;

        const left = keysRef.current.has("ArrowLeft") || keysRef.current.has("KeyA");
        const right = keysRef.current.has("ArrowRight") || keysRef.current.has("KeyD");
        const wantJump = justPressedRef.current.has("Space") || justPressedRef.current.has("ArrowUp") || justPressedRef.current.has("KeyW");
        const wantDash = justPressedRef.current.has("ShiftLeft") || justPressedRef.current.has("ShiftRight");
        const wantHack = justPressedRef.current.has("KeyE");

        if (wantHack && ability.hackWave) {
          for (const enemy of game.enemies) {
            if (Math.abs(enemy.x - player.x) < 150 && Math.abs(enemy.y - player.y) < 90) {
              enemy.stunnedUntil = now + 1700;
            }
          }
          for (const p of game.platforms) {
            if (p.type === "hackable") p.hackedUntil = now + 3500;
            if (p.type === "unstable" && Math.abs(p.x * TILE - player.x) < 180) p.active = true;
          }
          game.message = "Hack pulse execute.";
        }

        let targetVx = 0;
        if (left) targetVx -= SPEED;
        if (right) targetVx += SPEED;

        const isDashing = now < player.dashUntil;
        if (isDashing) {
          player.vx = player.vx > 0 ? DASH_SPEED : -DASH_SPEED;
          player.vy = Math.max(player.vy, -70);
        } else {
          const accel = player.grounded ? 1800 : 1200;
          if (Math.abs(targetVx - player.vx) <= accel * dt) player.vx = targetVx;
          else player.vx += Math.sign(targetVx - player.vx) * accel * dt;
        }

        if (wantDash && ability.airDash && now > player.dashCooldownUntil) {
          const dir = right ? 1 : left ? -1 : player.vx >= 0 ? 1 : -1;
          player.vx = dir * DASH_SPEED;
          player.vy = -20;
          player.dashUntil = now + DASH_MS;
          player.dashCooldownUntil = now + 1100;
        }

        if (wantJump) {
          if (player.grounded) {
            player.vy = -JUMP;
            player.grounded = false;
            player.jumpsLeft = ability.doubleJump ? 1 : 0;
          } else if (player.jumpsLeft > 0) {
            player.vy = -JUMP * 0.92;
            player.jumpsLeft -= 1;
          }
        }

        player.vy += GRAVITY * dt;

        const moveAxis = (axis: "x" | "y", amount: number) => {
          if (axis === "x") player.x += amount;
          else player.y += amount;

          const playerRect: Rect = { x: player.x, y: player.y, w: player.w, h: player.h };
          for (const b of blocks) {
            if (!rectIntersects(playerRect, b)) continue;
            if (axis === "x") {
              if (amount > 0) player.x = b.x - player.w;
              else player.x = b.x + b.w;
              player.vx = 0;
            } else {
              if (amount > 0) {
                player.y = b.y - player.h;
                player.vy = 0;
                player.grounded = true;
                if (ability.doubleJump) player.jumpsLeft = 1;

                if (b.type === "bounce") player.vy = -JUMP * 1.16;
                if (b.type === "glitch") player.x += Math.random() < 0.5 ? -36 : 36;

                if (b.type === "unstable") {
                  const p = game.platforms.find((pl) => pl.id === b.platformId);
                  if (p) {
                    p.active = false;
                    p.unstableWakeAt = now + 3000;
                  }
                }
              } else {
                player.y = b.y + b.h;
                player.vy = Math.max(0, player.vy);
              }
            }
          }
        };

        player.grounded = false;
        moveAxis("x", player.vx * dt);
        moveAxis("y", player.vy * dt);

        player.x = Math.max(0, Math.min(WORLD_W - player.w, player.x));

        if (player.y > WORLD_H + 120) {
          player.hp -= 1;
          player.x = level.spawn.x;
          player.y = level.spawn.y;
          player.vx = 0;
          player.vy = 0;
          player.invulnUntil = now + 1500;
          game.message = "Recompilation du noyau...";
        }

        for (const orb of game.orbs) {
          if (orb.taken) continue;
          const orbRect: Rect = { x: orb.x, y: orb.y, w: 18, h: 18 };
          const playerRect: Rect = { x: player.x, y: player.y, w: player.w, h: player.h };
          if (rectIntersects(playerRect, orbRect)) {
            orb.taken = true;
            game.collected += 1;
            game.message = "Data-Orb capture.";
          }
        }

        for (const enemy of game.enemies) {
          if (enemy.stunnedUntil <= now) {
            const enemySpeed = enemy.kind === "apex" ? 170 : enemy.kind === "pulse" ? 120 : 90;
            enemy.x += Math.sign(enemy.vx) * enemySpeed * dt;
            if (enemy.x <= enemy.minX || enemy.x >= enemy.maxX) enemy.vx *= -1;
          }

          const enemyRect: Rect = { x: enemy.x, y: enemy.y, w: 26, h: 26 };
          const playerRect: Rect = { x: player.x, y: player.y, w: player.w, h: player.h };
          if (rectIntersects(playerRect, enemyRect) && now > player.invulnUntil) {
            const stomp = player.vy > 80 && player.y + player.h - 6 < enemy.y;
            if (stomp) {
              enemy.stunnedUntil = now + 1400;
              player.vy = -JUMP * 0.65;
              game.message = "Tetrobot neutralise.";
            } else {
              const hasShield = ability.shield;
              player.hp -= hasShield ? 0 : 1;
              player.invulnUntil = now + 1600;
              player.x = level.spawn.x;
              player.y = level.spawn.y;
              player.vx = 0;
              player.vy = 0;
              game.message = hasShield ? "Bouclier actif." : "Impact critique.";
            }
          }
        }

        const portalOpen = game.collected >= level.requiredOrbs;
        if (portalOpen) {
          const portalRect: Rect = { x: level.portal.x, y: level.portal.y, w: 34, h: 44 };
          const playerRect: Rect = { x: player.x, y: player.y, w: player.w, h: player.h };
          if (rectIntersects(playerRect, portalRect)) {
            if (levelIndex < LEVELS.length - 1) {
              setLevelIndex((prev) => prev + 1);
              game.status = "won";
            } else {
              game.status = "won";
              game.message = "TETRIX CORE neutralise. Le systeme est recompile.";
            }
          }
        }

        if (player.hp <= 0) {
          game.status = "lost";
          game.message = "Pixel a ete desynchronise.";
        }
      }

      justPressedRef.current.clear();
      setRenderTick((v) => v + 1);
      frameRef.current = requestAnimationFrame(loop);
    };

    frameRef.current = requestAnimationFrame(loop);
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [ability.airDash, ability.doubleJump, ability.hackWave, ability.shield, level, levelIndex]);

  const runtime = runtimeRef.current;
  const portalOpen = runtime.collected >= level.requiredOrbs;

  return (
    <div className="pp-shell">
      <header className="pp-header">
        <div>
          <h1>Pixel Protocol</h1>
          <p>
            Monde {level.world} - {level.name}
          </p>
        </div>
        <div className="pp-stats">
          <span>HP: {runtime.player.hp}</span>
          <span>
            Data-Orbs: {runtime.collected}/{level.requiredOrbs}
          </span>
          <span>
            Capacites: {ability.doubleJump ? "DJ" : "-"} {ability.airDash ? "Dash" : "-"}{" "}
            {ability.hackWave ? "Hack" : "-"}
          </span>
        </div>
      </header>

      <section className="pp-game" style={{ width: WORLD_W, height: WORLD_H }}>
        {runtime.platforms.flatMap((platform) =>
          platformBlocks(platform).map((block, i) => (
            <div
              key={`${platform.id}-${i}-${platform.currentRotation}-${platform.active ? 1 : 0}`}
              className={`pp-platform ${PLATFORM_CLASS[platform.type]} ${platform.active ? "" : "pp-platform--off"}`}
              style={{ left: block.x, top: block.y, width: block.w, height: block.h }}
            />
          ))
        )}

        {runtime.orbs
          .filter((orb) => !orb.taken)
          .map((orb) => (
            <div key={orb.id} className="pp-orb" style={{ left: orb.x, top: orb.y }} />
          ))}

        <div
          className={`pp-portal ${portalOpen ? "pp-portal--open" : ""}`}
          style={{ left: level.portal.x, top: level.portal.y }}
          title={portalOpen ? "Portail actif" : "Collecte les Data-Orbs"}
        />

        {runtime.enemies.map((enemy) => (
          <div
            key={enemy.id}
            className={`pp-enemy pp-enemy--${enemy.kind} ${enemy.stunnedUntil > performance.now() ? "pp-enemy--stunned" : ""}`}
            style={{ left: enemy.x, top: enemy.y }}
            title={enemy.kind}
          />
        ))}

        <div
          className={`pp-player ${runtime.player.invulnUntil > performance.now() ? "pp-player--invuln" : ""}`}
          style={{ left: runtime.player.x, top: runtime.player.y, width: runtime.player.w, height: runtime.player.h }}
        />
      </section>

      <footer className="pp-footer">
        <p>{runtime.message}</p>
        <p>Controles: A/D ou fleches, Espace saut, Shift dash, E hack, stomp sur les Tetrobots.</p>
        <div className="pp-actions">
          <button
            className="retro-btn"
            onClick={() => {
              runtimeRef.current = cloneLevel(level);
              setRenderTick((v) => v + 1);
            }}
          >
            Rejouer le niveau
          </button>
          <button className="retro-btn" onClick={() => navigate("/dashboard")}>Retour dashboard</button>
        </div>
      </footer>
    </div>
  );
}
