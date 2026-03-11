import { TILE } from "./constants";
import { getDecorationPreset } from "./decorations";
import { withAutoWorldBounds, type DragState } from "./editorShared";
import type {
  Checkpoint,
  DecorationDef,
  DecorationType,
  DataOrb,
  Enemy,
  LevelDef,
  PlatformDef,
} from "./types";
import { normalizePlatformDefinition } from "./utils/platformRuntime";

const DEFAULT_ROTATE_EVERY_MS = 1800;

export function cloneDraftLevel(level: LevelDef): LevelDef {
  return JSON.parse(JSON.stringify(level)) as LevelDef;
}

export function buildDecorationDuplicates({
  base,
  columns,
  rows,
  offsetX,
  offsetY,
  mirrorX,
  mirrorY,
  alternateMirror,
  layout,
  startAngleDeg,
  arcDeg,
}: {
  base: DecorationDef;
  columns: number;
  rows: number;
  offsetX: number;
  offsetY: number;
  mirrorX: boolean;
  mirrorY: boolean;
  alternateMirror: boolean;
  layout: "grid" | "circle";
  startAngleDeg: number;
  arcDeg: number;
}): DecorationDef[] {
  const total = Math.max(1, columns) * Math.max(1, rows);
  const duplicates: DecorationDef[] = [];

  const applyMirror = (copy: DecorationDef, index: number) => {
    const alternate = alternateMirror && index % 2 === 1;
    return {
      ...copy,
      flipX: mirrorX || alternate ? !base.flipX : base.flipX,
      flipY: mirrorY || alternate ? !base.flipY : base.flipY,
    };
  };

  if (layout === "circle") {
    const radiusX = Math.max(Math.abs(offsetX), TILE);
    const radiusY = Math.max(Math.abs(offsetY), TILE);
    const normalizedArcDeg = Math.min(360, Math.max(1, Math.abs(arcDeg)));
    const startAngle = (startAngleDeg * Math.PI) / 180;
    const fullCircle = normalizedArcDeg >= 360;
    const arcRadians = (normalizedArcDeg * Math.PI) / 180;
    for (let index = 0; index < total; index += 1) {
      const progress = total <= 1 ? 0 : fullCircle ? index / total : index / (total - 1);
      const angle = startAngle + (fullCircle ? Math.PI * 2 * progress : arcRadians * progress);
      duplicates.push(
        applyMirror(
          {
            ...base,
            id: `${base.id}-dup-${index + 1}`,
            x: Math.round(base.x + Math.cos(angle) * radiusX),
            y: Math.round(base.y + Math.sin(angle) * radiusY),
          },
          index
        )
      );
    }
    return duplicates;
  }

  if (columns === 1 && rows === 1) {
    duplicates.push(
      applyMirror(
        {
          ...base,
          id: `${base.id}-dup-1`,
          x: base.x + offsetX,
          y: base.y + offsetY,
        },
        0
      )
    );
    return duplicates;
  }

  let created = 0;
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      if (row === 0 && column === 0) continue;
      duplicates.push(
        applyMirror(
          {
            ...base,
            id: `${base.id}-dup-${created + 1}`,
            x: base.x + offsetX * column,
            y: base.y + offsetY * row,
          },
          created
        )
      );
      created += 1;
    }
  }
  return duplicates;
}

export function nextId(items: Array<{ id: string }>, prefix: string) {
  let index = items.length + 1;
  while (items.some((item) => item.id === `${prefix}${index}`)) {
    index += 1;
  }
  return `${prefix}${index}`;
}

export function updatePlatform(
  level: LevelDef,
  platformId: string,
  updater: (platform: PlatformDef) => PlatformDef
) {
  return {
    ...level,
    platforms: level.platforms.map((platform) =>
      platform.id === platformId ? updater(platform) : platform
    ),
  };
}

export function updateCheckpoint(
  level: LevelDef,
  checkpointId: string,
  updater: (checkpoint: Checkpoint) => Checkpoint
) {
  return {
    ...level,
    checkpoints: level.checkpoints.map((checkpoint) =>
      checkpoint.id === checkpointId ? updater(checkpoint) : checkpoint
    ),
  };
}

export function updateOrb(level: LevelDef, orbId: string, updater: (orb: DataOrb) => DataOrb) {
  return {
    ...level,
    orbs: level.orbs.map((orb) => (orb.id === orbId ? updater(orb) : orb)),
  };
}

export function updateEnemy(level: LevelDef, enemyId: string, updater: (enemy: Enemy) => Enemy) {
  return {
    ...level,
    enemies: level.enemies.map((enemy) => (enemy.id === enemyId ? updater(enemy) : enemy)),
  };
}

export function updateDecoration(
  level: LevelDef,
  decorationId: string,
  updater: (decoration: DecorationDef) => DecorationDef
) {
  return {
    ...level,
    decorations: (level.decorations ?? []).map((decoration) =>
      decoration.id === decorationId ? updater(decoration) : decoration
    ),
  };
}

export function checkpointFromTile(id: string, tileX: number, tileY: number): Checkpoint {
  return {
    id,
    x: tileX * TILE + 10,
    y: tileY * TILE - 42,
    spawnX: tileX * TILE + 4,
    spawnY: tileY * TILE - 30,
  };
}

export function orbFromTile(id: string, tileX: number, tileY: number): DataOrb {
  return {
    id,
    x: tileX * TILE + 7,
    y: tileY * TILE - 20,
    affinity: "standard",
    grantsSkill: null,
  };
}

export function enemyFromTile(id: string, tileX: number, tileY: number): Enemy {
  return {
    id,
    kind: "rookie",
    x: tileX * TILE,
    y: tileY * TILE - 26,
    vx: 90,
    minX: Math.max(0, tileX * TILE - TILE * 2),
    maxX: tileX * TILE + TILE * 3,
    stunnedUntil: 0,
  };
}

export function decorationFromTile(
  id: string,
  tileX: number,
  tileY: number,
  type: DecorationType = "pixel_glitch"
): DecorationDef {
  const preset = getDecorationPreset(type);
  return {
    id,
    type,
    x: tileX * TILE,
    y: tileY * TILE,
    width: preset.defaultWidth,
    height: preset.defaultHeight,
    rotation: 0,
    opacity: 0.9,
    color: preset.color,
    colorSecondary: preset.colorSecondary,
    layer: "mid",
    animation: "none",
    flipX: false,
    flipY: false,
  };
}

export function normalizeTileOffset(value: number) {
  return ((value % TILE) + TILE) % TILE;
}

export function normalizePlatformSettings(platform: PlatformDef): PlatformDef {
  const next =
    platform.type === "rotating" && !platform.rotateEveryMs
      ? { ...platform, rotateEveryMs: DEFAULT_ROTATE_EVERY_MS }
      : platform;
  return normalizePlatformDefinition(next);
}

export function applyDragPreview(level: LevelDef, dragState: DragState | null): LevelDef {
  if (!dragState) return level;

  if (dragState.kind === "spawn") {
    return {
      ...level,
      spawn: {
        x: dragState.candidateTileX * TILE + dragState.offsetX,
        y: dragState.candidateTileY * TILE + dragState.offsetY,
      },
    };
  }

  if (dragState.kind === "portal") {
    return withAutoWorldBounds({
      ...level,
      portal: {
        x: dragState.candidateTileX * TILE + dragState.offsetX,
        y: dragState.candidateTileY * TILE + dragState.offsetY,
      },
    });
  }

  if (dragState.kind === "platform") {
    return updatePlatform(level, dragState.id, (platform) => ({
      ...platform,
      x: dragState.candidateTileX,
      y: dragState.candidateTileY,
    }));
  }

  if (dragState.kind === "checkpoint") {
    return updateCheckpoint(level, dragState.id, () =>
      checkpointFromTile(dragState.id, dragState.candidateTileX, dragState.candidateTileY)
    );
  }

  if (dragState.kind === "orb") {
    return updateOrb(level, dragState.id, () =>
      orbFromTile(dragState.id, dragState.candidateTileX, dragState.candidateTileY)
    );
  }

  if (dragState.kind === "decoration") {
    return updateDecoration(level, dragState.id, (decoration) => ({
      ...decoration,
      x: dragState.candidateTileX * TILE + dragState.offsetX,
      y: dragState.candidateTileY * TILE + dragState.offsetY,
    }));
  }

  return updateEnemy(level, dragState.id, (enemy) => {
    const nextX = dragState.candidateTileX * TILE;
    const nextY = dragState.candidateTileY * TILE - 26;
    const deltaX = nextX - enemy.x;
    return {
      ...enemy,
      x: nextX,
      y: nextY,
      minX: enemy.minX + deltaX,
      maxX: enemy.maxX + deltaX,
    };
  });
}
