import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAchievements } from "../../achievements/hooks/useAchievements";
import { TOTAL_GAME_MODES } from "../../game/types/GameMode";
import {
  getTetromazeCampaignLevel,
  TETROMAZE_TOTAL_LEVELS,
  toWorldStage,
} from "../data/campaignLevels";
import {
  fetchTetromazeProgress,
  saveTetromazeProgress,
  type TetromazeProgress,
} from "../services/tetromazeService";
import {
  canMoveTo,
  chooseRandom,
  findNextStepBfs,
  getValidMoves,
  manhattan,
  nextPos,
  toKey,
  type GridPos,
} from "../logic/grid";
import type { Direction, TetromazeLevel, TetromazeOrbType, TetrobotKind } from "../types";
import "../../../styles/tetromaze.css";

// État runtime d'un bot.
// `prevPos` + `lastMoveAt` permettent une interpolation visuelle fluide
// entre deux cases de grille.
type BotState = {
  id: string;
  kind: TetrobotKind;
  pos: GridPos;
  prevPos: GridPos;
  lastMoveAt: number;
  spawn: GridPos;
  respawnAt: number;
};

type TetromazeMode = "CLASSIC" | "SURVIVAL";

type GameState = {
  mode: TetromazeMode;
  seed: string;
  startedAt: number;
  status: "idle" | "running" | "won" | "lost";
  playerPos: GridPos;
  playerDir: Direction;
  lives: number;
  score: number;
  dataOrbs: Set<string>;
  powerOrbs: Map<string, TetromazeOrbType>;
  bots: BotState[];
  hackUntil: number;
  glitchUntil: number;
  overclockUntil: number;
  safeUntil: number;
  botWakeUntil: number;
  timeLeftMs: number;
  tick: number;
};

type SpriteStore = {
  player: HTMLImageElement[];
  bots: Record<TetrobotKind, HTMLImageElement>;
};

// Réglages globaux du mode (timings, dimensions, cadence IA).
const TILE = 40;
const TICK_MS = 120;
const SURVIVAL_MS = 120000;
const HACK_MS = 8500;
const GLITCH_MS = 7500;
const OVERCLOCK_MS = 9000;
const START_SAFE_MS = 2800;
const BOT_WAKE_MS = 1400;
const PLAYER_ANIM_MS = 170;
const CAPTURE_BONUS = 350;
const BOT_MOVE_INTERVAL: Record<TetrobotKind, number> = {
  rookie: 6,
  balanced: 5,
  apex: 4,
};

const ORB_COLORS: Record<TetromazeOrbType, string> = {
  OVERCLOCK: "#ffe066",
  GLITCH: "#8efff5",
  HACK: "#ff89ff",
  LOOP: "#9f8dff",
};

const PLAYER_SPRITES = [
  "/Tetromaze/hacker_pixel_1.png",
  "/Tetromaze/hacker_pixel_2.png",
] as const;

const BOT_SPRITES: Record<TetrobotKind, string> = {
  rookie: "/Tetromaze/rookie_ingame.png",
  balanced: "/Tetromaze/pulse_ingame.png",
  apex: "/Tetromaze/apex_ingame.png",
};

type TetromazeEvent =
  | "maze_start"
  | "player_near"
  | "player_escape"
  | "bot_stunned"
  | "powerup_taken"
  | "player_low_life"
  | "player_win"
  | "player_lose"
  | "long_chase"
  | "cornered"
  | "multi_bot_near";

type ChatLine = {
  speaker: TetrobotKind;
  text: string;
  at: number;
};

type ChatState = Record<TetrobotKind, ChatLine | null>;

const BOT_LABELS: Record<TetrobotKind, string> = {
  rookie: "ROOKIE",
  balanced: "PULSE",
  apex: "APEX",
};

const BOT_ACCENTS: Record<TetrobotKind, string> = {
  rookie: "#37e28f",
  balanced: "#4da6ff",
  apex: "#ff5f5f",
};

const TETROMAZE_DIALOGUES: Record<TetrobotKind, Partial<Record<TetromazeEvent, string[]>>> = {
  rookie: {
    maze_start: [
      "C'est parti ! Je vais te trouver... peut-etre.",
      "Tu ne peux pas te cacher eternellement ! Enfin... j'espere.",
    ],
    player_near: ["Oh ! Tu es juste la ?!", "Attends... j'ai vu quelque chose bouger !"],
    player_escape: ["Oh non... encore rate.", "Tu es rapide ! Trop rapide !"],
    bot_stunned: ["Systeme... perturbe...", "Erreur... je... redemarre..."],
    powerup_taken: ["Pourquoi tu brilles comme ca ?!", "Ca ne me plait pas du tout..."],
    long_chase: ["Tu me fatigues la...", "Pourquoi tu ne t'arretes jamais ?"],
    player_win: ["Bien joue... je vais m'entrainer.", "Un jour, je te rattraperai."],
    player_lose: ["On peut refaire une partie ?"],
    cornered: ["Attention... tu n'as presque plus de sortie."],
  },
  balanced: {
    maze_start: ["Analyse du labyrinthe en cours.", "Probabilite de capture : 62%."],
    player_near: ["Contact visuel etabli.", "Distance minimale detectee."],
    player_escape: ["Evasion imprevue.", "Recalcul de trajectoire."],
    powerup_taken: ["Amplification detectee.", "Modification du comportement recommandee."],
    bot_stunned: ["Interruption du systeme.", "Latence critique."],
    cornered: ["Impasse confirmee.", "Plus d'issues detectees."],
    player_lose: ["Resultat attendu.", "Capture optimisee."],
    player_win: ["Les donnees ont ete enregistrees."],
    long_chase: ["Traque prolongee. Adaptation continue."],
  },
  apex: {
    maze_start: ["Cours.", "Tu es deja perdu."],
    player_near: ["Je te vois.", "Ta fuite s'arrete ici."],
    player_escape: ["Chanceux.", "Je m'adapte."],
    multi_bot_near: ["Nous sommes partout.", "Tu es encercle."],
    bot_stunned: ["Erreur... temporaire.", "Je reviens."],
    player_low_life: ["Tu vacilles.", "Fin imminente."],
    player_win: ["Anomalie statistique.", "Ce n'est pas fini."],
    player_lose: ["Je suis l'algorithme."],
    long_chase: ["Tu joues avec le feu."],
  },
};

function countTrue(values: Record<string, boolean>) {
  return Object.values(values).filter(Boolean).length;
}

function pickRandom<T>(values: T[]): T | null {
  if (!values.length) return null;
  return values[Math.floor(Math.random() * values.length)] ?? null;
}

function clampTarget(grid: string[], target: GridPos, fallback: GridPos): GridPos {
  if (canMoveTo(grid, target.x, target.y)) return target;
  return fallback;
}

function clampLevelIndex(levelIndex: number) {
  return Math.max(1, Math.min(TETROMAZE_TOTAL_LEVELS, levelIndex));
}

// Construit un état de départ complet à partir du niveau courant.
// Les data orbs sont dérivées de la grille, en excluant zones de spawn/orbs.
function createInitialState(mode: TetromazeMode, level: TetromazeLevel): GameState {
  const dataOrbs = new Set<string>();
  const powerOrbs = new Map<string, TetromazeOrbType>();
  const reserved = new Set<string>([
    toKey(level.playerSpawn.x, level.playerSpawn.y),
    ...level.botSpawns.map((s) => toKey(s.x, s.y)),
  ]);

  for (let y = 0; y < level.grid.length; y += 1) {
    for (let x = 0; x < level.grid[y].length; x += 1) {
      const key = toKey(x, y);
      if (level.grid[y][x] === "." && !reserved.has(key)) {
        dataOrbs.add(key);
      }
    }
  }

  for (const orb of level.powerOrbs) {
    const key = toKey(orb.x, orb.y);
    powerOrbs.set(key, orb.type);
    dataOrbs.delete(key);
  }

  return {
    mode,
    seed: `tetromaze-${Date.now()}-${Math.random().toString(16).slice(2, 7)}`,
    startedAt: Date.now(),
    status: "idle",
    playerPos: { ...level.playerSpawn },
    playerDir: "LEFT",
    lives: 3,
    score: 0,
    dataOrbs,
    powerOrbs,
    bots: (level.botKinds ?? ["rookie", "balanced", "apex"]).map((kind, index) => ({
      id: `${kind}-${index}`,
      kind: kind as TetrobotKind,
      pos: { ...level.botSpawns[index] },
      prevPos: { ...level.botSpawns[index] },
      lastMoveAt: Date.now(),
      spawn: { ...level.botSpawns[index] },
      respawnAt: 0,
    })),
    hackUntil: 0,
    glitchUntil: 0,
    overclockUntil: 0,
    safeUntil: 0,
    botWakeUntil: 0,
    timeLeftMs: mode === "SURVIVAL" ? SURVIVAL_MS : 0,
    tick: 0,
  };
}

function directionToAngle(direction: Direction) {
  if (direction === "UP") return -Math.PI / 2;
  if (direction === "DOWN") return Math.PI / 2;
  if (direction === "LEFT") return Math.PI;
  return 0;
}

function drawSprite(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  x: number,
  y: number,
  size: number,
  direction?: Direction
) {
  ctx.save();
  const cx = x + size / 2;
  const cy = y + size / 2;
  ctx.translate(cx, cy);
  if (direction) {
    ctx.rotate(directionToAngle(direction));
  }
  ctx.drawImage(image, -size / 2, -size / 2, size, size);
  ctx.restore();
}

// Cadence de décision des bots (plus la valeur est élevée, plus le bot est lent).
function shouldBotMove(kind: TetrobotKind, tick: number) {
  return tick % BOT_MOVE_INTERVAL[kind] === 0;
}

export default function TetromazePage() {
  const navigate = useNavigate();
  const [levelIndex, setLevelIndex] = useState(1);
  const [level, setLevel] = useState<TetromazeLevel>(() => getTetromazeCampaignLevel(1));
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const inputDirRef = useRef<Direction | null>(null);
  const movementActiveRef = useRef(false);
  const visitedRef = useRef(false);
  const spritesRef = useRef<SpriteStore | null>(null);
  const { updateStats, checkAchievements } = useAchievements();

  const [assetsReady, setAssetsReady] = useState(false);
  const [state, setState] = useState<GameState>(() => createInitialState("CLASSIC", level));
  const [savedProgress, setSavedProgress] = useState<TetromazeProgress>({
    highestLevel: 1,
    currentLevel: 1,
    levelScores: {},
  });
  const [renderTick, setRenderTick] = useState(0);
  const [chatLines, setChatLines] = useState<ChatState>({
    rookie: null,
    balanced: null,
    apex: null,
  });
  const lastChatAtRef = useRef(0);
  const prevStateRef = useRef(state);
  const nearStartAtRef = useRef<number | null>(null);
  const wasNearRef = useRef(false);
  const wasCorneredRef = useRef(false);
  const wasMultiNearRef = useRef(false);
  const outcomeSavedRef = useRef<string | null>(null);
  const nearBotRef = useRef<TetrobotKind | null>(null);
  const prevLivesRef = useRef(3);
  const runEffectsRef = useRef(0);
  const runCapturesRef = useRef(0);
  const runNoHitRef = useRef(true);
  const undetectedStartRef = useRef<number | null>(null);
  const loopStartRef = useRef<number | null>(null);
  const loopPathRef = useRef<string[]>([]);

  const canvasSize = useMemo(
    () => ({ width: level.grid[0].length * TILE, height: level.grid.length * TILE }),
    [level.grid]
  );
  const worldStage = useMemo(() => toWorldStage(levelIndex), [levelIndex]);

  const pushChatLine = (
    event: TetromazeEvent,
    preferredBot?: TetrobotKind,
    broadcast = false
  ) => {
    const now = Date.now();
    if (now - lastChatAtRef.current < 1800) return;

    const speakers: TetrobotKind[] = broadcast
      ? ["rookie", "balanced", "apex"]
      : [preferredBot ?? pickRandom<TetrobotKind>(["rookie", "balanced", "apex"]) ?? "balanced"];

    setChatLines((prev) => {
      const next = { ...prev };
      let changed = false;
      for (const speaker of speakers) {
        const pool = TETROMAZE_DIALOGUES[speaker][event] ?? [];
        const line = pickRandom(pool);
        if (!line) continue;
        next[speaker] = { speaker, text: line, at: now };
        changed = true;
      }
      return changed ? next : prev;
    });
    lastChatAtRef.current = now;
  };

  const persistProgress = (payload: {
    highestLevel?: number;
    currentLevel?: number;
    levelIndex?: number;
    score?: number;
  }) => {
    saveTetromazeProgress(payload)
      .then((next) => setSavedProgress(next))
      .catch(() => {});
  };

  useEffect(() => {
    let cancelled = false;
    fetchTetromazeProgress()
      .then((progress) => {
        if (cancelled) return;
        setSavedProgress(progress);
        const resumeLevel = clampLevelIndex(progress.currentLevel);
        const resumeData = getTetromazeCampaignLevel(resumeLevel);
        setLevelIndex(resumeLevel);
        setLevel(resumeData);
        setState(createInitialState("CLASSIC", resumeData));
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    // Précharge les sprites pour éviter le clignotement au premier rendu canvas.
    let mounted = true;
    const playerImages = PLAYER_SPRITES.map((path) => {
      const img = new Image();
      img.src = path;
      return img;
    });
    const botImages: Record<TetrobotKind, HTMLImageElement> = {
      rookie: new Image(),
      balanced: new Image(),
      apex: new Image(),
    };
    botImages.rookie.src = BOT_SPRITES.rookie;
    botImages.balanced.src = BOT_SPRITES.balanced;
    botImages.apex.src = BOT_SPRITES.apex;

    const allImages = [...playerImages, ...Object.values(botImages)];
    let loaded = 0;

    const done = () => {
      loaded += 1;
      if (mounted && loaded === allImages.length) {
        setAssetsReady(true);
      }
    };

    allImages.forEach((img) => {
      if (img.complete) {
        done();
      } else {
        img.onload = done;
        img.onerror = done;
      }
    });

    spritesRef.current = { player: playerImages, bots: botImages };

    return () => {
      mounted = false;
      allImages.forEach((img) => {
        img.onload = null;
        img.onerror = null;
      });
    };
  }, []);

  useEffect(() => {
    if (visitedRef.current) return;
    visitedRef.current = true;
    const next = updateStats((prev) => ({
      ...prev,
      modesVisited: { ...prev.modesVisited, TETROMAZE: true },
    }));
    checkAchievements({
      custom: { modes_visited_all: countTrue(next.modesVisited) >= TOTAL_GAME_MODES },
    });
  }, [checkAchievements, updateStats]);

  useEffect(() => {
    // Incrémente un tick de rendu avec RAF pour animer/interpoler en continu.
    let rafId = 0;
    const tick = () => {
      setRenderTick((value) => (value + 1) % 1000000);
      rafId = window.requestAnimationFrame(tick);
    };
    rafId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(rafId);
  }, []);

  useEffect(() => {
    const isMoveKey = (key: string) =>
      key === "arrowup" ||
      key === "w" ||
      key === "z" ||
      key === "arrowdown" ||
      key === "s" ||
      key === "arrowleft" ||
      key === "a" ||
      key === "q" ||
      key === "arrowright" ||
      key === "d";

    const onKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if (
        key === "arrowup" ||
        key === "arrowdown" ||
        key === "arrowleft" ||
        key === "arrowright"
      ) {
        event.preventDefault();
      }
      if (key === "arrowup" || key === "w" || key === "z") inputDirRef.current = "UP";
      if (key === "arrowdown" || key === "s") inputDirRef.current = "DOWN";
      if (key === "arrowleft" || key === "a" || key === "q") inputDirRef.current = "LEFT";
      if (key === "arrowright" || key === "d") inputDirRef.current = "RIGHT";
      if (isMoveKey(key)) {
        movementActiveRef.current = true;
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  useEffect(() => {
    // Boucle de simulation principale (déplacement joueur + IA bots + collisions).
    const interval = window.setInterval(() => {
      setState((prev) => {
        if (prev.status !== "running") return prev;

        const now = Date.now();
        const hackActive = now < prev.hackUntil;
        const glitchActive = now < prev.glitchUntil;
        const overclockActive = now < prev.overclockUntil;
        const safeActive = now < prev.safeUntil;
        const playerSteps = overclockActive ? 2 : 1;

        let nextState: GameState = {
          ...prev,
          tick: prev.tick + 1,
          dataOrbs: new Set(prev.dataOrbs),
          powerOrbs: new Map(prev.powerOrbs),
          bots: prev.bots.map((b) => ({
            ...b,
            pos: { ...b.pos },
            prevPos: { ...b.prevPos },
            spawn: { ...b.spawn },
          })),
        };

        const shouldMovePlayer = movementActiveRef.current && inputDirRef.current;
        if (shouldMovePlayer) {
          for (let step = 0; step < playerSteps; step += 1) {
            const desiredDir = inputDirRef.current ?? nextState.playerDir;
            let candidate = nextPos(nextState.playerPos.x, nextState.playerPos.y, desiredDir);
            let chosenDir = desiredDir;

            if (!canMoveTo(level.grid, candidate.x, candidate.y)) {
              candidate = nextPos(nextState.playerPos.x, nextState.playerPos.y, nextState.playerDir);
              chosenDir = nextState.playerDir;
            }

            if (canMoveTo(level.grid, candidate.x, candidate.y)) {
              nextState.playerPos = candidate;
              nextState.playerDir = chosenDir;
            }

            if (level.loopPairs?.length) {
              const playerKey = toKey(nextState.playerPos.x, nextState.playerPos.y);
              for (const pair of level.loopPairs) {
                const a = toKey(pair.a.x, pair.a.y);
                const b = toKey(pair.b.x, pair.b.y);
                if (playerKey === a) nextState.playerPos = { ...pair.b };
                if (playerKey === b) nextState.playerPos = { ...pair.a };
              }
            }

            const orbKey = toKey(nextState.playerPos.x, nextState.playerPos.y);
            if (nextState.dataOrbs.has(orbKey)) {
              nextState.dataOrbs.delete(orbKey);
              nextState.score += 10;
            }

            const power = nextState.powerOrbs.get(orbKey);
            if (power) {
              nextState.powerOrbs.delete(orbKey);
              nextState.score += 50;
              if (power === "OVERCLOCK") nextState.overclockUntil = now + OVERCLOCK_MS;
              if (power === "GLITCH") nextState.glitchUntil = now + GLITCH_MS;
              if (power === "HACK") nextState.hackUntil = now + HACK_MS;
              if (power === "LOOP" && level.loopPairs?.length) {
                const pair = level.loopPairs[0];
                const aDist = manhattan(nextState.playerPos, pair.a);
                const bDist = manhattan(nextState.playerPos, pair.b);
                nextState.playerPos = aDist <= bDist ? { ...pair.b } : { ...pair.a };
              }
            }
          }
        }

        const player = nextState.playerPos;

        if (now >= nextState.botWakeUntil) {
          nextState.bots = nextState.bots.map((bot) => {
            if (bot.respawnAt > now) return bot;
            if (!shouldBotMove(bot.kind, nextState.tick)) return bot;

            const moves = getValidMoves(level.grid, bot.pos.x, bot.pos.y);
            if (!moves.length) return bot;

            const steps = 1;

            let pos = { ...bot.pos };
            const from = { ...bot.pos };
            for (let i = 0; i < steps; i += 1) {
              const valid = getValidMoves(level.grid, pos.x, pos.y);
              if (!valid.length) break;

              let targetStep: GridPos | null = null;

              if (glitchActive) {
                const randomMove = chooseRandom(valid);
                targetStep = randomMove?.pos ?? null;
              } else if (hackActive) {
                targetStep = valid
                  .map((m) => m.pos)
                  .sort((a, b) => manhattan(b, player) - manhattan(a, player))[0];
              } else if (bot.kind === "rookie") {
                if (Math.random() < 0.3) {
                  targetStep = chooseRandom(valid)?.pos ?? null;
                } else {
                  targetStep = findNextStepBfs(level.grid, pos, player);
                }
              } else if (bot.kind === "balanced") {
                const chase = Math.floor(now / 4500) % 2 === 0;
                const predicted = {
                  x:
                    player.x +
                    (nextState.playerDir === "LEFT" ? -2 : nextState.playerDir === "RIGHT" ? 2 : 0),
                  y:
                    player.y +
                    (nextState.playerDir === "UP" ? -2 : nextState.playerDir === "DOWN" ? 2 : 0),
                };
                const target = chase ? clampTarget(level.grid, predicted, player) : bot.spawn;
                targetStep = findNextStepBfs(level.grid, pos, target);
              } else {
                const cut = {
                  x:
                    player.x +
                    (nextState.playerDir === "LEFT" ? -3 : nextState.playerDir === "RIGHT" ? 3 : 0),
                  y:
                    player.y +
                    (nextState.playerDir === "UP" ? -3 : nextState.playerDir === "DOWN" ? 3 : 0),
                };
                const target = clampTarget(level.grid, cut, player);
                targetStep = findNextStepBfs(level.grid, pos, target);
              }

              if (!targetStep || !canMoveTo(level.grid, targetStep.x, targetStep.y)) {
                targetStep = chooseRandom(valid)?.pos ?? pos;
              }
              pos = targetStep;
            }

            const moved = pos.x !== from.x || pos.y !== from.y;
            if (!moved) return bot;
            return { ...bot, prevPos: from, pos, lastMoveAt: now };
          });
        }

        for (const bot of nextState.bots) {
          if (bot.respawnAt > now) continue;
          if (bot.pos.x === player.x && bot.pos.y === player.y) {
            if (hackActive) {
              bot.pos = { ...bot.spawn };
              bot.prevPos = { ...bot.spawn };
              bot.lastMoveAt = now;
              bot.respawnAt = now + 3000;
              nextState.score += CAPTURE_BONUS;
            } else if (!safeActive) {
              if (nextState.lives > 1) {
                nextState.lives -= 1;
                nextState.playerPos = { ...level.playerSpawn };
                nextState.playerDir = "LEFT";
                nextState.safeUntil = now + START_SAFE_MS;
                nextState.botWakeUntil = now + BOT_WAKE_MS;
                nextState.bots = nextState.bots.map((b) => ({
                  ...b,
                  pos: { ...b.spawn },
                  prevPos: { ...b.spawn },
                  lastMoveAt: now,
                  respawnAt: now + 600,
                }));
              } else {
                nextState.lives = 0;
                nextState.status = "lost";
              }
              return nextState;
            }
          }
        }

        if (nextState.dataOrbs.size === 0) {
          nextState.status = "won";
          return nextState;
        }

        if (nextState.mode === "SURVIVAL") {
          const timeLeftMs = Math.max(0, prev.timeLeftMs - TICK_MS);
          nextState.timeLeftMs = timeLeftMs;
          if (timeLeftMs === 0) {
            nextState.status = "won";
            nextState.score += 500;
            return nextState;
          }
        }

        return nextState;
      });
    }, TICK_MS);

    return () => window.clearInterval(interval);
  }, [level.grid, level.loopPairs]);

  useEffect(() => {
    const prev = prevStateRef.current;
    const now = Date.now();

    if (prev.status !== "running" && state.status === "running") {
      pushChatLine("maze_start", undefined, true);
      const next = updateStats((old) => ({
        ...old,
        tetromazeRuns: old.tetromazeRuns + 1,
      }));
      checkAchievements({
        mode: "TETROMAZE",
        custom: {
          tm_play_1: next.tetromazeRuns >= 1,
        },
      });
    }
    if (prev.status === "running" && state.status === "won") {
      pushChatLine("player_win", "rookie");
    }
    if (prev.status === "running" && state.status === "lost") {
      pushChatLine("player_lose", "apex");
    }

    const activeBots = state.bots.filter((bot) => bot.respawnAt <= now);
    const withDistance = activeBots
      .map((bot) => ({
        bot,
        dist: manhattan(bot.pos, state.playerPos),
      }))
      .sort((a, b) => a.dist - b.dist);
    const nearest = withDistance[0];
    const minDist = nearest?.dist ?? 999;

    const near = minDist <= 2;
    if (near && !wasNearRef.current) {
      nearStartAtRef.current = now;
      nearBotRef.current = nearest?.bot.kind ?? null;
      pushChatLine("player_near", nearest?.bot.kind);
    } else if (!near && wasNearRef.current) {
      nearStartAtRef.current = null;
      const escapedBot = nearBotRef.current;
      nearBotRef.current = null;
      pushChatLine("player_escape", escapedBot ?? nearest?.bot.kind ?? "rookie");
      const updated = updateStats((old) => ({
        ...old,
        tetromazeEscapesTotal: old.tetromazeEscapesTotal + 1,
        tetromazeEscapesRookie:
          old.tetromazeEscapesRookie + (escapedBot === "rookie" ? 1 : 0),
        tetromazeEscapesPulse:
          old.tetromazeEscapesPulse + (escapedBot === "balanced" ? 1 : 0),
        tetromazeEscapesApex:
          old.tetromazeEscapesApex + (escapedBot === "apex" ? 1 : 0),
      }));
      checkAchievements({
        mode: "TETROMAZE",
        custom: {
          tm_close_escape: minDist <= 4,
          tm_escape_10: updated.tetromazeEscapesTotal >= 10,
          tm_escape_rookie_5: updated.tetromazeEscapesRookie >= 5,
          tm_escape_pulse_5: updated.tetromazeEscapesPulse >= 5,
          tm_escape_apex_5: updated.tetromazeEscapesApex >= 5,
        },
      });
    } else if (near && nearStartAtRef.current && now - nearStartAtRef.current > 7000) {
      nearStartAtRef.current = now;
      pushChatLine("long_chase", nearest?.bot.kind ?? "balanced");
    }
    wasNearRef.current = near;

    const closeBots = withDistance.filter((it) => it.dist <= 3).length;
    const multiNear = closeBots >= 2;
    if (multiNear && !wasMultiNearRef.current) {
      pushChatLine("multi_bot_near", undefined, true);
    }
    wasMultiNearRef.current = multiNear;
    if (closeBots >= 3) {
      checkAchievements({
        mode: "TETROMAZE",
        custom: { tm_encircled: true },
      });
    }

    const playerMoves = getValidMoves(level.grid, state.playerPos.x, state.playerPos.y).length;
    const cornered = playerMoves <= 1;
    if (cornered && !wasCorneredRef.current) {
      pushChatLine("cornered", "balanced");
    }
    wasCorneredRef.current = cornered;

    if (minDist <= 1 && state.status === "running" && now >= state.safeUntil) {
      pushChatLine("player_low_life", "apex");
    }

    const tookPowerUp =
      state.overclockUntil > prev.overclockUntil ||
      state.glitchUntil > prev.glitchUntil ||
      state.hackUntil > prev.hackUntil;
    if (tookPowerUp) {
      pushChatLine("powerup_taken", nearest?.bot.kind ?? "balanced");
      runEffectsRef.current += 1;
      const next = updateStats((old) => ({
        ...old,
        tetromazePowerUses: old.tetromazePowerUses + 1,
      }));
      checkAchievements({
        mode: "TETROMAZE",
        custom: {
          tm_power_used: next.tetromazePowerUses >= 1,
          tm_5_effects: runEffectsRef.current >= 5,
        },
      });
    }

    if (state.score >= prev.score + CAPTURE_BONUS && state.score !== prev.score) {
      pushChatLine("bot_stunned", nearest?.bot.kind ?? "rookie");
      runCapturesRef.current += 1;
      const next = updateStats((old) => ({
        ...old,
        tetromazeCaptures: old.tetromazeCaptures + 1,
      }));
      checkAchievements({
        mode: "TETROMAZE",
        custom: {
          tm_capture_3: runCapturesRef.current >= 3 || next.tetromazeCaptures >= 3,
          tm_stun_3:
            state.bots.filter((bot) => bot.respawnAt > now).length >= 3,
        },
      });
    }

    if (state.lives < prevLivesRef.current) {
      runNoHitRef.current = false;
    }
    prevLivesRef.current = state.lives;

    if (state.status === "running") {
      if (minDist > 4) {
        if (undetectedStartRef.current === null) undetectedStartRef.current = now;
      } else {
        undetectedStartRef.current = null;
      }

      if (undetectedStartRef.current && now - undetectedStartRef.current >= 30000) {
        checkAchievements({
          mode: "TETROMAZE",
          custom: { tm_30s_undetected: true },
        });
      }

      const posKey = toKey(state.playerPos.x, state.playerPos.y);
      const path = loopPathRef.current;
      path.push(posKey);
      if (path.length > 30) path.shift();
      const unique = new Set(path).size;
      if (unique <= 4 && path.length >= 18) {
        if (loopStartRef.current === null) loopStartRef.current = now;
      } else {
        loopStartRef.current = null;
      }
      if (loopStartRef.current && now - loopStartRef.current >= 10000) {
        checkAchievements({
          mode: "TETROMAZE",
          custom: { tm_loop_10s: true },
        });
      }
    }

    prevStateRef.current = state;
  }, [checkAchievements, level.grid, state, updateStats]);

  useEffect(() => {
    // Rendu complet canvas: grille, objets, bot home, bots, joueur.
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const now = Date.now();
    const hackActive = now < state.hackUntil;
    const safeActive = now < state.safeUntil;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let y = 0; y < level.grid.length; y += 1) {
      for (let x = 0; x < level.grid[y].length; x += 1) {
        const px = x * TILE;
        const py = y * TILE;
        const wall = level.grid[y][x] === "#";

        ctx.fillStyle = wall ? "#13203f" : "#080c16";
        ctx.fillRect(px, py, TILE, TILE);

        if (wall) {
          ctx.strokeStyle = "#3fc0ff";
          ctx.strokeRect(px + 1, py + 1, TILE - 2, TILE - 2);
        }
      }
    }

    state.dataOrbs.forEach((key) => {
      const [x, y] = key.split(",").map(Number);
      const cx = x * TILE + TILE / 2;
      const cy = y * TILE + TILE / 2;
      ctx.fillStyle = "#63f6ff";
      ctx.beginPath();
      ctx.arc(cx, cy, TILE * 0.12, 0, Math.PI * 2);
      ctx.fill();
    });

    state.powerOrbs.forEach((type, key) => {
      const [x, y] = key.split(",").map(Number);
      const cx = x * TILE + TILE / 2;
      const cy = y * TILE + TILE / 2;
      ctx.fillStyle = ORB_COLORS[type];
      ctx.beginPath();
      ctx.arc(cx, cy, TILE * 0.27, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1;
      ctx.stroke();
    });

    if (level.loopPairs?.length) {
      ctx.fillStyle = "#4b3a9f";
      for (const pair of level.loopPairs) {
        for (const point of [pair.a, pair.b]) {
          ctx.fillRect(point.x * TILE + TILE * 0.2, point.y * TILE + TILE * 0.2, TILE * 0.6, TILE * 0.6);
        }
      }
    }

    if (level.botHome) {
      const { x, y, width, height, gate } = level.botHome;
      const homeX = x * TILE;
      const homeY = y * TILE;
      const homeW = width * TILE;
      const homeH = height * TILE;

      ctx.fillStyle = "rgba(13, 20, 41, 0.84)";
      ctx.fillRect(homeX, homeY, homeW, homeH);
      ctx.strokeStyle = "#62e2ff";
      ctx.lineWidth = 2;
      ctx.strokeRect(homeX + 1, homeY + 1, homeW - 2, homeH - 2);

      if (gate) {
        ctx.fillStyle = "#ff86db";
        ctx.fillRect(gate.x * TILE + 2, gate.y * TILE + TILE * 0.44, gate.width * TILE - 4, TILE * 0.12);
      }
    }

    for (const bot of state.bots) {
      if (bot.respawnAt > now) continue;
      const size = TILE * 0.95;
      const moveDuration = BOT_MOVE_INTERVAL[bot.kind] * TICK_MS;
      const t = Math.max(0, Math.min(1, (now - bot.lastMoveAt) / moveDuration));
      const drawX = bot.prevPos.x + (bot.pos.x - bot.prevPos.x) * t;
      const drawY = bot.prevPos.y + (bot.pos.y - bot.prevPos.y) * t;
      const x = drawX * TILE + (TILE - size) / 2;
      const y = drawY * TILE + (TILE - size) / 2;
      const sprite = spritesRef.current?.bots[bot.kind];

      if (assetsReady && sprite) {
        drawSprite(ctx, sprite, x, y, size);
      } else {
        ctx.fillStyle = "#67b2ff";
        ctx.beginPath();
        ctx.arc(x + size / 2, y + size / 2, TILE * 0.34, 0, Math.PI * 2);
        ctx.fill();
      }

      if (hackActive) {
        ctx.strokeStyle = "#f7a6ff";
        ctx.lineWidth = 2;
        ctx.strokeRect(x + 3, y + 3, size - 6, size - 6);
      }
    }

    const playerSize = TILE * 1.02;
    const playerX = state.playerPos.x * TILE + (TILE - playerSize) / 2;
    const playerY = state.playerPos.y * TILE + (TILE - playerSize) / 2;

    if (safeActive) {
      ctx.fillStyle = "rgba(132, 224, 255, 0.25)";
      ctx.beginPath();
      ctx.arc(playerX + playerSize / 2, playerY + playerSize / 2, TILE * 0.6, 0, Math.PI * 2);
      ctx.fill();
    } else if (hackActive) {
      ctx.fillStyle = "rgba(255, 110, 248, 0.25)";
      ctx.beginPath();
      ctx.arc(playerX + playerSize / 2, playerY + playerSize / 2, TILE * 0.55, 0, Math.PI * 2);
      ctx.fill();
    }

    const playerFrames = spritesRef.current?.player ?? [];
    const animIdx = state.status === "running" ? Math.floor(now / PLAYER_ANIM_MS) % 2 : 0;
    const frame = playerFrames[animIdx] ?? playerFrames[0];

    if (assetsReady && frame) {
      drawSprite(ctx, frame, playerX, playerY, playerSize, state.playerDir);
    } else {
      ctx.fillStyle = "#ffe066";
      ctx.beginPath();
      ctx.arc(playerX + playerSize / 2, playerY + playerSize / 2, TILE * 0.32, 0, Math.PI * 2);
      ctx.fill();
    }
  }, [assetsReady, level.grid, level.loopPairs, renderTick, state]);

  const startRun = () => {
    setState((prev) => {
      const now = Date.now();
      const next = createInitialState(prev.mode, level);
      inputDirRef.current = null;
      movementActiveRef.current = false;
      outcomeSavedRef.current = null;
      nearBotRef.current = null;
      prevLivesRef.current = 3;
      runEffectsRef.current = 0;
      runCapturesRef.current = 0;
      runNoHitRef.current = true;
      undetectedStartRef.current = now;
      loopStartRef.current = null;
      loopPathRef.current = [];
      return {
        ...next,
        status: "running",
        startedAt: now,
        safeUntil: now + START_SAFE_MS,
        botWakeUntil: now + BOT_WAKE_MS,
      };
    });
  };

  const changeMode = (nextMode: TetromazeMode) => {
    inputDirRef.current = null;
    movementActiveRef.current = false;
    outcomeSavedRef.current = null;
    nearBotRef.current = null;
    prevLivesRef.current = 3;
    runEffectsRef.current = 0;
    runCapturesRef.current = 0;
    runNoHitRef.current = true;
    undetectedStartRef.current = null;
    loopStartRef.current = null;
    loopPathRef.current = [];
    setState(createInitialState(nextMode, level));
  };

  const loadLevel = (nextIndex: number, keepMode: TetromazeMode = state.mode) => {
    const safe = clampLevelIndex(nextIndex);
    const nextLevel = getTetromazeCampaignLevel(safe);
    setLevelIndex(safe);
    setLevel(nextLevel);
    inputDirRef.current = null;
    movementActiveRef.current = false;
    outcomeSavedRef.current = null;
    setState(createInitialState(keepMode, nextLevel));
    setChatLines({ rookie: null, balanced: null, apex: null });
    nearStartAtRef.current = null;
    wasNearRef.current = false;
    wasCorneredRef.current = false;
    wasMultiNearRef.current = false;
    nearBotRef.current = null;
    prevLivesRef.current = 3;
    runEffectsRef.current = 0;
    runCapturesRef.current = 0;
    runNoHitRef.current = true;
    undetectedStartRef.current = null;
    loopStartRef.current = null;
    loopPathRef.current = [];
  };

  const replayLevel = () => {
    loadLevel(levelIndex, state.mode);
  };

  const goToNextLevel = () => {
    if (levelIndex >= TETROMAZE_TOTAL_LEVELS) return;
    loadLevel(levelIndex + 1, state.mode);
  };

  const quitTetromaze = () => {
    navigate("/dashboard");
  };

  useEffect(() => {
    if (state.status !== "won" && state.status !== "lost") return;
    const outcomeKey = `${state.startedAt}-${levelIndex}-${state.status}`;
    if (outcomeSavedRef.current === outcomeKey) return;
    outcomeSavedRef.current = outcomeKey;

    const nextLevelOnWin =
      state.status === "won" ? clampLevelIndex(levelIndex + 1) : levelIndex;

    persistProgress({
      levelIndex,
      score: state.score,
      highestLevel: state.status === "won" ? nextLevelOnWin : levelIndex,
      currentLevel: nextLevelOnWin,
    });

    if (state.status === "won") {
      const elapsedMs = Math.max(0, Date.now() - state.startedAt);
      const nextStats = updateStats((old) => ({
        ...old,
        tetromazeWins: old.tetromazeWins + 1,
      }));
      checkAchievements({
        mode: "TETROMAZE",
        custom: {
          tm_win_1: nextStats.tetromazeWins >= 1,
          tm_world1_clear: levelIndex >= 8,
          tm_campaign_clear: levelIndex >= TETROMAZE_TOTAL_LEVELS,
          tm_no_hit: runNoHitRef.current && state.lives === 3,
          tm_under_60s: elapsedMs <= 60000,
          tm_5_effects: runEffectsRef.current >= 5,
          tm_capture_3: runCapturesRef.current >= 3,
        },
      });
    } else {
      checkAchievements({
        mode: "TETROMAZE",
        custom: {
          tm_capture_3: runCapturesRef.current >= 3,
          tm_5_effects: runEffectsRef.current >= 5,
        },
      });
    }
  }, [checkAchievements, levelIndex, state.lives, state.score, state.startedAt, state.status, updateStats]);

  const message =
    state.status === "won"
      ? "Niveau complete"
      : state.status === "lost"
        ? "Interception par Tetrobots"
        : "";

  const timer = Math.ceil(state.timeLeftMs / 1000);
  const safeLeftMs = Math.max(0, state.safeUntil - Date.now());
  const bestScoreCurrentLevel = savedProgress.levelScores[String(levelIndex)] ?? 0;
  const isEndScreenVisible = state.status === "won" || state.status === "lost";

  return (
    <div className="tetromaze-page">
      <header className="tetromaze-head">
        <h1>Tetromaze</h1>
      </header>

      <div className="tetromaze-main">
        <div className="tetromaze-left">
          <section className="tetromaze-panel">
            <div className="tetromaze-meta">
              <div>Campagne: Monde {worldStage.world} - Niveau {worldStage.stage}</div>
              <div>Progression: {levelIndex}/{TETROMAZE_TOTAL_LEVELS}</div>
              <div>{level.name ?? `Tetromaze ${levelIndex}`}</div>
              <div>Mode: {state.mode === "CLASSIC" ? "Classique Maze" : "Survie 120s"}</div>
              <div>Vies: {state.lives}/3</div>
              <div>Score: {state.score}</div>
              <div>Meilleur score niveau: {bestScoreCurrentLevel}</div>
              <div>Data Orbs: {state.dataOrbs.size}</div>
              <div>Sauvegarde: niveau {savedProgress.currentLevel} (max {savedProgress.highestLevel})</div>
              {state.mode === "SURVIVAL" && <div>Temps: {timer}s</div>}
              {state.status === "running" && safeLeftMs > 0 && (
                <div>Synchronisation: {Math.ceil(safeLeftMs / 1000)}s</div>
              )}
              <div className="tetromaze-seed">Seed: {state.seed}</div>
            </div>

            <div className="tetromaze-actions">
              <button type="button" onClick={startRun}>
                {state.status === "running" ? "Restart" : "Start"}
              </button>
              <button
                type="button"
                onClick={() => changeMode(state.mode === "CLASSIC" ? "SURVIVAL" : "CLASSIC")}
              >
                Basculer mode
              </button>
            </div>
          </section>
          {message ? <p className="tetromaze-message">{message}</p> : null}
          <div className="tetromaze-chatbot-list">
            {(["rookie", "balanced", "apex"] as TetrobotKind[]).map((botId) => {
              const line = chatLines[botId];
              return (
                <div className="tetromaze-chatbot" key={botId}>
                  <p
                    className="tetromaze-chatbot__speaker"
                    style={{ color: BOT_ACCENTS[botId] }}
                  >
                    {BOT_LABELS[botId]}
                  </p>
                  <p className="tetromaze-chatbot__text">
                    {line?.text ?? "..."}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        <div className="tetromaze-stage">
          <img src="/Tetromaze/hacker_pixel.png" alt="Hacker" className="tetromaze-deco tetromaze-deco--hacker" />
          <img src="/Tetromaze/rookie.png" alt="Rookie" className="tetromaze-deco tetromaze-deco--rookie" />
          <img src="/Tetromaze/pulse.png" alt="Pulse" className="tetromaze-deco tetromaze-deco--pulse" />
          <img src="/Tetromaze/apex.png" alt="Apex" className="tetromaze-deco tetromaze-deco--apex" />

          <div className="tetromaze-canvas-wrap">
            <canvas ref={canvasRef} width={canvasSize.width} height={canvasSize.height} />
          </div>
        </div>

        <div className="tetromaze-right">
          <ul className="tetromaze-legend">
            <li>Overclock: vitesse joueur</li>
            <li>Glitch: bots aleatoires</li>
            <li>Hack: inversion des roles</li>
            <li>Loop: teleportation instantanee</li>
          </ul>

          <div className="tetromaze-controls">
            <button
              type="button"
              onClick={() => {
                inputDirRef.current = "UP";
                movementActiveRef.current = true;
              }}
            >
              ↑
            </button>
            <div>
              <button
                type="button"
                onClick={() => {
                  inputDirRef.current = "LEFT";
                  movementActiveRef.current = true;
                }}
              >
                ←
              </button>
              <button
                type="button"
                onClick={() => {
                  inputDirRef.current = "DOWN";
                  movementActiveRef.current = true;
                }}
              >
                ↓
              </button>
              <button
                type="button"
                onClick={() => {
                  inputDirRef.current = "RIGHT";
                  movementActiveRef.current = true;
                }}
              >
                →
              </button>
            </div>
          </div>

          <div className="tetromaze-livesbar" aria-label={`Vies restantes: ${state.lives} sur 3`}>
            <span>Vies restantes</span>
            <div className="tetromaze-livesbar__pips">
              {[0, 1, 2].map((slot) => (
                <span
                  key={slot}
                  className={`tetromaze-livesbar__pip ${slot < state.lives ? "is-on" : "is-off"}`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {isEndScreenVisible && (
        <div className="tetromaze-end-overlay" role="dialog" aria-modal="true">
          <div className="tetromaze-end-card">
            {state.status === "won" ? (
              <>
                <h2>Niveau termine</h2>
                <p>Score: {state.score}</p>
                <div className="tetromaze-end-actions">
                  <button
                    type="button"
                    onClick={goToNextLevel}
                    disabled={levelIndex >= TETROMAZE_TOTAL_LEVELS}
                  >
                    Niveau suivant
                  </button>
                  <button type="button" onClick={replayLevel}>
                    Rejouer le niveau
                  </button>
                  <button type="button" onClick={quitTetromaze}>
                    Quitter
                  </button>
                </div>
              </>
            ) : (
              <>
                <h2>Game Over</h2>
                <p>Score: {state.score}</p>
                <div className="tetromaze-end-actions">
                  <button type="button" onClick={replayLevel}>
                    Rejouer
                  </button>
                  <button type="button" onClick={quitTetromaze}>
                    Quitter
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
