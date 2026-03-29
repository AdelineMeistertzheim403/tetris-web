import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const coverageSummaryPath = path.resolve(__dirname, "../coverage/unit/coverage-summary.json");
const badgePath = path.resolve(__dirname, "../../.github/badges/frontend-coverage.json");

function getBadgeColor(percentage) {
  if (percentage >= 80) return "brightgreen";
  if (percentage >= 60) return "green";
  if (percentage >= 40) return "yellow";
  if (percentage >= 20) return "orange";
  return "red";
}

const coverageSummary = JSON.parse(await readFile(coverageSummaryPath, "utf8"));
const linesCoverage = Number(coverageSummary?.total?.lines?.pct ?? 0);
const roundedCoverage = Number(linesCoverage.toFixed(2));

const badge = {
  schemaVersion: 1,
  label: "coverage",
  message: `${roundedCoverage}%`,
  color: getBadgeColor(roundedCoverage),
};

await writeFile(badgePath, `${JSON.stringify(badge, null, 2)}\n`, "utf8");
console.log(`Updated coverage badge at ${badgePath}`);
