import { writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { LEVELS } from "../../frontend/src/features/pixelProtocol/levels.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  const outputPath = path.resolve(__dirname, "../prisma/pixelProtocolLevels.json");
  await writeFile(outputPath, `${JSON.stringify(LEVELS, null, 2)}\n`, "utf8");
  console.log(`[pixel-protocol:sync] Wrote ${LEVELS.length} level(s) to ${outputPath}.`);
}

main().catch((err) => {
  console.error("Pixel Protocol sync error:", err);
  process.exit(1);
});
