import { useCallback, useEffect, useRef } from "react";

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
  onLaunch?: () => void;
  onBlocksDestroyed?: (count: number) => void;
  onBlockDestroyedAt?: (pos: { x: number; y: number }) => void;
  onState?: (state: {
    ball: { x: number; y: number; vx: number; vy: number };
    paddle: { x: number; width: number };
    lives: number;
  }) => void;
};

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
  onLaunch,
  onBlocksDestroyed,
  onBlockDestroyedAt,
  onState,
}: BrickfallBoardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const blocksRef = useRef<number[][]>([]);
  const ballRef = useRef({ x: 0, y: 0, vx: 0.27, vy: -0.315 });
  const paddleRef = useRef({ x: 0, width: cols * cellSize * 0.25 });
  const paddleVelRef = useRef(0);
  const launchedRef = useRef(false);
  const speedRef = useRef(speedMultiplier);
  const debuffRef = useRef<string | null>(debuff ?? null);
  const onBlocksDestroyedRef = useRef<BrickfallBoardProps["onBlocksDestroyed"]>(onBlocksDestroyed);
  const onBlockDestroyedAtRef = useRef<BrickfallBoardProps["onBlockDestroyedAt"]>(onBlockDestroyedAt);
  const onStateRef = useRef<BrickfallBoardProps["onState"]>(onState);
  const livesRef = useRef(1);
  const lastFrameRef = useRef<number | null>(null);
  const lastStateSentRef = useRef(0);
  const accumulatorRef = useRef(0);
  const destroyedRef = useRef<Set<string>>(new Set());

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
    const mask = destroyedRef.current;
    if (mask.size) {
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          if (mask.has(`${x}:${y}`)) {
            normalized[y][x] = 0;
          }
        }
      }
    }
    blocksRef.current = normalized;
  }, [cols, rows, targetBoard]);

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

  const launchBall = useCallback(() => {
    if (!canLaunch || launchedRef.current) return;
    launchedRef.current = true;
    const dir = Math.random() < 0.5 ? -1 : 1;
    ballRef.current.x = paddleRef.current.x + paddleRef.current.width / 2;
    ballRef.current.y = paddleY - ballRadius - 2;
    ballRef.current.vx = dir * 0.27;
    ballRef.current.vy = -0.315;
    onLaunch?.();
  }, [ballRadius, canLaunch, onLaunch, paddleY]);

  useEffect(() => {
    if (!interactive) return;
    wrapperRef.current?.focus();
    const handleKeyDown = (evt: KeyboardEvent) => {
      if (evt.key === "ArrowLeft" || evt.key === "a" || evt.key === "A") {
        evt.preventDefault();
        paddleVelRef.current = -1;
      }
      if (evt.key === "ArrowRight" || evt.key === "d" || evt.key === "D") {
        evt.preventDefault();
        paddleVelRef.current = 1;
      }
      if (evt.key === " " || evt.code === "Space") {
        evt.preventDefault();
        launchBall();
      }
    };
    const handleKeyUp = (evt: KeyboardEvent) => {
      if (
        evt.key === "ArrowLeft" ||
        evt.key === "ArrowRight" ||
        evt.key === "a" ||
        evt.key === "A" ||
        evt.key === "d" ||
        evt.key === "D"
      ) {
        evt.preventDefault();
        paddleVelRef.current = 0;
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [interactive, launchBall]);

  useEffect(() => {
    if (!interactive) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;

    ballRef.current = {
      x: width / 2,
      y: height * 0.7,
      vx: 0.2,
      vy: -0.26,
    };
    launchedRef.current = false;
    paddleRef.current = {
      x: width / 2 - paddleRef.current.width / 2,
      width: paddleRef.current.width,
    };
    livesRef.current = 1;

    const resolveBlockCollision = () => {
      const grid = blocksRef.current;
      const minX = Math.floor((ballRef.current.x - ballRadius) / cellSize);
      const maxX = Math.floor((ballRef.current.x + ballRadius) / cellSize);
      const minY = Math.floor((ballRef.current.y - ballRadius) / cellSize);
      const maxY = Math.floor((ballRef.current.y + ballRadius) / cellSize);
      for (let y = minY; y <= maxY; y++) {
        for (let x = minX; x <= maxX; x++) {
          if (y < 0 || y >= rows || x < 0 || x >= cols) continue;
          if (grid[y]?.[x]) {
            grid[y][x] = 0;
            ballRef.current.vy = -ballRef.current.vy;
            onBlocksDestroyedRef.current?.(1);
            destroyedRef.current.add(`${x}:${y}`);
            onBlockDestroyedAtRef.current?.({ x, y: rows - 1 - y });
            return;
          }
        }
      }
    };

    const step = (timestamp: number) => {
      if (lastFrameRef.current === null) lastFrameRef.current = timestamp;
      let delta = timestamp - lastFrameRef.current;
      delta = Math.min(delta, 24);
      lastFrameRef.current = timestamp;
      accumulatorRef.current += delta;
      const fixedStep = 4;
      while (accumulatorRef.current >= fixedStep) {
        accumulatorRef.current -= fixedStep;
        const stepDelta = fixedStep;

      const paddleSpeed = cellSize * 0.054 * stepDelta;
        const velocity = paddleVelRef.current;
        const maxX = width - paddleRef.current.width;
        paddleRef.current.x = clamp(
          paddleRef.current.x + velocity * paddleSpeed,
          0,
          maxX
        );

      const ball = ballRef.current;
      if (!Number.isFinite(ball.x) || !Number.isFinite(ball.y)) {
        ball.x = width / 2;
        ball.y = height * 0.7;
      }
      if (!launchedRef.current) {
        ball.x = paddleRef.current.x + paddleRef.current.width / 2;
        ball.y = paddleY - ballRadius - 2;
      } else {
          const speed = speedRef.current * (debuffRef.current === "slow" ? 0.6 : 1);
          ball.x += ball.vx * stepDelta * speed;
          ball.y += ball.vy * stepDelta * speed;
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

        if (ball.y - ballRadius > height) {
          livesRef.current = Math.max(0, livesRef.current - 1);
          ball.x = width / 2;
          ball.y = height * 0.7;
        ball.vx = 0.27;
        ball.vy = -0.315;
          launchedRef.current = false;
        }

        if (launchedRef.current) {
          resolveBlockCollision();
        }
      }

      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = "#0b0b14";
      ctx.fillRect(0, 0, width, height);

      const grid = blocksRef.current;
      const ball = ballRef.current;
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          if (grid[y]?.[x]) {
            ctx.fillStyle = "#ff7b00";
            ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
          }
        }
      }

      ctx.fillStyle = "#00eaff";
      ctx.fillRect(paddleRef.current.x, paddleY, paddleRef.current.width, cellSize * 0.5);

      ctx.beginPath();
      ctx.arc(ball.x, ball.y, ballRadius, 0, Math.PI * 2);
      ctx.fillStyle = "#facc15";
      ctx.fill();
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1;
      ctx.stroke();

      const now = performance.now();
      if (onStateRef.current && now - lastStateSentRef.current > 200) {
        lastStateSentRef.current = now;
        onStateRef.current({
          ball: { x: ball.x, y: ball.y, vx: ball.vx, vy: ball.vy },
          paddle: { x: paddleRef.current.x, width: paddleRef.current.width },
          lives: livesRef.current,
        });
      }

      requestAnimationFrame(step);
    };

    requestAnimationFrame(step);
  }, [cellSize, cols, height, interactive, rows, width]);

  useEffect(() => {
    if (interactive) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;

    let rafId = 0;
    const render = () => {
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = "#0b0b14";
      ctx.fillRect(0, 0, width, height);

      const grid = blocksRef.current;
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          if (grid[y]?.[x]) {
            ctx.fillStyle = "#ff7b00";
            ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
          }
        }
      }

      if (externalState) {
        ctx.fillStyle = "#00eaff";
        ctx.fillRect(
          externalState.paddle.x,
          paddleY,
          externalState.paddle.width,
          cellSize * 0.5
        );
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
