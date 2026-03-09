import type { CSSProperties, ReactNode } from "react";
import svgPackManifestRaw from "./pixel_protocole_svg_pack/manifest.json?raw";
import tilesetAtlasMapRaw from "./pixel_protocole_svg_pack/tileset/pixel_protocole_cyber_tileset.json?raw";
import tilesetAtlasUrl from "./pixel_protocole_svg_pack/tileset/pixel_protocole_cyber_tileset.svg?url";
import type {
  BuiltinDecorationType,
  DecorationAnimation,
  DecorationDef,
  DecorationLayer,
  DecorationType,
  SvgPackDecorationType,
  TilesetDecorationType,
} from "./types";

type DecorationCategory =
  | "tetromino"
  | "tech"
  | "glitch"
  | "network"
  | "ai"
  | "background"
  | "tileset";

export type DecorationPreset = {
  type: DecorationType;
  label: string;
  category: DecorationCategory;
  defaultWidth: number;
  defaultHeight: number;
  color: string;
  colorSecondary: string;
};

type SvgPackManifestEntry = {
  file: string;
  category?: string;
  theme?: string;
};

type SvgPackManifest = {
  decorations?: SvgPackManifestEntry[];
  backgrounds?: SvgPackManifestEntry[];
};

type SvgPackAsset = {
  markup: string;
  width: number;
  height: number;
};

type TilesetTile = {
  x: number;
  y: number;
  w: number;
  h: number;
};

type TilesetAsset = TilesetTile & {
  atlasUrl: string;
  atlasWidth: number;
  atlasHeight: number;
};

export const DECORATION_CATEGORY_ORDER: DecorationCategory[] = [
  "tetromino",
  "tech",
  "glitch",
  "network",
  "ai",
  "background",
  "tileset",
];

const SVG_PACK_MANIFEST = JSON.parse(svgPackManifestRaw) as SvgPackManifest;
const SVG_PACK_SOURCE_BY_PATH = import.meta.glob(
  "./pixel_protocole_svg_pack/**/*.svg",
  {
    eager: true,
    import: "default",
    query: "?raw",
  }
) as Record<string, string>;
const TILESET_ATLAS_MAP = JSON.parse(tilesetAtlasMapRaw) as Record<string, TilesetTile>;

const SVG_PACK_CATEGORY_COLORS: Record<
  DecorationCategory,
  { color: string; colorSecondary: string }
> = {
  tetromino: { color: "#00ffff", colorSecondary: "#ff00ff" },
  tech: { color: "#00ffff", colorSecondary: "#89f8ff" },
  glitch: { color: "#ff00ff", colorSecondary: "#00ffff" },
  network: { color: "#00ffff", colorSecondary: "#ff00ff" },
  ai: { color: "#8a5cff", colorSecondary: "#ff4d5a" },
  background: { color: "#00f5ff", colorSecondary: "#ff4fd8" },
  tileset: { color: "#00f5ff", colorSecondary: "#ff4fd8" },
};

function toSvgPackDecorationType(file: string): SvgPackDecorationType {
  return `svg_pack:${file.replace(/\.svg$/i, "")}`;
}

function toTilesetDecorationType(tileKey: string): TilesetDecorationType {
  return `tileset:${tileKey}`;
}

function toDecorationCategory(category: string | undefined): DecorationCategory {
  switch ((category ?? "").toLowerCase()) {
    case "tetromino":
      return "tetromino";
    case "circuit":
      return "tech";
    case "glitch":
      return "glitch";
    case "ai":
      return "ai";
    case "environment":
      return "background";
    default:
      return "background";
  }
}

function toTitleCaseToken(token: string) {
  const upperTokenMap: Record<string, string> = {
    ai: "AI",
    i: "I",
    o: "O",
    t: "T",
    l: "L",
    j: "J",
    s: "S",
    z: "Z",
  };

  return upperTokenMap[token] ?? `${token.charAt(0).toUpperCase()}${token.slice(1)}`;
}

function humanizeSvgPackLabel(file: string, isBackground: boolean) {
  const basename = file.replace(/\.svg$/i, "");
  const stem = isBackground
    ? basename.replace(/^bg_parallax_\d+_/, "")
    : basename.replace(/^dec_\d+_/, "");

  return stem
    .split("_")
    .filter(Boolean)
    .map((token) => toTitleCaseToken(token.toLowerCase()))
    .join(" ");
}

function humanizeTilesetLabel(tileKey: string) {
  return tileKey
    .split("_")
    .filter(Boolean)
    .map((token) => toTitleCaseToken(token.toLowerCase()))
    .join(" ");
}

function parseSvgDimensions(svg: string) {
  const viewBoxMatch = svg.match(/viewBox="([^"]+)"/i);
  if (viewBoxMatch) {
    const parts = viewBoxMatch[1]
      .trim()
      .split(/\s+/)
      .map((value) => Number(value));
    if (parts.length === 4 && parts.every((value) => Number.isFinite(value))) {
      return {
        width: Math.max(4, Math.round(parts[2] || 100)),
        height: Math.max(4, Math.round(parts[3] || 100)),
      };
    }
  }

  const widthMatch = svg.match(/width="([^"]+)"/i);
  const heightMatch = svg.match(/height="([^"]+)"/i);
  const width = widthMatch ? Number.parseFloat(widthMatch[1]) : 100;
  const height = heightMatch ? Number.parseFloat(heightMatch[1]) : 100;
  return {
    width: Math.max(4, Math.round(Number.isFinite(width) ? width : 100)),
    height: Math.max(4, Math.round(Number.isFinite(height) ? height : 100)),
  };
}

function normalizeSvgMarkup(svg: string) {
  const trimmed = svg.trim().replace(/^\uFEFF/, "").replace(/<\?xml[\s\S]*?\?>/gi, "");
  return trimmed.replace(/<svg\b([^>]*)>/i, (_match, attrs: string) => {
    const cleanedAttrs = attrs
      .replace(/\swidth="[^"]*"/gi, "")
      .replace(/\sheight="[^"]*"/gi, "")
      .replace(/\spreserveAspectRatio="[^"]*"/gi, "")
      .replace(/\sclass="[^"]*"/gi, "");

    return `<svg${cleanedAttrs} width="100%" height="100%" preserveAspectRatio="none" class="pp-decoration-svg" aria-hidden="true">`;
  });
}

function resolveSvgPackSource(path: string) {
  return SVG_PACK_SOURCE_BY_PATH[path];
}

function buildSvgPackEntries() {
  const assets = new Map<DecorationType, SvgPackAsset>();
  const presets: DecorationPreset[] = [];

  const registerEntry = (
    folder: "decorations" | "backgrounds",
    entry: SvgPackManifestEntry,
    fallbackCategory: DecorationCategory
  ) => {
    const path = `./pixel_protocole_svg_pack/${folder}/${entry.file}`;
    const source = resolveSvgPackSource(path);
    if (!source) {
      return;
    }

    const type = toSvgPackDecorationType(entry.file);
    const category =
      folder === "backgrounds"
        ? "background"
        : toDecorationCategory(entry.category) ?? fallbackCategory;
    const { width, height } = parseSvgDimensions(source);
    const colors = SVG_PACK_CATEGORY_COLORS[category];

    assets.set(type, {
      markup: normalizeSvgMarkup(source),
      width,
      height,
    });

    presets.push({
      type,
      label: humanizeSvgPackLabel(entry.file, folder === "backgrounds"),
      category,
      defaultWidth: width,
      defaultHeight: height,
      color: colors.color,
      colorSecondary: colors.colorSecondary,
    });
  };

  for (const entry of SVG_PACK_MANIFEST.decorations ?? []) {
    registerEntry("decorations", entry, "background");
  }

  for (const entry of SVG_PACK_MANIFEST.backgrounds ?? []) {
    registerEntry("backgrounds", entry, "background");
  }

  return { assets, presets };
}

function buildTilesetEntries() {
  const assets = new Map<DecorationType, TilesetAsset>();
  const presets: DecorationPreset[] = [];
  const atlasSource = resolveSvgPackSource(
    "./pixel_protocole_svg_pack/tileset/pixel_protocole_cyber_tileset.svg"
  );
  const { width: atlasWidth, height: atlasHeight } = atlasSource
    ? parseSvgDimensions(atlasSource)
    : { width: 256, height: 256 };

  for (const [tileKey, tile] of Object.entries(TILESET_ATLAS_MAP)) {
    const type = toTilesetDecorationType(tileKey);
    const category: DecorationCategory = "tileset";
    const colors = SVG_PACK_CATEGORY_COLORS[category];

    assets.set(type, {
      ...tile,
      atlasUrl: tilesetAtlasUrl,
      atlasWidth,
      atlasHeight,
    });

    presets.push({
      type,
      label: humanizeTilesetLabel(tileKey),
      category,
      defaultWidth: tile.w,
      defaultHeight: tile.h,
      color: colors.color,
      colorSecondary: colors.colorSecondary,
    });
  }

  return { assets, presets };
}

const { assets: SVG_PACK_ASSETS, presets: SVG_PACK_PRESETS } = buildSvgPackEntries();
const { assets: TILESET_ASSETS, presets: TILESET_PRESETS } = buildTilesetEntries();

const BUILTIN_DECORATION_PRESETS: DecorationPreset[] = [
  { type: "tetromino_I", label: "Tetromino I", category: "tetromino", defaultWidth: 128, defaultHeight: 32, color: "#00ffff", colorSecondary: "#7ffbff" },
  { type: "tetromino_T", label: "Tetromino T", category: "tetromino", defaultWidth: 96, defaultHeight: 64, color: "#ff00ff", colorSecondary: "#ff8cff" },
  { type: "tetromino_L", label: "Tetromino L", category: "tetromino", defaultWidth: 72, defaultHeight: 96, color: "#00ff88", colorSecondary: "#9dffd0" },
  { type: "tetromino_Z", label: "Tetromino Z", category: "tetromino", defaultWidth: 96, defaultHeight: 64, color: "#ff4444", colorSecondary: "#ffb0b0" },
  { type: "tetromino_O", label: "Tetromino O", category: "tetromino", defaultWidth: 64, defaultHeight: 64, color: "#ffff00", colorSecondary: "#fff8b0" },
  { type: "tetromino_S", label: "Tetromino S", category: "tetromino", defaultWidth: 96, defaultHeight: 64, color: "#00ffcc", colorSecondary: "#b9fff1" },
  { type: "tetromino_J", label: "Tetromino J", category: "tetromino", defaultWidth: 72, defaultHeight: 96, color: "#0088ff", colorSecondary: "#a8d6ff" },
  { type: "tetromino_fragment", label: "Tetromino Fragment", category: "tetromino", defaultWidth: 64, defaultHeight: 64, color: "#ff00ff", colorSecondary: "#00ffff" },
  { type: "tetromino_outline", label: "Tetromino Outline", category: "tetromino", defaultWidth: 96, defaultHeight: 96, color: "#00ffff", colorSecondary: "#92fbff" },
  { type: "tetromino_glow_block", label: "Tetromino Glow Block", category: "tetromino", defaultWidth: 40, defaultHeight: 40, color: "#00ffff", colorSecondary: "#adfaff" },
  { type: "stacked_tetromino_blocks", label: "Stacked Tetromino Blocks", category: "tetromino", defaultWidth: 64, defaultHeight: 96, color: "#ff00ff", colorSecondary: "#00ffff" },
  { type: "tetromino_shadow", label: "Tetromino Shadow", category: "tetromino", defaultWidth: 128, defaultHeight: 36, color: "#111111", colorSecondary: "#2e2e2e" },
  { type: "broken_tetromino", label: "Broken Tetromino", category: "tetromino", defaultWidth: 64, defaultHeight: 64, color: "#ff4444", colorSecondary: "#ffaaaa" },
  { type: "mini_tetromino_cluster", label: "Mini Tetromino Cluster", category: "tetromino", defaultWidth: 64, defaultHeight: 64, color: "#00ffff", colorSecondary: "#ff00ff" },
  { type: "tetromino_neon_border", label: "Tetromino Neon Border", category: "tetromino", defaultWidth: 150, defaultHeight: 36, color: "#ff00ff", colorSecondary: "#ffc4ff" },
  { type: "data_line", label: "Data Line", category: "tech", defaultWidth: 220, defaultHeight: 36, color: "#00ffff", colorSecondary: "#5af1ff" },
  { type: "data_nodes", label: "Data Nodes", category: "tech", defaultWidth: 220, defaultHeight: 42, color: "#00ffff", colorSecondary: "#ff00ff" },
  { type: "energy_pillar", label: "Energy Pillar", category: "tech", defaultWidth: 40, defaultHeight: 180, color: "#00ffff", colorSecondary: "#ff00ff" },
  { type: "data_beam", label: "Data Beam", category: "tech", defaultWidth: 56, defaultHeight: 180, color: "#ff00ff", colorSecondary: "#b7f5ff" },
  { type: "energy_core", label: "Energy Core", category: "tech", defaultWidth: 72, defaultHeight: 72, color: "#00ffff", colorSecondary: "#ff00ff" },
  { type: "horizontal_data_stream", label: "Horizontal Data Stream", category: "tech", defaultWidth: 240, defaultHeight: 32, color: "#00ffff", colorSecondary: "#8cf7ff" },
  { type: "vertical_data_stream", label: "Vertical Data Stream", category: "tech", defaultWidth: 32, defaultHeight: 240, color: "#00ffff", colorSecondary: "#8cf7ff" },
  { type: "data_pulse_nodes", label: "Data Pulse Nodes", category: "tech", defaultWidth: 160, defaultHeight: 36, color: "#ff00ff", colorSecondary: "#ff9de8" },
  { type: "circuit_cross", label: "Circuit Cross", category: "tech", defaultWidth: 90, defaultHeight: 90, color: "#00ffff", colorSecondary: "#abfcff" },
  { type: "data_arrow", label: "Data Arrow", category: "tech", defaultWidth: 120, defaultHeight: 40, color: "#00ffff", colorSecondary: "#7ef6ff" },
  { type: "packet_squares", label: "Packet Squares", category: "tech", defaultWidth: 150, defaultHeight: 36, color: "#00ffff", colorSecondary: "#98fcff" },
  { type: "network_hub", label: "Network Hub", category: "tech", defaultWidth: 96, defaultHeight: 96, color: "#00ffff", colorSecondary: "#ff00ff" },
  { type: "data_ladder", label: "Data Ladder", category: "tech", defaultWidth: 56, defaultHeight: 180, color: "#00ffff", colorSecondary: "#9efbff" },
  { type: "digital_crosshair", label: "Digital Crosshair", category: "tech", defaultWidth: 72, defaultHeight: 72, color: "#ff00ff", colorSecondary: "#ff9df4" },
  { type: "signal_beam", label: "Signal Beam", category: "tech", defaultWidth: 56, defaultHeight: 180, color: "#00ffff", colorSecondary: "#95fbff" },
  { type: "pixel_glitch", label: "Pixel Glitch", category: "glitch", defaultWidth: 120, defaultHeight: 120, color: "#00ffff", colorSecondary: "#ff00ff" },
  { type: "broken_pixels", label: "Broken Pixels", category: "glitch", defaultWidth: 120, defaultHeight: 120, color: "#ff00ff", colorSecondary: "#00ffff" },
  { type: "glitch_bar", label: "Glitch Bar", category: "glitch", defaultWidth: 220, defaultHeight: 28, color: "#ff00ff", colorSecondary: "#00ffff" },
  { type: "data_noise", label: "Data Noise", category: "glitch", defaultWidth: 140, defaultHeight: 56, color: "#00ffff", colorSecondary: "#ff00ff" },
  { type: "fragment_blocks", label: "Fragment Blocks", category: "glitch", defaultWidth: 110, defaultHeight: 110, color: "#00ffff", colorSecondary: "#ff00ff" },
  { type: "glitch_stripes", label: "Glitch Stripes", category: "glitch", defaultWidth: 160, defaultHeight: 40, color: "#ff00ff", colorSecondary: "#00ffff" },
  { type: "glitch_fragments", label: "Glitch Fragments", category: "glitch", defaultWidth: 130, defaultHeight: 70, color: "#ff00ff", colorSecondary: "#00ffff" },
  { type: "broken_grid", label: "Broken Grid", category: "glitch", defaultWidth: 170, defaultHeight: 170, color: "#ff00ff", colorSecondary: "#00ffff" },
  { type: "pixel_noise", label: "Pixel Noise", category: "glitch", defaultWidth: 110, defaultHeight: 110, color: "#00ffff", colorSecondary: "#ff00ff" },
  { type: "corrupted_blocks", label: "Corrupted Blocks", category: "glitch", defaultWidth: 96, defaultHeight: 96, color: "#ff4444", colorSecondary: "#ff9999" },
  { type: "glitch_diagonal", label: "Glitch Diagonal", category: "glitch", defaultWidth: 90, defaultHeight: 90, color: "#ff00ff", colorSecondary: "#ff97ff" },
  { type: "data_crack", label: "Data Crack", category: "glitch", defaultWidth: 90, defaultHeight: 90, color: "#00ffff", colorSecondary: "#8bfdff" },
  { type: "static_bar", label: "Static Bar", category: "glitch", defaultWidth: 170, defaultHeight: 24, color: "#00ffff", colorSecondary: "#87fbff" },
  { type: "corruption_wave", label: "Corruption Wave", category: "glitch", defaultWidth: 170, defaultHeight: 70, color: "#ff00ff", colorSecondary: "#ffa3ff" },
  { type: "broken_pixels_cluster", label: "Broken Pixels Cluster", category: "glitch", defaultWidth: 120, defaultHeight: 120, color: "#ff00ff", colorSecondary: "#00ffff" },
  { type: "teleport_ring", label: "Teleport Ring", category: "network", defaultWidth: 96, defaultHeight: 96, color: "#00ffff", colorSecondary: "#64f7ff" },
  { type: "portal_grid", label: "Portal Grid", category: "network", defaultWidth: 96, defaultHeight: 96, color: "#ff00ff", colorSecondary: "#73f3ff" },
  { type: "network_triangle", label: "Network Triangle", category: "network", defaultWidth: 96, defaultHeight: 96, color: "#00ffff", colorSecondary: "#ff00ff" },
  { type: "data_hub", label: "Data Hub", category: "network", defaultWidth: 96, defaultHeight: 96, color: "#00ffff", colorSecondary: "#ff00ff" },
  { type: "node_cluster", label: "Node Cluster", category: "network", defaultWidth: 92, defaultHeight: 92, color: "#00ffff", colorSecondary: "#93f8ff" },
  { type: "server_block", label: "Server Block", category: "ai", defaultWidth: 130, defaultHeight: 72, color: "#00ffff", colorSecondary: "#ff00ff" },
  { type: "circuit_board", label: "Circuit Board", category: "ai", defaultWidth: 130, defaultHeight: 72, color: "#00ffff", colorSecondary: "#6ff1ff" },
  { type: "ai_eye", label: "AI Eye", category: "ai", defaultWidth: 120, defaultHeight: 60, color: "#ff00ff", colorSecondary: "#95faff" },
  { type: "code_panel", label: "Code Panel", category: "ai", defaultWidth: 140, defaultHeight: 110, color: "#00ffff", colorSecondary: "#ff00ff" },
  { type: "matrix_block", label: "Matrix Block", category: "ai", defaultWidth: 96, defaultHeight: 96, color: "#00ffff", colorSecondary: "#ff00ff" },
  { type: "ai_eye_large", label: "AI Eye Large", category: "ai", defaultWidth: 150, defaultHeight: 76, color: "#ff00ff", colorSecondary: "#ff9af4" },
  { type: "core_processor", label: "Core Processor", category: "ai", defaultWidth: 96, defaultHeight: 96, color: "#00ffff", colorSecondary: "#9bfdff" },
  { type: "server_rack", label: "Server Rack", category: "ai", defaultWidth: 92, defaultHeight: 130, color: "#00ffff", colorSecondary: "#8bf0ff" },
  { type: "ai_triangle", label: "AI Triangle", category: "ai", defaultWidth: 100, defaultHeight: 100, color: "#00ffff", colorSecondary: "#9bfaff" },
  { type: "neural_nodes", label: "Neural Nodes", category: "ai", defaultWidth: 96, defaultHeight: 96, color: "#ff00ff", colorSecondary: "#ffa2f2" },
  { type: "digital_chip", label: "Digital Chip", category: "ai", defaultWidth: 96, defaultHeight: 96, color: "#00ffff", colorSecondary: "#89f8ff" },
  { type: "circuit_hub", label: "Circuit Hub", category: "ai", defaultWidth: 90, defaultHeight: 90, color: "#00ffff", colorSecondary: "#98fcff" },
  { type: "core_ring", label: "Core Ring", category: "ai", defaultWidth: 96, defaultHeight: 96, color: "#00ffff", colorSecondary: "#a4f8ff" },
  { type: "data_scanner", label: "Data Scanner", category: "ai", defaultWidth: 130, defaultHeight: 34, color: "#ff00ff", colorSecondary: "#ff9ce8" },
  { type: "processor_grid", label: "Processor Grid", category: "ai", defaultWidth: 96, defaultHeight: 96, color: "#00ffff", colorSecondary: "#98f7ff" },
  { type: "grid_background", label: "Grid Background", category: "background", defaultWidth: 240, defaultHeight: 240, color: "#00ffff", colorSecondary: "#6ff1ff" },
  { type: "vertical_grid", label: "Vertical Grid", category: "background", defaultWidth: 240, defaultHeight: 240, color: "#00ffff", colorSecondary: "#6ff1ff" },
  { type: "floating_squares", label: "Floating Squares", category: "background", defaultWidth: 128, defaultHeight: 128, color: "#ff00ff", colorSecondary: "#00ffff" },
  { type: "energy_arcs", label: "Energy Arcs", category: "background", defaultWidth: 160, defaultHeight: 80, color: "#ff00ff", colorSecondary: "#00ffff" },
  { type: "digital_wave", label: "Digital Wave", category: "background", defaultWidth: 220, defaultHeight: 80, color: "#00ffff", colorSecondary: "#99faff" },
  { type: "horizon_grid", label: "Horizon Grid", category: "background", defaultWidth: 250, defaultHeight: 120, color: "#00ffff", colorSecondary: "#7ef6ff" },
  { type: "neon_arc", label: "Neon Arc", category: "background", defaultWidth: 160, defaultHeight: 70, color: "#ff00ff", colorSecondary: "#ff9eff" },
  { type: "floating_squares_cluster", label: "Floating Squares Cluster", category: "background", defaultWidth: 128, defaultHeight: 128, color: "#ff00ff", colorSecondary: "#00ffff" },
  { type: "background_circuit", label: "Background Circuit", category: "background", defaultWidth: 170, defaultHeight: 90, color: "#00ffff", colorSecondary: "#8cf9ff" },
  { type: "data_skyline", label: "Data Skyline", category: "background", defaultWidth: 150, defaultHeight: 90, color: "#00ffff", colorSecondary: "#ff00ff" },
  { type: "pixel_star", label: "Pixel Star", category: "background", defaultWidth: 36, defaultHeight: 36, color: "#00ffff", colorSecondary: "#a2fbff" },
  { type: "neon_rectangle", label: "Neon Rectangle", category: "background", defaultWidth: 140, defaultHeight: 70, color: "#ff00ff", colorSecondary: "#ffc2ff" },
  { type: "digital_tunnel", label: "Digital Tunnel", category: "background", defaultWidth: 110, defaultHeight: 110, color: "#00ffff", colorSecondary: "#8ff9ff" },
  { type: "data_pulse", label: "Data Pulse", category: "background", defaultWidth: 90, defaultHeight: 32, color: "#ff00ff", colorSecondary: "#ff9aff" },
  { type: "wave_grid", label: "Wave Grid", category: "background", defaultWidth: 220, defaultHeight: 80, color: "#00ffff", colorSecondary: "#9ffbff" },
];

export const DECORATION_PRESETS: DecorationPreset[] = [
  ...BUILTIN_DECORATION_PRESETS,
  ...SVG_PACK_PRESETS,
  ...TILESET_PRESETS,
];

const PRESET_BY_TYPE = new Map(
  DECORATION_PRESETS.map((preset) => [preset.type, preset] as const)
);

const LAYER_ORDER: Record<DecorationLayer, number> = {
  far: -1,
  mid: 0,
  near: 1,
};

export function decorationLayerOrder(layer: DecorationLayer | undefined) {
  return LAYER_ORDER[layer ?? "mid"];
}

export function getDecorationPreset(type: DecorationType) {
  return PRESET_BY_TYPE.get(type) ?? DECORATION_PRESETS[0];
}

export function isSvgPackDecorationType(
  type: DecorationType
): type is SvgPackDecorationType {
  return type.startsWith("svg_pack:");
}

export function isTilesetDecorationType(
  type: DecorationType
): type is TilesetDecorationType {
  return type.startsWith("tileset:");
}

export function usesEmbeddedDecorationArtwork(type: DecorationType) {
  return isSvgPackDecorationType(type) || isTilesetDecorationType(type);
}

function getSvgPackDecorationAsset(type: DecorationType) {
  return SVG_PACK_ASSETS.get(type);
}

function getTilesetDecorationAsset(type: DecorationType) {
  return TILESET_ASSETS.get(type);
}

type DecorationSvgProps = {
  type: BuiltinDecorationType;
};

function decorationShape({ type }: DecorationSvgProps): ReactNode {
  const secondary = "var(--pp-dec-color-2)";
  switch (type) {
    case "tetromino_I":
      return (
        <>
          <rect x="0" y="0" width="20" height="20" fill="currentColor" />
          <rect x="20" y="0" width="20" height="20" fill="currentColor" />
          <rect x="40" y="0" width="20" height="20" fill="currentColor" />
          <rect x="60" y="0" width="20" height="20" fill="currentColor" />
        </>
      );
    case "tetromino_T":
      return (
        <>
          <rect x="0" y="0" width="20" height="20" fill="currentColor" />
          <rect x="20" y="0" width="20" height="20" fill="currentColor" />
          <rect x="40" y="0" width="20" height="20" fill="currentColor" />
          <rect x="20" y="20" width="20" height="20" fill="currentColor" />
        </>
      );
    case "tetromino_L":
      return (
        <>
          <rect x="0" y="0" width="20" height="20" fill="currentColor" />
          <rect x="0" y="20" width="20" height="20" fill="currentColor" />
          <rect x="0" y="40" width="20" height="20" fill="currentColor" />
          <rect x="20" y="40" width="20" height="20" fill="currentColor" />
        </>
      );
    case "tetromino_Z":
      return (
        <>
          <rect x="0" y="0" width="20" height="20" fill="currentColor" />
          <rect x="20" y="0" width="20" height="20" fill="currentColor" />
          <rect x="20" y="20" width="20" height="20" fill="currentColor" />
          <rect x="40" y="20" width="20" height="20" fill="currentColor" />
        </>
      );
    case "tetromino_O":
      return (
        <>
          <rect x="0" y="0" width="20" height="20" fill="currentColor" />
          <rect x="20" y="0" width="20" height="20" fill="currentColor" />
          <rect x="0" y="20" width="20" height="20" fill="currentColor" />
          <rect x="20" y="20" width="20" height="20" fill="currentColor" />
        </>
      );
    case "tetromino_S":
      return (
        <>
          <rect x="34" y="10" width="26" height="26" fill="currentColor" />
          <rect x="60" y="10" width="26" height="26" fill="currentColor" />
          <rect x="8" y="36" width="26" height="26" fill="currentColor" />
          <rect x="34" y="36" width="26" height="26" fill="currentColor" />
        </>
      );
    case "tetromino_J":
      return (
        <>
          <rect x="50" y="6" width="24" height="24" fill="currentColor" />
          <rect x="50" y="30" width="24" height="24" fill="currentColor" />
          <rect x="50" y="54" width="24" height="24" fill="currentColor" />
          <rect x="26" y="54" width="24" height="24" fill="currentColor" />
        </>
      );
    case "tetromino_fragment":
      return (
        <>
          <rect x="8" y="8" width="34" height="34" fill="currentColor" />
          <rect x="56" y="56" width="34" height="34" fill={secondary} />
        </>
      );
    case "tetromino_outline":
      return <rect x="6" y="6" width="88" height="88" fill="none" stroke="currentColor" strokeWidth="4" />;
    case "tetromino_glow_block":
      return (
        <>
          <rect x="16" y="16" width="68" height="68" fill="currentColor" />
          <rect x="26" y="26" width="48" height="48" fill={secondary} opacity="0.42" />
        </>
      );
    case "stacked_tetromino_blocks":
      return (
        <>
          <rect x="20" y="8" width="30" height="26" fill="currentColor" />
          <rect x="20" y="36" width="30" height="26" fill={secondary} />
          <rect x="20" y="64" width="30" height="26" fill="#00ff88" />
        </>
      );
    case "tetromino_shadow":
      return <rect x="0" y="36" width="100" height="28" fill="currentColor" />;
    case "broken_tetromino":
      return (
        <>
          <rect x="8" y="8" width="30" height="30" fill="currentColor" />
          <rect x="58" y="58" width="30" height="30" fill="currentColor" />
        </>
      );
    case "mini_tetromino_cluster":
      return (
        <>
          <rect x="6" y="6" width="16" height="16" fill="currentColor" />
          <rect x="38" y="26" width="16" height="16" fill={secondary} />
          <rect x="70" y="46" width="16" height="16" fill="currentColor" />
        </>
      );
    case "tetromino_neon_border":
      return <rect x="2" y="24" width="96" height="52" fill="none" stroke="currentColor" strokeWidth="6" />;
    case "data_line":
      return <line x1="0" y1="50" x2="100" y2="50" stroke="currentColor" strokeWidth="4" />;
    case "data_nodes":
      return (
        <>
          <line x1="0" y1="50" x2="100" y2="50" stroke={secondary} strokeWidth="3" />
          <circle cx="15" cy="50" r="8" fill="currentColor" />
          <circle cx="50" cy="50" r="8" fill={secondary} />
          <circle cx="85" cy="50" r="8" fill="currentColor" />
        </>
      );
    case "energy_pillar":
      return (
        <>
          <rect x="9" y="0" width="2" height="100" fill="currentColor" />
          <circle cx="10" cy="20" r="4" fill={secondary} />
          <circle cx="10" cy="50" r="4" fill={secondary} />
          <circle cx="10" cy="80" r="4" fill={secondary} />
        </>
      );
    case "data_beam":
      return <rect x="18" y="0" width="4" height="120" fill="currentColor" />;
    case "energy_core":
      return (
        <>
          <circle cx="20" cy="20" r="10" fill="currentColor" />
          <circle cx="20" cy="20" r="4" fill={secondary} />
        </>
      );
    case "horizontal_data_stream":
      return <path d="M0 50 H100" stroke="currentColor" strokeWidth="4" fill="none" />;
    case "vertical_data_stream":
      return <path d="M50 0 V100" stroke="currentColor" strokeWidth="4" fill="none" />;
    case "data_pulse_nodes":
      return (
        <>
          <circle cx="16" cy="50" r="7" fill="currentColor" />
          <circle cx="50" cy="50" r="7" fill="currentColor" />
          <circle cx="84" cy="50" r="7" fill="currentColor" />
        </>
      );
    case "circuit_cross":
      return (
        <>
          <line x1="0" y1="50" x2="100" y2="50" stroke="currentColor" strokeWidth="3" />
          <line x1="50" y1="0" x2="50" y2="100" stroke="currentColor" strokeWidth="3" />
        </>
      );
    case "data_arrow":
      return <polygon points="0,50 62,50 62,24 100,50 62,76 62,50" fill="currentColor" />;
    case "packet_squares":
      return (
        <>
          <rect x="6" y="38" width="12" height="12" fill="currentColor" />
          <rect x="44" y="38" width="12" height="12" fill="currentColor" />
          <rect x="82" y="38" width="12" height="12" fill="currentColor" />
        </>
      );
    case "network_hub":
      return (
        <>
          <circle cx="50" cy="50" r="10" fill={secondary} />
          <line x1="50" y1="50" x2="20" y2="20" stroke="currentColor" strokeWidth="3" />
          <line x1="50" y1="50" x2="80" y2="20" stroke="currentColor" strokeWidth="3" />
        </>
      );
    case "data_ladder":
      return (
        <>
          <line x1="30" y1="0" x2="30" y2="100" stroke="currentColor" strokeWidth="3" />
          <line x1="70" y1="0" x2="70" y2="100" stroke="currentColor" strokeWidth="3" />
        </>
      );
    case "digital_crosshair":
      return (
        <>
          <line x1="50" y1="0" x2="50" y2="100" stroke="currentColor" strokeWidth="3" />
          <line x1="0" y1="50" x2="100" y2="50" stroke="currentColor" strokeWidth="3" />
        </>
      );
    case "signal_beam":
      return <rect x="45" y="0" width="10" height="100" fill="currentColor" />;
    case "pixel_glitch":
      return (
        <>
          <rect x="10" y="10" width="8" height="8" fill="currentColor" />
          <rect x="40" y="20" width="8" height="8" fill={secondary} />
          <rect x="20" y="50" width="8" height="8" fill="currentColor" />
          <rect x="62" y="34" width="8" height="8" fill={secondary} />
        </>
      );
    case "broken_pixels":
      return (
        <>
          <rect x="10" y="10" width="6" height="6" fill="currentColor" />
          <rect x="16" y="10" width="6" height="6" fill={secondary} />
          <rect x="35" y="22" width="6" height="6" fill={secondary} />
          <rect x="61" y="50" width="6" height="6" fill="currentColor" />
        </>
      );
    case "glitch_bar":
      return (
        <>
          <rect x="0" y="40" width="100" height="20" fill="currentColor" />
          <rect x="14" y="44" width="20" height="12" fill={secondary} opacity="0.7" />
          <rect x="62" y="44" width="12" height="12" fill={secondary} opacity="0.7" />
        </>
      );
    case "data_noise":
      return (
        <>
          <rect x="10" y="5" width="4" height="4" fill="currentColor" />
          <rect x="40" y="15" width="4" height="4" fill={secondary} />
          <rect x="70" y="25" width="4" height="4" fill="currentColor" />
          <rect x="56" y="8" width="4" height="4" fill={secondary} />
        </>
      );
    case "fragment_blocks":
      return (
        <>
          <rect x="10" y="10" width="10" height="10" fill="currentColor" />
          <rect x="30" y="20" width="10" height="10" fill={secondary} />
          <rect x="42" y="40" width="8" height="8" fill="currentColor" />
        </>
      );
    case "glitch_stripes":
      return (
        <>
          <rect x="0" y="16" width="100" height="12" fill="currentColor" />
          <rect x="0" y="56" width="100" height="12" fill={secondary} />
        </>
      );
    case "glitch_fragments":
      return (
        <>
          <rect x="12" y="18" width="16" height="16" fill="currentColor" />
          <rect x="42" y="44" width="16" height="16" fill={secondary} />
        </>
      );
    case "broken_grid":
      return (
        <>
          <line x1="0" y1="20" x2="100" y2="20" stroke="currentColor" strokeWidth="2.5" />
          <line x1="0" y1="60" x2="100" y2="60" stroke={secondary} strokeWidth="2.5" />
        </>
      );
    case "pixel_noise":
      return (
        <>
          <rect x="16" y="16" width="6" height="6" fill="currentColor" />
          <rect x="68" y="34" width="6" height="6" fill={secondary} />
        </>
      );
    case "corrupted_blocks":
      return (
        <>
          <rect x="4" y="4" width="30" height="30" fill="currentColor" />
          <rect x="36" y="64" width="30" height="30" fill="currentColor" />
        </>
      );
    case "glitch_diagonal":
      return <line x1="0" y1="0" x2="100" y2="100" stroke="currentColor" strokeWidth="3" />;
    case "data_crack":
      return <polyline points="16,16 50,34 34,66 84,84" stroke="currentColor" fill="none" strokeWidth="3" />;
    case "static_bar":
      return <rect x="0" y="40" width="100" height="20" fill="currentColor" />;
    case "corruption_wave":
      return <path d="M0 55 Q20 28 40 55 T80 55 T100 55" stroke="currentColor" fill="none" strokeWidth="3" />;
    case "broken_pixels_cluster":
      return (
        <>
          <rect x="26" y="12" width="10" height="10" fill="currentColor" />
          <rect x="62" y="38" width="10" height="10" fill={secondary} />
        </>
      );
    case "teleport_ring":
      return (
        <>
          <circle cx="30" cy="30" r="20" stroke="currentColor" fill="none" strokeWidth="3" />
          <circle cx="30" cy="30" r="12" stroke={secondary} fill="none" strokeWidth="1.5" />
        </>
      );
    case "portal_grid":
      return (
        <>
          <circle cx="30" cy="30" r="15" stroke="currentColor" fill="none" />
          <circle cx="30" cy="30" r="22" stroke={secondary} fill="none" opacity="0.7" />
        </>
      );
    case "network_triangle":
      return (
        <>
          <line x1="10" y1="50" x2="30" y2="10" stroke="currentColor" />
          <line x1="30" y1="10" x2="50" y2="50" stroke="currentColor" />
          <line x1="50" y1="50" x2="10" y2="50" stroke="currentColor" />
          <circle cx="30" cy="10" r="3" fill={secondary} />
        </>
      );
    case "data_hub":
      return (
        <>
          <circle cx="30" cy="30" r="6" fill={secondary} />
          <line x1="30" y1="30" x2="10" y2="10" stroke="currentColor" />
          <line x1="30" y1="30" x2="50" y2="10" stroke="currentColor" />
          <line x1="30" y1="30" x2="30" y2="55" stroke="currentColor" />
        </>
      );
    case "node_cluster":
      return (
        <>
          <circle cx="20" cy="20" r="4" fill="currentColor" />
          <circle cx="40" cy="20" r="4" fill="currentColor" />
          <circle cx="30" cy="40" r="4" fill={secondary} />
          <line x1="20" y1="20" x2="30" y2="40" stroke={secondary} />
          <line x1="40" y1="20" x2="30" y2="40" stroke={secondary} />
        </>
      );
    case "server_block":
      return (
        <>
          <rect width="80" height="40" fill="#111827" />
          <rect x="10" y="10" width="10" height="10" fill="currentColor" />
          <rect x="24" y="10" width="10" height="10" fill={secondary} />
          <rect x="52" y="10" width="20" height="6" fill={secondary} opacity="0.8" />
        </>
      );
    case "circuit_board":
      return (
        <>
          <rect width="80" height="40" fill="#091422" />
          <line x1="0" y1="20" x2="80" y2="20" stroke="currentColor" />
          <line x1="15" y1="6" x2="15" y2="34" stroke={secondary} />
          <line x1="52" y1="6" x2="52" y2="34" stroke={secondary} />
        </>
      );
    case "ai_eye":
      return (
        <>
          <ellipse cx="30" cy="15" rx="20" ry="10" fill="none" stroke="currentColor" />
          <circle cx="30" cy="15" r="4" fill={secondary} />
        </>
      );
    case "code_panel":
      return (
        <>
          <rect width="80" height="60" fill="#111827" />
          <line x1="10" y1="15" x2="70" y2="15" stroke="currentColor" />
          <line x1="10" y1="30" x2="60" y2="30" stroke={secondary} />
          <line x1="10" y1="45" x2="55" y2="45" stroke="currentColor" />
        </>
      );
    case "matrix_block":
      return (
        <>
          <rect width="60" height="60" fill="#0b1420" />
          <circle cx="20" cy="20" r="3" fill="currentColor" />
          <circle cx="35" cy="28" r="3" fill={secondary} />
          <circle cx="44" cy="41" r="3" fill="currentColor" />
        </>
      );
    case "ai_eye_large":
      return <ellipse cx="50" cy="50" rx="38" ry="20" stroke="currentColor" fill="none" strokeWidth="3" />;
    case "core_processor":
      return (
        <>
          <rect x="10" y="10" width="80" height="80" fill="#111827" />
          <circle cx="50" cy="50" r="10" fill="currentColor" />
        </>
      );
    case "server_rack":
      return (
        <>
          <rect x="14" y="6" width="72" height="88" fill="#111827" />
          <rect x="26" y="20" width="48" height="8" fill="currentColor" />
          <rect x="26" y="40" width="48" height="8" fill={secondary} />
          <rect x="26" y="60" width="48" height="8" fill="currentColor" />
        </>
      );
    case "ai_triangle":
      return <polygon points="50,8 92,92 8,92" stroke="currentColor" fill="none" strokeWidth="3" />;
    case "neural_nodes":
      return (
        <>
          <circle cx="25" cy="25" r="6" fill="currentColor" />
          <circle cx="75" cy="25" r="6" fill="currentColor" />
          <circle cx="50" cy="75" r="6" fill="currentColor" />
        </>
      );
    case "digital_chip":
      return <rect x="16" y="16" width="68" height="68" stroke="currentColor" fill="none" strokeWidth="3" />;
    case "circuit_hub":
      return <circle cx="50" cy="50" r="8" fill="currentColor" />;
    case "core_ring":
      return <circle cx="50" cy="50" r="30" stroke="currentColor" fill="none" strokeWidth="3" />;
    case "data_scanner":
      return <line x1="0" y1="50" x2="100" y2="50" stroke="currentColor" strokeWidth="4" />;
    case "processor_grid":
      return <rect x="4" y="4" width="92" height="92" stroke="currentColor" fill="none" strokeWidth="3" />;
    case "grid_background":
      return (
        <path
          d="M0 20 H100 M0 40 H100 M0 60 H100 M0 80 H100"
          stroke="currentColor"
          fill="none"
        />
      );
    case "vertical_grid":
      return (
        <path
          d="M20 0 V100 M40 0 V100 M60 0 V100 M80 0 V100"
          stroke="currentColor"
          fill="none"
        />
      );
    case "floating_squares":
      return (
        <>
          <rect x="10" y="10" width="10" height="10" fill="currentColor" />
          <rect x="50" y="40" width="10" height="10" fill={secondary} />
          <rect x="30" y="58" width="8" height="8" fill="currentColor" />
        </>
      );
    case "energy_arcs":
      return <path d="M10 30 Q40 0 70 30" stroke="currentColor" fill="none" />;
    case "digital_wave":
      return (
        <path d="M0 55 Q16 30 32 55 T64 55 T100 55" stroke="currentColor" fill="none" />
      );
    case "horizon_grid":
      return <path d="M0 50 H100" stroke="currentColor" strokeWidth="2.5" fill="none" />;
    case "neon_arc":
      return <path d="M10 75 Q50 15 90 75" stroke="currentColor" fill="none" strokeWidth="3" />;
    case "floating_squares_cluster":
      return (
        <>
          <rect x="12" y="12" width="12" height="12" fill="currentColor" />
          <rect x="74" y="50" width="12" height="12" fill={secondary} />
        </>
      );
    case "background_circuit":
      return <line x1="0" y1="50" x2="100" y2="50" stroke="currentColor" strokeWidth="3" />;
    case "data_skyline":
      return (
        <>
          <rect x="12" y="50" width="12" height="40" fill="currentColor" />
          <rect x="36" y="36" width="12" height="54" fill={secondary} />
          <rect x="60" y="44" width="12" height="46" fill="currentColor" />
          <rect x="80" y="28" width="12" height="62" fill={secondary} />
        </>
      );
    case "pixel_star":
      return <circle cx="50" cy="50" r="6" fill="currentColor" />;
    case "neon_rectangle":
      return <rect x="4" y="12" width="92" height="76" stroke="currentColor" fill="none" strokeWidth="3" />;
    case "digital_tunnel":
      return <circle cx="50" cy="50" r="40" stroke="currentColor" fill="none" strokeWidth="3" />;
    case "data_pulse":
      return <circle cx="50" cy="50" r="20" fill="currentColor" />;
    case "wave_grid":
      return <path d="M0 55 Q16 30 32 55 T64 55 T100 55" stroke="currentColor" fill="none" strokeWidth="3" />;
    default:
      return <rect x="10" y="10" width="12" height="12" fill="currentColor" />;
  }
}

type PixelProtocolDecorationProps = {
  decoration: DecorationDef;
  className?: string;
  selected?: boolean;
};

export function PixelProtocolDecoration({
  decoration,
  className = "",
  selected = false,
}: PixelProtocolDecorationProps) {
  const preset = getDecorationPreset(decoration.type);
  const svgPackAsset = getSvgPackDecorationAsset(decoration.type);
  const tilesetAsset = getTilesetDecorationAsset(decoration.type);
  const builtinType = usesEmbeddedDecorationArtwork(decoration.type)
    ? "pixel_glitch"
    : decoration.type;
  const layer = decoration.layer ?? "mid";
  const animation: DecorationAnimation = decoration.animation ?? "none";
  const width = Math.max(
    4,
    decoration.width || svgPackAsset?.width || tilesetAsset?.w || preset.defaultWidth
  );
  const height = Math.max(
    4,
    decoration.height || svgPackAsset?.height || tilesetAsset?.h || preset.defaultHeight
  );
  const flipX = decoration.flipX ? -1 : 1;
  const flipY = decoration.flipY ? -1 : 1;
  const baseStyle: CSSProperties = {
    left: decoration.x,
    top: decoration.y,
    width,
    height,
    opacity: decoration.opacity ?? 0.9,
    zIndex: decorationLayerOrder(layer),
    transform: `rotate(${decoration.rotation ?? 0}deg) scale(${flipX}, ${flipY})`,
    color: decoration.color ?? preset.color,
  };
  const decorationStyle = {
    ...baseStyle,
    ["--pp-dec-color-2" as string]: decoration.colorSecondary ?? preset.colorSecondary,
  } as CSSProperties;
  const tilesetStyle = tilesetAsset
    ? ({
        backgroundImage: `url("${tilesetAsset.atlasUrl}")`,
        backgroundRepeat: "no-repeat",
        backgroundSize: `${(tilesetAsset.atlasWidth * width) / tilesetAsset.w}px ${(tilesetAsset.atlasHeight * height) / tilesetAsset.h}px`,
        backgroundPosition: `${(-tilesetAsset.x * width) / tilesetAsset.w}px ${(-tilesetAsset.y * height) / tilesetAsset.h}px`,
      } as CSSProperties)
    : undefined;

  return (
    <div
      className={`pp-decoration pp-decoration--${layer} pp-decoration--anim-${animation} ${selected ? "is-selected" : ""} ${className}`.trim()}
      style={decorationStyle}
      data-decoration-type={decoration.type}
    >
      {svgPackAsset ? (
        <div dangerouslySetInnerHTML={{ __html: svgPackAsset.markup }} />
      ) : tilesetAsset ? (
        <div className="pp-decoration-tile" style={tilesetStyle} aria-hidden="true" />
      ) : (
        <svg
          className="pp-decoration-svg"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          {decorationShape({ type: builtinType })}
        </svg>
      )}
    </div>
  );
}
