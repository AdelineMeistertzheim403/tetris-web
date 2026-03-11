import { DEFAULT_WORLD_TOP_PADDING, TILE, WORLD_H } from "./constants";
import { platformRenderData } from "./editorUtils";
import type { LevelDef, WorldTemplate } from "./types";
import type { PixelProtocolAdminLevel } from "./services/pixelProtocolService";

const MIN_WORLD_TILES = 12;
const MIN_WORLD_ROWS = WORLD_H / TILE;
const PORTAL_RIGHT_PADDING = TILE * 6;
const PORTAL_W = 34;
const PLAYER_W = 24;
const EDITOR_UI_STORAGE_KEY = "pixel-protocol-editor-ui-v1";

export const DECORATION_INSPECTOR_SECTIONS = [
  "source",
  "transform",
  "style",
  "animation",
  "duplication",
] as const;
export const PLATFORM_INSPECTOR_SECTIONS = [
  "shape",
  "layout",
  "behavior",
] as const;
export const CHECKPOINT_INSPECTOR_SECTIONS = [
  "position",
  "respawn",
] as const;
export const ORB_INSPECTOR_SECTIONS = [
  "position",
  "ability",
] as const;
export const ENEMY_INSPECTOR_SECTIONS = [
  "type",
  "position",
  "patrol",
] as const;
export const CENTER_PANEL_SECTIONS = [
  "layoutState",
  "validation",
  "elements",
  "linkedWorld",
] as const;

export type EditorUiPrefs = {
  exampleTemplatesExpanded: boolean;
  savedWorldsExpanded: boolean;
  decorationInspectorSections: Record<
    (typeof DECORATION_INSPECTOR_SECTIONS)[number],
    boolean
  >;
  platformInspectorSections: Record<
    (typeof PLATFORM_INSPECTOR_SECTIONS)[number],
    boolean
  >;
  checkpointInspectorSections: Record<
    (typeof CHECKPOINT_INSPECTOR_SECTIONS)[number],
    boolean
  >;
  orbInspectorSections: Record<(typeof ORB_INSPECTOR_SECTIONS)[number], boolean>;
  enemyInspectorSections: Record<(typeof ENEMY_INSPECTOR_SECTIONS)[number], boolean>;
  centerPanelSections: Record<(typeof CENTER_PANEL_SECTIONS)[number], boolean>;
};

export type EditorStoredLevel = LevelDef & {
  active?: boolean;
  sortOrder?: number;
  updatedAt?: string | null;
};

export type Selection =
  | { kind: "spawn" }
  | { kind: "portal" }
  | { kind: "platform"; id: string }
  | { kind: "checkpoint"; id: string }
  | { kind: "orb"; id: string }
  | { kind: "enemy"; id: string }
  | { kind: "decoration"; id: string }
  | null;

export type DragState =
  | {
      kind: "spawn";
      candidateTileX: number;
      candidateTileY: number;
      offsetX: number;
      offsetY: number;
    }
  | {
      kind: "portal";
      candidateTileX: number;
      candidateTileY: number;
      offsetX: number;
      offsetY: number;
    }
  | {
      kind: "platform";
      id: string;
      candidateTileX: number;
      candidateTileY: number;
      offsetX: number;
      offsetY: number;
    }
  | {
      kind: "checkpoint";
      id: string;
      candidateTileX: number;
      candidateTileY: number;
    }
  | {
      kind: "orb";
      id: string;
      candidateTileX: number;
      candidateTileY: number;
    }
  | {
      kind: "enemy";
      id: string;
      candidateTileX: number;
      candidateTileY: number;
    }
  | {
      kind: "decoration";
      id: string;
      candidateTileX: number;
      candidateTileY: number;
      offsetX: number;
      offsetY: number;
    };

export type EditorMode = "level" | "world";

export const TEMPLATE_BASE: LevelDef = {
  id: "w1-1",
  world: 1,
  name: "Nouveau niveau",
  worldWidth: 30 * TILE,
  worldHeight: WORLD_H,
  worldTopPadding: DEFAULT_WORLD_TOP_PADDING,
  requiredOrbs: 3,
  spawn: { x: 96, y: 450 },
  portal: { x: 960, y: 260 },
  platforms: [],
  checkpoints: [],
  orbs: [],
  enemies: [],
  decorations: [],
};

export function defaultEditorUiPrefs(): EditorUiPrefs {
  return {
    exampleTemplatesExpanded: false,
    savedWorldsExpanded: false,
    decorationInspectorSections: {
      source: false,
      transform: false,
      style: false,
      animation: false,
      duplication: false,
    },
    platformInspectorSections: {
      shape: false,
      layout: false,
      behavior: false,
    },
    checkpointInspectorSections: {
      position: false,
      respawn: false,
    },
    orbInspectorSections: {
      position: false,
      ability: false,
    },
    enemyInspectorSections: {
      type: false,
      position: false,
      patrol: false,
    },
    centerPanelSections: {
      layoutState: false,
      validation: false,
      elements: false,
      linkedWorld: false,
    },
  };
}

export function getEditorUiScope(mode: EditorMode, isAdmin: boolean) {
  return `${mode}:${isAdmin ? "admin" : "custom"}` as const;
}

export function readEditorUiPrefs(scope: string) {
  if (typeof window === "undefined") return defaultEditorUiPrefs();
  try {
    const raw = window.localStorage.getItem(EDITOR_UI_STORAGE_KEY);
    if (!raw) return defaultEditorUiPrefs();
    const parsed = JSON.parse(raw) as
      | Record<string, Partial<EditorUiPrefs> | undefined>
      | Partial<EditorUiPrefs>;
    const scoped: Partial<EditorUiPrefs> =
      scope in parsed
        ? ((parsed as Record<string, Partial<EditorUiPrefs> | undefined>)[scope] ?? {})
        : (parsed as Partial<EditorUiPrefs>);
    const defaults = defaultEditorUiPrefs();

    return {
      exampleTemplatesExpanded: scoped.exampleTemplatesExpanded ?? defaults.exampleTemplatesExpanded,
      savedWorldsExpanded: scoped.savedWorldsExpanded ?? defaults.savedWorldsExpanded,
      decorationInspectorSections: {
        source: scoped.decorationInspectorSections?.source ?? defaults.decorationInspectorSections.source,
        transform:
          scoped.decorationInspectorSections?.transform ??
          defaults.decorationInspectorSections.transform,
        style: scoped.decorationInspectorSections?.style ?? defaults.decorationInspectorSections.style,
        animation:
          scoped.decorationInspectorSections?.animation ??
          defaults.decorationInspectorSections.animation,
        duplication:
          scoped.decorationInspectorSections?.duplication ??
          defaults.decorationInspectorSections.duplication,
      },
      platformInspectorSections: {
        shape: scoped.platformInspectorSections?.shape ?? defaults.platformInspectorSections.shape,
        layout: scoped.platformInspectorSections?.layout ?? defaults.platformInspectorSections.layout,
        behavior:
          scoped.platformInspectorSections?.behavior ?? defaults.platformInspectorSections.behavior,
      },
      checkpointInspectorSections: {
        position:
          scoped.checkpointInspectorSections?.position ??
          defaults.checkpointInspectorSections.position,
        respawn:
          scoped.checkpointInspectorSections?.respawn ??
          defaults.checkpointInspectorSections.respawn,
      },
      orbInspectorSections: {
        position: scoped.orbInspectorSections?.position ?? defaults.orbInspectorSections.position,
        ability: scoped.orbInspectorSections?.ability ?? defaults.orbInspectorSections.ability,
      },
      enemyInspectorSections: {
        type: scoped.enemyInspectorSections?.type ?? defaults.enemyInspectorSections.type,
        position:
          scoped.enemyInspectorSections?.position ?? defaults.enemyInspectorSections.position,
        patrol: scoped.enemyInspectorSections?.patrol ?? defaults.enemyInspectorSections.patrol,
      },
      centerPanelSections: {
        layoutState:
          scoped.centerPanelSections?.layoutState ?? defaults.centerPanelSections.layoutState,
        validation:
          scoped.centerPanelSections?.validation ?? defaults.centerPanelSections.validation,
        elements: scoped.centerPanelSections?.elements ?? defaults.centerPanelSections.elements,
        linkedWorld:
          scoped.centerPanelSections?.linkedWorld ?? defaults.centerPanelSections.linkedWorld,
      },
    } satisfies EditorUiPrefs;
  } catch {
    return defaultEditorUiPrefs();
  }
}

export function writeEditorUiPrefs(scope: string, prefs: EditorUiPrefs) {
  if (typeof window === "undefined") return;
  let parsed: Record<string, EditorUiPrefs> = {};
  try {
    const raw = window.localStorage.getItem(EDITOR_UI_STORAGE_KEY);
    if (raw) {
      const candidate = JSON.parse(raw) as Record<string, EditorUiPrefs>;
      if (candidate && typeof candidate === "object") {
        parsed = candidate;
      }
    }
  } catch {
    parsed = {};
  }
  parsed[scope] = prefs;
  window.localStorage.setItem(EDITOR_UI_STORAGE_KEY, JSON.stringify(parsed));
}

export function getLevelWorldHeight(level: Pick<LevelDef, "worldHeight">) {
  if (
    typeof level.worldHeight === "number" &&
    Number.isFinite(level.worldHeight) &&
    level.worldHeight >= TILE * MIN_WORLD_ROWS
  ) {
    return Math.round(level.worldHeight);
  }
  return WORLD_H;
}

export function getLevelWorldTopPadding(level: Pick<LevelDef, "worldTopPadding">) {
  if (
    typeof level.worldTopPadding === "number" &&
    Number.isFinite(level.worldTopPadding) &&
    level.worldTopPadding >= 0
  ) {
    return Math.round(level.worldTopPadding);
  }
  return DEFAULT_WORLD_TOP_PADDING;
}

function computeAutoWorldWidth(level: LevelDef) {
  let rightMostX = Math.max(level.portal.x + PORTAL_W, level.spawn.x + PLAYER_W);

  for (const checkpoint of level.checkpoints) {
    rightMostX = Math.max(rightMostX, checkpoint.x + 12);
  }
  for (const orb of level.orbs) {
    rightMostX = Math.max(rightMostX, orb.x + 18);
  }
  for (const enemy of level.enemies) {
    rightMostX = Math.max(rightMostX, enemy.maxX + 26);
  }
  for (const decoration of level.decorations ?? []) {
    rightMostX = Math.max(rightMostX, decoration.x + decoration.width);
  }

  const rendered = platformRenderData(level);
  for (const { bounds } of rendered) {
    if (!bounds) continue;
    rightMostX = Math.max(rightMostX, bounds.left + bounds.width);
  }

  const requiredTiles = Math.max(
    MIN_WORLD_TILES,
    Math.ceil((rightMostX + PORTAL_RIGHT_PADDING) / TILE)
  );
  return requiredTiles * TILE;
}

export function withAutoWorldBounds(level: LevelDef): LevelDef {
  const nextWidth = computeAutoWorldWidth(level);
  const nextHeight = getLevelWorldHeight(level);
  const nextTopPadding = getLevelWorldTopPadding(level);
  if (
    nextWidth === level.worldWidth &&
    nextHeight === getLevelWorldHeight(level) &&
    nextTopPadding === level.worldTopPadding
  ) {
    return level;
  }
  return {
    ...level,
    worldWidth: nextWidth,
    worldHeight: nextHeight,
    worldTopPadding: nextTopPadding,
  };
}

function parseStage(id: string) {
  const match = id.match(/w\d+-(\d+)/i);
  return match ? Number(match[1]) : 0;
}

export function sortAdminLevels(levels: EditorStoredLevel[]) {
  return [...levels].sort((a, b) => {
    if (a.world !== b.world) return a.world - b.world;
    return parseStage(a.id) - parseStage(b.id);
  });
}

export function makeNewLevel(levels: EditorStoredLevel[], isAdmin: boolean): LevelDef {
  if (isAdmin) {
    const world = 1;
    const existingStages = levels
      .filter((lvl) => lvl.world === world)
      .map((lvl) => parseStage(lvl.id))
      .filter(Number.isFinite);
    const nextStage = (existingStages.length ? Math.max(...existingStages) : 0) + 1;

    return {
      ...TEMPLATE_BASE,
      id: `w${world}-${nextStage}`,
      world,
      name: `Nouveau niveau ${nextStage}`,
    };
  }

  let index = levels.length + 1;
  while (levels.some((level) => level.id === `pp-custom-${index}`)) {
    index += 1;
  }
  return {
    ...TEMPLATE_BASE,
    id: `pp-custom-${index}`,
    name: `Niveau custom ${index}`,
  };
}

export function stripAdminFields(level: PixelProtocolAdminLevel): LevelDef {
  const { active: _active, sortOrder: _sortOrder, updatedAt: _updatedAt, ...rest } = level;
  return rest;
}

export function makeNewWorldTemplate(worlds: WorldTemplate[]): WorldTemplate {
  let index = worlds.length + 1;
  while (worlds.some((world) => world.id === `pp-world-${index}`)) {
    index += 1;
  }
  return {
    id: `pp-world-${index}`,
    name: `Monde custom ${index}`,
    worldWidth: 30 * TILE,
    worldHeight: WORLD_H,
    worldTopPadding: DEFAULT_WORLD_TOP_PADDING,
    decorations: [],
    updatedAt: null,
  };
}

export function levelFromWorldTemplate(world: WorldTemplate): LevelDef {
  return withAutoWorldBounds({
    ...TEMPLATE_BASE,
    id: world.id,
    name: world.name,
    worldWidth: world.worldWidth,
    worldHeight: world.worldHeight,
    worldTopPadding: world.worldTopPadding,
    decorations: world.decorations,
    worldTemplateId: world.id,
  });
}

export function worldTemplateFromLevel(level: LevelDef): WorldTemplate {
  return {
    id: level.id,
    name: level.name,
    worldWidth: level.worldWidth,
    worldHeight: level.worldHeight,
    worldTopPadding: level.worldTopPadding,
    decorations: level.decorations ?? [],
    updatedAt: new Date().toISOString(),
  };
}
