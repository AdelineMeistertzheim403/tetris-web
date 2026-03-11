import type {
  DecorationAnimation,
  DecorationLayer,
  DataOrbAffinity,
  DecorationType,
  PixelSkill,
  PlatformType,
  Tetromino,
} from "./types";
import exampleNeonFoundryJson from "./examples/world-template-neon-foundry.json?raw";
import exampleGlitchCathedralJson from "./examples/world-template-glitch-cathedral.json?raw";
import exampleDataArchivesJson from "./examples/world-template-data-archives.json?raw";
import exampleApexCoreJson from "./examples/world-template-apex-core.json?raw";
import exampleNeonCityJson from "./examples/world-template-neon-city.json?raw";
import exampleGlitchWorldJson from "./examples/world-template-glitch-world.json?raw";
import exampleApexCore2Json from "./examples/world-template-apex-core-2.json?raw";
import exampleShowcaseTetrominoCircuitJson from "./examples/world-template-showcase-tetromino-circuit.json?raw";
import exampleShowcaseGlitchCorruptionJson from "./examples/world-template-showcase-glitch-corruption.json?raw";
import exampleShowcaseAiNetworkJson from "./examples/world-template-showcase-ai-network.json?raw";
import exampleShowcaseAtmosphereJson from "./examples/world-template-showcase-atmosphere.json?raw";
import exampleSvgPackGalleryAJson from "./examples/world-template-svg-pack-gallery-a.json?raw";
import exampleSvgPackGalleryBJson from "./examples/world-template-svg-pack-gallery-b.json?raw";
import exampleTilesetAtlasShowcaseJson from "./examples/world-template-tileset-atlas-showcase.json?raw";
import exampleMegaShowcaseJson from "./examples/world-template-mega-showcase.json?raw";
import example3dDecorShowcaseJson from "./examples/world-template-3d-decor-showcase.json?raw";
import example3dDecorPremiumJson from "./examples/world-template-3d-decor-premium.json?raw";
import example3dThemeDesertTechnoJson from "./examples/world-template-3d-theme-desert-techno.json?raw";
import example3dThemeOrbitalRuinsJson from "./examples/world-template-3d-theme-orbital-ruins.json?raw";
import example3dThemeNeonSanctuaryJson from "./examples/world-template-3d-theme-neon-sanctuary.json?raw";

export const TETROMINOS: Tetromino[] = ["I", "O", "T", "L", "J", "S", "Z"];
export const PLATFORM_TYPES: PlatformType[] = [
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
export const MOVING_AXES = ["x", "y"] as const;
export const MOVING_PATTERNS = ["pingpong", "loop"] as const;
export const DECORATION_LAYERS: DecorationLayer[] = ["far", "mid", "near"];
export const DECORATION_ANIMATIONS: DecorationAnimation[] = [
  "none",
  "pulse",
  "flow",
  "glitch",
];
export const DECORATION_SOURCES = [
  "all",
  "builtin",
  "svg_pack",
  "3d",
  "tileset",
] as const;
export const ORB_AFFINITIES: DataOrbAffinity[] = [
  "standard",
  "blue",
  "red",
  "green",
  "purple",
];
export const PIXEL_SKILLS: PixelSkill[] = [
  "DATA_GRAPPLE",
  "OVERJUMP",
  "PHASE_SHIFT",
  "PULSE_SHOCK",
  "OVERCLOCK_MODE",
  "TIME_BUFFER",
  "PLATFORM_SPAWN",
];
export const WORLD_EXAMPLES = [
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
  {
    id: "3d-decor-showcase",
    name: "3D Decor Showcase",
    theme: "28 decors 3D / cyber-jungle / sci-fi",
    raw: example3dDecorShowcaseJson,
  },
  {
    id: "3d-decor-premium",
    name: "3D Decor Premium",
    theme: "selection hero / plus detail / plus grand format",
    raw: example3dDecorPremiumJson,
  },
  {
    id: "3d-theme-desert-techno",
    name: "3D Theme Desert Techno",
    theme: "sable / relais / archeotech",
    raw: example3dThemeDesertTechnoJson,
  },
  {
    id: "3d-theme-orbital-ruins",
    name: "3D Theme Orbital Ruins",
    theme: "stations cassees / alliage / vide",
    raw: example3dThemeOrbitalRuinsJson,
  },
  {
    id: "3d-theme-neon-sanctuary",
    name: "3D Theme Neon Sanctuary",
    theme: "rituel / magenta / cyan",
    raw: example3dThemeNeonSanctuaryJson,
  },
] as const;

export function decorationSource(
  type: DecorationType
): (typeof DECORATION_SOURCES)[number] {
  if (type.startsWith("svg_pack:")) return "svg_pack";
  if (type.startsWith("tileset:")) return "tileset";
  return "builtin";
}

export function isThreeDDecorationType(type: DecorationType) {
  return type.startsWith("svg_pack:") && type.includes("_3d_");
}

export function isShowcaseExample(example: (typeof WORLD_EXAMPLES)[number]) {
  const haystack = `${example.id} ${example.name} ${example.theme}`.toLowerCase();
  return (
    haystack.includes("showcase") ||
    haystack.includes("gallery") ||
    haystack.includes("atlas") ||
    haystack.includes("mega")
  );
}
