import { TILE } from "./constants";
import type {
  Checkpoint,
  DataOrb,
  DataOrbAffinity,
  Enemy,
  EnemyKind,
  LevelDef,
  PixelSkill,
  PlatformDef,
  PlatformType,
  Tetromino,
} from "./types";

type PlatformPatternStep =
  | {
      tetromino: Tetromino;
      x: number;
      y: number;
      type: PlatformType;
      rotation?: 0 | 1 | 2 | 3;
      rotateEveryMs?: number;
    }
  | {
      kind: "i-span";
      x: number;
      y: number;
      count: number;
      type: PlatformType;
      rotation?: 0 | 1 | 2 | 3;
      rotateEveryMs?: number;
      gap?: number;
    };

type EnemyPatternStep = {
  kind: EnemyKind;
  anchorX: number;
  anchorY: number;
  speed: number;
  dir?: 1 | -1;
  spanI?: number;
};

type StaircaseStep =
  | {
      tetromino: Tetromino;
      type: PlatformType;
      rotation?: 0 | 1 | 2 | 3;
      rotateEveryMs?: number;
      dx?: number;
      dy?: number;
    }
  | {
      kind: "i-span";
      count: number;
      type: PlatformType;
      rotation?: 0 | 1 | 2 | 3;
      rotateEveryMs?: number;
      gap?: number;
      dx?: number;
      dy?: number;
    };

type ApexClimbOptions = {
  finalDx?: number;
  finalDy?: number;
  finalType?: PlatformType;
  rotateEveryMs?: number;
};

function indexedId(prefix: string, index: number) {
  return `${prefix}${index + 1}`;
}

export function orbOnTile(id: string, tileX: number, tileY: number): DataOrb {
  return { id, x: tileX * TILE + 7, y: tileY * TILE - 20, affinity: "standard" };
}

export function skillOrbOnTile(
  id: string,
  tileX: number,
  tileY: number,
  skill: PixelSkill,
  affinity: DataOrbAffinity
): DataOrb {
  return {
    id,
    x: tileX * TILE + 7,
    y: tileY * TILE - 20,
    affinity,
    grantsSkill: skill,
  };
}

export function checkpointOnTile(
  id: string,
  tileX: number,
  tileY: number
): Checkpoint {
  return {
    id,
    x: tileX * TILE + 10,
    y: tileY * TILE - 42,
    spawnX: tileX * TILE + 4,
    spawnY: tileY * TILE - 30,
  };
}

export function enemyOnITop(
  id: string,
  kind: EnemyKind,
  anchorX: number,
  anchorY: number,
  speed: number,
  dir: 1 | -1 = 1,
  spanI: number = 1
): Enemy {
  const minTileX = anchorX - 1;
  const maxTileX = anchorX + 2 + (spanI - 1) * 4;
  return {
    id,
    kind,
    x: anchorX * TILE,
    y: anchorY * TILE - 26,
    vx: speed * dir,
    minX: minTileX * TILE,
    maxX: (maxTileX + 1) * TILE - 26,
    stunnedUntil: 0,
  };
}

export function platformPattern(
  prefix: string,
  steps: PlatformPatternStep[]
): PlatformDef[] {
  // Les builders generent des ids deterministes pour garder des cles React stables.
  return steps.flatMap((step, index) => {
    const id = indexedId(prefix, index);

    if ("kind" in step && step.kind === "i-span") {
      const gap = step.gap ?? 4;
      return Array.from({ length: step.count }, (_, spanIndex) => ({
        id: `${id}${spanIndex === 0 ? "" : String.fromCharCode(97 + spanIndex)}`,
        tetromino: "I" as const,
        x: step.x + gap * spanIndex,
        y: step.y,
        type: step.type,
        rotation: step.rotation,
        rotateEveryMs: step.rotateEveryMs,
      }));
    }

    if ("tetromino" in step) {
      return {
        id,
        tetromino: step.tetromino,
        x: step.x,
        y: step.y,
        type: step.type,
        rotation: step.rotation,
        rotateEveryMs: step.rotateEveryMs,
      };
    }

    return [];
  });
}

export function staircasePattern(
  prefix: string,
  startX: number,
  startY: number,
  steps: StaircaseStep[]
) {
  let currentX = startX;
  let currentY = startY;

  // Une staircase decrit un deplacement relatif depuis la plateforme precedente au lieu de fixer chaque x/y.
  const positionedSteps: PlatformPatternStep[] = steps.map((step, index) => {
    if (index > 0) {
      currentX += step.dx ?? 0;
      currentY += step.dy ?? 0;
    }

    return "kind" in step
      ? {
          kind: "i-span",
          count: step.count,
          type: step.type,
          rotation: step.rotation,
          rotateEveryMs: step.rotateEveryMs,
          gap: step.gap,
          x: currentX,
          y: currentY,
        }
      : {
          tetromino: step.tetromino,
          type: step.type,
          rotation: step.rotation,
          rotateEveryMs: step.rotateEveryMs,
          x: currentX,
          y: currentY,
        };
  });

  return platformPattern(prefix, positionedSteps);
}

export function bounceChainPattern(
  prefix: string,
  startX: number,
  startY: number,
  count: number,
  stepX: number,
  stepY: number,
  tetromino: Extract<Tetromino, "L" | "S" | "T"> = "L"
) {
  // Les chaines de bounce reviennent souvent dans les mondes 1 et 4, donc on les garde declaratives.
  return staircasePattern(prefix, startX, startY, [
    { tetromino, type: "bounce" },
    ...Array.from({ length: count - 1 }, () => ({
      tetromino,
      type: "bounce" as const,
      dx: stepX,
      dy: stepY,
    })),
  ]);
}

export function verticalTowerPattern(
  prefix: string,
  startX: number,
  startY: number,
  steps: Array<{
    tetromino: Tetromino;
    type: PlatformType;
    dy: number;
    rotation?: 0 | 1 | 2 | 3;
    rotateEveryMs?: number;
  }>
) {
  return staircasePattern(prefix, startX, startY, [
    {
      tetromino: steps[0].tetromino,
      type: steps[0].type,
      rotation: steps[0].rotation,
      rotateEveryMs: steps[0].rotateEveryMs,
    },
    ...steps.slice(1).map((step) => ({
      tetromino: step.tetromino,
      type: step.type,
      dy: step.dy,
      rotation: step.rotation,
      rotateEveryMs: step.rotateEveryMs,
    })),
  ]);
}

export function glitchBridgePattern(
  prefix: string,
  startX: number,
  startY: number
) {
  // Petit pont de danger pour casser une longue montee sans changer le trajet global.
  return staircasePattern(prefix, startX, startY, [
    { tetromino: "S", type: "glitch" },
    { tetromino: "O", type: "armored", dx: 9, dy: -1 },
    { kind: "i-span", count: 2, type: "bounce", dx: 9, dy: -1 },
  ]);
}

export function hackGatePattern(
  prefix: string,
  startX: number,
  startY: number
) {
  // Un hack gate regroupe des tuiles hackables et hostiles dans un meme obstacle.
  return staircasePattern(prefix, startX, startY, [
    { tetromino: "L", type: "hackable" },
    { tetromino: "S", type: "glitch", dx: 9, dy: -1 },
    { tetromino: "O", type: "armored", dx: 9, dy: -1 },
  ]);
}

export function apexClimbPattern(
  prefix: string,
  startX: number,
  startY: number,
  options: ApexClimbOptions = {}
) {
  // Les apex climbs servent de finisseurs compacts dans les sorties de niveaux avances.
  return staircasePattern(prefix, startX, startY, [
    {
      tetromino: "T",
      type: "rotating",
      rotateEveryMs: options.rotateEveryMs ?? 1280,
    },
    { tetromino: "O", type: "armored", dx: 9, dy: -1 },
    {
      kind: "i-span",
      count: 2,
      type: options.finalType ?? "stable",
      dx: options.finalDx ?? 8,
      dy: options.finalDy ?? 1,
    },
  ]);
}

export function orbPattern(prefix: string, positions: Array<[number, number]>) {
  return positions.map(([tileX, tileY], index) =>
    orbOnTile(indexedId(prefix, index), tileX, tileY)
  );
}

export function checkpointPattern(
  prefix: string,
  positions: Array<[number, number]>
) {
  return positions.map(([tileX, tileY], index) =>
    checkpointOnTile(indexedId(prefix, index), tileX, tileY)
  );
}

export function enemyPattern(prefix: string, steps: EnemyPatternStep[]) {
  return steps.map((step, index) =>
    enemyOnITop(
      indexedId(prefix, index),
      step.kind,
      step.anchorX,
      step.anchorY,
      step.speed,
      step.dir,
      step.spanI
    )
  );
}

export function sortLevels(levels: LevelDef[]) {
  return [...levels].sort((a, b) => {
    if (a.world !== b.world) return a.world - b.world;
    const aStage = Number(a.id.split("-")[1]);
    const bStage = Number(b.id.split("-")[1]);
    return aStage - bStage;
  });
}
