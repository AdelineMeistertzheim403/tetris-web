import { writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function loadLevels() {
  const candidatePaths = [
    path.resolve(__dirname, "../../frontend/src/features/pixelProtocol/levels.ts"),
    path.resolve(__dirname, "../frontend/src/features/pixelProtocol/levels.ts"),
  ];

  const levelModulePath = candidatePaths.find((candidate) => existsSync(candidate));
  if (!levelModulePath) {
    throw new Error("frontend/src/features/pixelProtocol/levels.ts introuvable");
  }

  const moduleUrl = new URL(`file://${levelModulePath}`);
  const { LEVELS } = await import(moduleUrl.href);
  if (!Array.isArray(LEVELS)) {
    throw new Error("Export LEVELS invalide");
  }
  return LEVELS;
}

async function main() {
  const LEVELS = await loadLevels();
  const outputPath = path.resolve(__dirname, "../prisma/pixelProtocolLevels.json");
  await writeFile(outputPath, `${JSON.stringify(LEVELS, null, 2)}\n`, "utf8");
  console.log(`[pixel-protocol:sync] Wrote ${LEVELS.length} level(s) to ${outputPath}.`);
}

main().catch((err) => {
  console.error("Pixel Protocol sync error:", err);
  process.exit(1);
});
