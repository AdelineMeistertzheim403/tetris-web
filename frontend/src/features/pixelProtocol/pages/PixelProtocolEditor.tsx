import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { PixelProtocolControlsPanel } from "../components/PixelProtocolControlsPanel";
import { PixelProtocolInfoPanel } from "../components/PixelProtocolInfoPanel";
import { PixelProtocolWorld } from "../components/PixelProtocolWorld";
import {
  DEFAULT_WORLD_TOP_PADDING,
  MOVING_DEFAULT_AXIS,
  MOVING_DEFAULT_PATTERN,
  MOVING_DEFAULT_RANGE_TILES,
  MOVING_DEFAULT_SPEED,
  PLATFORM_CLASS,
  TILE,
  WORLD_H,
} from "../constants";
import {
  DECORATION_CATEGORY_ORDER,
  DECORATION_PRESETS,
  PixelProtocolDecoration,
  decorationLayerOrder,
  getDecorationPreset,
  usesEmbeddedDecorationArtwork,
} from "../decorations";
import { platformRenderData, validatePlatformLayout } from "../editorUtils";
import { usePixelProtocolGame } from "../hooks/usePixelProtocolGame";
import { abilityFlags } from "../logic";
import type {
  Checkpoint,
  DecorationAnimation,
  DecorationDef,
  DecorationLayer,
  DataOrb,
  DataOrbAffinity,
  DecorationType,
  Enemy,
  LevelDef,
  PixelSkill,
  PlatformDef,
  PlatformType,
  Tetromino,
  WorldTemplate,
} from "../types";
import {
  deletePixelProtocolCustomLevel,
  deletePixelProtocolLevel,
  fetchPixelProtocolCommunityLevels,
  fetchPixelProtocolCustomLevels,
  fetchPixelProtocolAdminLevels,
  fetchPixelProtocolWorldTemplates,
  publishPixelProtocolCommunityLevel,
  savePixelProtocolCustomLevel,
  savePixelProtocolLevel,
  savePixelProtocolWorldTemplate,
  deletePixelProtocolWorldTemplate,
  type PixelProtocolCommunityLevel,
  type PixelProtocolAdminLevel,
} from "../services/pixelProtocolService";
import {
  listPixelProtocolCustomLevels,
  mergePixelProtocolCustomLevels,
  removePixelProtocolCustomLevel,
  upsertPixelProtocolCustomLevel,
} from "../utils/customLevels";
import {
  listPixelProtocolWorldTemplates,
  mergePixelProtocolWorldTemplates,
  removePixelProtocolWorldTemplate,
  isWorldTemplate,
  upsertPixelProtocolWorldTemplate,
} from "../utils/worldTemplates";
import { applyWorldTemplateToLevel } from "../utils/resolveWorldTemplate";
import {
  getPixelProtocolCustomLevelCompletion,
  hasCompletedCurrentPixelProtocolLevel,
} from "../utils/communityCompletion";
import { useAuth } from "../../auth/context/AuthContext";
import exampleNeonFoundryJson from "../examples/world-template-neon-foundry.json?raw";
import exampleGlitchCathedralJson from "../examples/world-template-glitch-cathedral.json?raw";
import exampleDataArchivesJson from "../examples/world-template-data-archives.json?raw";
import exampleApexCoreJson from "../examples/world-template-apex-core.json?raw";
import exampleNeonCityJson from "../examples/world-template-neon-city.json?raw";
import exampleGlitchWorldJson from "../examples/world-template-glitch-world.json?raw";
import exampleApexCore2Json from "../examples/world-template-apex-core-2.json?raw";
import exampleShowcaseTetrominoCircuitJson from "../examples/world-template-showcase-tetromino-circuit.json?raw";
import exampleShowcaseGlitchCorruptionJson from "../examples/world-template-showcase-glitch-corruption.json?raw";
import exampleShowcaseAiNetworkJson from "../examples/world-template-showcase-ai-network.json?raw";
import exampleShowcaseAtmosphereJson from "../examples/world-template-showcase-atmosphere.json?raw";
import exampleSvgPackGalleryAJson from "../examples/world-template-svg-pack-gallery-a.json?raw";
import exampleSvgPackGalleryBJson from "../examples/world-template-svg-pack-gallery-b.json?raw";
import exampleTilesetAtlasShowcaseJson from "../examples/world-template-tileset-atlas-showcase.json?raw";
import exampleMegaShowcaseJson from "../examples/world-template-mega-showcase.json?raw";
import "../../../styles/pixel-protocol.css";
import "../../../styles/pixel-protocol-editor.css";

const EDITOR_TILE = 22;
const MIN_WORLD_TILES = 12;
const MIN_WORLD_ROWS = WORLD_H / TILE;
const PORTAL_RIGHT_PADDING = TILE * 6;
const PORTAL_W = 34;
const PLAYER_W = 24;
const TETROMINOS: Tetromino[] = ["I", "O", "T", "L", "J", "S", "Z"];
const PLATFORM_TYPES: PlatformType[] = [
  "stable",
  "bounce",
  "boost",
  "unstable",
  "moving",
  "rotating",
  "glitch",
  "corrupted",
  "magnetic",
  "ice",
  "gravity",
  "grapplable",
  "armored",
  "hackable",
];
const DEFAULT_ROTATE_EVERY_MS = 1800;
const MOVING_AXES = ["x", "y"] as const;
const MOVING_PATTERNS = ["pingpong", "loop"] as const;
const DECORATION_LAYERS: DecorationLayer[] = ["far", "mid", "near"];
const DECORATION_ANIMATIONS: DecorationAnimation[] = ["none", "pulse", "flow", "glitch"];
const DECORATION_DUPLICATE_OFFSET = TILE;
const DUPLICATION_LAYOUTS = ["grid", "circle"] as const;
const DECORATION_SOURCES = ["all", "builtin", "svg_pack", "tileset"] as const;
const EXAMPLE_SORTS = ["recent", "a-z", "showcase", "ambiance"] as const;
const EDITOR_UI_STORAGE_KEY = "pixel-protocol-editor-ui-v1";
const ORB_AFFINITIES: DataOrbAffinity[] = ["standard", "blue", "red", "green", "purple"];
const PIXEL_SKILLS: PixelSkill[] = [
  "DATA_GRAPPLE",
  "OVERJUMP",
  "PHASE_SHIFT",
  "PULSE_SHOCK",
  "OVERCLOCK_MODE",
  "TIME_BUFFER",
  "PLATFORM_SPAWN",
];
const WORLD_EXAMPLES = [
  {
    id: "neon-foundry",
    name: "Neon Foundry",
    theme: "forge neon / industrie",
    raw: exampleNeonFoundryJson,
  },
  {
    id: "glitch-cathedral",
    name: "Glitch Cathedral",
    theme: "vertical / sanctuaire corrompu",
    raw: exampleGlitchCathedralJson,
  },
  {
    id: "data-archives",
    name: "Data Archives",
    theme: "serveurs / techno propre",
    raw: exampleDataArchivesJson,
  },
  {
    id: "apex-core",
    name: "Apex Core",
    theme: "boss final / coeur IA",
    raw: exampleApexCoreJson,
  },
  {
    id: "neon-city",
    name: "Neon City",
    theme: "tileset / skyline / signaletique",
    raw: exampleNeonCityJson,
  },
  {
    id: "glitch-world",
    name: "Glitch World",
    theme: "tileset / corruption / danger",
    raw: exampleGlitchWorldJson,
  },
  {
    id: "apex-core-2",
    name: "Apex Core 2",
    theme: "variante boss final / coeur central",
    raw: exampleApexCore2Json,
  },
  {
    id: "showcase-tetromino-circuit",
    name: "Showcase Tetromino Circuit",
    theme: "builtin tetromino / circuits",
    raw: exampleShowcaseTetrominoCircuitJson,
  },
  {
    id: "showcase-glitch-corruption",
    name: "Showcase Glitch Corruption",
    theme: "builtin glitch / corruption",
    raw: exampleShowcaseGlitchCorruptionJson,
  },
  {
    id: "showcase-ai-network",
    name: "Showcase AI Network",
    theme: "builtin IA / reseau",
    raw: exampleShowcaseAiNetworkJson,
  },
  {
    id: "showcase-atmosphere",
    name: "Showcase Atmosphere",
    theme: "builtin backgrounds / ambiance",
    raw: exampleShowcaseAtmosphereJson,
  },
  {
    id: "svg-pack-gallery-a",
    name: "SVG Pack Gallery A",
    theme: "50 decors svg_pack:*",
    raw: exampleSvgPackGalleryAJson,
  },
  {
    id: "svg-pack-gallery-b",
    name: "SVG Pack Gallery B",
    theme: "reste du pack + backgrounds",
    raw: exampleSvgPackGalleryBJson,
  },
  {
    id: "tileset-atlas-showcase",
    name: "Tileset Atlas Showcase",
    theme: "64 tuiles tileset:*",
    raw: exampleTilesetAtlasShowcaseJson,
  },
  {
    id: "mega-showcase",
    name: "Mega Showcase",
    theme: "builtin + svg_pack + tileset",
    raw: exampleMegaShowcaseJson,
  },
] as const;
const DECORATION_INSPECTOR_SECTIONS = [
  "source",
  "transform",
  "style",
  "animation",
  "duplication",
] as const;
const PLATFORM_INSPECTOR_SECTIONS = [
  "shape",
  "layout",
  "behavior",
] as const;
const CHECKPOINT_INSPECTOR_SECTIONS = [
  "position",
  "respawn",
] as const;
const ORB_INSPECTOR_SECTIONS = [
  "position",
  "ability",
] as const;
const ENEMY_INSPECTOR_SECTIONS = [
  "type",
  "position",
  "patrol",
] as const;
const CENTER_PANEL_SECTIONS = [
  "layoutState",
  "validation",
  "elements",
  "linkedWorld",
] as const;

type EditorUiPrefs = {
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

function defaultEditorUiPrefs(): EditorUiPrefs {
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

function getEditorUiScope(mode: "level" | "world", isAdmin: boolean) {
  return `${mode}:${isAdmin ? "admin" : "custom"}` as const;
}

function decorationSource(type: DecorationType): (typeof DECORATION_SOURCES)[number] {
  if (type.startsWith("svg_pack:")) return "svg_pack";
  if (type.startsWith("tileset:")) return "tileset";
  return "builtin";
}

function isShowcaseExample(example: (typeof WORLD_EXAMPLES)[number]) {
  const haystack = `${example.id} ${example.name} ${example.theme}`.toLowerCase();
  return (
    haystack.includes("showcase") ||
    haystack.includes("gallery") ||
    haystack.includes("atlas") ||
    haystack.includes("mega")
  );
}

function readEditorUiPrefs(scope: string) {
  if (typeof window === "undefined") return defaultEditorUiPrefs();
  try {
    const raw = window.localStorage.getItem(EDITOR_UI_STORAGE_KEY);
    if (!raw) return defaultEditorUiPrefs();
    const parsed = JSON.parse(raw) as
      | {
          [scope: string]: Partial<EditorUiPrefs> | undefined;
        }
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

const TEMPLATE_BASE: LevelDef = {
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

type EditorStoredLevel = LevelDef & {
  active?: boolean;
  sortOrder?: number;
  updatedAt?: string | null;
};

type Selection =
  | { kind: "spawn" }
  | { kind: "portal" }
  | { kind: "platform"; id: string }
  | { kind: "checkpoint"; id: string }
  | { kind: "orb"; id: string }
  | { kind: "enemy"; id: string }
  | { kind: "decoration"; id: string }
  | null;

type DragState =
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

type EditorMode = "level" | "world";

function getLevelWorldHeight(level: Pick<LevelDef, "worldHeight">) {
  if (
    typeof level.worldHeight === "number" &&
    Number.isFinite(level.worldHeight) &&
    level.worldHeight >= TILE * MIN_WORLD_ROWS
  ) {
    return Math.round(level.worldHeight);
  }
  return WORLD_H;
}

function getLevelWorldTopPadding(level: Pick<LevelDef, "worldTopPadding">) {
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

function withAutoWorldBounds(level: LevelDef): LevelDef {
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
  return { ...level, worldWidth: nextWidth, worldHeight: nextHeight, worldTopPadding: nextTopPadding };
}

function parseStage(id: string) {
  const match = id.match(/w\d+-(\d+)/i);
  return match ? Number(match[1]) : 0;
}

function sortAdminLevels(levels: EditorStoredLevel[]) {
  return [...levels].sort((a, b) => {
    if (a.world !== b.world) return a.world - b.world;
    return parseStage(a.id) - parseStage(b.id);
  });
}

function makeNewLevel(levels: EditorStoredLevel[], isAdmin: boolean): LevelDef {
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

function stripAdminFields(level: PixelProtocolAdminLevel): LevelDef {
  const { active: _active, sortOrder: _sortOrder, updatedAt: _updatedAt, ...rest } = level;
  return rest;
}

function makeNewWorldTemplate(worlds: WorldTemplate[]): WorldTemplate {
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

function levelFromWorldTemplate(world: WorldTemplate): LevelDef {
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

function worldTemplateFromLevel(level: LevelDef): WorldTemplate {
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

function cloneDraftLevel(level: LevelDef): LevelDef {
  return JSON.parse(JSON.stringify(level)) as LevelDef;
}

function buildDecorationDuplicates({
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
  layout: (typeof DUPLICATION_LAYOUTS)[number];
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
      const progress =
        total <= 1 ? 0 : fullCircle ? index / total : index / (total - 1);
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

function nextId(items: Array<{ id: string }>, prefix: string) {
  let index = items.length + 1;
  while (items.some((item) => item.id === `${prefix}${index}`)) {
    index += 1;
  }
  return `${prefix}${index}`;
}

function updatePlatform(level: LevelDef, platformId: string, updater: (platform: PlatformDef) => PlatformDef) {
  return {
    ...level,
    platforms: level.platforms.map((platform) =>
      platform.id === platformId ? updater(platform) : platform
    ),
  };
}

function updateCheckpoint(level: LevelDef, checkpointId: string, updater: (checkpoint: Checkpoint) => Checkpoint) {
  return {
    ...level,
    checkpoints: level.checkpoints.map((checkpoint) =>
      checkpoint.id === checkpointId ? updater(checkpoint) : checkpoint
    ),
  };
}

function updateOrb(level: LevelDef, orbId: string, updater: (orb: DataOrb) => DataOrb) {
  return {
    ...level,
    orbs: level.orbs.map((orb) => (orb.id === orbId ? updater(orb) : orb)),
  };
}

function updateEnemy(level: LevelDef, enemyId: string, updater: (enemy: Enemy) => Enemy) {
  return {
    ...level,
    enemies: level.enemies.map((enemy) => (enemy.id === enemyId ? updater(enemy) : enemy)),
  };
}

function updateDecoration(
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

function checkpointFromTile(id: string, tileX: number, tileY: number): Checkpoint {
  return {
    id,
    x: tileX * TILE + 10,
    y: tileY * TILE - 42,
    spawnX: tileX * TILE + 4,
    spawnY: tileY * TILE - 30,
  };
}

function orbFromTile(id: string, tileX: number, tileY: number): DataOrb {
  return {
    id,
    x: tileX * TILE + 7,
    y: tileY * TILE - 20,
    affinity: "standard",
    grantsSkill: null,
  };
}

function enemyFromTile(id: string, tileX: number, tileY: number): Enemy {
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

function decorationFromTile(
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

function normalizeTileOffset(value: number) {
  return ((value % TILE) + TILE) % TILE;
}

function normalizePlatformSettings(platform: PlatformDef): PlatformDef {
  const next =
    platform.type === "rotating" && !platform.rotateEveryMs
      ? { ...platform, rotateEveryMs: DEFAULT_ROTATE_EVERY_MS }
      : platform;

  if (next.type !== "moving") return next;
  return {
    ...next,
    moveAxis: next.moveAxis === "y" ? "y" : MOVING_DEFAULT_AXIS,
    movePattern: next.movePattern === "loop" ? "loop" : MOVING_DEFAULT_PATTERN,
    moveRangeTiles:
      typeof next.moveRangeTiles === "number" && next.moveRangeTiles > 0
        ? Math.round(next.moveRangeTiles)
        : MOVING_DEFAULT_RANGE_TILES,
    moveSpeed:
      typeof next.moveSpeed === "number" && next.moveSpeed > 0
        ? Math.round(next.moveSpeed)
        : MOVING_DEFAULT_SPEED,
  };
}

function applyDragPreview(level: LevelDef, dragState: DragState | null): LevelDef {
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

function PixelProtocolDraftPreview({
  level,
  onClose,
}: {
  level: LevelDef;
  onClose: () => void;
}) {
  const {
    ability,
    chatLine,
    gameViewportRef,
    level: previewLevel,
    playerRunFrame,
    playerSprite,
    portalOpen,
    grapplePreview,
    resetLevel,
    runtime,
  } = usePixelProtocolGame([level]);

  return (
    <div className="pp-editor-preview-play">
      <div className="pp-editor-preview-head">
        <div>
          <h2>Test du draft</h2>
          <p className="pp-editor-muted">
            La preview charge le niveau en cours avec la physique reelle du mode.
          </p>
        </div>
        <button type="button" className="retro-btn" onClick={onClose}>
          Fermer
        </button>
      </div>

      <div className="pp-layout pp-editor-preview-layout">
        <PixelProtocolInfoPanel
          ability={ability}
          chatLine={chatLine}
          level={previewLevel}
          message={runtime.message}
          collected={runtime.collected}
          hp={runtime.player.hp}
          unlockedSkills={[]}
        />
        <PixelProtocolWorld
          gameViewportRef={gameViewportRef}
          level={previewLevel}
          playerRunFrame={playerRunFrame}
          playerSprite={playerSprite}
          portalOpen={portalOpen}
          grapplePreview={grapplePreview}
          runtime={runtime}
        />
        <PixelProtocolControlsPanel
          ability={ability}
          onReset={resetLevel}
          onExit={onClose}
          statusMessage="Test local du draft courant."
        />
      </div>
    </div>
  );
}

export default function PixelProtocolEditor() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const editorMode: EditorMode = searchParams.get("mode") === "world" ? "world" : "level";
  const isAdmin = user?.role === "ADMIN";
  const uiScope = getEditorUiScope(editorMode, isAdmin);
  const boardScrollRef = useRef<HTMLDivElement | null>(null);
  const draftLevelRef = useRef<LevelDef>(withAutoWorldBounds(TEMPLATE_BASE));
  const dragStateRef = useRef<DragState | null>(null);
  const importWorldInputRef = useRef<HTMLInputElement | null>(null);

  const [levels, setLevels] = useState<EditorStoredLevel[]>([]);
  const [worldTemplates, setWorldTemplates] = useState<WorldTemplate[]>(() =>
    listPixelProtocolWorldTemplates()
  );
  const [draftLevel, setDraftLevel] = useState<LevelDef>(() =>
    withAutoWorldBounds(TEMPLATE_BASE)
  );
  const [published, setPublished] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selection, setSelection] = useState<Selection>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [previewLevel, setPreviewLevel] = useState<LevelDef | null>(null);
  const [previewKey, setPreviewKey] = useState(0);
  const [communityLevels, setCommunityLevels] = useState<PixelProtocolCommunityLevel[]>([]);
  const [editorExpanded, setEditorExpanded] = useState(true);
  const [duplicateOffsetX, setDuplicateOffsetX] = useState(DECORATION_DUPLICATE_OFFSET);
  const [duplicateOffsetY, setDuplicateOffsetY] = useState(DECORATION_DUPLICATE_OFFSET);
  const [duplicateColumns, setDuplicateColumns] = useState(1);
  const [duplicateRows, setDuplicateRows] = useState(1);
  const [duplicateMirrorX, setDuplicateMirrorX] = useState(false);
  const [duplicateMirrorY, setDuplicateMirrorY] = useState(false);
  const [duplicateAlternateMirror, setDuplicateAlternateMirror] = useState(false);
  const [duplicateLayout, setDuplicateLayout] =
    useState<(typeof DUPLICATION_LAYOUTS)[number]>("grid");
  const [duplicateStartAngle, setDuplicateStartAngle] = useState(0);
  const [duplicateArcAngle, setDuplicateArcAngle] = useState(360);
  const [decorationSourceFilter, setDecorationSourceFilter] =
    useState<(typeof DECORATION_SOURCES)[number]>("all");
  const [exampleTemplatesExpanded, setExampleTemplatesExpanded] = useState(
    () => readEditorUiPrefs(uiScope).exampleTemplatesExpanded
  );
  const [savedWorldsExpanded, setSavedWorldsExpanded] = useState(
    () => readEditorUiPrefs(uiScope).savedWorldsExpanded
  );
  const [decorationInspectorSections, setDecorationInspectorSections] = useState<
    Record<(typeof DECORATION_INSPECTOR_SECTIONS)[number], boolean>
  >(() => readEditorUiPrefs(uiScope).decorationInspectorSections);
  const [platformInspectorSections, setPlatformInspectorSections] = useState<
    Record<(typeof PLATFORM_INSPECTOR_SECTIONS)[number], boolean>
  >(() => readEditorUiPrefs(uiScope).platformInspectorSections);
  const [checkpointInspectorSections, setCheckpointInspectorSections] = useState<
    Record<(typeof CHECKPOINT_INSPECTOR_SECTIONS)[number], boolean>
  >(() => readEditorUiPrefs(uiScope).checkpointInspectorSections);
  const [orbInspectorSections, setOrbInspectorSections] = useState<
    Record<(typeof ORB_INSPECTOR_SECTIONS)[number], boolean>
  >(() => readEditorUiPrefs(uiScope).orbInspectorSections);
  const [enemyInspectorSections, setEnemyInspectorSections] = useState<
    Record<(typeof ENEMY_INSPECTOR_SECTIONS)[number], boolean>
  >(() => readEditorUiPrefs(uiScope).enemyInspectorSections);
  const [centerPanelSections, setCenterPanelSections] = useState<
    Record<(typeof CENTER_PANEL_SECTIONS)[number], boolean>
  >(() => readEditorUiPrefs(uiScope).centerPanelSections);
  const [exampleSearch, setExampleSearch] = useState("");
  const [exampleSort, setExampleSort] =
    useState<(typeof EXAMPLE_SORTS)[number]>("recent");
  const requestedTemplateId = searchParams.get("template");
  const isWorldEditor = editorMode === "world";

  draftLevelRef.current = draftLevel;
  dragStateRef.current = dragState;

  const displayedLevel = useMemo(
    () => applyDragPreview(draftLevel, dragState),
    [draftLevel, dragState]
  );

  const validation = useMemo(
    () => validatePlatformLayout(displayedLevel),
    [
      displayedLevel,
    ]
  );

  const renderPlatforms = useMemo(() => platformRenderData(displayedLevel), [displayedLevel]);
  const platformCenterMap = useMemo(() => {
    return new Map(
      renderPlatforms
        .filter((item) => item.center)
        .map((item) => [item.platform.id, item.center!] as const)
    );
  }, [renderPlatforms]);

  const selectedPlatform =
    selection?.kind === "platform"
      ? draftLevel.platforms.find((platform) => platform.id === selection.id) ?? null
      : null;
  const selectedSpawn = selection?.kind === "spawn";
  const selectedPortal = selection?.kind === "portal";
  const selectedCheckpoint =
    selection?.kind === "checkpoint"
      ? draftLevel.checkpoints.find((checkpoint) => checkpoint.id === selection.id) ?? null
      : null;
  const selectedOrb =
    selection?.kind === "orb"
      ? draftLevel.orbs.find((orb) => orb.id === selection.id) ?? null
      : null;
  const selectedEnemy =
    selection?.kind === "enemy"
      ? draftLevel.enemies.find((enemy) => enemy.id === selection.id) ?? null
      : null;
  const selectedDecoration =
    selection?.kind === "decoration"
      ? (draftLevel.decorations ?? []).find((decoration) => decoration.id === selection.id) ?? null
      : null;
  const selectedDecorationUsesEmbeddedArtwork = selectedDecoration
    ? usesEmbeddedDecorationArtwork(selectedDecoration.type)
    : false;
  const selectedWorldTemplate =
    draftLevel.worldTemplateId
      ? worldTemplates.find((world) => world.id === draftLevel.worldTemplateId) ?? null
      : null;
  const filteredDecorationPresets = useMemo(
    () => {
      const filtered = DECORATION_PRESETS.filter((preset) =>
        decorationSourceFilter === "all"
          ? true
          : decorationSource(preset.type) === decorationSourceFilter
      );
      if (
        selectedDecoration &&
        !filtered.some((preset) => preset.type === selectedDecoration.type)
      ) {
        const currentPreset = DECORATION_PRESETS.find(
          (preset) => preset.type === selectedDecoration.type
        );
        if (currentPreset) filtered.unshift(currentPreset);
      }
      return filtered;
    },
    [decorationSourceFilter, selectedDecoration]
  );
  const filteredExamples = useMemo(() => {
    const query = exampleSearch.trim().toLowerCase();
    const withIndex = WORLD_EXAMPLES.map((example, index) => ({ example, index }));
    const searched = withIndex.filter(({ example }) => {
      if (!query) return true;
      const haystack = `${example.name} ${example.theme} ${example.id}`.toLowerCase();
      return haystack.includes(query);
    });

    searched.sort((a, b) => {
      if (exampleSort === "recent") return b.index - a.index;
      if (exampleSort === "a-z") return a.example.name.localeCompare(b.example.name, "fr");
      if (exampleSort === "showcase") {
        const aShowcase = isShowcaseExample(a.example) ? 0 : 1;
        const bShowcase = isShowcaseExample(b.example) ? 0 : 1;
        return aShowcase - bShowcase || a.example.name.localeCompare(b.example.name, "fr");
      }
      const aAmbiance = isShowcaseExample(a.example) ? 1 : 0;
      const bAmbiance = isShowcaseExample(b.example) ? 1 : 0;
      return aAmbiance - bAmbiance || a.example.name.localeCompare(b.example.name, "fr");
    });

    return searched.map(({ example }) => example);
  }, [exampleSearch, exampleSort]);
  const renderDecorations = useMemo(
    () =>
      [...(displayedLevel.decorations ?? [])].sort(
        (a, b) => decorationLayerOrder(a.layer) - decorationLayerOrder(b.layer)
      ),
    [displayedLevel]
  );
  const duplicatePreviewDecorations = useMemo(() => {
    if (editorMode !== "world" || !selectedDecoration) return [];
    return buildDecorationDuplicates({
      base: selectedDecoration,
      columns: duplicateColumns,
      rows: duplicateRows,
      offsetX: duplicateOffsetX,
      offsetY: duplicateOffsetY,
      mirrorX: duplicateMirrorX,
      mirrorY: duplicateMirrorY,
      alternateMirror: duplicateAlternateMirror,
      layout: duplicateLayout,
      startAngleDeg: duplicateStartAngle,
      arcDeg: duplicateArcAngle,
    }).map((decoration, index) => ({
      ...decoration,
      id: `${selectedDecoration.id}-preview-${index + 1}`,
    }));
  }, [
    editorMode,
    selectedDecoration,
    duplicateColumns,
    duplicateRows,
    duplicateOffsetX,
    duplicateOffsetY,
    duplicateMirrorX,
    duplicateMirrorY,
    duplicateAlternateMirror,
    duplicateLayout,
    duplicateStartAngle,
    duplicateArcAngle,
  ]);

  const worldTiles = Math.max(MIN_WORLD_TILES, Math.round(displayedLevel.worldWidth / TILE));
  const worldRows = Math.max(MIN_WORLD_ROWS, Math.round(getLevelWorldHeight(displayedLevel) / TILE));
  const topPaddingRows = Math.max(0, Math.round(getLevelWorldTopPadding(displayedLevel) / TILE));
  const editorTotalRows = worldRows + topPaddingRows;
  const editorYOffset = topPaddingRows * EDITOR_TILE;
  const abilities = abilityFlags(displayedLevel.world);
  const readonlyJson = useMemo(() => JSON.stringify(draftLevel, null, 2), [draftLevel]);
  const canDeleteSelection =
    selection?.kind === "platform" ||
    selection?.kind === "checkpoint" ||
    selection?.kind === "orb" ||
    selection?.kind === "enemy" ||
    selection?.kind === "decoration";
  const validationWarnings = validation.issues.filter((issue) => issue.severity === "warning");
  const validationErrors = validation.issues.filter((issue) => issue.severity === "error");
  const currentCompletion = useMemo(
    () => getPixelProtocolCustomLevelCompletion(draftLevel),
    [draftLevel]
  );
  const ownPublishedLevel = useMemo(
    () =>
      communityLevels.find(
        (level) => level.isOwn && level.level.id === draftLevel.id
      ) ?? null,
    [communityLevels, draftLevel.id]
  );
  const canPublishCommunityLevel =
    !isAdmin &&
    !isWorldEditor &&
    validation.isValid &&
    hasCompletedCurrentPixelProtocolLevel(draftLevel);

  const resetMessages = () => {
    setStatus(null);
    setError(null);
  };

  const handleExportWorldTemplate = () => {
    if (!isWorldEditor) return;
    const world = worldTemplateFromLevel(draftLevel);
    const filename = `${world.id || "pixel-protocol-world"}.json`;
    const blob = new Blob([JSON.stringify(world, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setStatus(`Monde exporte: ${filename}`);
    setError(null);
  };

  const handleImportWorldTemplate = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    try {
      const raw = JSON.parse(await file.text()) as unknown;
      const candidate =
        raw && typeof raw === "object" && "world" in raw
          ? (raw as { world?: unknown }).world
          : raw;

      if (!isWorldTemplate(candidate)) {
        throw new Error("Le fichier JSON ne correspond pas a un monde Pixel Protocol valide.");
      }

      const importedWorld: WorldTemplate = {
        ...candidate,
        updatedAt: new Date().toISOString(),
      };
      const worlds = upsertPixelProtocolWorldTemplate(importedWorld);
      setWorldTemplates(worlds);
      setSelectedId(importedWorld.id);
      setDraftLevel(levelFromWorldTemplate(importedWorld));
      setSelection(
        importedWorld.decorations[0]
          ? { kind: "decoration", id: importedWorld.decorations[0].id }
          : null
      );
      setStatus(`Monde importe: ${importedWorld.name}`);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import JSON impossible");
      setStatus(null);
    }
  };

  const handleLoadExampleWorldTemplate = (rawExample: string) => {
    try {
      const raw = JSON.parse(rawExample) as unknown;
      if (!isWorldTemplate(raw)) {
        throw new Error("Le monde d'exemple embarque est invalide.");
      }
      const exampleWorld: WorldTemplate = {
        ...raw,
        updatedAt: new Date().toISOString(),
      };
      const worlds = upsertPixelProtocolWorldTemplate(exampleWorld);
      setWorldTemplates(worlds);
      setSelectedId(exampleWorld.id);
      setDraftLevel(levelFromWorldTemplate(exampleWorld));
      setSelection(
        exampleWorld.decorations[0]
          ? { kind: "decoration", id: exampleWorld.decorations[0].id }
          : null
      );
      setStatus(`Monde d'exemple charge: ${exampleWorld.name}`);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Chargement du monde d'exemple impossible");
      setStatus(null);
    }
  };

  const applyDraftLevel = (nextLevel: LevelDef, nextSelection: Selection = selection) => {
    const normalizedLevel = withAutoWorldBounds(nextLevel);
    const nextValidation = validatePlatformLayout(normalizedLevel);
    setDraftLevel(normalizedLevel);
    setSelection(nextSelection);
    setStatus(null);
    setError(nextValidation.isValid ? null : nextValidation.issues[0]?.message ?? null);
    return nextValidation.isValid;
  };

  const selectLevel = (level: EditorStoredLevel) => {
    const cleanLevel = withAutoWorldBounds(
      isAdmin ? stripAdminFields(level as PixelProtocolAdminLevel) : level
    );
    setSelectedId(level.id);
    setPublished(level.active ?? false);
    setDraftLevel(cleanLevel);
    setSelection(cleanLevel.platforms[0] ? { kind: "platform", id: cleanLevel.platforms[0].id } : null);
    setPreviewLevel(null);
    resetMessages();
  };

  const selectWorldTemplate = (world: WorldTemplate) => {
    const draft = levelFromWorldTemplate(world);
    setSelectedId(world.id);
    setPublished(false);
    setDraftLevel(draft);
    setSelection(
      draft.decorations?.[0] ? { kind: "decoration", id: draft.decorations[0].id } : null
    );
    setPreviewLevel(null);
    resetMessages();
  };

  const refreshLevels = async () => {
    setLoading(true);
    setWorldTemplates(listPixelProtocolWorldTemplates());

    if (isWorldEditor) {
      let worlds = listPixelProtocolWorldTemplates();
      try {
        worlds = mergePixelProtocolWorldTemplates(await fetchPixelProtocolWorldTemplates());
      } catch {
        setError("Mode hors ligne: mondes custom locaux utilises.");
      }
      setWorldTemplates(worlds);
      const requestedWorld =
        requestedTemplateId
          ? worlds.find((world) => world.id === requestedTemplateId) ?? null
          : null;
      if (requestedWorld) {
        selectWorldTemplate(requestedWorld);
      } else if (worlds.length > 0) {
        selectWorldTemplate(worlds[0]);
      } else {
        const freshWorld = makeNewWorldTemplate([]);
        setSelectedId(null);
        setPublished(false);
        setDraftLevel(levelFromWorldTemplate(freshWorld));
        setSelection(null);
      }
      setLoading(false);
      return;
    }

    try {
      const sorted = isAdmin
        ? sortAdminLevels(await fetchPixelProtocolAdminLevels())
        : mergePixelProtocolCustomLevels(await fetchPixelProtocolCustomLevels());
      setLevels(sorted);
      if (!isAdmin) {
        try {
          setCommunityLevels(await fetchPixelProtocolCommunityLevels());
        } catch {
          setCommunityLevels([]);
        }
      }
      if (sorted.length > 0) {
        selectLevel(sorted[0]);
      } else {
        const fresh = makeNewLevel([], isAdmin);
        setSelectedId(null);
        setPublished(isAdmin);
        setDraftLevel(withAutoWorldBounds(fresh));
        setSelection(null);
      }
    } catch (err) {
      if (isAdmin) {
        setError(err instanceof Error ? err.message : "Erreur chargement niveaux admin");
      } else {
        const local = listPixelProtocolCustomLevels();
        setLevels(local);
        if (local.length > 0) {
          selectLevel(local[0]);
        } else {
          setDraftLevel(withAutoWorldBounds(makeNewLevel([], false)));
          setSelection(null);
        }
        setError("Mode hors ligne: niveaux custom locaux utilises.");
      }
    } finally {
      setLoading(false);
    }
  };

  const saveCurrentCustomDraft = async (levelToSave: LevelDef): Promise<LevelDef> => {
    const merged = upsertPixelProtocolCustomLevel(levelToSave);
    setLevels(merged);
    setSelectedId(levelToSave.id);
    setPublished(false);
    setDraftLevel(levelToSave);

    try {
      const remoteSaved = await savePixelProtocolCustomLevel(levelToSave);
      const mergedRemote: LevelDef = {
        ...remoteSaved,
        worldTopPadding: remoteSaved.worldTopPadding ?? levelToSave.worldTopPadding,
        orbs: remoteSaved.orbs.map((orb) => {
          const draftOrb = levelToSave.orbs.find((item) => item.id === orb.id);
          return {
            ...orb,
            affinity: orb.affinity ?? draftOrb?.affinity ?? "standard",
            grantsSkill: orb.grantsSkill ?? draftOrb?.grantsSkill ?? null,
          };
        }),
      };
      const synced = upsertPixelProtocolCustomLevel(mergedRemote);
      setLevels(synced);
      setDraftLevel(mergedRemote);
      setSelectedId(mergedRemote.id);
      return mergedRemote;
    } catch {
      return levelToSave;
    }
  };

  useEffect(() => {
    refreshLevels();
  }, [isAdmin, isWorldEditor, requestedTemplateId]);

  useEffect(() => {
    const prefs = readEditorUiPrefs(uiScope);
    setExampleTemplatesExpanded(prefs.exampleTemplatesExpanded);
    setSavedWorldsExpanded(prefs.savedWorldsExpanded);
    setDecorationInspectorSections(prefs.decorationInspectorSections);
    setPlatformInspectorSections(prefs.platformInspectorSections);
    setCheckpointInspectorSections(prefs.checkpointInspectorSections);
    setOrbInspectorSections(prefs.orbInspectorSections);
    setEnemyInspectorSections(prefs.enemyInspectorSections);
    setCenterPanelSections(prefs.centerPanelSections);
  }, [uiScope]);

  useEffect(() => {
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
    parsed[uiScope] = {
          exampleTemplatesExpanded,
          savedWorldsExpanded,
          decorationInspectorSections,
          platformInspectorSections,
          checkpointInspectorSections,
          orbInspectorSections,
          enemyInspectorSections,
          centerPanelSections,
        };
    window.localStorage.setItem(EDITOR_UI_STORAGE_KEY, JSON.stringify(parsed));
  }, [
    uiScope,
    exampleTemplatesExpanded,
    savedWorldsExpanded,
    decorationInspectorSections,
    platformInspectorSections,
    checkpointInspectorSections,
    orbInspectorSections,
    enemyInspectorSections,
    centerPanelSections,
  ]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!isWorldEditor || !selectedDecoration) return;
      const target = event.target as HTMLElement | null;
      const tagName = target?.tagName ?? "";
      const isTypingTarget =
        tagName === "INPUT" ||
        tagName === "TEXTAREA" ||
        tagName === "SELECT" ||
        Boolean(target?.isContentEditable);
      if (isTypingTarget) return;

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "d") {
        event.preventDefault();
        handleDuplicateDecoration();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [
    isWorldEditor,
    selectedDecoration,
    draftLevel,
    duplicateOffsetX,
    duplicateOffsetY,
    duplicateColumns,
    duplicateRows,
    duplicateMirrorX,
    duplicateMirrorY,
    duplicateAlternateMirror,
    duplicateLayout,
    duplicateStartAngle,
    duplicateArcAngle,
  ]);

  useEffect(() => {
    if (!dragState) return;

    const pointerToTile = (clientX: number, clientY: number) => {
      const scroller = boardScrollRef.current;
      if (!scroller) return null;
      const rect = scroller.getBoundingClientRect();
      const localX = clientX - rect.left + scroller.scrollLeft;
      const localY = clientY - rect.top + scroller.scrollTop;
      return {
        x: Math.max(0, Math.floor(localX / EDITOR_TILE)),
        y: Math.max(0, Math.floor(localY / EDITOR_TILE) - topPaddingRows),
      };
    };

    const onPointerMove = (event: PointerEvent) => {
      const tile = pointerToTile(event.clientX, event.clientY);
      if (!tile) return;

      setDragState((current) => {
        if (!current) return current;
        if (current.kind === "platform") {
          return {
            ...current,
            candidateTileX: tile.x - current.offsetX,
            candidateTileY: tile.y - current.offsetY,
          };
        }
        return {
          ...current,
          candidateTileX: tile.x,
          candidateTileY: tile.y,
        };
      });
    };

    const onPointerUp = () => {
      const currentDrag = dragStateRef.current;
      if (!currentDrag) return;
      const nextLevel = applyDragPreview(draftLevelRef.current, currentDrag);
      const nextSelection: Selection =
        currentDrag.kind === "spawn" || currentDrag.kind === "portal"
          ? { kind: currentDrag.kind }
          : { kind: currentDrag.kind, id: currentDrag.id };
      applyDraftLevel(nextLevel, nextSelection);
      setDragState(null);
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
    };
  }, [dragState, selection, topPaddingRows]);

  const save = async (forceActive?: boolean) => {
    if (isWorldEditor) {
      const world = worldTemplateFromLevel(draftLevel);
      const next = upsertPixelProtocolWorldTemplate(world);
      setWorldTemplates(next);
      setSelectedId(world.id);
      setDraftLevel(levelFromWorldTemplate(world));
      try {
        const savedWorld = await savePixelProtocolWorldTemplate(world);
        const synced = upsertPixelProtocolWorldTemplate(savedWorld);
        setWorldTemplates(synced);
        setDraftLevel(levelFromWorldTemplate(savedWorld));
        setStatus("Monde custom sauvegarde.");
      } catch {
        setStatus("Monde custom sauvegarde localement.");
      }
      setError(null);
      return;
    }

    const layoutValidation = validatePlatformLayout(draftLevel);
    if (!layoutValidation.isValid) {
      setError(layoutValidation.issues[0]?.message ?? "Le layout des plateformes est invalide.");
      return;
    }

    const active = forceActive ?? published;
    try {
      let savedLevel: LevelDef;
      if (isAdmin) {
        const saved = await savePixelProtocolLevel(draftLevel, active);
        const normalizedSaved = {
          ...saved,
          worldTopPadding: saved.worldTopPadding ?? draftLevel.worldTopPadding,
        };
        setLevels((prev) => sortAdminLevels([normalizedSaved, ...prev.filter((lvl) => lvl.id !== normalizedSaved.id)]));
        setSelectedId(normalizedSaved.id);
        setPublished(normalizedSaved.active);
        setDraftLevel(stripAdminFields(normalizedSaved));
        setStatus(active ? "Niveau publie." : "Niveau sauvegarde en brouillon.");
        savedLevel = stripAdminFields(normalizedSaved);
      } else {
        savedLevel = await saveCurrentCustomDraft(draftLevel);
        setStatus(savedLevel === draftLevel ? "Niveau custom sauvegarde localement." : "Niveau custom sauvegarde.");
      }
      setSelection(savedLevel.platforms[0] ? { kind: "platform", id: savedLevel.platforms[0].id } : null);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur sauvegarde niveau");
    }
  };

  const playCurrentLevel = async () => {
    if (isAdmin || isWorldEditor) return;
    const layoutValidation = validatePlatformLayout(draftLevel);
    if (!layoutValidation.isValid) {
      setError(layoutValidation.issues[0]?.message ?? "Corrige le layout avant de jouer.");
      return;
    }

    const savedLevel = await saveCurrentCustomDraft(draftLevel);
    setStatus("Niveau pret pour le test complet.");
    setError(null);
    navigate(`/pixel-protocol/play?custom=${encodeURIComponent(savedLevel.id)}`);
  };

  const publishCurrentLevel = async () => {
    if (isAdmin || isWorldEditor) return;
    if (!validation.isValid) {
      setError(validationErrors[0]?.message ?? "Le layout doit etre valide avant publication.");
      return;
    }
    if (!hasCompletedCurrentPixelProtocolLevel(draftLevel)) {
      setError("Tu dois finir cette version exacte du niveau avant de le publier.");
      return;
    }

    try {
      const savedLevel = await saveCurrentCustomDraft(draftLevel);
      const publishedLevel = await publishPixelProtocolCommunityLevel(savedLevel.id);
      setCommunityLevels((current) => {
        const next = [publishedLevel, ...current.filter((item) => item.id !== publishedLevel.id)];
        next.sort((a, b) => b.likeCount - a.likeCount || b.id - a.id);
        return next;
      });
      setStatus("Niveau publie dans la galerie des joueurs.");
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur publication niveau");
    }
  };

  const removeLevel = async (levelId: string) => {
    if (!window.confirm(`Supprimer definitivement ${levelId} ?`)) return;
    if (isWorldEditor) {
      const remaining = removePixelProtocolWorldTemplate(levelId);
      try {
        await deletePixelProtocolWorldTemplate(levelId);
      } catch {
        setStatus("Monde supprime localement.");
      }
      setWorldTemplates(remaining);
      setStatus("Monde supprime.");
      if (selectedId !== levelId) return;
      if (remaining.length > 0) {
        selectWorldTemplate(remaining[0]);
      } else {
        const freshWorld = makeNewWorldTemplate([]);
        setSelectedId(null);
        setDraftLevel(levelFromWorldTemplate(freshWorld));
        setSelection(null);
      }
      return;
    }
    try {
      if (isAdmin) {
        await deletePixelProtocolLevel(levelId);
      } else {
        removePixelProtocolCustomLevel(levelId);
        try {
          await deletePixelProtocolCustomLevel(levelId);
        } catch {
          setStatus("Niveau supprime localement.");
        }
      }
      const remaining = isAdmin
        ? sortAdminLevels(levels.filter((lvl) => lvl.id !== levelId))
        : listPixelProtocolCustomLevels();
      setLevels(remaining);
      setStatus("Niveau supprime.");
      if (selectedId !== levelId) return;
      if (remaining.length > 0) {
        selectLevel(remaining[0]);
      } else {
        const fresh = makeNewLevel([], isAdmin);
        setSelectedId(null);
        setPublished(isAdmin);
        setDraftLevel(withAutoWorldBounds(fresh));
        setSelection(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur suppression niveau");
    }
  };

  const startNewLevel = () => {
    if (isWorldEditor) {
      const freshWorld = makeNewWorldTemplate(worldTemplates);
      setSelectedId(null);
      setPublished(false);
      setDraftLevel(levelFromWorldTemplate(freshWorld));
      setSelection(null);
      setPreviewLevel(null);
      resetMessages();
      return;
    }

    const fresh = makeNewLevel(levels, isAdmin);
    setSelectedId(null);
    setPublished(false);
    setDraftLevel(withAutoWorldBounds(fresh));
    setSelection(null);
    setPreviewLevel(null);
    resetMessages();
  };

  const setLevelField = <K extends keyof LevelDef>(field: K, value: LevelDef[K]) => {
    const next = { ...draftLevel, [field]: value };
    if (
      field === "portal" ||
      field === "spawn" ||
      field === "platforms" ||
      field === "checkpoints" ||
      field === "orbs" ||
      field === "enemies"
    ) {
      applyDraftLevel(withAutoWorldBounds(next));
      return;
    }
    applyDraftLevel(next);
  };

  const handleAddPlatform = () => {
    const newId = nextId(draftLevel.platforms, "p");
    const basePlatform: PlatformDef = selectedPlatform
      ? {
          ...selectedPlatform,
          id: newId,
          x: selectedPlatform.x + 4,
          y: Math.max(1, selectedPlatform.y - 1),
        }
      : {
          id: newId,
          tetromino: "I",
          type: "stable",
          rotation: 0,
          x: 6,
          y: 14,
        };
    const normalizedPlatform = normalizePlatformSettings(basePlatform);
    applyDraftLevel(
      { ...draftLevel, platforms: [...draftLevel.platforms, normalizedPlatform] },
      { kind: "platform", id: newId }
    );
  };

  const handleAddCheckpoint = () => {
    const id = nextId(draftLevel.checkpoints, "c");
    const checkpoint = checkpointFromTile(id, 8, 14);
    applyDraftLevel(
      { ...draftLevel, checkpoints: [...draftLevel.checkpoints, checkpoint] },
      { kind: "checkpoint", id }
    );
  };

  const handleAddOrb = () => {
    const id = nextId(draftLevel.orbs, "o");
    const orb = orbFromTile(id, 10, 13);
    applyDraftLevel({ ...draftLevel, orbs: [...draftLevel.orbs, orb] }, { kind: "orb", id });
  };

  const handleAddEnemy = () => {
    const id = nextId(draftLevel.enemies, "e");
    const enemy = enemyFromTile(id, 12, 13);
    applyDraftLevel(
      { ...draftLevel, enemies: [...draftLevel.enemies, enemy] },
      { kind: "enemy", id }
    );
  };

  const handleAddDecoration = () => {
    const id = nextId(draftLevel.decorations ?? [], "d");
    const preset = DECORATION_PRESETS[0];
    const decoration = decorationFromTile(id, 8, 8, preset.type);
    applyDraftLevel(
      {
        ...draftLevel,
        decorations: [...(draftLevel.decorations ?? []), decoration],
      },
      { kind: "decoration", id }
    );
  };

  const handleDuplicateDecoration = () => {
    if (!selectedDecoration) return;
    const nextDecorations = [...(draftLevel.decorations ?? [])];
    const duplicates = buildDecorationDuplicates({
      base: selectedDecoration,
      columns: duplicateColumns,
      rows: duplicateRows,
      offsetX: duplicateOffsetX,
      offsetY: duplicateOffsetY,
      mirrorX: duplicateMirrorX,
      mirrorY: duplicateMirrorY,
      alternateMirror: duplicateAlternateMirror,
      layout: duplicateLayout,
      startAngleDeg: duplicateStartAngle,
      arcDeg: duplicateArcAngle,
    });
    let lastId = selectedDecoration.id;
    duplicates.forEach((duplicate) => {
      const id = nextId(nextDecorations, "d");
      lastId = id;
      nextDecorations.push({
        ...duplicate,
        id,
      });
    });

    applyDraftLevel(
      {
        ...draftLevel,
        decorations: nextDecorations,
      },
      { kind: "decoration", id: lastId }
    );
    setStatus(
      duplicates.length === 1
        ? `Decoration dupliquee: ${lastId}`
        : `${duplicates.length} decorations dupliquees.`
    );
  };

  const handleDeleteSelection = () => {
    if (!selection) return;
    if (selection.kind === "spawn" || selection.kind === "portal") return;
    if (selection.kind === "platform") {
      const nextPlatforms = draftLevel.platforms.filter((item) => item.id !== selection.id);
      applyDraftLevel({ ...draftLevel, platforms: nextPlatforms }, nextPlatforms[0] ? { kind: "platform", id: nextPlatforms[0].id } : null);
      return;
    }
    if (selection.kind === "checkpoint") {
      const next = draftLevel.checkpoints.filter((item) => item.id !== selection.id);
      applyDraftLevel({ ...draftLevel, checkpoints: next }, next[0] ? { kind: "checkpoint", id: next[0].id } : null);
      return;
    }
    if (selection.kind === "orb") {
      const next = draftLevel.orbs.filter((item) => item.id !== selection.id);
      applyDraftLevel({ ...draftLevel, orbs: next }, next[0] ? { kind: "orb", id: next[0].id } : null);
      return;
    }
    if (selection.kind === "decoration") {
      const next = (draftLevel.decorations ?? []).filter((item) => item.id !== selection.id);
      applyDraftLevel(
        { ...draftLevel, decorations: next },
        next[0] ? { kind: "decoration", id: next[0].id } : null
      );
      return;
    }
    const next = draftLevel.enemies.filter((item) => item.id !== selection.id);
    applyDraftLevel({ ...draftLevel, enemies: next }, next[0] ? { kind: "enemy", id: next[0].id } : null);
  };

  const handleSelectedPlatformChange = (updater: (platform: PlatformDef) => PlatformDef) => {
    if (!selectedPlatform) return;
    applyDraftLevel(
      updatePlatform(draftLevel, selectedPlatform.id, (platform) => {
        const nextPlatform = updater(platform);
        return normalizePlatformSettings(nextPlatform);
      }),
      selection
    );
  };

  const handleSelectedCheckpointChange = (updater: (checkpoint: Checkpoint) => Checkpoint) => {
    if (!selectedCheckpoint) return;
    applyDraftLevel(updateCheckpoint(draftLevel, selectedCheckpoint.id, updater), selection);
  };

  const handleSelectedOrbChange = (updater: (orb: DataOrb) => DataOrb) => {
    if (!selectedOrb) return;
    applyDraftLevel(updateOrb(draftLevel, selectedOrb.id, updater), selection);
  };

  const handleSelectedEnemyChange = (updater: (enemy: Enemy) => Enemy) => {
    if (!selectedEnemy) return;
    applyDraftLevel(updateEnemy(draftLevel, selectedEnemy.id, updater), selection);
  };

  const handleSelectedDecorationChange = (updater: (decoration: DecorationDef) => DecorationDef) => {
    if (!selectedDecoration) return;
    applyDraftLevel(
      updateDecoration(draftLevel, selectedDecoration.id, (decoration) => {
        const next = updater(decoration);
        const preset = getDecorationPreset(next.type);
        return {
          ...next,
          width: Math.max(4, next.width || preset.defaultWidth),
          height: Math.max(4, next.height || preset.defaultHeight),
          opacity: Math.min(1, Math.max(0, next.opacity ?? 0.9)),
          layer: next.layer ?? "mid",
          animation: next.animation ?? "none",
        };
      }),
      selection
    );
  };

  const toggleDecorationInspectorSection = (
    section: (typeof DECORATION_INSPECTOR_SECTIONS)[number]
  ) => {
    setDecorationInspectorSections((current) => ({
      ...current,
      [section]: !current[section],
    }));
  };

  const togglePlatformInspectorSection = (
    section: (typeof PLATFORM_INSPECTOR_SECTIONS)[number]
  ) => {
    setPlatformInspectorSections((current) => ({
      ...current,
      [section]: !current[section],
    }));
  };

  const toggleCheckpointInspectorSection = (
    section: (typeof CHECKPOINT_INSPECTOR_SECTIONS)[number]
  ) => {
    setCheckpointInspectorSections((current) => ({
      ...current,
      [section]: !current[section],
    }));
  };

  const toggleOrbInspectorSection = (section: (typeof ORB_INSPECTOR_SECTIONS)[number]) => {
    setOrbInspectorSections((current) => ({
      ...current,
      [section]: !current[section],
    }));
  };

  const toggleEnemyInspectorSection = (section: (typeof ENEMY_INSPECTOR_SECTIONS)[number]) => {
    setEnemyInspectorSections((current) => ({
      ...current,
      [section]: !current[section],
    }));
  };

  const toggleCenterPanelSection = (section: (typeof CENTER_PANEL_SECTIONS)[number]) => {
    setCenterPanelSections((current) => ({
      ...current,
      [section]: !current[section],
    }));
  };

  const setAllCenterPanelSections = (expanded: boolean) => {
    setCenterPanelSections(
      Object.fromEntries(
        CENTER_PANEL_SECTIONS.map((section) => [section, expanded])
      ) as Record<(typeof CENTER_PANEL_SECTIONS)[number], boolean>
    );
  };

  const resetEditorUi = () => {
    const prefs = defaultEditorUiPrefs();
    setExampleTemplatesExpanded(prefs.exampleTemplatesExpanded);
    setSavedWorldsExpanded(prefs.savedWorldsExpanded);
    setDecorationInspectorSections(prefs.decorationInspectorSections);
    setPlatformInspectorSections(prefs.platformInspectorSections);
    setCheckpointInspectorSections(prefs.checkpointInspectorSections);
    setOrbInspectorSections(prefs.orbInspectorSections);
    setEnemyInspectorSections(prefs.enemyInspectorSections);
    setCenterPanelSections(prefs.centerPanelSections);
    setStatus("Interface reinitialisee pour ce mode.");
    setError(null);
  };

  const setAllInspectorSections = (expanded: boolean) => {
    if (selectedPlatform) {
      setPlatformInspectorSections(
        Object.fromEntries(
          PLATFORM_INSPECTOR_SECTIONS.map((section) => [section, expanded])
        ) as Record<(typeof PLATFORM_INSPECTOR_SECTIONS)[number], boolean>
      );
      return;
    }
    if (selectedCheckpoint) {
      setCheckpointInspectorSections(
        Object.fromEntries(
          CHECKPOINT_INSPECTOR_SECTIONS.map((section) => [section, expanded])
        ) as Record<(typeof CHECKPOINT_INSPECTOR_SECTIONS)[number], boolean>
      );
      return;
    }
    if (selectedOrb) {
      setOrbInspectorSections(
        Object.fromEntries(
          ORB_INSPECTOR_SECTIONS.map((section) => [section, expanded])
        ) as Record<(typeof ORB_INSPECTOR_SECTIONS)[number], boolean>
      );
      return;
    }
    if (selectedEnemy) {
      setEnemyInspectorSections(
        Object.fromEntries(
          ENEMY_INSPECTOR_SECTIONS.map((section) => [section, expanded])
        ) as Record<(typeof ENEMY_INSPECTOR_SECTIONS)[number], boolean>
      );
      return;
    }
    if (selectedDecoration) {
      setDecorationInspectorSections(
        Object.fromEntries(
          DECORATION_INSPECTOR_SECTIONS.map((section) => [section, expanded])
        ) as Record<(typeof DECORATION_INSPECTOR_SECTIONS)[number], boolean>
      );
    }
  };

  const startPlatformDrag = (event: React.PointerEvent<HTMLButtonElement>, platform: PlatformDef) => {
    event.preventDefault();
    const scroller = boardScrollRef.current;
    if (!scroller) return;
    const rect = scroller.getBoundingClientRect();
    const tileX = Math.floor((event.clientX - rect.left + scroller.scrollLeft) / EDITOR_TILE);
    const tileY =
      Math.floor((event.clientY - rect.top + scroller.scrollTop) / EDITOR_TILE) - topPaddingRows;
    setSelection({ kind: "platform", id: platform.id });
    setDragState({
      kind: "platform",
      id: platform.id,
      offsetX: tileX - platform.x,
      offsetY: Math.max(0, tileY) - platform.y,
      candidateTileX: platform.x,
      candidateTileY: platform.y,
    });
  };

  const startCheckpointDrag = (event: React.PointerEvent<HTMLButtonElement>, checkpoint: Checkpoint) => {
    event.preventDefault();
    setSelection({ kind: "checkpoint", id: checkpoint.id });
    setDragState({
      kind: "checkpoint",
      id: checkpoint.id,
      candidateTileX: Math.round((checkpoint.x - 10) / TILE),
      candidateTileY: Math.round((checkpoint.y + 42) / TILE),
    });
  };

  const startOrbDrag = (event: React.PointerEvent<HTMLButtonElement>, orb: DataOrb) => {
    event.preventDefault();
    setSelection({ kind: "orb", id: orb.id });
    setDragState({
      kind: "orb",
      id: orb.id,
      candidateTileX: Math.round((orb.x - 7) / TILE),
      candidateTileY: Math.round((orb.y + 20) / TILE),
    });
  };

  const startEnemyDrag = (event: React.PointerEvent<HTMLButtonElement>, enemy: Enemy) => {
    event.preventDefault();
    setSelection({ kind: "enemy", id: enemy.id });
    setDragState({
      kind: "enemy",
      id: enemy.id,
      candidateTileX: Math.round(enemy.x / TILE),
      candidateTileY: Math.round((enemy.y + 26) / TILE),
    });
  };

  const startDecorationDrag = (
    event: React.PointerEvent<HTMLButtonElement>,
    decoration: DecorationDef
  ) => {
    event.preventDefault();
    setSelection({ kind: "decoration", id: decoration.id });
    setDragState({
      kind: "decoration",
      id: decoration.id,
      offsetX: normalizeTileOffset(decoration.x),
      offsetY: normalizeTileOffset(decoration.y),
      candidateTileX: Math.floor(decoration.x / TILE),
      candidateTileY: Math.floor(decoration.y / TILE),
    });
  };

  const startSpawnDrag = (event: React.PointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    setSelection({ kind: "spawn" });
    setDragState({
      kind: "spawn",
      candidateTileX: Math.floor(draftLevel.spawn.x / TILE),
      candidateTileY: Math.floor(draftLevel.spawn.y / TILE),
      offsetX: normalizeTileOffset(draftLevel.spawn.x),
      offsetY: normalizeTileOffset(draftLevel.spawn.y),
    });
  };

  const startPortalDrag = (event: React.PointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    setSelection({ kind: "portal" });
    setDragState({
      kind: "portal",
      candidateTileX: Math.floor(draftLevel.portal.x / TILE),
      candidateTileY: Math.floor(draftLevel.portal.y / TILE),
      offsetX: normalizeTileOffset(draftLevel.portal.x),
      offsetY: normalizeTileOffset(draftLevel.portal.y),
    });
  };

  const openPreview = () => {
    const layoutValidation = validatePlatformLayout(draftLevel);
    if (!layoutValidation.isValid) {
      setError(layoutValidation.issues[0]?.message ?? "Corrige le layout avant le test.");
      return;
    }
    setPreviewLevel(cloneDraftLevel(draftLevel));
    setPreviewKey((current) => current + 1);
    setError(null);
  };

  return (
    <div className="pp-editor-shell">
      <div className="pp-editor-head">
        <div>
          <h1>Pixel Protocol - {isAdmin ? "Editeur admin" : "Editeur custom"}</h1>
          <p>
            {isAdmin
              ? "Edition visuelle des niveaux officiels avec publication et validation de parcours."
              : "Cree, modifie et supprime tes propres niveaux. Les niveaux officiels restent en lecture seule."}
          </p>
        </div>
        <div className="pp-editor-head-actions">
          <button
            type="button"
            className={`pp-editor-icon-btn ${
              isWorldEditor ? "pp-editor-icon-btn--decoration" : "pp-editor-icon-btn--platform"
            }`}
            title={isWorldEditor ? "Nouveau monde" : "Nouveau niveau"}
            aria-label={isWorldEditor ? "Nouveau monde" : "Nouveau niveau"}
            onClick={startNewLevel}
          >
            <i className="fa-solid fa-file-circle-plus" />
          </button>
          <button
            type="button"
            className="pp-editor-icon-btn pp-editor-icon-btn--refresh"
            title="Actualiser"
            aria-label="Actualiser"
            onClick={refreshLevels}
          >
            <i className="fa-solid fa-rotate-right" />
          </button>
          <button
            type="button"
            className="pp-editor-icon-btn pp-editor-icon-btn--help"
            title="Aide"
            aria-label="Aide"
            onClick={() => navigate("/pixel-protocol/help/editor")}
          >
            <i className="fa-solid fa-circle-question" />
          </button>
          <button
            type="button"
            className="pp-editor-icon-btn pp-editor-icon-btn--reset-ui"
            title="Reinitialiser l'interface"
            aria-label="Reinitialiser l'interface"
            onClick={resetEditorUi}
          >
            <i className="fa-solid fa-rotate-left" />
          </button>
          <button
            type="button"
            className="pp-editor-icon-btn pp-editor-icon-btn--back"
            title="Retour"
            aria-label="Retour"
            onClick={() => navigate("/pixel-protocol")}
          >
            <i className="fa-solid fa-arrow-left" />
          </button>
        </div>
      </div>

      <div className="pp-editor-layout">
        <aside className="pp-editor-panel pp-editor-list">
          {isWorldEditor && (
            <input
              ref={importWorldInputRef}
              type="file"
              accept="application/json,.json"
              hidden
              onChange={handleImportWorldTemplate}
            />
          )}
          {(!isAdmin || isWorldEditor) && (
            <div
              className="pp-editor-list-actions"
              aria-label={
                isWorldEditor
                  ? isAdmin
                    ? "Actions monde admin"
                    : "Actions monde custom"
                  : "Actions niveau custom"
              }
            >
              {isWorldEditor && (
                <button
                  type="button"
                  className="pp-editor-icon-btn pp-editor-icon-btn--example"
                  title="Charger le monde d'exemple"
                  aria-label="Charger le monde d'exemple"
                  onClick={() => handleLoadExampleWorldTemplate(WORLD_EXAMPLES[0].raw)}
                >
                  <i className="fa-solid fa-wand-magic-sparkles" />
                </button>
              )}
              {isWorldEditor && (
                <button
                  type="button"
                  className="pp-editor-icon-btn pp-editor-icon-btn--import"
                  title="Importer un monde JSON"
                  aria-label="Importer un monde JSON"
                  onClick={() => importWorldInputRef.current?.click()}
                >
                  <i className="fa-solid fa-file-arrow-up" />
                </button>
              )}
              {isWorldEditor && (
                <button
                  type="button"
                  className="pp-editor-icon-btn pp-editor-icon-btn--export"
                  title="Exporter le monde courant en JSON"
                  aria-label="Exporter le monde courant en JSON"
                  onClick={handleExportWorldTemplate}
                >
                  <i className="fa-solid fa-file-arrow-down" />
                </button>
              )}
              <button
                type="button"
                className="pp-editor-icon-btn pp-editor-icon-btn--save"
                title="Sauvegarder"
                aria-label="Sauvegarder"
                onClick={() => save(false)}
              >
                <i className="fa-solid fa-floppy-disk" />
              </button>
              {!isAdmin && !isWorldEditor && (
                <>
                  <button
                    type="button"
                    className="pp-editor-icon-btn pp-editor-icon-btn--test"
                    title="Tester le niveau"
                    aria-label="Tester le niveau"
                    onClick={openPreview}
                  >
                    <i className="fa-solid fa-vial-circle-check" />
                  </button>
                  <button
                    type="button"
                    className="pp-editor-icon-btn pp-editor-icon-btn--play"
                    title="Jouer ce niveau"
                    aria-label="Jouer ce niveau"
                    onClick={() => void playCurrentLevel()}
                  >
                    <i className="fa-solid fa-play" />
                  </button>
                  <button
                    type="button"
                    className="pp-editor-icon-btn pp-editor-icon-btn--publish"
                    title={
                      validation.isValid
                        ? hasCompletedCurrentPixelProtocolLevel(draftLevel)
                          ? "Publier dans la galerie"
                          : "Finis d'abord cette version exacte du niveau"
                        : "Le layout doit etre valide pour publier"
                    }
                    aria-label="Publier dans la galerie"
                    onClick={() => void publishCurrentLevel()}
                    disabled={!canPublishCommunityLevel}
                  >
                    <i className="fa-solid fa-upload" />
                  </button>
                </>
              )}
            </div>
          )}
          {isWorldEditor && (
            <div className="pp-editor-collapsible">
              <button
                type="button"
                className="pp-editor-collapsible__toggle"
                onClick={() => setExampleTemplatesExpanded((current: boolean) => !current)}
              >
                <span>{`Mondes d'exemple (${WORLD_EXAMPLES.length})`}</span>
                <i
                  className={`fa-solid ${
                    exampleTemplatesExpanded ? "fa-chevron-up" : "fa-chevron-down"
                  }`}
                  aria-hidden="true"
                />
              </button>
              {exampleTemplatesExpanded && (
                <>
                  <div className="pp-editor-example-toolbar">
                    <input
                      type="search"
                      value={exampleSearch}
                      onChange={(event) => setExampleSearch(event.target.value)}
                      placeholder="Rechercher un exemple"
                      aria-label="Rechercher un monde d'exemple"
                    />
                    <select
                      value={exampleSort}
                      onChange={(event) =>
                        setExampleSort(event.target.value as (typeof EXAMPLE_SORTS)[number])
                      }
                      aria-label="Trier les mondes d'exemple"
                    >
                      <option value="recent">Recents</option>
                      <option value="a-z">A-Z</option>
                      <option value="showcase">Showcase</option>
                      <option value="ambiance">Ambiance</option>
                    </select>
                  </div>
                  <div className="pp-editor-example-actions" aria-label="Mondes d'exemple">
                  {filteredExamples.map((example) => (
                    <button
                      key={example.id}
                      type="button"
                      className="pp-editor-example-btn"
                      onClick={() => handleLoadExampleWorldTemplate(example.raw)}
                    >
                      <strong>{example.name}</strong>
                      <span>{example.theme}</span>
                    </button>
                  ))}
                  </div>
                  {filteredExamples.length === 0 && (
                    <p className="pp-editor-muted">Aucun monde d'exemple pour cette recherche.</p>
                  )}
                </>
              )}
            </div>
          )}
          <div className="pp-editor-collapsible">
            <button
              type="button"
              className="pp-editor-collapsible__toggle"
              onClick={() => setSavedWorldsExpanded((current: boolean) => !current)}
            >
              <span>
                {isWorldEditor
                  ? `Tes mondes custom (${worldTemplates.length})`
                  : isAdmin
                    ? `Niveaux disponibles (${levels.length})`
                    : `Tes niveaux custom (${levels.length})`}
              </span>
              <i
                className={`fa-solid ${savedWorldsExpanded ? "fa-chevron-up" : "fa-chevron-down"}`}
                aria-hidden="true"
              />
            </button>
          {savedWorldsExpanded && (loading ? (
            <p className="pp-editor-muted">Chargement...</p>
          ) : (isWorldEditor ? worldTemplates.length === 0 : levels.length === 0) ? (
            <p className="pp-editor-muted">
              {isWorldEditor
                ? "Aucun monde custom pour le moment."
                : isAdmin
                  ? "Aucun niveau en base."
                  : "Aucun niveau custom pour le moment."}
            </p>
          ) : (
            <div className="pp-editor-list-scroll">
              {(isWorldEditor ? worldTemplates : levels).map((lvl) => (
                <div
                  key={lvl.id}
                  className={`pp-editor-level ${lvl.id === selectedId ? "is-active" : ""}`}
                >
                  <div className="pp-editor-level-head">
                    <span>{lvl.name}</span>
                    {isWorldEditor ? (
                      <span className="tag tag-draft">Monde</span>
                    ) : isAdmin ? (
                      <span
                        className={(lvl as EditorStoredLevel).active ? "tag tag-live" : "tag tag-draft"}
                      >
                        {(lvl as EditorStoredLevel).active ? "Publie" : "Brouillon"}
                      </span>
                    ) : (
                      <span className="tag tag-draft">Prive</span>
                    )}
                  </div>
                  <div className="pp-editor-level-meta">
                    <span>ID: {lvl.id}</span>
                    <span>
                      {isWorldEditor ? `Decors ${(lvl as WorldTemplate).decorations.length}` : `Monde ${(lvl as EditorStoredLevel).world}`}
                    </span>
                    {!isAdmin &&
                      !isWorldEditor &&
                      communityLevels.some((communityLevel) => communityLevel.isOwn && communityLevel.level.id === lvl.id) && (
                        <span>Galerie: publie</span>
                      )}
                    {!isWorldEditor && (lvl as EditorStoredLevel).worldTemplateId && (
                      <span>Decor: {(lvl as EditorStoredLevel).worldTemplateId}</span>
                    )}
                  </div>
                  <div className="pp-editor-level-actions">
                    <button
                      type="button"
                      className="pp-editor-icon-btn pp-editor-icon-btn--load"
                      title="Charger"
                      aria-label="Charger"
                      onClick={() =>
                        isWorldEditor
                          ? selectWorldTemplate(lvl as WorldTemplate)
                          : selectLevel(lvl as EditorStoredLevel)
                      }
                    >
                      <i className="fa-solid fa-folder-open" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      className="pp-editor-icon-btn pp-editor-icon-btn--danger"
                      title="Supprimer"
                      aria-label="Supprimer"
                      onClick={() => removeLevel(lvl.id)}
                    >
                      <i className="fa-solid fa-trash" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ))}
          </div>
        </aside>

        <section className="pp-editor-panel pp-editor-main">
          <div className="pp-editor-main-head">
            <div>
              <h2>{isWorldEditor ? "Edition du monde" : "Edition du niveau"}</h2>
              <p className="pp-editor-muted">
                {isWorldEditor
                  ? "Compose un decor reutilisable, puis applique-le ensuite dans le mode niveau."
                  : "Les plateformes invalides sont signalees et les liens atteignables sont traces."}
              </p>
            </div>
            <div className="pp-editor-main-actions">
              <button
                type="button"
                className="pp-editor-icon-btn pp-editor-icon-btn--info"
                title={editorExpanded ? "Reduire l'edition" : "Agrandir l'edition"}
                aria-label={editorExpanded ? "Reduire l'edition" : "Agrandir l'edition"}
                onClick={() => setEditorExpanded((current) => !current)}
              >
                <i
                  className={`fa-solid ${editorExpanded ? "fa-compress" : "fa-expand"}`}
                  aria-hidden="true"
                />
              </button>
              {isAdmin ? (
                <label className="pp-editor-toggle">
                  <input
                    type="checkbox"
                    checked={published}
                    onChange={(event) => setPublished(event.target.checked)}
                  />
                  Publie
                </label>
              ) : (
                <div className="pp-editor-muted">Visibilite: privee</div>
              )}
            </div>
          </div>

          {editorExpanded && (
            <div className="pp-editor-form-sections">
              <div className="pp-editor-form-grid">
                <label>
                  <span>ID</span>
                  <input value={draftLevel.id} onChange={(event) => setLevelField("id", event.target.value)} />
                </label>
                <label>
                  <span>Nom</span>
                  <input value={draftLevel.name} onChange={(event) => setLevelField("name", event.target.value)} />
                </label>
                {editorMode === "level" && (
                  <label>
                    <span>Monde</span>
                    <input
                      type="number"
                      min={1}
                      max={9}
                      value={draftLevel.world}
                      onChange={(event) => setLevelField("world", Math.max(1, Number(event.target.value) || 1))}
                    />
                  </label>
                )}
              </div>
              {editorMode === "level" ? (
                <>
                <div className="pp-editor-form-split">
                  <section className="pp-editor-form-card">
                    <h3>Dimensions gameplay</h3>
                    <p className="pp-editor-muted">
                      Ces valeurs controlent le sol, la hauteur jouable et la marge camera du niveau.
                    </p>
                    <div className="pp-editor-form-grid">
                      <label>
                        <span>Largeur (tuiles)</span>
                        <input
                          type="number"
                          min={MIN_WORLD_TILES}
                          max={180}
                          value={worldTiles}
                          onChange={(event) => {
                            const tiles = Math.max(MIN_WORLD_TILES, Number(event.target.value) || MIN_WORLD_TILES);
                            setLevelField("worldWidth", tiles * TILE);
                          }}
                        />
                      </label>
                      <label>
                        <span>Hauteur (tuiles)</span>
                        <input
                          type="number"
                          min={MIN_WORLD_ROWS}
                          max={80}
                          value={worldRows}
                          onChange={(event) => {
                            const rows = Math.max(MIN_WORLD_ROWS, Number(event.target.value) || MIN_WORLD_ROWS);
                            setLevelField("worldHeight", rows * TILE);
                          }}
                        />
                      </label>
                      <label>
                        <span>Marge haute (tuiles)</span>
                        <input
                          type="number"
                          min={0}
                          max={24}
                          value={topPaddingRows}
                          onChange={(event) => {
                            const rows = Math.max(0, Number(event.target.value) || 0);
                            setLevelField("worldTopPadding", rows * TILE);
                          }}
                        />
                      </label>
                    </div>
                  </section>
                  <section className="pp-editor-form-card">
                    <h3>Monde decoratif</h3>
                    <p className="pp-editor-muted">
                      Le monde lie applique les decors et la largeur visuelle, sans modifier la hauteur gameplay.
                    </p>
                    <div className="pp-editor-form-grid">
                      <label>
                        <span>Monde decoratif</span>
                        <select
                          value={draftLevel.worldTemplateId ?? ""}
                          onChange={(event) => {
                            const nextId = event.target.value;
                            if (!nextId) {
                              setLevelField("worldTemplateId", null);
                              return;
                            }
                            const world = worldTemplates.find((item) => item.id === nextId);
                            if (!world) return;
                            applyDraftLevel(applyWorldTemplateToLevel(draftLevel, world), selection);
                            setStatus(`Monde applique: ${world.name}`);
                          }}
                        >
                          <option value="">-- aucun --</option>
                          {worldTemplates.map((world) => (
                            <option key={world.id} value={world.id}>
                              {world.name}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                    <div className="pp-editor-world-summary">
                      <div><span>Decor lie</span><strong>{selectedWorldTemplate?.name ?? "Aucun"}</strong></div>
                      <div><span>Largeur decor</span><strong>{selectedWorldTemplate ? `${Math.round(selectedWorldTemplate.worldWidth / TILE)} tuiles` : "-"}</strong></div>
                      <div><span>Hauteur decor</span><strong>{selectedWorldTemplate ? `${Math.round((selectedWorldTemplate.worldHeight ?? WORLD_H) / TILE)} tuiles` : "-"}</strong></div>
                      <div><span>Marge decor</span><strong>{selectedWorldTemplate ? `${Math.round((selectedWorldTemplate.worldTopPadding ?? 0) / TILE)} tuiles` : "-"}</strong></div>
                    </div>
                    {selectedWorldTemplate && selectedWorldTemplate.worldWidth < draftLevel.worldWidth && (
                      <div className="pp-editor-status warning">
                        Le decor lie est plus etroit que la largeur gameplay. Une partie du niveau peut depasser de la zone decorative.
                      </div>
                    )}
                  </section>
                </div>
                <section className="pp-editor-form-card">
                  <h3>Objectifs et points clefs</h3>
                  <div className="pp-editor-form-grid">
                    <label>
                      <span>Orbs requises</span>
                      <input
                        type="number"
                        min={0}
                        max={99}
                        value={draftLevel.requiredOrbs}
                        onChange={(event) => setLevelField("requiredOrbs", Math.max(0, Number(event.target.value) || 0))}
                      />
                    </label>
                    <label>
                      <span>Spawn X</span>
                      <input
                        type="number"
                        value={draftLevel.spawn.x}
                        onChange={(event) =>
                          setLevelField("spawn", { ...draftLevel.spawn, x: Number(event.target.value) || 0 })
                        }
                      />
                    </label>
                    <label>
                      <span>Spawn Y</span>
                      <input
                        type="number"
                        value={draftLevel.spawn.y}
                        onChange={(event) =>
                          setLevelField("spawn", { ...draftLevel.spawn, y: Number(event.target.value) || 0 })
                        }
                      />
                    </label>
                    <label>
                      <span>Portail X</span>
                      <input
                        type="number"
                        value={draftLevel.portal.x}
                        onChange={(event) =>
                          setLevelField("portal", { ...draftLevel.portal, x: Number(event.target.value) || 0 })
                        }
                      />
                    </label>
                    <label>
                      <span>Portail Y</span>
                      <input
                        type="number"
                        value={draftLevel.portal.y}
                        onChange={(event) =>
                          setLevelField("portal", { ...draftLevel.portal, y: Number(event.target.value) || 0 })
                        }
                      />
                    </label>
                  </div>
                </section>
                </>
              ) : (
                <div className="pp-editor-form-grid">
                  <label>
                    <span>Largeur (tuiles)</span>
                    <input
                      type="number"
                      min={MIN_WORLD_TILES}
                      max={180}
                      value={worldTiles}
                      onChange={(event) => {
                        const tiles = Math.max(MIN_WORLD_TILES, Number(event.target.value) || MIN_WORLD_TILES);
                        setLevelField("worldWidth", tiles * TILE);
                      }}
                    />
                  </label>
                  <label>
                    <span>Hauteur (tuiles)</span>
                    <input
                      type="number"
                      min={MIN_WORLD_ROWS}
                      max={80}
                      value={worldRows}
                      onChange={(event) => {
                        const rows = Math.max(MIN_WORLD_ROWS, Number(event.target.value) || MIN_WORLD_ROWS);
                        setLevelField("worldHeight", rows * TILE);
                      }}
                    />
                  </label>
                  <label>
                    <span>Marge haute (tuiles)</span>
                    <input
                      type="number"
                      min={0}
                      max={24}
                      value={topPaddingRows}
                      onChange={(event) => {
                        const rows = Math.max(0, Number(event.target.value) || 0);
                        setLevelField("worldTopPadding", rows * TILE);
                      }}
                    />
                  </label>
                </div>
              )}
          </div>
          )}

          <div className="pp-editor-workbench">
            <div className="pp-editor-canvas-card">
              <div className="pp-editor-toolbar">
                <div className="pp-editor-toolbar-hint">
                  {editorMode === "level"
                    ? `Mode Niveau${selectedWorldTemplate ? ` - Monde: ${selectedWorldTemplate.name}` : ""}`
                    : "Mode Monde - Edition du decor reutilisable"}
                </div>
                <div className="pp-editor-toolbar-group">
                  {editorMode === "level" ? (
                    <>
                      <button
                        type="button"
                        className="pp-editor-icon-btn pp-editor-icon-btn--platform"
                        title="Ajouter plateforme"
                        aria-label="Ajouter plateforme"
                        onClick={handleAddPlatform}
                      >
                        <i className="fa-solid fa-cubes" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        className="pp-editor-icon-btn pp-editor-icon-btn--checkpoint"
                        title="Ajouter checkpoint"
                        aria-label="Ajouter checkpoint"
                        onClick={handleAddCheckpoint}
                      >
                        <i className="fa-solid fa-flag" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        className="pp-editor-icon-btn pp-editor-icon-btn--orb"
                        title="Ajouter orb"
                        aria-label="Ajouter orb"
                        onClick={handleAddOrb}
                      >
                        <i className="fa-solid fa-circle-nodes" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        className="pp-editor-icon-btn pp-editor-icon-btn--enemy"
                        title="Ajouter ennemi"
                        aria-label="Ajouter ennemi"
                        onClick={handleAddEnemy}
                      >
                        <i className="fa-solid fa-robot" aria-hidden="true" />
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        className="pp-editor-icon-btn pp-editor-icon-btn--decoration"
                        title="Ajouter decoration"
                        aria-label="Ajouter decoration"
                        onClick={handleAddDecoration}
                      >
                        <i className="fa-solid fa-shapes" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        className="pp-editor-icon-btn pp-editor-icon-btn--duplicate"
                        title="Dupliquer decoration"
                        aria-label="Dupliquer decoration"
                        onClick={handleDuplicateDecoration}
                        disabled={!selectedDecoration}
                      >
                        <i className="fa-solid fa-clone" aria-hidden="true" />
                      </button>
                    </>
                  )}
                  <button
                    type="button"
                    className="pp-editor-icon-btn pp-editor-icon-btn--danger"
                    title="Supprimer selection"
                    aria-label="Supprimer selection"
                    onClick={handleDeleteSelection}
                    disabled={!canDeleteSelection}
                  >
                    <i className="fa-solid fa-trash-can" aria-hidden="true" />
                  </button>
                </div>
                <div className="pp-editor-toolbar-hint">
                  {editorMode === "level"
                    ? `Capacites actives: ${abilities.doubleJump ? "double jump" : "saut simple"} / ${abilities.airDash ? "dash" : "pas de dash"}`
                    : "Mode Monde: edition de la couche decorative (sans collision)."}
                </div>
              </div>

              <div ref={boardScrollRef} className="pp-editor-world-scroll">
                <div
                  className="pp-editor-world"
                  style={{ width: worldTiles * EDITOR_TILE, height: editorTotalRows * EDITOR_TILE }}
                >
                  <svg className="pp-editor-links" width={worldTiles * EDITOR_TILE} height={editorTotalRows * EDITOR_TILE}>
                    {validation.links.map((link, index) => {
                      const from =
                        link.from.kind === "spawn"
                          ? {
                              x: (displayedLevel.spawn.x / TILE) * EDITOR_TILE + 10,
                              y: (displayedLevel.spawn.y / TILE) * EDITOR_TILE + editorYOffset + 10,
                            }
                          : platformCenterMap.get(link.from.platformId)
                            ? {
                                x: (platformCenterMap.get(link.from.platformId)!.x / TILE) * EDITOR_TILE,
                                y: (platformCenterMap.get(link.from.platformId)!.y / TILE) * EDITOR_TILE + editorYOffset,
                              }
                            : null;
                      const toCenter = platformCenterMap.get(link.to.platformId);
                      const to = toCenter
                        ? {
                            x: (toCenter.x / TILE) * EDITOR_TILE,
                            y: (toCenter.y / TILE) * EDITOR_TILE + editorYOffset,
                          }
                        : null;
                      if (!from || !to) return null;
                      return <line key={`${link.to.platformId}-${index}`} x1={from.x} y1={from.y} x2={to.x} y2={to.y} />;
                    })}
                  </svg>

                  {topPaddingRows > 0 && (
                    <div
                      className="pp-editor-top-padding"
                      style={{ top: editorYOffset - 2, height: 2 }}
                    />
                  )}

                  <div
                    className="pp-editor-ground"
                    style={{ top: (editorTotalRows - 1) * EDITOR_TILE, height: EDITOR_TILE }}
                  />

                  {renderDecorations.map((decoration) => {
                    const scaledX = (decoration.x / TILE) * EDITOR_TILE;
                    const scaledY = (decoration.y / TILE) * EDITOR_TILE;
                    const scaledW = (decoration.width / TILE) * EDITOR_TILE;
                    const scaledH = (decoration.height / TILE) * EDITOR_TILE;
                    const isSelected =
                      selection?.kind === "decoration" && selection.id === decoration.id;
                    return (
                      <button
                        key={decoration.id}
                        type="button"
                        className={`pp-editor-decoration-layer ${isSelected ? "is-selected" : ""} ${
                          dragState?.kind === "decoration" && dragState.id === decoration.id
                            ? "is-dragging"
                            : ""
                        } ${editorMode === "world" ? "" : "is-readonly"}`}
                        style={{
                          left: scaledX,
                          top: scaledY,
                          width: scaledW,
                          height: scaledH,
                          pointerEvents: editorMode === "world" ? "auto" : "none",
                        }}
                        onPointerDown={(event) => startDecorationDrag(event, decoration)}
                        onClick={() => setSelection({ kind: "decoration", id: decoration.id })}
                      >
                        <PixelProtocolDecoration
                          decoration={{
                            ...decoration,
                            x: 0,
                            y: 0,
                            width: scaledW,
                            height: scaledH,
                          }}
                          className="pp-editor-decoration-preview"
                          selected={isSelected}
                        />
                        <span className="pp-editor-decoration-badge">{decoration.id}</span>
                      </button>
                    );
                  })}

                  {duplicatePreviewDecorations.map((decoration) => {
                    const scaledX = (decoration.x / TILE) * EDITOR_TILE;
                    const scaledY = (decoration.y / TILE) * EDITOR_TILE;
                    const scaledW = (decoration.width / TILE) * EDITOR_TILE;
                    const scaledH = (decoration.height / TILE) * EDITOR_TILE;
                    return (
                      <div
                        key={decoration.id}
                        className="pp-editor-decoration-layer pp-editor-decoration-layer--ghost"
                        style={{
                          left: scaledX,
                          top: scaledY,
                          width: scaledW,
                          height: scaledH,
                        }}
                      >
                        <PixelProtocolDecoration
                          decoration={{
                            ...decoration,
                            x: 0,
                            y: 0,
                            width: scaledW,
                            height: scaledH,
                          }}
                          className="pp-editor-decoration-preview"
                        />
                      </div>
                    );
                  })}

                  {editorMode === "level" && (
                    <>
                      <button
                        type="button"
                        className={`pp-editor-spawn ${
                          selectedSpawn ? "is-selected" : ""
                        } ${dragState?.kind === "spawn" ? "is-dragging" : ""}`}
                        style={{
                          left: (displayedLevel.spawn.x / TILE) * EDITOR_TILE,
                          top: (displayedLevel.spawn.y / TILE) * EDITOR_TILE + editorYOffset,
                        }}
                        onPointerDown={startSpawnDrag}
                        onClick={() => setSelection({ kind: "spawn" })}
                      >
                        Spawn
                      </button>
                      <button
                        type="button"
                        className={`pp-editor-portal ${
                          selectedPortal ? "is-selected" : ""
                        } ${dragState?.kind === "portal" ? "is-dragging" : ""}`}
                        style={{
                          left: (displayedLevel.portal.x / TILE) * EDITOR_TILE,
                          top: (displayedLevel.portal.y / TILE) * EDITOR_TILE + editorYOffset,
                        }}
                        onPointerDown={startPortalDrag}
                        onClick={() => setSelection({ kind: "portal" })}
                      >
                        Exit
                      </button>

                      {renderPlatforms.map(({ platform, blocks, bounds }) => (
                    <button
                      key={platform.id}
                      type="button"
                      className={`pp-editor-platform-layer ${
                        platform.type === "grapplable" ? "pp-editor-platform-layer--grapplable" : ""
                      } ${
                        selection?.kind === "platform" && selection.id === platform.id ? "is-selected" : ""
                      } ${dragState?.kind === "platform" && dragState.id === platform.id ? "is-dragging" : ""}`}
                      onPointerDown={(event) => startPlatformDrag(event, platform)}
                      onClick={() => setSelection({ kind: "platform", id: platform.id })}
                      style={
                        bounds
                          ? {
                              left: (bounds.left / TILE) * EDITOR_TILE,
                              top: (bounds.top / TILE) * EDITOR_TILE + editorYOffset,
                              width: (bounds.width / TILE) * EDITOR_TILE,
                              height: (bounds.height / TILE) * EDITOR_TILE,
                              pointerEvents: editorMode === "level" ? "auto" : "none",
                            }
                          : undefined
                      }
                    >
                      {blocks.map((block, index) => (
                        <span
                          key={`${platform.id}-${index}`}
                          className={`pp-platform ${PLATFORM_CLASS[platform.type]} pp-editor-platform-block ${
                            platform.type === "grapplable" ? "pp-editor-platform-block--grapplable" : ""
                          } ${
                            validation.reachablePlatformIds.includes(platform.id) ? "is-reachable" : "is-unreachable"
                          }`}
                          style={{
                            left: ((block.x - (bounds?.left ?? 0)) / TILE) * EDITOR_TILE,
                            top: ((block.y - (bounds?.top ?? 0)) / TILE) * EDITOR_TILE,
                            width: EDITOR_TILE,
                            height: EDITOR_TILE,
                          }}
                        />
                      ))}
                      {platform.type === "grapplable" && (
                        <span className="pp-editor-grappleAnchor" aria-hidden="true" />
                      )}
                      <span className="pp-editor-platform-badge">{platform.id}</span>
                    </button>
                      ))}

                      {displayedLevel.checkpoints.map((checkpoint) => (
                    <button
                      key={checkpoint.id}
                      type="button"
                      className={`pp-editor-entity pp-editor-entity--checkpoint ${
                        selection?.kind === "checkpoint" && selection.id === checkpoint.id ? "is-selected" : ""
                      }`}
                      style={{
                        left: (checkpoint.x / TILE) * EDITOR_TILE,
                        top: (checkpoint.y / TILE) * EDITOR_TILE + editorYOffset,
                      }}
                      onPointerDown={(event) => startCheckpointDrag(event, checkpoint)}
                      onClick={() => setSelection({ kind: "checkpoint", id: checkpoint.id })}
                    >
                      {checkpoint.id}
                    </button>
                      ))}

                      {displayedLevel.orbs.map((orb) => (
                    <button
                      key={orb.id}
                      type="button"
                      className={`pp-editor-entity pp-editor-entity--orb ${
                        selection?.kind === "orb" && selection.id === orb.id ? "is-selected" : ""
                      }`}
                      style={{
                        left: (orb.x / TILE) * EDITOR_TILE,
                        top: (orb.y / TILE) * EDITOR_TILE + editorYOffset,
                      }}
                      onPointerDown={(event) => startOrbDrag(event, orb)}
                      onClick={() => setSelection({ kind: "orb", id: orb.id })}
                    >
                      {orb.id}
                    </button>
                      ))}

                      {displayedLevel.enemies.map((enemy) => (
                    <button
                      key={enemy.id}
                      type="button"
                      className={`pp-editor-entity pp-editor-entity--enemy ${
                        selection?.kind === "enemy" && selection.id === enemy.id ? "is-selected" : ""
                      }`}
                      style={{
                        left: (enemy.x / TILE) * EDITOR_TILE,
                        top: (enemy.y / TILE) * EDITOR_TILE + editorYOffset,
                      }}
                      onPointerDown={(event) => startEnemyDrag(event, enemy)}
                      onClick={() => setSelection({ kind: "enemy", id: enemy.id })}
                    >
                      <span>{enemy.id}</span>
                      <span className="pp-editor-entity-range" style={{ width: ((enemy.maxX - enemy.minX) / TILE) * EDITOR_TILE }} />
                    </button>
                      ))}
                    </>
                  )}
                </div>
              </div>

              <div className="pp-editor-center-actions">
                <button
                  type="button"
                  className="pp-editor-icon-btn pp-editor-icon-btn--info"
                  aria-label="Tout ouvrir la colonne centrale"
                  title="Tout ouvrir la colonne centrale"
                  onClick={() => setAllCenterPanelSections(true)}
                >
                  <i className="fa-solid fa-angles-down" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  className="pp-editor-icon-btn pp-editor-icon-btn--info"
                  aria-label="Tout fermer la colonne centrale"
                  title="Tout fermer la colonne centrale"
                  onClick={() => setAllCenterPanelSections(false)}
                >
                  <i className="fa-solid fa-angles-up" aria-hidden="true" />
                </button>
              </div>

              <div className="pp-editor-preview">
                <button
                  type="button"
                  className="pp-editor-panel-toggle"
                  onClick={() => toggleCenterPanelSection("layoutState")}
                >
                  <span><i className="fa-solid fa-chart-simple" aria-hidden="true" /> Etat du layout</span>
                  <i
                    className={`fa-solid ${
                      centerPanelSections.layoutState ? "fa-chevron-up" : "fa-chevron-down"
                    }`}
                    aria-hidden="true"
                  />
                </button>
                {centerPanelSections.layoutState && (
                  <div className="pp-editor-preview-grid">
                    <div>Platforms: {draftLevel.platforms.length}</div>
                    <div>Reachable: {validation.reachablePlatformIds.length}</div>
                    <div>Checkpoints: {draftLevel.checkpoints.length}</div>
                    <div>Orbs: {draftLevel.orbs.length}</div>
                    <div>Ennemis: {draftLevel.enemies.length}</div>
                    <div>Decors: {(draftLevel.decorations ?? []).length}</div>
                    <div>Liens: {validation.links.length}</div>
                  </div>
                )}
              </div>
              {editorMode === "level" && (
                <div className="pp-editor-panel pp-editor-subpanel">
                  <button
                    type="button"
                    className="pp-editor-panel-toggle"
                    onClick={() => toggleCenterPanelSection("validation")}
                  >
                    <span><i className="fa-solid fa-shield-halved" aria-hidden="true" /> Validation</span>
                    <i
                      className={`fa-solid ${
                        centerPanelSections.validation ? "fa-chevron-up" : "fa-chevron-down"
                      }`}
                      aria-hidden="true"
                    />
                  </button>
                {centerPanelSections.validation &&
                    (validation.isValid ? (
                      <>
                        <div className="pp-editor-status success">
                          Layout valide: toutes les plateformes sont atteignables.
                        </div>
                        {!isAdmin && !isWorldEditor && (
                          <div className={`pp-editor-status ${currentCompletion && canPublishCommunityLevel ? "success" : "warning"}`}>
                            {currentCompletion && canPublishCommunityLevel
                              ? "Publication joueur debloquee: cette version du niveau a deja ete terminee."
                              : currentCompletion
                                ? "Le niveau a ete fini, mais le layout a change depuis. Rejoue-le avant publication."
                                : "Pour publier, tu dois encore finir ce niveau via Jouer ce niveau."}
                          </div>
                        )}
                        {!isAdmin && !isWorldEditor && ownPublishedLevel && (
                          <div className="pp-editor-status success">
                            Niveau deja publie dans la galerie joueurs. Likes actuels: {ownPublishedLevel.likeCount}.
                          </div>
                        )}
                        {validationWarnings.length > 0 && (
                          <div className="pp-editor-issues">
                            {validationWarnings.map((issue, index) => (
                              <div
                                key={`${issue.platformId ?? "warning"}-${index}`}
                                className="pp-editor-issue"
                              >
                                {issue.message}
                              </div>
                            ))}
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="pp-editor-issues">
                        {validationErrors.map((issue, index) => (
                          <button
                            key={`${issue.platformId ?? "global"}-${index}`}
                            type="button"
                            className="pp-editor-issue"
                            onClick={() => {
                              if (issue.platformId) setSelection({ kind: "platform", id: issue.platformId });
                            }}
                          >
                            {issue.message}
                          </button>
                        ))}
                      </div>
                    ))}
                </div>
              )}

              <div className="pp-editor-panel pp-editor-subpanel">
                <button
                  type="button"
                  className="pp-editor-panel-toggle"
                  onClick={() => toggleCenterPanelSection("elements")}
                >
                  <span><i className="fa-solid fa-list" aria-hidden="true" /> Elements du niveau</span>
                  <i
                    className={`fa-solid ${
                      centerPanelSections.elements ? "fa-chevron-up" : "fa-chevron-down"
                    }`}
                    aria-hidden="true"
                  />
                </button>
                {centerPanelSections.elements && (
                  <div className="pp-editor-platform-list">
                    {editorMode === "level" && draftLevel.platforms.map((platform) => (
                      <button
                        key={platform.id}
                        type="button"
                        className={`pp-editor-platform-row ${
                          selection?.kind === "platform" && selection.id === platform.id ? "is-active" : ""
                        }`}
                        onClick={() => setSelection({ kind: "platform", id: platform.id })}
                      >
                        <span>{platform.id}</span>
                        <span className="pp-editor-inline-tags">
                          <span className="pp-editor-mini-tag pp-editor-mini-tag--shape">{platform.tetromino}</span>
                          <span className={`pp-editor-mini-tag pp-editor-mini-tag--${platform.type}`}>
                            {platform.type}
                          </span>
                        </span>
                        <span>({platform.x}, {platform.y})</span>
                      </button>
                    ))}
                    {editorMode === "level" && draftLevel.checkpoints.map((checkpoint) => (
                      <button
                        key={checkpoint.id}
                        type="button"
                        className={`pp-editor-platform-row ${
                          selection?.kind === "checkpoint" && selection.id === checkpoint.id ? "is-active" : ""
                        }`}
                        onClick={() => setSelection({ kind: "checkpoint", id: checkpoint.id })}
                      >
                        <span>{checkpoint.id}</span>
                        <span className="pp-editor-inline-tags">
                          <span className="pp-editor-mini-tag pp-editor-mini-tag--checkpoint">checkpoint</span>
                        </span>
                        <span>({checkpoint.x}, {checkpoint.y})</span>
                      </button>
                    ))}
                    {editorMode === "level" && draftLevel.orbs.map((orb) => (
                      <button
                        key={orb.id}
                        type="button"
                        className={`pp-editor-platform-row ${
                          selection?.kind === "orb" && selection.id === orb.id ? "is-active" : ""
                        }`}
                        onClick={() => setSelection({ kind: "orb", id: orb.id })}
                      >
                        <span>{orb.id}</span>
                        <span className="pp-editor-inline-tags">
                          <span className="pp-editor-mini-tag pp-editor-mini-tag--orb">orb</span>
                          {orb.affinity && orb.affinity !== "standard" && (
                            <span className={`pp-editor-mini-tag pp-editor-mini-tag--affinity-${orb.affinity}`}>
                              {orb.affinity}
                            </span>
                          )}
                          {orb.grantsSkill && (
                            <span className="pp-editor-mini-tag pp-editor-mini-tag--skill">
                              {orb.grantsSkill}
                            </span>
                          )}
                        </span>
                        <span>({orb.x}, {orb.y})</span>
                      </button>
                    ))}
                    {editorMode === "level" && draftLevel.enemies.map((enemy) => (
                      <button
                        key={enemy.id}
                        type="button"
                        className={`pp-editor-platform-row ${
                          selection?.kind === "enemy" && selection.id === enemy.id ? "is-active" : ""
                        }`}
                        onClick={() => setSelection({ kind: "enemy", id: enemy.id })}
                      >
                        <span>{enemy.id}</span>
                        <span className="pp-editor-inline-tags">
                          <span className={`pp-editor-mini-tag pp-editor-mini-tag--enemy-${enemy.kind}`}>
                            {enemy.kind}
                          </span>
                        </span>
                        <span>({enemy.x}, {enemy.y})</span>
                      </button>
                    ))}
                    {editorMode === "world" && (draftLevel.decorations ?? []).map((decoration) => (
                      <button
                        key={decoration.id}
                        type="button"
                        className={`pp-editor-platform-row ${
                          selection?.kind === "decoration" && selection.id === decoration.id ? "is-active" : ""
                        }`}
                        onClick={() => setSelection({ kind: "decoration", id: decoration.id })}
                      >
                        <span>{decoration.id}</span>
                        <span className="pp-editor-inline-tags">
                          <span className="pp-editor-mini-tag pp-editor-mini-tag--decoration">
                            {decoration.type}
                          </span>
                          <span className="pp-editor-mini-tag pp-editor-mini-tag--layer">
                            {decoration.layer ?? "mid"}
                          </span>
                        </span>
                        <span>({decoration.x}, {decoration.y})</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {editorMode === "level" && selectedWorldTemplate && (
                <div className="pp-editor-panel pp-editor-subpanel">
                  <button
                    type="button"
                    className="pp-editor-panel-toggle"
                    onClick={() => toggleCenterPanelSection("linkedWorld")}
                  >
                    <span><i className="fa-solid fa-globe" aria-hidden="true" /> Monde lie</span>
                    <i
                      className={`fa-solid ${
                        centerPanelSections.linkedWorld ? "fa-chevron-up" : "fa-chevron-down"
                      }`}
                      aria-hidden="true"
                    />
                  </button>
                  {centerPanelSections.linkedWorld && (
                    <div className="pp-editor-platform-list">
                      <div className="pp-editor-platform-row is-active">
                        <span>{selectedWorldTemplate.name}</span>
                        <span className="pp-editor-inline-tags">
                          <span className="pp-editor-mini-tag pp-editor-mini-tag--layer">
                            {selectedWorldTemplate.id}
                          </span>
                          <span className="pp-editor-mini-tag pp-editor-mini-tag--decoration">
                            {selectedWorldTemplate.decorations.length} decors
                          </span>
                        </span>
                        <span>
                          {Math.round(selectedWorldTemplate.worldWidth / TILE)}x
                          {Math.round((selectedWorldTemplate.worldHeight ?? WORLD_H) / TILE)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <aside className="pp-editor-inspector">
              <div className="pp-editor-panel pp-editor-subpanel">
                <div className="pp-editor-inspector-head">
                  <h2>Selection</h2>
                  {(selectedPlatform ||
                    selectedCheckpoint ||
                    selectedOrb ||
                    selectedEnemy ||
                    selectedDecoration) && (
                    <div className="pp-editor-inspector-actions">
                      <button
                        type="button"
                        className="pp-editor-icon-btn pp-editor-icon-btn--info"
                        aria-label="Tout ouvrir"
                        title="Tout ouvrir"
                        onClick={() => setAllInspectorSections(true)}
                      >
                        <i className="fa-solid fa-angles-down" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        className="pp-editor-icon-btn pp-editor-icon-btn--info"
                        aria-label="Tout fermer"
                        title="Tout fermer"
                        onClick={() => setAllInspectorSections(false)}
                      >
                        <i className="fa-solid fa-angles-up" aria-hidden="true" />
                      </button>
                    </div>
                  )}
                </div>
                {selectedPlatform && (
                  <>
                    <div className="pp-editor-code">{selectedPlatform.id}</div>
                    <div className="pp-editor-inspector-groups">
                      <section className="pp-editor-inspector-group">
                        <button
                          type="button"
                          className="pp-editor-inspector-group__toggle"
                          onClick={() => togglePlatformInspectorSection("shape")}
                        >
                          <span><i className="fa-solid fa-cubes" aria-hidden="true" /> Forme & type</span>
                          <i className={`fa-solid ${platformInspectorSections.shape ? "fa-chevron-up" : "fa-chevron-down"}`} aria-hidden="true" />
                        </button>
                        {platformInspectorSections.shape && (
                          <div className="pp-editor-inspector-group__body">
                            <div className="pp-editor-chip-grid pp-editor-chip-grid--tetrominos">
                              {TETROMINOS.map((tetromino) => (
                                <button
                                  key={tetromino}
                                  type="button"
                                  className={selectedPlatform.tetromino === tetromino ? "is-active" : ""}
                                  onClick={() => handleSelectedPlatformChange((platform) => ({ ...platform, tetromino }))}
                                >
                                  {tetromino}
                                </button>
                              ))}
                            </div>
                            <div className="pp-editor-chip-grid pp-editor-chip-grid--platform-types">
                              {PLATFORM_TYPES.map((type) => (
                                <button
                                  key={type}
                                  type="button"
                                  className={`pp-editor-chip-grid__button ${
                                    selectedPlatform.type === type ? "is-active" : ""
                                  }`}
                                  onClick={() =>
                                    handleSelectedPlatformChange((platform) => ({
                                      ...platform,
                                      type,
                                      rotateEveryMs:
                                        type === "rotating"
                                          ? platform.rotateEveryMs ?? DEFAULT_ROTATE_EVERY_MS
                                          : platform.rotateEveryMs,
                                      moveAxis:
                                        type === "moving"
                                          ? platform.moveAxis ?? MOVING_DEFAULT_AXIS
                                          : platform.moveAxis,
                                      movePattern:
                                        type === "moving"
                                          ? platform.movePattern ?? MOVING_DEFAULT_PATTERN
                                          : platform.movePattern,
                                      moveRangeTiles:
                                        type === "moving"
                                          ? platform.moveRangeTiles ?? MOVING_DEFAULT_RANGE_TILES
                                          : platform.moveRangeTiles,
                                      moveSpeed:
                                        type === "moving"
                                          ? platform.moveSpeed ?? MOVING_DEFAULT_SPEED
                                          : platform.moveSpeed,
                                    }))
                                  }
                                >
                                  {type}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </section>

                      <section className="pp-editor-inspector-group">
                        <button
                          type="button"
                          className="pp-editor-inspector-group__toggle"
                          onClick={() => togglePlatformInspectorSection("layout")}
                        >
                          <span><i className="fa-solid fa-up-down-left-right" aria-hidden="true" /> Position & rotation</span>
                          <i className={`fa-solid ${platformInspectorSections.layout ? "fa-chevron-up" : "fa-chevron-down"}`} aria-hidden="true" />
                        </button>
                        {platformInspectorSections.layout && (
                          <div className="pp-editor-inspector-group__body">
                            <div className="pp-editor-chip-grid pp-editor-chip-grid--small">
                              {[0, 1, 2, 3].map((rotation) => (
                                <button
                                  key={rotation}
                                  type="button"
                                  className={(selectedPlatform.rotation ?? 0) === rotation ? "is-active" : ""}
                                  onClick={() =>
                                    handleSelectedPlatformChange((platform) => ({
                                      ...platform,
                                      rotation: rotation as 0 | 1 | 2 | 3,
                                    }))
                                  }
                                >
                                  Rot {rotation}
                                </button>
                              ))}
                            </div>
                            <div className="pp-editor-inline-fields">
                              <label>
                                <span>X</span>
                                <input
                                  type="number"
                                  value={selectedPlatform.x}
                                  onChange={(event) =>
                                    handleSelectedPlatformChange((platform) => ({ ...platform, x: Number(event.target.value) || 0 }))
                                  }
                                />
                              </label>
                              <label>
                                <span>Y</span>
                                <input
                                  type="number"
                                  value={selectedPlatform.y}
                                  onChange={(event) =>
                                    handleSelectedPlatformChange((platform) => ({ ...platform, y: Number(event.target.value) || 0 }))
                                  }
                                />
                              </label>
                            </div>
                            {selectedPlatform.type === "rotating" && (
                              <div className="pp-editor-inline-fields">
                                <label>
                                  <span>Rotation ms</span>
                                  <input
                                    type="number"
                                    min={100}
                                    step={10}
                                    value={selectedPlatform.rotateEveryMs ?? DEFAULT_ROTATE_EVERY_MS}
                                    onChange={(event) =>
                                      handleSelectedPlatformChange((platform) => ({
                                        ...platform,
                                        rotateEveryMs:
                                          Math.max(100, Number(event.target.value) || DEFAULT_ROTATE_EVERY_MS),
                                      }))
                                    }
                                  />
                                </label>
                              </div>
                            )}
                          </div>
                        )}
                      </section>

                      <section className="pp-editor-inspector-group">
                        <button
                          type="button"
                          className="pp-editor-inspector-group__toggle"
                          onClick={() => togglePlatformInspectorSection("behavior")}
                        >
                          <span><i className="fa-solid fa-sliders" aria-hidden="true" /> Comportement</span>
                          <i className={`fa-solid ${platformInspectorSections.behavior ? "fa-chevron-up" : "fa-chevron-down"}`} aria-hidden="true" />
                        </button>
                        {platformInspectorSections.behavior && (
                          <div className="pp-editor-inspector-group__body">
                            {selectedPlatform.type === "moving" ? (
                              <>
                                <div className="pp-editor-inline-fields">
                                  <label>
                                    <span>Axe</span>
                                    <select
                                      value={selectedPlatform.moveAxis ?? MOVING_DEFAULT_AXIS}
                                      onChange={(event) =>
                                        handleSelectedPlatformChange((platform) => ({
                                          ...platform,
                                          moveAxis: event.target.value as (typeof MOVING_AXES)[number],
                                        }))
                                      }
                                    >
                                      {MOVING_AXES.map((axis) => (
                                        <option key={axis} value={axis}>
                                          {axis}
                                        </option>
                                      ))}
                                    </select>
                                  </label>
                                  <label>
                                    <span>Pattern</span>
                                    <select
                                      value={selectedPlatform.movePattern ?? MOVING_DEFAULT_PATTERN}
                                      onChange={(event) =>
                                        handleSelectedPlatformChange((platform) => ({
                                          ...platform,
                                          movePattern: event.target.value as (typeof MOVING_PATTERNS)[number],
                                        }))
                                      }
                                    >
                                      {MOVING_PATTERNS.map((pattern) => (
                                        <option key={pattern} value={pattern}>
                                          {pattern}
                                        </option>
                                      ))}
                                    </select>
                                  </label>
                                </div>
                                <div className="pp-editor-inline-fields">
                                  <label>
                                    <span>Portee (tuiles)</span>
                                    <input
                                      type="number"
                                      min={1}
                                      max={24}
                                      value={selectedPlatform.moveRangeTiles ?? MOVING_DEFAULT_RANGE_TILES}
                                      onChange={(event) =>
                                        handleSelectedPlatformChange((platform) => ({
                                          ...platform,
                                          moveRangeTiles: Math.max(1, Number(event.target.value) || MOVING_DEFAULT_RANGE_TILES),
                                        }))
                                      }
                                    />
                                  </label>
                                  <label>
                                    <span>Vitesse (px/s)</span>
                                    <input
                                      type="number"
                                      min={20}
                                      max={420}
                                      value={selectedPlatform.moveSpeed ?? MOVING_DEFAULT_SPEED}
                                      onChange={(event) =>
                                        handleSelectedPlatformChange((platform) => ({
                                          ...platform,
                                          moveSpeed: Math.max(20, Number(event.target.value) || MOVING_DEFAULT_SPEED),
                                        }))
                                      }
                                    />
                                  </label>
                                </div>
                              </>
                            ) : (
                              <p className="pp-editor-muted">
                                Aucun parametre avance necessaire pour ce type de plateforme.
                              </p>
                            )}
                          </div>
                        )}
                      </section>
                    </div>
                  </>
                )}

                {selectedSpawn && (
                  <>
                    <div className="pp-editor-code">spawn</div>
                    <p className="pp-editor-muted">
                      Point de depart du joueur. Deplace-le sur la grille ou via les champs globaux.
                    </p>
                  </>
                )}

                {selectedPortal && (
                  <>
                    <div className="pp-editor-code">portal</div>
                    <p className="pp-editor-muted">
                      Portail de fin de niveau. Deplace-le sur la grille ou via les champs globaux.
                    </p>
                  </>
                )}

                {selectedCheckpoint && (
                  <>
                    <div className="pp-editor-code">{selectedCheckpoint.id}</div>
                    <div className="pp-editor-inspector-groups">
                      <section className="pp-editor-inspector-group">
                        <button
                          type="button"
                          className="pp-editor-inspector-group__toggle"
                          onClick={() => toggleCheckpointInspectorSection("position")}
                        >
                          <span><i className="fa-solid fa-location-dot" aria-hidden="true" /> Position</span>
                          <i className={`fa-solid ${checkpointInspectorSections.position ? "fa-chevron-up" : "fa-chevron-down"}`} aria-hidden="true" />
                        </button>
                        {checkpointInspectorSections.position && (
                          <div className="pp-editor-inspector-group__body">
                            <div className="pp-editor-inline-fields">
                              <label>
                                <span>X</span>
                                <input
                                  type="number"
                                  value={selectedCheckpoint.x}
                                  onChange={(event) =>
                                    handleSelectedCheckpointChange((checkpoint) => ({
                                      ...checkpoint,
                                      x: Number(event.target.value) || 0,
                                    }))
                                  }
                                />
                              </label>
                              <label>
                                <span>Y</span>
                                <input
                                  type="number"
                                  value={selectedCheckpoint.y}
                                  onChange={(event) =>
                                    handleSelectedCheckpointChange((checkpoint) => ({
                                      ...checkpoint,
                                      y: Number(event.target.value) || 0,
                                    }))
                                  }
                                />
                              </label>
                            </div>
                          </div>
                        )}
                      </section>

                      <section className="pp-editor-inspector-group">
                        <button
                          type="button"
                          className="pp-editor-inspector-group__toggle"
                          onClick={() => toggleCheckpointInspectorSection("respawn")}
                        >
                          <span><i className="fa-solid fa-flag-checkered" aria-hidden="true" /> Respawn</span>
                          <i className={`fa-solid ${checkpointInspectorSections.respawn ? "fa-chevron-up" : "fa-chevron-down"}`} aria-hidden="true" />
                        </button>
                        {checkpointInspectorSections.respawn && (
                          <div className="pp-editor-inspector-group__body">
                            <div className="pp-editor-inline-fields">
                              <label>
                                <span>Spawn X</span>
                                <input
                                  type="number"
                                  value={selectedCheckpoint.spawnX}
                                  onChange={(event) =>
                                    handleSelectedCheckpointChange((checkpoint) => ({
                                      ...checkpoint,
                                      spawnX: Number(event.target.value) || 0,
                                    }))
                                  }
                                />
                              </label>
                              <label>
                                <span>Spawn Y</span>
                                <input
                                  type="number"
                                  value={selectedCheckpoint.spawnY}
                                  onChange={(event) =>
                                    handleSelectedCheckpointChange((checkpoint) => ({
                                      ...checkpoint,
                                      spawnY: Number(event.target.value) || 0,
                                    }))
                                  }
                                />
                              </label>
                            </div>
                          </div>
                        )}
                      </section>
                    </div>
                  </>
                )}

                {selectedOrb && (
                  <>
                    <div className="pp-editor-code">{selectedOrb.id}</div>
                    <div className="pp-editor-inspector-groups">
                      <section className="pp-editor-inspector-group">
                        <button
                          type="button"
                          className="pp-editor-inspector-group__toggle"
                          onClick={() => toggleOrbInspectorSection("position")}
                        >
                          <span><i className="fa-solid fa-location-dot" aria-hidden="true" /> Position</span>
                          <i className={`fa-solid ${orbInspectorSections.position ? "fa-chevron-up" : "fa-chevron-down"}`} aria-hidden="true" />
                        </button>
                        {orbInspectorSections.position && (
                          <div className="pp-editor-inspector-group__body">
                            <div className="pp-editor-inline-fields">
                              <label>
                                <span>X</span>
                                <input
                                  type="number"
                                  value={selectedOrb.x}
                                  onChange={(event) =>
                                    handleSelectedOrbChange((orb) => ({
                                      ...orb,
                                      x: Number(event.target.value) || 0,
                                    }))
                                  }
                                />
                              </label>
                              <label>
                                <span>Y</span>
                                <input
                                  type="number"
                                  value={selectedOrb.y}
                                  onChange={(event) =>
                                    handleSelectedOrbChange((orb) => ({
                                      ...orb,
                                      y: Number(event.target.value) || 0,
                                    }))
                                  }
                                />
                              </label>
                            </div>
                          </div>
                        )}
                      </section>

                      <section className="pp-editor-inspector-group">
                        <button
                          type="button"
                          className="pp-editor-inspector-group__toggle"
                          onClick={() => toggleOrbInspectorSection("ability")}
                        >
                          <span><i className="fa-solid fa-circle-nodes" aria-hidden="true" /> Affinite & skill</span>
                          <i className={`fa-solid ${orbInspectorSections.ability ? "fa-chevron-up" : "fa-chevron-down"}`} aria-hidden="true" />
                        </button>
                        {orbInspectorSections.ability && (
                          <div className="pp-editor-inspector-group__body">
                            <div className="pp-editor-inline-fields">
                              <label>
                                <span>Affinite</span>
                                <select
                                  value={selectedOrb.affinity ?? "standard"}
                                  onChange={(event) =>
                                    handleSelectedOrbChange((orb) => ({
                                      ...orb,
                                      affinity: event.target.value as DataOrbAffinity,
                                      grantsSkill:
                                        event.target.value === "standard"
                                          ? null
                                          : orb.grantsSkill ?? "OVERJUMP",
                                    }))
                                  }
                                >
                                  {ORB_AFFINITIES.map((affinity) => (
                                    <option key={affinity} value={affinity}>
                                      {affinity}
                                    </option>
                                  ))}
                                </select>
                              </label>
                              <label>
                                <span>Skill</span>
                                <select
                                  value={selectedOrb.grantsSkill ?? ""}
                                  onChange={(event) =>
                                    handleSelectedOrbChange((orb) => ({
                                      ...orb,
                                      grantsSkill: event.target.value
                                        ? (event.target.value as PixelSkill)
                                        : null,
                                    }))
                                  }
                                >
                                  <option value="">aucune</option>
                                  {PIXEL_SKILLS.map((skill) => (
                                    <option key={skill} value={skill}>
                                      {skill}
                                    </option>
                                  ))}
                                </select>
                              </label>
                            </div>
                          </div>
                        )}
                      </section>
                    </div>
                  </>
                )}

                {selectedEnemy && (
                  <>
                    <div className="pp-editor-code">{selectedEnemy.id}</div>
                    <div className="pp-editor-inspector-groups">
                      <section className="pp-editor-inspector-group">
                        <button
                          type="button"
                          className="pp-editor-inspector-group__toggle"
                          onClick={() => toggleEnemyInspectorSection("type")}
                        >
                          <span><i className="fa-solid fa-robot" aria-hidden="true" /> Type</span>
                          <i className={`fa-solid ${enemyInspectorSections.type ? "fa-chevron-up" : "fa-chevron-down"}`} aria-hidden="true" />
                        </button>
                        {enemyInspectorSections.type && (
                          <div className="pp-editor-inspector-group__body">
                            <div className="pp-editor-chip-grid pp-editor-chip-grid--small">
                              {(["rookie", "pulse", "apex"] as const).map((kind) => (
                                <button
                                  key={kind}
                                  type="button"
                                  className={selectedEnemy.kind === kind ? "is-active" : ""}
                                  onClick={() =>
                                    handleSelectedEnemyChange((enemy) => ({ ...enemy, kind }))
                                  }
                                >
                                  {kind}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </section>

                      <section className="pp-editor-inspector-group">
                        <button
                          type="button"
                          className="pp-editor-inspector-group__toggle"
                          onClick={() => toggleEnemyInspectorSection("position")}
                        >
                          <span><i className="fa-solid fa-location-dot" aria-hidden="true" /> Position</span>
                          <i className={`fa-solid ${enemyInspectorSections.position ? "fa-chevron-up" : "fa-chevron-down"}`} aria-hidden="true" />
                        </button>
                        {enemyInspectorSections.position && (
                          <div className="pp-editor-inspector-group__body">
                            <div className="pp-editor-inline-fields">
                              <label>
                                <span>X</span>
                                <input
                                  type="number"
                                  value={selectedEnemy.x}
                                  onChange={(event) =>
                                    handleSelectedEnemyChange((enemy) => ({
                                      ...enemy,
                                      x: Number(event.target.value) || 0,
                                    }))
                                  }
                                />
                              </label>
                              <label>
                                <span>Y</span>
                                <input
                                  type="number"
                                  value={selectedEnemy.y}
                                  onChange={(event) =>
                                    handleSelectedEnemyChange((enemy) => ({
                                      ...enemy,
                                      y: Number(event.target.value) || 0,
                                    }))
                                  }
                                />
                              </label>
                            </div>
                          </div>
                        )}
                      </section>

                      <section className="pp-editor-inspector-group">
                        <button
                          type="button"
                          className="pp-editor-inspector-group__toggle"
                          onClick={() => toggleEnemyInspectorSection("patrol")}
                        >
                          <span><i className="fa-solid fa-ruler-horizontal" aria-hidden="true" /> Patrouille</span>
                          <i className={`fa-solid ${enemyInspectorSections.patrol ? "fa-chevron-up" : "fa-chevron-down"}`} aria-hidden="true" />
                        </button>
                        {enemyInspectorSections.patrol && (
                          <div className="pp-editor-inspector-group__body">
                            <div className="pp-editor-inline-fields">
                              <label>
                                <span>Min X</span>
                                <input
                                  type="number"
                                  value={selectedEnemy.minX}
                                  onChange={(event) =>
                                    handleSelectedEnemyChange((enemy) => ({
                                      ...enemy,
                                      minX: Number(event.target.value) || 0,
                                    }))
                                  }
                                />
                              </label>
                              <label>
                                <span>Max X</span>
                                <input
                                  type="number"
                                  value={selectedEnemy.maxX}
                                  onChange={(event) =>
                                    handleSelectedEnemyChange((enemy) => ({
                                      ...enemy,
                                      maxX: Number(event.target.value) || 0,
                                    }))
                                  }
                                />
                              </label>
                            </div>
                          </div>
                        )}
                      </section>
                    </div>
                  </>
                )}

                {editorMode === "world" && selectedDecoration && (
                  <>
                    <div className="pp-editor-code">{selectedDecoration.id}</div>
                    <div className="pp-editor-decoration-preview-card">
                      <PixelProtocolDecoration
                        decoration={{
                          ...selectedDecoration,
                          x: 0,
                          y: 0,
                          width: 96,
                          height: 96,
                        }}
                      />
                    </div>
                    <div className="pp-editor-inspector-groups">
                      <section className="pp-editor-inspector-group">
                        <button
                          type="button"
                          className="pp-editor-inspector-group__toggle"
                          onClick={() => toggleDecorationInspectorSection("source")}
                        >
                          <span><i className="fa-solid fa-shapes" aria-hidden="true" /> Source & type</span>
                          <i className={`fa-solid ${decorationInspectorSections.source ? "fa-chevron-up" : "fa-chevron-down"}`} aria-hidden="true" />
                        </button>
                        {decorationInspectorSections.source && (
                          <div className="pp-editor-inspector-group__body">
                            <div className="pp-editor-inline-fields">
                              <label>
                                <span>Source</span>
                                <div className="pp-editor-chip-grid pp-editor-chip-grid--small">
                                  {DECORATION_SOURCES.map((source) => (
                                    <button
                                      key={source}
                                      type="button"
                                      className={`pp-editor-chip-grid__button ${
                                        decorationSourceFilter === source ? "is-active" : ""
                                      }`}
                                      onClick={() => setDecorationSourceFilter(source)}
                                    >
                                      {source}
                                    </button>
                                  ))}
                                </div>
                              </label>
                            </div>
                            <div className="pp-editor-inline-fields">
                              <label>
                                <span>Type</span>
                                <select
                                  value={selectedDecoration.type}
                                  onChange={(event) =>
                                    handleSelectedDecorationChange((decoration) => {
                                      const nextType = event.target.value as DecorationType;
                                      const preset = getDecorationPreset(nextType);
                                      return {
                                        ...decoration,
                                        type: nextType,
                                        width: decoration.width || preset.defaultWidth,
                                        height: decoration.height || preset.defaultHeight,
                                        color: decoration.color ?? preset.color,
                                        colorSecondary: decoration.colorSecondary ?? preset.colorSecondary,
                                      };
                                    })
                                  }
                                >
                                  {DECORATION_CATEGORY_ORDER.map((category) => (
                                    <optgroup key={category} label={category}>
                                      {filteredDecorationPresets.filter((preset) => preset.category === category).map((preset) => (
                                        <option key={preset.type} value={preset.type}>
                                          {preset.label}
                                        </option>
                                      ))}
                                    </optgroup>
                                  ))}
                                </select>
                              </label>
                              <label>
                                <span>Layer</span>
                                <select
                                  value={selectedDecoration.layer ?? "mid"}
                                  onChange={(event) =>
                                    handleSelectedDecorationChange((decoration) => ({
                                      ...decoration,
                                      layer: event.target.value as DecorationLayer,
                                    }))
                                  }
                                >
                                  {DECORATION_LAYERS.map((layer) => (
                                    <option key={layer} value={layer}>
                                      {layer}
                                    </option>
                                  ))}
                                </select>
                              </label>
                            </div>
                          </div>
                        )}
                      </section>

                      <section className="pp-editor-inspector-group">
                        <button
                          type="button"
                          className="pp-editor-inspector-group__toggle"
                          onClick={() => toggleDecorationInspectorSection("transform")}
                        >
                          <span><i className="fa-solid fa-up-down-left-right" aria-hidden="true" /> Transform</span>
                          <i className={`fa-solid ${decorationInspectorSections.transform ? "fa-chevron-up" : "fa-chevron-down"}`} aria-hidden="true" />
                        </button>
                        {decorationInspectorSections.transform && (
                          <div className="pp-editor-inspector-group__body">
                            <div className="pp-editor-inline-fields">
                              <label>
                                <span>X</span>
                                <input
                                  type="number"
                                  value={selectedDecoration.x}
                                  onChange={(event) =>
                                    handleSelectedDecorationChange((decoration) => ({
                                      ...decoration,
                                      x: Number(event.target.value) || 0,
                                    }))
                                  }
                                />
                              </label>
                              <label>
                                <span>Y</span>
                                <input
                                  type="number"
                                  value={selectedDecoration.y}
                                  onChange={(event) =>
                                    handleSelectedDecorationChange((decoration) => ({
                                      ...decoration,
                                      y: Number(event.target.value) || 0,
                                    }))
                                  }
                                />
                              </label>
                            </div>
                            <div className="pp-editor-inline-fields">
                              <label>
                                <span>Largeur</span>
                                <input
                                  type="number"
                                  min={4}
                                  value={selectedDecoration.width}
                                  onChange={(event) =>
                                    handleSelectedDecorationChange((decoration) => ({
                                      ...decoration,
                                      width: Math.max(4, Number(event.target.value) || 4),
                                    }))
                                  }
                                />
                              </label>
                              <label>
                                <span>Hauteur</span>
                                <input
                                  type="number"
                                  min={4}
                                  value={selectedDecoration.height}
                                  onChange={(event) =>
                                    handleSelectedDecorationChange((decoration) => ({
                                      ...decoration,
                                      height: Math.max(4, Number(event.target.value) || 4),
                                    }))
                                  }
                                />
                              </label>
                            </div>
                            <div className="pp-editor-inline-fields">
                              <label>
                                <span>Rotation</span>
                                <input
                                  type="number"
                                  min={-360}
                                  max={360}
                                  value={selectedDecoration.rotation ?? 0}
                                  onChange={(event) =>
                                    handleSelectedDecorationChange((decoration) => ({
                                      ...decoration,
                                      rotation: Number(event.target.value) || 0,
                                    }))
                                  }
                                />
                              </label>
                              <label>
                                <span>Opacite</span>
                                <input
                                  type="number"
                                  min={0}
                                  max={1}
                                  step={0.05}
                                  value={selectedDecoration.opacity ?? 0.9}
                                  onChange={(event) =>
                                    handleSelectedDecorationChange((decoration) => ({
                                      ...decoration,
                                      opacity: Math.min(1, Math.max(0, Number(event.target.value) || 0)),
                                    }))
                                  }
                                />
                              </label>
                            </div>
                          </div>
                        )}
                      </section>

                      <section className="pp-editor-inspector-group">
                        <button
                          type="button"
                          className="pp-editor-inspector-group__toggle"
                          onClick={() => toggleDecorationInspectorSection("style")}
                        >
                          <span><i className="fa-solid fa-palette" aria-hidden="true" /> Couleurs & style</span>
                          <i className={`fa-solid ${decorationInspectorSections.style ? "fa-chevron-up" : "fa-chevron-down"}`} aria-hidden="true" />
                        </button>
                        {decorationInspectorSections.style && (
                          <div className="pp-editor-inspector-group__body">
                            {selectedDecorationUsesEmbeddedArtwork && (
                              <p className="pp-editor-muted">
                                Asset integre: les couleurs proviennent directement du fichier source.
                              </p>
                            )}
                            <div className="pp-editor-inline-fields">
                              <label>
                                <span>Couleur</span>
                                <input
                                  type="color"
                                  disabled={selectedDecorationUsesEmbeddedArtwork}
                                  value={selectedDecoration.color ?? "#00ffff"}
                                  onChange={(event) =>
                                    handleSelectedDecorationChange((decoration) => ({
                                      ...decoration,
                                      color: event.target.value,
                                    }))
                                  }
                                />
                              </label>
                              <label>
                                <span>Couleur 2</span>
                                <input
                                  type="color"
                                  disabled={selectedDecorationUsesEmbeddedArtwork}
                                  value={selectedDecoration.colorSecondary ?? "#ff00ff"}
                                  onChange={(event) =>
                                    handleSelectedDecorationChange((decoration) => ({
                                      ...decoration,
                                      colorSecondary: event.target.value,
                                    }))
                                  }
                                />
                              </label>
                            </div>
                          </div>
                        )}
                      </section>

                      <section className="pp-editor-inspector-group">
                        <button
                          type="button"
                          className="pp-editor-inspector-group__toggle"
                          onClick={() => toggleDecorationInspectorSection("animation")}
                        >
                          <span><i className="fa-solid fa-wand-magic-sparkles" aria-hidden="true" /> Animation & symetrie</span>
                          <i className={`fa-solid ${decorationInspectorSections.animation ? "fa-chevron-up" : "fa-chevron-down"}`} aria-hidden="true" />
                        </button>
                        {decorationInspectorSections.animation && (
                          <div className="pp-editor-inspector-group__body">
                            <div className="pp-editor-inline-fields">
                              <label>
                                <span>Animation</span>
                                <select
                                  value={selectedDecoration.animation ?? "none"}
                                  onChange={(event) =>
                                    handleSelectedDecorationChange((decoration) => ({
                                      ...decoration,
                                      animation: event.target.value as DecorationAnimation,
                                    }))
                                  }
                                >
                                  {DECORATION_ANIMATIONS.map((animation) => (
                                    <option key={animation} value={animation}>
                                      {animation}
                                    </option>
                                  ))}
                                </select>
                              </label>
                              <label>
                                <span>Symetrie</span>
                                <div className="pp-editor-inline-checkboxes">
                                  <label>
                                    <input
                                      type="checkbox"
                                      checked={Boolean(selectedDecoration.flipX)}
                                      onChange={(event) =>
                                        handleSelectedDecorationChange((decoration) => ({
                                          ...decoration,
                                          flipX: event.target.checked,
                                        }))
                                      }
                                    />
                                    Flip X
                                  </label>
                                  <label>
                                    <input
                                      type="checkbox"
                                      checked={Boolean(selectedDecoration.flipY)}
                                      onChange={(event) =>
                                        handleSelectedDecorationChange((decoration) => ({
                                          ...decoration,
                                          flipY: event.target.checked,
                                        }))
                                      }
                                    />
                                    Flip Y
                                  </label>
                                </div>
                              </label>
                            </div>
                          </div>
                        )}
                      </section>

                      <section className="pp-editor-inspector-group">
                        <button
                          type="button"
                          className="pp-editor-inspector-group__toggle"
                          onClick={() => toggleDecorationInspectorSection("duplication")}
                        >
                          <span><i className="fa-solid fa-clone" aria-hidden="true" /> Duplication</span>
                          <i className={`fa-solid ${decorationInspectorSections.duplication ? "fa-chevron-up" : "fa-chevron-down"}`} aria-hidden="true" />
                        </button>
                        {decorationInspectorSections.duplication && (
                          <div className="pp-editor-inspector-group__body">
                            <div className="pp-editor-inline-fields">
                              <label>
                                <span>Duplication X</span>
                                <input
                                  type="number"
                                  value={duplicateOffsetX}
                                  onChange={(event) =>
                                    setDuplicateOffsetX(Math.round(Number(event.target.value) || 0))
                                  }
                                />
                              </label>
                              <label>
                                <span>Duplication Y</span>
                                <input
                                  type="number"
                                  value={duplicateOffsetY}
                                  onChange={(event) =>
                                    setDuplicateOffsetY(Math.round(Number(event.target.value) || 0))
                                  }
                                />
                              </label>
                            </div>
                            <div className="pp-editor-inline-fields">
                              <label>
                                <span>Colonnes</span>
                                <input
                                  type="number"
                                  min={1}
                                  max={20}
                                  value={duplicateColumns}
                                  onChange={(event) =>
                                    setDuplicateColumns(
                                      Math.min(20, Math.max(1, Math.round(Number(event.target.value) || 1)))
                                    )
                                  }
                                />
                              </label>
                              <label>
                                <span>Lignes</span>
                                <input
                                  type="number"
                                  min={1}
                                  max={20}
                                  value={duplicateRows}
                                  onChange={(event) =>
                                    setDuplicateRows(
                                      Math.min(20, Math.max(1, Math.round(Number(event.target.value) || 1)))
                                    )
                                  }
                                />
                              </label>
                            </div>
                            <div className="pp-editor-inline-fields">
                              <label>
                                <span>Mode</span>
                                <select
                                  value={duplicateLayout}
                                  onChange={(event) =>
                                    setDuplicateLayout(
                                      (event.target.value as (typeof DUPLICATION_LAYOUTS)[number]) ??
                                        "grid"
                                    )
                                  }
                                >
                                  <option value="grid">Grille</option>
                                  <option value="circle">Cercle</option>
                                </select>
                              </label>
                              {duplicateLayout === "circle" && (
                                <label>
                                  <span>Angle depart</span>
                                  <input
                                    type="number"
                                    min={-360}
                                    max={360}
                                    value={duplicateStartAngle}
                                    onChange={(event) =>
                                      setDuplicateStartAngle(
                                        Math.max(-360, Math.min(360, Math.round(Number(event.target.value) || 0)))
                                      )
                                    }
                                  />
                                </label>
                              )}
                              {duplicateLayout === "circle" && (
                                <label>
                                  <span>Arc</span>
                                  <input
                                    type="number"
                                    min={1}
                                    max={360}
                                    value={duplicateArcAngle}
                                    onChange={(event) =>
                                      setDuplicateArcAngle(
                                        Math.max(1, Math.min(360, Math.round(Number(event.target.value) || 360)))
                                      )
                                    }
                                  />
                                </label>
                              )}
                            </div>
                            <div className="pp-editor-inline-fields">
                              <label>
                                <span>Miroir</span>
                                <div className="pp-editor-inline-checkboxes">
                                  <label>
                                    <input
                                      type="checkbox"
                                      checked={duplicateMirrorX}
                                      onChange={(event) => setDuplicateMirrorX(event.target.checked)}
                                    />
                                    X
                                  </label>
                                  <label>
                                    <input
                                      type="checkbox"
                                      checked={duplicateMirrorY}
                                      onChange={(event) => setDuplicateMirrorY(event.target.checked)}
                                    />
                                    Y
                                  </label>
                                </div>
                              </label>
                              <label>
                                <span>Alterne</span>
                                <div className="pp-editor-inline-checkboxes">
                                  <label>
                                    <input
                                      type="checkbox"
                                      checked={duplicateAlternateMirror}
                                      onChange={(event) =>
                                        setDuplicateAlternateMirror(event.target.checked)
                                      }
                                    />
                                    Miroir 1/2
                                  </label>
                                </div>
                              </label>
                              <label>
                                <span>Apercu</span>
                                <div className="pp-editor-duplicate-shortcut">
                                  {duplicatePreviewDecorations.length} copie(s)
                                </div>
                              </label>
                            </div>
                            <div className="pp-editor-inline-fields">
                              <label>
                                <span>Action</span>
                                <button
                                  type="button"
                                  className="pp-editor-duplicate-action"
                                  onClick={handleDuplicateDecoration}
                                >
                                  Dupliquer
                                </button>
                              </label>
                              <label>
                                <span>Raccourci</span>
                                <div className="pp-editor-duplicate-shortcut">Ctrl/Cmd + D</div>
                              </label>
                            </div>
                          </div>
                        )}
                      </section>
                    </div>
                  </>
                )}

                {!selection && <p className="pp-editor-muted">Selectionne un element sur la grille.</p>}
              </div>
            </aside>
          </div>

          <div className="pp-editor-actions">
            {isAdmin && (
              <button
                type="button"
                className="pp-editor-icon-btn pp-editor-icon-btn--save"
                title="Sauver brouillon"
                aria-label="Sauver brouillon"
                onClick={() => save(false)}
              >
                <i className="fa-solid fa-floppy-disk" aria-hidden="true" />
              </button>
            )}
            {isAdmin && (
              <button
                type="button"
                className="pp-editor-icon-btn pp-editor-icon-btn--publish"
                title="Publier"
                aria-label="Publier"
                onClick={() => save(true)}
              >
                <i className="fa-solid fa-upload" aria-hidden="true" />
              </button>
            )}
          </div>

          {previewLevel && (
            <PixelProtocolDraftPreview
              key={previewKey}
              level={previewLevel}
              onClose={() => setPreviewLevel(null)}
            />
          )}

          <details className="pp-editor-json-panel">
            <summary>JSON lecture seule</summary>
            <textarea className="pp-editor-json" value={readonlyJson} readOnly spellCheck={false} />
          </details>

          {status && <div className="pp-editor-status success">{status}</div>}
          {error && <div className="pp-editor-status error">{error}</div>}
        </section>
      </div>
    </div>
  );
}
