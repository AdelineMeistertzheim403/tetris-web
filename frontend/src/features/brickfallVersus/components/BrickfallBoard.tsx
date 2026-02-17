import { useCallback, useEffect, useRef } from "react";
import { BRICKFALL_BALANCE } from "../config/balance";

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

type BrickfallBoardProps = {
  rows: number;
  cols: number;
  cellSize?: number;
  targetBoard?: number[][] | null;
  speedMultiplier?: number;
  debuff?: string | null;
  interactive?: boolean;
  externalState?: {
    ball: { x: number; y: number; vx: number; vy: number };
    paddle: { x: number; width: number };
    lives: number;
  } | null;
  canLaunch?: boolean;
  paused?: boolean;
  spawnBlockType?: "normal" | "armored" | "bomb" | "cursed" | "mirror" | null;
  spawnToken?: number;
  onLaunch?: () => void;
  onBlocksDestroyed?: (count: number) => void;
  onBlockDestroyedAt?: (pos: { x: number; y: number }) => void;
  onLifeDepleted?: () => void;
  onBombDestroyed?: (pos: { x: number; y: number }) => void;
  onCursedHit?: () => void;
  onMirrorHit?: () => void;
  onCoreDestroyed?: () => void;
  onSpecialShapeSpawned?: (payload: {
    blockType: "armored" | "bomb" | "cursed" | "mirror";
    cells: Array<{ x: number; y: number }>;
  }) => void;
  onState?: (state: {
    ball: { x: number; y: number; vx: number; vy: number };
    paddle: { x: number; width: number };
    lives: number;
  }) => void;
  onLivesChange?: (lives: number) => void;
  onPowerUpActivated?: (
    type: "multi_ball" | "piercing" | "paddle_extend" | "slow_motion" | "chaotic_ball"
  ) => void;
  initialSpecialBlocks?: Array<{
    x: number;
    y: number;
    type: "armored" | "bomb" | "cursed" | "mirror";
    hp?: number;
  }>;
  guaranteedDropBlocks?: Array<{
    x: number;
    y: number;
    drop?: DropType | "random";
  }>;
};

type Ball = { x: number; y: number; vx: number; vy: number; id: number };
type SpecialBlockType = "armored" | "bomb" | "cursed" | "mirror" | "core";
type BlockSpriteType = "normal" | "bonus" | "malus" | SpecialBlockType;
type DropType = "multi_ball" | "piercing" | "paddle_extend" | "slow_motion" | "chaotic_ball";
type Drop = { id: number; x: number; y: number; vy: number; type: DropType };
type ExplosionRing = {
  x: number;
  y: number;
  startedAt: number;
  durationMs: number;
  maxRadius: number;
};
type ActiveEffects = {
  piercingUntil: number;
  extendedPaddleUntil: number;
  slowMotionUntil: number;
  chaoticBallUntil: number;
};

const POWER_UP_SPRITES: Record<DropType, string> = {
  multi_ball: "/powerups/multi_ball.png",
  piercing: "/powerups/balle_perforante.png",
  paddle_extend: "/powerups/raquette_ettendue.png",
  slow_motion: "/powerups/slow_motion.png",
  chaotic_ball: "/powerups/balle_chaotique.png",
};
const BLOCK_SPRITES: Record<BlockSpriteType, string> = {
  normal: "/blocs/normal.png",
  bonus: "/blocs/bonus.png",
  malus: "/blocs/malus.png",
  armored: "/blocs/armored.png",
  bomb: "/blocs/bomb.png",
  cursed: "/blocs/cursed.png",
  mirror: "/blocs/mirror.png",
  core: "/blocs/core.png",
};
const TETROMINO_SHAPES: Array<Array<{ x: number; y: number }>> = [
  [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 2, y: 0 },
    { x: 3, y: 0 },
  ],
  [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 0, y: 1 },
    { x: 1, y: 1 },
  ],
  [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 2, y: 0 },
    { x: 1, y: 1 },
  ],
  [
    { x: 0, y: 0 },
    { x: 0, y: 1 },
    { x: 1, y: 1 },
    { x: 2, y: 1 },
  ],
  [
    { x: 2, y: 0 },
    { x: 0, y: 1 },
    { x: 1, y: 1 },
    { x: 2, y: 1 },
  ],
  [
    { x: 1, y: 0 },
    { x: 2, y: 0 },
    { x: 0, y: 1 },
    { x: 1, y: 1 },
  ],
  [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 1, y: 1 },
    { x: 2, y: 1 },
  ],
];
const CORE_SHAPE: Array<{ x: number; y: number }> = [
  { x: 0, y: 0 },
  { x: 1, y: 0 },
  { x: 0, y: 1 },
  { x: 1, y: 1 },
];

function randomDropType(): DropType {
  const pool: DropType[] = [
    "multi_ball",
    "piercing",
    "paddle_extend",
    "slow_motion",
    "chaotic_ball",
  ];
  return pool[Math.floor(Math.random() * pool.length)];
}

function normalizeDropType(value: string | undefined): DropType | "random" | null {
  if (!value) return null;
  if (value === "random") return "random";
  if (
    value === "multi_ball" ||
    value === "piercing" ||
    value === "paddle_extend" ||
    value === "slow_motion" ||
    value === "chaotic_ball"
  ) {
    return value;
  }
  return null;
}

function armoredColorFromHp(hp: number) {
  if (hp >= 3) return "#4b5563";
  if (hp >= 2) return "#9ca3af";
  return "#d1d5db";
}

export default function BrickfallBoard({
  rows,
  cols,
  cellSize = 16,
  targetBoard,
  speedMultiplier = 1,
  debuff,
  interactive = true,
  externalState = null,
  canLaunch = true,
  paused = false,
  spawnBlockType = null,
  spawnToken = 0,
  onLaunch,
  onBlocksDestroyed,
  onBlockDestroyedAt,
  onLifeDepleted,
  onBombDestroyed,
  onCursedHit,
  onMirrorHit,
  onCoreDestroyed,
  onSpecialShapeSpawned,
  onState,
  onLivesChange,
  onPowerUpActivated,
  initialSpecialBlocks,
  guaranteedDropBlocks,
}: BrickfallBoardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const blocksRef = useRef<number[][]>([]);
  const basePaddleWidth = cols * cellSize * 0.25;
  const paddleRef = useRef({ x: 0, width: basePaddleWidth });
  const paddleVelRef = useRef(0);
  const launchedRef = useRef(false);
  const speedRef = useRef(speedMultiplier);
  const debuffRef = useRef<string | null>(debuff ?? null);
  const livesRef = useRef(BRICKFALL_BALANCE.demolisher.startLives);
  const ballsRef = useRef<Ball[]>([]);
  const nextBallIdRef = useRef(1);
  const dropsRef = useRef<Drop[]>([]);
  const powerUpImagesRef = useRef<Partial<Record<DropType, HTMLImageElement>>>({});
  const blockImagesRef = useRef<Partial<Record<BlockSpriteType, HTMLImageElement>>>({});
  const effectsRef = useRef<ActiveEffects>({
    piercingUntil: 0,
    extendedPaddleUntil: 0,
    slowMotionUntil: 0,
    chaoticBallUntil: 0,
  });

  const onBlocksDestroyedRef = useRef<BrickfallBoardProps["onBlocksDestroyed"]>(onBlocksDestroyed);
  const onBlockDestroyedAtRef = useRef<BrickfallBoardProps["onBlockDestroyedAt"]>(onBlockDestroyedAt);
  const onStateRef = useRef<BrickfallBoardProps["onState"]>(onState);
  const onLifeDepletedRef = useRef<BrickfallBoardProps["onLifeDepleted"]>(onLifeDepleted);
  const onBombDestroyedRef = useRef<BrickfallBoardProps["onBombDestroyed"]>(onBombDestroyed);
  const onCursedHitRef = useRef<BrickfallBoardProps["onCursedHit"]>(onCursedHit);
  const onMirrorHitRef = useRef<BrickfallBoardProps["onMirrorHit"]>(onMirrorHit);
  const onCoreDestroyedRef = useRef<BrickfallBoardProps["onCoreDestroyed"]>(onCoreDestroyed);
  const onSpecialShapeSpawnedRef =
    useRef<BrickfallBoardProps["onSpecialShapeSpawned"]>(onSpecialShapeSpawned);
  const onLivesChangeRef = useRef<BrickfallBoardProps["onLivesChange"]>(onLivesChange);
  const onPowerUpActivatedRef =
    useRef<BrickfallBoardProps["onPowerUpActivated"]>(onPowerUpActivated);

  const lastFrameRef = useRef<number | null>(null);
  const lastStateSentRef = useRef(0);
  const accumulatorRef = useRef(0);
  const pressedKeysRef = useRef({ left: false, right: false });
  const destroyedRef = useRef<Set<string>>(new Set());
  const specialBlocksRef = useRef<Record<string, { type: SpecialBlockType; hp: number }>>({});
  const guaranteedDropsRef = useRef<Record<string, DropType | "random">>({});
  const explosionRingsRef = useRef<ExplosionRing[]>([]);
  const corePlacedRef = useRef(false);

  const width = cols * cellSize;
  const height = rows * cellSize;
  const paddleY = height - cellSize * 1.2;
  const ballRadius = cellSize * 0.35;

  useEffect(() => {
    if (!targetBoard || targetBoard.length === 0) return;
    const normalized = Array.from({ length: rows }, (_, y) => {
      const sourceRow = targetBoard[rows - 1 - y] ?? [];
      return Array.from({ length: cols }, (_, x) => (sourceRow[x] ? 1 : 0));
    });
    blocksRef.current = normalized;
  }, [cols, rows, targetBoard]);

  useEffect(() => {
    const next: Record<string, { type: SpecialBlockType; hp: number }> = {};
    for (const block of initialSpecialBlocks ?? []) {
      if (block.x < 0 || block.x >= cols || block.y < 0 || block.y >= rows) continue;
      // `initialSpecialBlocks` are passed in the same top-origin space as `blocksRef`.
      const internalY = block.y;
      const key = `${block.x}:${internalY}`;
      next[key] = {
        type: block.type,
        hp: block.type === "armored" ? Math.max(2, Math.floor(block.hp ?? 3)) : 1,
      };
    }
    specialBlocksRef.current = next;
  }, [cols, initialSpecialBlocks, rows]);

  useEffect(() => {
    const next: Record<string, DropType | "random"> = {};
    for (const block of guaranteedDropBlocks ?? []) {
      if (block.x < 0 || block.x >= cols || block.y < 0 || block.y >= rows) continue;
      const normalizedDrop = normalizeDropType(block.drop);
      if (!normalizedDrop) continue;
      next[`${block.x}:${block.y}`] = normalizedDrop;
    }
    guaranteedDropsRef.current = next;
  }, [cols, guaranteedDropBlocks, rows]);

  useEffect(() => {
    speedRef.current = speedMultiplier;
  }, [speedMultiplier]);

  useEffect(() => {
    debuffRef.current = debuff ?? null;
  }, [debuff]);

  useEffect(() => {
    onBlocksDestroyedRef.current = onBlocksDestroyed;
  }, [onBlocksDestroyed]);

  useEffect(() => {
    onBlockDestroyedAtRef.current = onBlockDestroyedAt;
  }, [onBlockDestroyedAt]);

  useEffect(() => {
    onStateRef.current = onState;
  }, [onState]);

  useEffect(() => {
    onLifeDepletedRef.current = onLifeDepleted;
  }, [onLifeDepleted]);

  useEffect(() => {
    onBombDestroyedRef.current = onBombDestroyed;
  }, [onBombDestroyed]);

  useEffect(() => {
    onCursedHitRef.current = onCursedHit;
  }, [onCursedHit]);

  useEffect(() => {
    onMirrorHitRef.current = onMirrorHit;
  }, [onMirrorHit]);

  useEffect(() => {
    onCoreDestroyedRef.current = onCoreDestroyed;
  }, [onCoreDestroyed]);

  useEffect(() => {
    onLivesChangeRef.current = onLivesChange;
  }, [onLivesChange]);

  useEffect(() => {
    onSpecialShapeSpawnedRef.current = onSpecialShapeSpawned;
  }, [onSpecialShapeSpawned]);

  useEffect(() => {
    onPowerUpActivatedRef.current = onPowerUpActivated;
  }, [onPowerUpActivated]);

  useEffect(() => {
    const images: Partial<Record<DropType, HTMLImageElement>> = {};
    (Object.keys(POWER_UP_SPRITES) as DropType[]).forEach((type) => {
      const img = new Image();
      img.src = POWER_UP_SPRITES[type];
      images[type] = img;
    });
    powerUpImagesRef.current = images;
    return () => {
      powerUpImagesRef.current = {};
    };
  }, []);

  useEffect(() => {
    const images: Partial<Record<BlockSpriteType, HTMLImageElement>> = {};
    (Object.keys(BLOCK_SPRITES) as BlockSpriteType[]).forEach((type) => {
      const img = new Image();
      img.src = BLOCK_SPRITES[type];
      images[type] = img;
    });
    blockImagesRef.current = images;
    return () => {
      blockImagesRef.current = {};
    };
  }, []);

  const canPlaceShape = useCallback(
    (shape: Array<{ x: number; y: number }>, anchorX: number, anchorY: number) => {
      const grid = blocksRef.current;
      for (const cell of shape) {
        const x = anchorX + cell.x;
        const y = anchorY + cell.y;
        if (x < 0 || x >= cols || y < 0 || y >= rows) return false;
        if (!grid[y]?.[x]) return false;
        if (specialBlocksRef.current[`${x}:${y}`]) return false;
      }
      return true;
    },
    [cols, rows]
  );

  const placeSpecialShape = useCallback(
    (blockType: Exclude<SpecialBlockType, "core">) => {
      const tries = 50;
      for (let i = 0; i < tries; i += 1) {
        const shape = TETROMINO_SHAPES[Math.floor(Math.random() * TETROMINO_SHAPES.length)];
        const anchorX = Math.floor(Math.random() * cols);
        const anchorY = Math.floor(Math.random() * rows);
        if (!canPlaceShape(shape, anchorX, anchorY)) continue;
        const placedCells: Array<{ x: number; y: number }> = [];
        for (const cell of shape) {
          const x = anchorX + cell.x;
          const y = anchorY + cell.y;
          specialBlocksRef.current[`${x}:${y}`] = {
            type: blockType,
            hp: blockType === "armored" ? 3 : 1,
          };
          placedCells.push({ x, y: rows - 1 - y });
        }
        onSpecialShapeSpawnedRef.current?.({ blockType, cells: placedCells });
        return true;
      }
      return false;
    },
    [canPlaceShape, cols, rows]
  );

  const tryPlaceCore = useCallback(() => {
    if (corePlacedRef.current) return;
    const minX = Math.max(0, Math.floor(cols / 2) - 4);
    const maxX = Math.min(cols - 2, Math.floor(cols / 2) + 2);
    for (let y = rows - 3; y >= 1; y -= 1) {
      for (let x = minX; x <= maxX; x += 1) {
        if (!canPlaceShape(CORE_SHAPE, x, y)) continue;
        for (const cell of CORE_SHAPE) {
          const key = `${x + cell.x}:${y + cell.y}`;
          specialBlocksRef.current[key] = { type: "core", hp: 1 };
        }
        corePlacedRef.current = true;
        return;
      }
    }
  }, [canPlaceShape, cols, rows]);

  useEffect(() => {
    if (!interactive) return;
    tryPlaceCore();
  }, [interactive, targetBoard, tryPlaceCore]);

  useEffect(() => {
    if (!spawnBlockType || spawnBlockType === "normal") return;
    placeSpecialShape(spawnBlockType);
  }, [placeSpecialShape, spawnBlockType, spawnToken]);

  const resetBallOnPaddle = useCallback(() => {
    const x = paddleRef.current.x + paddleRef.current.width / 2;
    const y = paddleY - ballRadius - 2;
    ballsRef.current = [{ x, y, vx: 0.27, vy: -0.315, id: nextBallIdRef.current++ }];
    launchedRef.current = false;
  }, [ballRadius, paddleY]);

  const launchBall = useCallback(() => {
    if (paused || !canLaunch || launchedRef.current) return;
    launchedRef.current = true;
    const current = ballsRef.current[0];
    if (!current) {
      resetBallOnPaddle();
      launchedRef.current = true;
      return;
    }
    const dir = Math.random() < 0.5 ? -1 : 1;
    current.vx = dir * 0.27;
    current.vy = -0.315;
    onLaunch?.();
  }, [canLaunch, onLaunch, paused, resetBallOnPaddle]);

  const activatePowerUp = useCallback(
    (type: DropType) => {
      onPowerUpActivatedRef.current?.(type);
      const now = Date.now();
      if (type === "multi_ball") {
        const source = ballsRef.current[0];
        if (!source) return;
        ballsRef.current.push({ ...source, vx: Math.abs(source.vx) + 0.08, id: nextBallIdRef.current++ });
        ballsRef.current.push({ ...source, vx: -Math.abs(source.vx) - 0.08, id: nextBallIdRef.current++ });
        return;
      }
      if (type === "piercing") {
        effectsRef.current.piercingUntil = now + BRICKFALL_BALANCE.demolisher.powerUpDurationMs;
        return;
      }
      if (type === "paddle_extend") {
        effectsRef.current.extendedPaddleUntil =
          now + BRICKFALL_BALANCE.demolisher.powerUpDurationMs;
        return;
      }
      if (type === "slow_motion") {
        effectsRef.current.slowMotionUntil = now + BRICKFALL_BALANCE.demolisher.powerUpDurationMs;
        return;
      }
      effectsRef.current.chaoticBallUntil = now + BRICKFALL_BALANCE.demolisher.powerUpDurationMs;
    },
    []
  );

  useEffect(() => {
    if (!interactive) return;
    wrapperRef.current?.focus();

    const syncPaddleVelocity = () => {
      const { left, right } = pressedKeysRef.current;
      if (left === right) {
        paddleVelRef.current = 0;
        return;
      }
      const invert = debuffRef.current === "invert_controls";
      if (left) {
        paddleVelRef.current = invert ? 1 : -1;
        return;
      }
      paddleVelRef.current = invert ? -1 : 1;
    };

    const isLeftKey = (key: string) => key === "ArrowLeft" || key === "a" || key === "A";
    const isRightKey = (key: string) => key === "ArrowRight" || key === "d" || key === "D";

    const handleKeyDown = (evt: KeyboardEvent) => {
      if (isLeftKey(evt.key)) {
        evt.preventDefault();
        pressedKeysRef.current.left = true;
        syncPaddleVelocity();
      }
      if (isRightKey(evt.key)) {
        evt.preventDefault();
        pressedKeysRef.current.right = true;
        syncPaddleVelocity();
      }
      if (evt.key === " " || evt.code === "Space") {
        evt.preventDefault();
        launchBall();
      }
    };

    const handleKeyUp = (evt: KeyboardEvent) => {
      if (isLeftKey(evt.key) || isRightKey(evt.key)) {
        evt.preventDefault();
      }
      if (isLeftKey(evt.key)) {
        pressedKeysRef.current.left = false;
        syncPaddleVelocity();
      }
      if (isRightKey(evt.key)) {
        pressedKeysRef.current.right = false;
        syncPaddleVelocity();
      }
    };

    const handleBlur = () => {
      pressedKeysRef.current.left = false;
      pressedKeysRef.current.right = false;
      paddleVelRef.current = 0;
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", handleBlur);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", handleBlur);
      pressedKeysRef.current.left = false;
      pressedKeysRef.current.right = false;
      paddleVelRef.current = 0;
    };
  }, [interactive, launchBall]);

  useEffect(() => {
    if (!interactive) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    let rafId = 0;

    paddleRef.current = { x: width / 2 - basePaddleWidth / 2, width: basePaddleWidth };
    livesRef.current = BRICKFALL_BALANCE.demolisher.startLives;
    destroyedRef.current = new Set();
    corePlacedRef.current = false;
    onLivesChangeRef.current?.(livesRef.current);
    dropsRef.current = [];
    explosionRingsRef.current = [];
    effectsRef.current = {
      piercingUntil: 0,
      extendedPaddleUntil: 0,
      slowMotionUntil: 0,
      chaoticBallUntil: 0,
    };
    resetBallOnPaddle();

    const resolveBallBlockCollision = (ball: Ball): boolean => {
      const grid = blocksRef.current;
      const spawnDrop = (x: number, y: number) => {
        const key = `${x}:${y}`;
        const guaranteedDrop = guaranteedDropsRef.current[key];
        let dropType: DropType | null = null;
        if (guaranteedDrop) {
          delete guaranteedDropsRef.current[key];
          dropType = guaranteedDrop === "random" ? randomDropType() : guaranteedDrop;
        } else if (Math.random() < BRICKFALL_BALANCE.demolisher.powerUpDropRate) {
          dropType = randomDropType();
        }
        if (!dropType) return;
        dropsRef.current.push({
          id: Date.now() + Math.floor(Math.random() * 1000),
          x: x * cellSize + cellSize / 2,
          y: y * cellSize + cellSize / 2,
          vy: 0.06,
          type: dropType,
        });
      };
      const registerDestroyed = (x: number, y: number, specialType: SpecialBlockType | null) => {
        const key = `${x}:${y}`;
        destroyedRef.current.add(key);
        onBlocksDestroyedRef.current?.(1);
        onBlockDestroyedAtRef.current?.({ x, y: rows - 1 - y });
        if (specialType !== "core") {
          spawnDrop(x, y);
        }
      };
      const destroyCell = (
        x: number,
        y: number,
        allowBombExplosion: boolean,
        triggerDestroyEffects: boolean
      ): boolean => {
        if (y < 0 || y >= rows || x < 0 || x >= cols) return false;
        if (!grid[y]?.[x]) return false;
        const key = `${x}:${y}`;
        const special = specialBlocksRef.current[key];
        grid[y][x] = 0;
        delete specialBlocksRef.current[key];
        registerDestroyed(x, y, special?.type ?? null);
        if (special && triggerDestroyEffects) {
          if (special.type === "cursed") {
            onCursedHitRef.current?.();
          } else if (special.type === "mirror") {
            onMirrorHitRef.current?.();
          } else if (special.type === "core") {
            onCoreDestroyedRef.current?.();
          }
        }
        if (special?.type === "bomb") {
          explosionRingsRef.current.push({
            x: x * cellSize + cellSize / 2,
            y: y * cellSize + cellSize / 2,
            startedAt: performance.now(),
            durationMs: 320,
            maxRadius: cellSize * 2.3,
          });
          onBombDestroyedRef.current?.({ x, y: rows - 1 - y });
          if (allowBombExplosion) {
            for (let dy = -1; dy <= 1; dy += 1) {
              for (let dx = -1; dx <= 1; dx += 1) {
                if (dx === 0 && dy === 0) continue;
                destroyCell(x + dx, y + dy, true, true);
              }
            }
          }
        }
        return true;
      };
      const minX = Math.floor((ball.x - ballRadius) / cellSize);
      const maxX = Math.floor((ball.x + ballRadius) / cellSize);
      const minY = Math.floor((ball.y - ballRadius) / cellSize);
      const maxY = Math.floor((ball.y + ballRadius) / cellSize);
      for (let y = minY; y <= maxY; y += 1) {
        for (let x = minX; x <= maxX; x += 1) {
          if (y < 0 || y >= rows || x < 0 || x >= cols) continue;
          if (!grid[y]?.[x]) continue;
          const key = `${x}:${y}`;
          const special = specialBlocksRef.current[key];
          if (special) {
            special.hp -= 1;
            if (special.type === "cursed") {
              onCursedHitRef.current?.();
            }
            if (special.type === "mirror") {
              onMirrorHitRef.current?.();
              ball.vx = -ball.vx + (Math.random() - 0.5) * 0.2;
            }
            if (special.type === "core" && special.hp <= 0) {
              onCoreDestroyedRef.current?.();
            }
            if (special.hp <= 0) {
              destroyCell(x, y, true, false);
            }
          } else {
            destroyCell(x, y, false, false);
          }
          return true;
        }
      }
      return false;
    };

    const step = (timestamp: number) => {
      if (lastFrameRef.current === null) lastFrameRef.current = timestamp;
      let delta = timestamp - lastFrameRef.current;
      delta = Math.min(delta, 24);
      lastFrameRef.current = timestamp;
      accumulatorRef.current += delta;

      const now = Date.now();
      const effects = effectsRef.current;
      const hasSlow = now < effects.slowMotionUntil;
      const hasPiercing = now < effects.piercingUntil;
      const hasExtend = now < effects.extendedPaddleUntil;
      const hasChaosBall = now < effects.chaoticBallUntil;

      const targetPaddleWidth = hasExtend ? basePaddleWidth * 1.45 : basePaddleWidth;
      const debuffShrink = debuffRef.current === "paddle_shrink";
      const finalPaddleWidth = debuffShrink ? targetPaddleWidth * 0.7 : targetPaddleWidth;
      const center = paddleRef.current.x + paddleRef.current.width / 2;
      paddleRef.current.width = finalPaddleWidth;
      paddleRef.current.x = clamp(center - finalPaddleWidth / 2, 0, width - finalPaddleWidth);

      const fixedStep = 4;
      while (accumulatorRef.current >= fixedStep) {
        accumulatorRef.current -= fixedStep;
        const stepDelta = fixedStep;

        const paddleSpeed = cellSize * 0.054 * stepDelta;
        if (!paused) {
          paddleRef.current.x = clamp(
            paddleRef.current.x + paddleVelRef.current * paddleSpeed,
            0,
            width - paddleRef.current.width
          );
        }

        const speedMul = speedRef.current * (debuffRef.current === "slow" ? 0.6 : 1) * (hasSlow ? 0.75 : 1);

        if (paused || !launchedRef.current) {
          const docked = ballsRef.current[0];
          if (docked) {
            docked.x = paddleRef.current.x + paddleRef.current.width / 2;
            docked.y = paddleY - ballRadius - 2;
          }
        } else {
          const nextBalls: Ball[] = [];
          for (const ball of ballsRef.current) {
            if (!Number.isFinite(ball.x) || !Number.isFinite(ball.y)) {
              ball.x = width / 2;
              ball.y = height * 0.7;
            }
            ball.x += ball.vx * stepDelta * speedMul;
            ball.y += ball.vy * stepDelta * speedMul;

            if (hasChaosBall || debuffRef.current === "chaos_path") {
              ball.vx += (Math.random() - 0.5) * 0.015;
            }
            if (debuffRef.current === "random_gravity") {
              ball.vy += (Math.random() - 0.5) * 0.01;
            }

            if (ball.x - ballRadius <= 0) {
              ball.x = ballRadius;
              ball.vx = Math.abs(ball.vx);
            }
            if (ball.x + ballRadius >= width) {
              ball.x = width - ballRadius;
              ball.vx = -Math.abs(ball.vx);
            }
            if (ball.y - ballRadius <= 0) {
              ball.y = ballRadius;
              ball.vy = Math.abs(ball.vy);
            }

            const paddleLeft = paddleRef.current.x;
            const paddleRight = paddleLeft + paddleRef.current.width;
            if (ball.y + ballRadius >= paddleY && ball.y + ballRadius <= paddleY + cellSize) {
              if (ball.x >= paddleLeft && ball.x <= paddleRight && ball.vy > 0) {
                const hit = (ball.x - paddleLeft) / paddleRef.current.width - 0.5;
                ball.vy = -Math.abs(ball.vy);
                ball.vx = hit * 0.75;
                if (Math.abs(ball.vx) < 0.08) {
                  ball.vx = ball.vx >= 0 ? 0.08 : -0.08;
                }
              }
            }

            if (!hasPiercing) {
              const hitBlock = resolveBallBlockCollision(ball);
              if (hitBlock) {
                ball.vy = -ball.vy;
              }
            } else {
              resolveBallBlockCollision(ball);
            }

            if (ball.y - ballRadius <= height) {
              nextBalls.push(ball);
            }
          }

          ballsRef.current = nextBalls;
          if (ballsRef.current.length === 0) {
            livesRef.current = Math.max(0, livesRef.current - 1);
            onLivesChangeRef.current?.(livesRef.current);
            if (livesRef.current <= 0) {
              onLifeDepletedRef.current?.();
            } else {
              resetBallOnPaddle();
            }
          }
        }

        if (!paused) {
          const nextDrops: Drop[] = [];
          for (const drop of dropsRef.current) {
            drop.y += drop.vy * stepDelta * Math.max(1, speedMul * 0.9);
            const paddleLeft = paddleRef.current.x;
            const paddleRight = paddleLeft + paddleRef.current.width;
            if (drop.y >= paddleY && drop.y <= paddleY + cellSize && drop.x >= paddleLeft && drop.x <= paddleRight) {
              activatePowerUp(drop.type);
              continue;
            }
            if (drop.y <= height + cellSize) nextDrops.push(drop);
          }
          dropsRef.current = nextDrops;
        }
      }

      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = "#0b0b14";
      ctx.fillRect(0, 0, width, height);
      ctx.strokeStyle = "rgba(34, 211, 238, 0.16)";
      ctx.lineWidth = 1;
      for (let gx = 0; gx <= cols; gx += 1) {
        const x = gx * cellSize + 0.5;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let gy = 0; gy <= rows; gy += 1) {
        const y = gy * cellSize + 0.5;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      const grid = blocksRef.current;
      for (let y = 0; y < rows; y += 1) {
        for (let x = 0; x < cols; x += 1) {
          if (!grid[y]?.[x]) continue;
          const key = `${x}:${y}`;
          const special = specialBlocksRef.current[`${x}:${y}`];
          const hasGuaranteedBonus = Boolean(guaranteedDropsRef.current[key]);
          let blockType: BlockSpriteType = "normal";
          if (special?.type === "cursed") blockType = "malus";
          else if (special) blockType = special.type;
          else if (hasGuaranteedBonus) blockType = "bonus";
          const blockImg = blockImagesRef.current[blockType];
          const hasSprite = Boolean(blockImg && blockImg.complete && blockImg.naturalWidth > 0);
          if (hasSprite) {
            ctx.drawImage(blockImg as HTMLImageElement, x * cellSize, y * cellSize, cellSize, cellSize);
          } else if (!special) {
            ctx.fillStyle = "#ff7b00";
          } else if (special.type === "armored") {
            ctx.fillStyle = armoredColorFromHp(special.hp);
          } else if (special.type === "bomb") {
            ctx.fillStyle = "#ef4444";
          } else if (special.type === "cursed") {
            ctx.fillStyle = "#7c3aed";
          } else if (special.type === "core") {
            ctx.fillStyle = "#f43f5e";
          } else {
            ctx.fillStyle = "#22d3ee";
          }
          if (!hasSprite) {
            ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
          }
          if (special?.type === "armored") {
            ctx.fillStyle = armoredColorFromHp(special.hp);
            ctx.globalAlpha = 0.32;
            ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
            ctx.globalAlpha = 1;
          }
          ctx.strokeStyle = special ? "#e2e8f0" : "#111827";
          ctx.lineWidth = 1;
          ctx.strokeRect(x * cellSize + 0.5, y * cellSize + 0.5, cellSize - 1, cellSize - 1);
          if (special?.type === "armored") {
            ctx.fillStyle = "#111";
            ctx.font = `${Math.max(10, Math.floor(cellSize * 0.45))}px monospace`;
            ctx.fillText(
              String(Math.max(1, special.hp)),
              x * cellSize + cellSize * 0.35,
              y * cellSize + cellSize * 0.65
            );
          }
          if (special?.type === "bomb") {
            ctx.fillStyle = "#fff";
            ctx.font = `${Math.max(9, Math.floor(cellSize * 0.42))}px monospace`;
            ctx.fillText("B", x * cellSize + cellSize * 0.34, y * cellSize + cellSize * 0.66);
          }
          if (special?.type === "cursed") {
            ctx.fillStyle = "#fff";
            ctx.font = `${Math.max(9, Math.floor(cellSize * 0.42))}px monospace`;
            ctx.fillText("C", x * cellSize + cellSize * 0.34, y * cellSize + cellSize * 0.66);
          }
          if (special?.type === "mirror") {
            ctx.fillStyle = "#111";
            ctx.font = `${Math.max(9, Math.floor(cellSize * 0.42))}px monospace`;
            ctx.fillText("M", x * cellSize + cellSize * 0.32, y * cellSize + cellSize * 0.66);
          }
          if (special?.type === "core") {
            ctx.fillStyle = "#fff";
            ctx.font = `${Math.max(9, Math.floor(cellSize * 0.42))}px monospace`;
            ctx.fillText("H", x * cellSize + cellSize * 0.32, y * cellSize + cellSize * 0.66);
          }
        }
      }

      for (const drop of dropsRef.current) {
        const img = powerUpImagesRef.current[drop.type];
        const size = cellSize * 0.78;
        if (img && img.complete && img.naturalWidth > 0) {
          ctx.drawImage(img, drop.x - size / 2, drop.y - size / 2, size, size);
        } else {
          if (drop.type === "multi_ball") ctx.fillStyle = "#22c55e";
          else if (drop.type === "piercing") ctx.fillStyle = "#f97316";
          else if (drop.type === "paddle_extend") ctx.fillStyle = "#60a5fa";
          else if (drop.type === "slow_motion") ctx.fillStyle = "#facc15";
          else ctx.fillStyle = "#e879f9";
          ctx.beginPath();
          ctx.arc(drop.x, drop.y, cellSize * 0.22, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      const nowPerf = performance.now();
      const nextRings: ExplosionRing[] = [];
      for (const ring of explosionRingsRef.current) {
        const t = (nowPerf - ring.startedAt) / ring.durationMs;
        if (t >= 1) continue;
        nextRings.push(ring);
        const eased = Math.max(0, Math.min(1, t));
        const radius = ring.maxRadius * eased;
        const alpha = 1 - eased;
        ctx.strokeStyle = `rgba(239, 68, 68, ${0.85 * alpha})`;
        ctx.lineWidth = Math.max(1.5, cellSize * 0.1 * (1 - eased * 0.4));
        ctx.beginPath();
        ctx.arc(ring.x, ring.y, radius, 0, Math.PI * 2);
        ctx.stroke();
      }
      explosionRingsRef.current = nextRings;

      ctx.fillStyle = "#00eaff";
      ctx.fillRect(paddleRef.current.x, paddleY, paddleRef.current.width, cellSize * 0.5);

      for (const ball of ballsRef.current) {
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, ballRadius, 0, Math.PI * 2);
        ctx.fillStyle = "#facc15";
        ctx.fill();
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      if (onStateRef.current && nowPerf - lastStateSentRef.current > 200) {
        lastStateSentRef.current = nowPerf;
        const first = ballsRef.current[0] ?? { x: 0, y: 0, vx: 0, vy: 0 };
        onStateRef.current({
          ball: { x: first.x, y: first.y, vx: first.vx, vy: first.vy },
          paddle: { x: paddleRef.current.x, width: paddleRef.current.width },
          lives: livesRef.current,
        });
      }

      rafId = requestAnimationFrame(step);
    };

    rafId = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(rafId);
      lastFrameRef.current = null;
    };
  }, [
    activatePowerUp,
    ballRadius,
    basePaddleWidth,
    cellSize,
    cols,
    height,
    interactive,
    paused,
    paddleY,
    resetBallOnPaddle,
    rows,
    width,
  ]);

  useEffect(() => {
    if (interactive) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;

    let rafId = 0;
    const render = () => {
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = "#0b0b14";
      ctx.fillRect(0, 0, width, height);
      ctx.strokeStyle = "rgba(34, 211, 238, 0.16)";
      ctx.lineWidth = 1;
      for (let gx = 0; gx <= cols; gx += 1) {
        const x = gx * cellSize + 0.5;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let gy = 0; gy <= rows; gy += 1) {
        const y = gy * cellSize + 0.5;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      const grid = blocksRef.current;
      for (let y = 0; y < rows; y += 1) {
        for (let x = 0; x < cols; x += 1) {
          if (grid[y]?.[x]) {
            const normalImg = blockImagesRef.current.normal;
            if (normalImg && normalImg.complete && normalImg.naturalWidth > 0) {
              ctx.drawImage(normalImg, x * cellSize, y * cellSize, cellSize, cellSize);
            } else {
              ctx.fillStyle = "#ff7b00";
              ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
            }
            ctx.strokeStyle = "#111827";
            ctx.strokeRect(x * cellSize + 0.5, y * cellSize + 0.5, cellSize - 1, cellSize - 1);
          }
        }
      }

      if (externalState) {
        ctx.fillStyle = "#00eaff";
        ctx.fillRect(externalState.paddle.x, paddleY, externalState.paddle.width, cellSize * 0.5);
        ctx.beginPath();
        ctx.arc(externalState.ball.x, externalState.ball.y, ballRadius, 0, Math.PI * 2);
        ctx.fillStyle = "#facc15";
        ctx.fill();
      }

      rafId = requestAnimationFrame(render);
    };

    rafId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(rafId);
  }, [ballRadius, cellSize, cols, externalState, height, interactive, paddleY, rows, width]);

  return (
    <div
      ref={wrapperRef}
      tabIndex={0}
      onMouseDown={() => wrapperRef.current?.focus()}
      className="rounded-xl border border-cyan-500 bg-black/60 p-3 outline-none"
    >
      <canvas ref={canvasRef} width={width} height={height} />
    </div>
  );
}
